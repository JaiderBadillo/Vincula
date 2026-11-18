# -*- coding: utf-8 -*-
"""Citar a un egresado: modalidad virtual o presencial, enlace automático y correo con los datos."""

import app.main  # noqa: F401  carga los módulos en el orden de producción (evita un ciclo de importación)
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from app.integrations.meetings import generate_meeting_link, is_valid_meeting_url
from app.integrations.transactional_notifications import build_message
from app.modules.vacancies_ats import services as ats
from app.modules.vacancies_ats.schemas import ProgramarEntrevistaRequest as Req
from app.modules.vacancies_ats.services import VacancyATSService

MANANA = (datetime.now(timezone(timedelta(hours=-5))).date() + timedelta(days=1)).isoformat()


def req(**extra):
    base = {"fecha_entrevista": MANANA, "franja_horaria": "10:00 AM - 11:00 AM", "modalidad": "Virtual", "objetivo": "Entrevista técnica"}
    return Req(**{**base, **extra})


class SchemaTests(unittest.TestCase):
    def test_modalidad_se_normaliza_y_se_limita(self):
        self.assertEqual(req(modalidad="virtual").modalidad, "Virtual")
        self.assertEqual(req(modalidad="PRESENCIAL", url_reunion="Calle 5 #3-20, sala 2").modalidad, "Presencial")
        with self.assertRaises(ValidationError):
            req(modalidad="telefónica")

    def test_la_franja_exige_el_formato_de_las_citas(self):
        self.assertEqual(req(franja_horaria="9:30 am - 10:30 am").franja_horaria, "9:30 AM - 10:30 AM")
        for malo in ("mañana", "10:00 - 11:00", "25:00 AM - 11:00 AM"):
            with self.assertRaises(ValidationError, msg=malo):
                req(franja_horaria=malo)

    def test_presencial_exige_lugar_y_virtual_acepta_solo_enlaces_http(self):
        with self.assertRaises(ValidationError):
            req(modalidad="Presencial")
        with self.assertRaises(ValidationError):
            req(modalidad="Presencial", url_reunion="sala")
        self.assertIsNone(req().url_reunion)  # virtual sin enlace: se genera después
        self.assertEqual(req(url_reunion=" https://meet.google.com/abc-defg-hij ").url_reunion, "https://meet.google.com/abc-defg-hij")
        for malo in ("javascript:alert(1)", "meet.google.com/abc", "https://x.test/a b", 'https://x.test/"onmouseover="x'):
            with self.assertRaises(ValidationError, msg=malo):
                req(url_reunion=malo)


class MeetingLinkTests(unittest.TestCase):
    def test_enlaces_unicos_y_validos(self):
        enlaces = {generate_meeting_link() for _ in range(50)}
        self.assertEqual(len(enlaces), 50)
        self.assertTrue(all(e.startswith("https://meet.jit.si/Vincula-") and is_valid_meeting_url(e) for e in enlaces))


class EmailTests(unittest.TestCase):
    DATA = {"nombre": "Laura", "vacante": "Analista de Calidad", "empresa": "Acme", "fecha": "2026-11-20",
            "franja": "10:00 AM - 11:00 AM", "objetivo": "Entrevista técnica", "reclutador": "Carlos Pérez"}

    def test_virtual_incluye_el_enlace_en_texto_y_en_boton(self):
        link = "https://meet.jit.si/Vincula-abc123"
        subject, plain, html = build_message("entrevista_programada", {**self.DATA, "modalidad": "Virtual", "enlace": link})
        self.assertIn("viernes 20 de noviembre de 2026", plain)
        self.assertIn("10:00 AM - 11:00 AM", plain)
        self.assertIn(link, plain)                 # Brevo envía `plain` como texto plano
        self.assertIn(f'href="{link}"', html)      # botón "Unirme a la reunión"
        self.assertIn("Unirme a la reunión", html)
        self.assertNotIn("Ingresar a Vincula", html)

    def test_presencial_incluye_el_lugar_y_no_lleva_boton(self):
        subject, plain, html = build_message("entrevista_programada", {**self.DATA, "modalidad": "Presencial", "enlace": "Calle 5 #3-20, sala 2"})
        self.assertIn("Lugar: Calle 5 #3-20, sala 2", plain)
        self.assertIn("Calle 5 #3-20, sala 2", html)
        self.assertNotIn("Unirme a la reunión", html)
        self.assertNotIn("Ingresar a Vincula", html)

    def test_el_lugar_escrito_por_el_reclutador_no_inyecta_html(self):
        _, _, html = build_message("entrevista_programada", {**self.DATA, "modalidad": "Presencial", "enlace": "<script>alert(1)</script>"})
        self.assertNotIn("<script>", html)

    def test_un_enlace_virtual_invalido_no_genera_boton(self):
        _, plain, html = build_message("entrevista_programada", {**self.DATA, "modalidad": "Virtual", "enlace": 'javascript:alert("x")'})
        self.assertNotIn("Unirme a la reunión", html)


