# -*- coding: utf-8 -*-
"""El egresado confirma o pide otra fecha desde el correo, y el reclutador se entera."""

import app.main  # noqa: F401  carga los módulos en el orden de producción (evita un ciclo de importación)
import unittest
import uuid
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.core.security import create_access_token
from app.integrations.transactional_notifications import build_message
from app.modules.vacancies_ats import services  # noqa: F401  (carga primero los modelos y evita un ciclo de importación)
from app.modules.vacancies_ats import interview_response as ir

MANANA = date.today() + timedelta(days=2)
DATA = {"nombre": "Laura", "vacante": "Analista", "empresa": "Acme", "fecha": MANANA.isoformat(),
        "franja": "10:00 AM - 11:00 AM", "modalidad": "Virtual", "enlace": "https://meet.jit.si/Vincula-abc"}


def entrevista(estado="programada", fecha=MANANA):
    emp = SimpleNamespace(nombre_comercial="Acme", razon_social="Acme SAS")
    vac = SimpleNamespace(titulo="Analista", empresa=emp)
    post = SimpleNamespace(vacante=vac, egresado=SimpleNamespace(nombre_completo="Laura Rincón"))
    rec = SimpleNamespace(nombre_completo="Carlos Pérez", correo_corporativo="carlos@acme.test")
    return SimpleNamespace(id=uuid.uuid4(), estado=estado, fecha_entrevista=fecha, franja_horaria="10:00 AM - 11:00 AM",
                           modalidad="Virtual", url_reunion="https://meet.jit.si/x", objetivo="Técnica", postulacion=post, reclutador=rec)


class Session:
    def __init__(self, e): self.e, self.commits = e, 0
    async def execute(self, _): return SimpleNamespace(scalar_one_or_none=lambda: self.e)
    async def commit(self): self.commits += 1


class EmailTests(unittest.TestCase):
    def test_el_correo_trae_el_boton_de_confirmar_y_el_enlace_en_texto(self):
        url = ir.make_response_url(uuid.uuid4())
        _, plain, html = build_message("entrevista_programada", {**DATA, "responder_url": url})
        self.assertIn(url, plain)
        self.assertIn("Confirmar asistencia", html)
        self.assertIn("https://meet.jit.si/Vincula-abc", html)  # el enlace de la reunión sigue visible
        self.assertIn("Pendiente de tu confirmación", html)

    def test_solo_se_acepta_el_enlace_de_confirmacion_de_vincula(self):
        _, plain, html = build_message("entrevista_programada", {**DATA, "responder_url": "https://malo.example/entrevista/responder?token=abc"})
        self.assertNotIn("malo.example", plain + html)
        self.assertIn("Unirme a la reunión", html)  # sin enlace válido, vuelve al botón de unirse

    def test_aviso_al_reclutador(self):
        base = {"nombre": "Carlos", "candidato": "Laura", "vacante": "Analista", "fecha": MANANA.isoformat(), "franja": "10:00 AM - 11:00 AM"}
        _, ok, _ = build_message("entrevista_respuesta", {**base, "accion": "confirmo"})
        _, no, _ = build_message("entrevista_respuesta", {**base, "accion": "no_puede", "motivo": "Tengo examen"})
        self.assertIn("confirmó", ok)
        self.assertIn("no puede asistir", no)
        self.assertIn("Tengo examen", no)


class TokenTests(unittest.IsolatedAsyncioTestCase):
    async def test_token_invalido_o_de_sesion_se_rechaza(self):
        for token in ("basura", create_access_token({"sub": str(uuid.uuid4())})):
            with self.assertRaises(HTTPException) as ctx:
                await ir.get_details(Session(None), token)
            self.assertEqual(ctx.exception.status_code, 400)

    async def test_token_vencido_se_rechaza(self):
        viejo = create_access_token({"entrevista": str(uuid.uuid4())}, expires_delta=timedelta(seconds=-5))
        with self.assertRaises(HTTPException):
            await ir.get_details(Session(None), viejo)


class RespondTests(unittest.IsolatedAsyncioTestCase):
    async def go(self, e, accion, motivo=None):
        s = Session(e)
        with patch.object(ir, "send_vincula_email", new_callable=AsyncMock, return_value=True) as correo:
            out = await ir.respond(s, ir.make_response_token(e.id), accion, motivo)
        return out, s, correo

    async def test_confirmar_cambia_el_estado_y_avisa_al_reclutador(self):
        e = entrevista()
        out, s, correo = await self.go(e, "confirmar")
        self.assertEqual((e.estado, out["estado"], s.commits), ("confirmada", "confirmada", 1))
        self.assertEqual(correo.call_args.args[:2], ("entrevista_respuesta", "carlos@acme.test"))
        self.assertEqual(correo.call_args.kwargs["accion"], "confirmo")

    async def test_pedir_otra_fecha_queda_como_reprogramada_con_motivo(self):
        e = entrevista()
        _, _, correo = await self.go(e, "no_puedo", " Tengo examen ")
        self.assertEqual(e.estado, "reprogramada")
        self.assertEqual((correo.call_args.kwargs["accion"], correo.call_args.kwargs["motivo"]), ("no_puede", "Tengo examen"))

    async def test_repetir_la_respuesta_no_avisa_dos_veces(self):
        _, s, correo = await self.go(entrevista("confirmada"), "confirmar")
        correo.assert_not_awaited()
        self.assertEqual(s.commits, 0)

    async def test_no_se_responde_una_entrevista_cancelada_ni_pasada(self):
        for e in (entrevista("cancelada"), entrevista("realizada"), entrevista(fecha=date.today() - timedelta(days=3))):
            with self.assertRaises(HTTPException) as ctx:
                await self.go(e, "confirmar")
            self.assertEqual(ctx.exception.status_code, 409)

    async def test_si_falla_el_correo_la_respuesta_se_guarda(self):
        e = entrevista()
        with patch.object(ir, "send_vincula_email", new_callable=AsyncMock, side_effect=RuntimeError("caído")):
            out = await ir.respond(Session(e), ir.make_response_token(e.id), "confirmar", None)
        self.assertEqual(out["estado"], "confirmada")


if __name__ == "__main__":
    unittest.main()