class FakeSession:
    def __init__(self, postulacion, reclutador):
        self.postulacion, self.reclutador, self.added = postulacion, reclutador, []
        self._queue = [postulacion, reclutador]

    async def execute(self, statement):
        return SimpleNamespace(scalar_one_or_none=lambda: self._queue.pop(0))

    def add(self, obj): self.added.append(obj)
    async def commit(self): pass

    async def refresh(self, obj):
        obj.id, obj.creado_en = uuid.uuid4(), datetime.now(timezone.utc)


def escenario(empresa="e1"):
    empresa_obj = SimpleNamespace(nombre_comercial="Acme", razon_social="Acme SAS")
    vacante = SimpleNamespace(id_empresa=empresa, titulo="Analista de Calidad", empresa=empresa_obj, id_reclutador_responsable=uuid.uuid4())
    egresado = SimpleNamespace(correo_personal="egresado@example.com", nombre_completo="Laura Rincón")
    post = SimpleNamespace(id=uuid.uuid4(), vacante=vacante, egresado=egresado, fase_actual="prueba_tecnica")
    return post, SimpleNamespace(id=uuid.uuid4(), nombre_completo="Carlos Pérez")


async def citar(payload, session=None, company="e1"):
    post, rec = escenario()
    session = session or FakeSession(post, rec)
    with patch.object(ats, "send_vincula_email", new_callable=AsyncMock, return_value=True) as correo:
        out = await VacancyATSService.programar_entrevista_candidato(session, str(uuid.uuid4()), str(post.id), payload, company)
    return out, session, post, correo


class ServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_virtual_sin_enlace_genera_la_sala_y_avisa_al_egresado(self):
        out, session, post, correo = await citar(req())
        self.assertTrue(out.url_reunion.startswith("https://meet.jit.si/Vincula-"))
        self.assertTrue(out.correo_enviado)
        correo.assert_awaited_once()
        self.assertEqual(correo.call_args.args[:2], ("entrevista_programada", "egresado@example.com"))
        kw = correo.call_args.kwargs
        self.assertEqual((kw["modalidad"], kw["enlace"], kw["fecha"], kw["franja"]), ("Virtual", out.url_reunion, MANANA, "10:00 AM - 11:00 AM"))
        self.assertEqual(post.fase_actual, "entrevista")  # sigue moviendo la fase

    async def test_virtual_con_enlace_propio_lo_respeta(self):
        out, *_ = await citar(req(url_reunion="https://meet.google.com/abc-defg-hij"))
        self.assertEqual(out.url_reunion, "https://meet.google.com/abc-defg-hij")

    async def test_presencial_guarda_el_lugar_y_no_genera_enlace(self):
        out, _, _, correo = await citar(req(modalidad="Presencial", url_reunion="Calle 5 #3-20, sala 2"))
        self.assertEqual((out.modalidad, out.url_reunion), ("Presencial", "Calle 5 #3-20, sala 2"))
        self.assertEqual(correo.call_args.kwargs["enlace"], "Calle 5 #3-20, sala 2")

    async def test_un_solo_correo_y_es_el_de_la_entrevista(self):
        """Antes salía el aviso genérico de fase, sin fecha ni enlace."""
        *_, correo = await citar(req())
        self.assertEqual(correo.await_count, 1)
        self.assertEqual(correo.call_args.args[0], "entrevista_programada")

    async def test_la_cita_se_guarda_aunque_falle_el_correo(self):
        post, rec = escenario()
        with patch.object(ats, "send_vincula_email", new_callable=AsyncMock, side_effect=RuntimeError("caído")):
            out = await VacancyATSService.programar_entrevista_candidato(FakeSession(post, rec), str(uuid.uuid4()), str(post.id), req(), "e1")
        self.assertFalse(out.correo_enviado)
        self.assertEqual(out.estado, "programada")

    async def test_egresado_sin_correo_no_rompe(self):
        post, rec = escenario()
        post.egresado.correo_personal = None
        with patch.object(ats, "send_vincula_email", new_callable=AsyncMock) as correo:
            out = await VacancyATSService.programar_entrevista_candidato(FakeSession(post, rec), str(uuid.uuid4()), str(post.id), req(), "e1")
        correo.assert_not_awaited()
        self.assertFalse(out.correo_enviado)

    async def test_no_se_cita_en_el_pasado(self):
        ayer = (datetime.now(timezone(timedelta(hours=-5))).date() - timedelta(days=1)).isoformat()
        with self.assertRaises(HTTPException) as e:
            await citar(req(fecha_entrevista=ayer))
        self.assertEqual((e.exception.status_code, e.exception.detail["codigo"]), (422, "FECHA_PASADA"))

    async def test_otra_empresa_no_puede_citar(self):
        with self.assertRaises(HTTPException) as e:
            await citar(req(), company="otra-empresa")
        self.assertEqual(e.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
