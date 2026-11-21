# -*- coding: utf-8 -*-
"""Convenios IES <-> empresa: quién puede proponer y responder, y la regla de las vacantes exclusivas."""

import app.main  # noqa: F401  carga los módulos en el orden de producción (evita un ciclo de importación)
import unittest
import uuid
from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from sqlalchemy import column, table
from sqlalchemy.dialects import postgresql

from app.modules.convenios import services as svc
from app.modules.convenios.visibility import SQL_VISIBLE_PARA_EG, visible_para

EMP, IES, OTRO = (str(uuid.uuid4()) for _ in range(3))


class Res:
    def __init__(self, value): self.v = value
    def one(self): return self.v
    def one_or_none(self): return self.v
    def scalar(self): return self.v
    def first(self): return self.v
    def fetchall(self): return self.v


class Session:
    """Entrega resultados en orden; guarda lo que se ejecutó."""
    def __init__(self, *results): self.results, self.sql, self.commits = list(results), [], 0
    async def execute(self, stmt, params=None):
        self.sql.append((str(stmt), params))
        return Res(self.results.pop(0) if self.results else None)
    async def commit(self): self.commits += 1
    async def rollback(self): pass


class SideTests(unittest.TestCase):
    def test_lado_segun_el_rol(self):
        self.assertEqual(svc.side_of({"rol": "admin_empresa", "id_entidad": EMP}), ("empresa", EMP))
        for rol in ("admin_ies", "asesor_ies"):
            self.assertEqual(svc.side_of({"rol": rol, "id_entidad": IES}), ("ies", IES))

    def test_sin_entidad_o_con_otro_rol_se_rechaza(self):
        for user, code in (({"rol": "admin_empresa"}, 400), ({"rol": "egresado", "id_entidad": EMP}, 403)):
            with self.assertRaises(HTTPException) as e:
                svc.side_of(user)
            self.assertEqual(e.exception.status_code, code)

    def test_responde_quien_no_propuso(self):
        self.assertTrue(svc.puede_responder("empresa", "ies"))
        self.assertFalse(svc.puede_responder("ies", "ies"))


class ProponerTests(unittest.IsolatedAsyncioTestCase):
    async def test_tipo_invalido(self):
        with self.assertRaises(HTTPException) as e:
            await svc.proponer(Session(), "empresa", EMP, IES, "Otro", 1, 1, [], None)
        self.assertEqual(e.exception.status_code, 422)

    async def test_ambas_partes_deben_estar_aprobadas(self):
        with self.assertRaises(HTTPException) as e:
            await svc.proponer(Session(("aprobado", "pendiente")), "empresa", EMP, IES, "Pasantía", 1, 1, [], None)
        self.assertEqual(e.exception.status_code, 422)

    async def test_no_se_propone_si_ya_hay_convenio_vigente(self):
        with self.assertRaises(HTTPException) as e:
            await svc.proponer(Session(("aprobado", "aprobado"), (1,)), "ies", IES, EMP, "Laboral", 2, 1, [], None)
        self.assertEqual(e.exception.status_code, 409)

    async def test_propone_y_avisa_a_la_otra_parte(self):
        with patch.object(svc, "send_vincula_email", new_callable=AsyncMock, return_value=True) as correo:
            # la empresa propone: el aviso va a la IES (primero se consulta el nombre de quien propone, luego el contacto de la IES)
            s = Session(("aprobado", "aprobado"), None, uuid.uuid4(), ("Acme", "x", "Acme"), ("rector@uts.co", "Rector", "UTS"))
            out = await svc.proponer(s, "empresa", EMP, IES, "Pasantía", 5, 2, ["Ingeniería"], " Hola ")
        self.assertEqual(out["estado"], "pendiente")
        self.assertEqual(correo.call_args.args[:2], ("convenio_propuesta", "rector@uts.co"))
        self.assertEqual(correo.call_args.kwargs["contraparte"], "Acme")


class BuscarContrapartesTests(unittest.IsolatedAsyncioTestCase):
    async def test_ies_ve_empresas_con_vacantes_y_su_relacion(self):
        rows = [(uuid.uuid4(), "Acme", "Tecnología", "Bucaramanga", 3, "vigente"), (uuid.uuid4(), "Beta", None, "Floridablanca", 0, None)]
        s = Session(rows)
        out = await svc.contrapartes(s, "ies", " ac ", ciudad="Bucaramanga", sector="Tecnología", con_vacantes=True, entidad=IES)
        self.assertEqual([(o["nombre"], o["vacantes_abiertas"], o["relacion"]) for o in out], [("Acme", 3, "vigente"), ("Beta", 0, None)])
        self.assertEqual(out[0]["detalle"], "Tecnología · Bucaramanga")
        self.assertEqual(out[1]["detalle"], "Floridablanca")  # sin sector no deja un separador suelto
        _, params = s.sql[0]
        self.assertEqual((params["ciudad"], params["sector"], params["abiertas"], params["q"]), ("Bucaramanga", "Tecnología", True, "%ac%"))
        self.assertEqual(str(params["me"]), IES)  # la relación se calcula contra la entidad de quien busca

    async def test_empresa_ve_instituciones_con_programas_y_filtra_por_programa(self):
        s = Session([(uuid.uuid4(), "UTS", "Bucaramanga", 4, 36, "propuesta")])
        out = await svc.contrapartes(s, "empresa", "", programa="Sistemas", entidad=EMP)
        self.assertEqual((out[0]["programas"], out[0]["egresados"], out[0]["relacion"]), (4, 36, "propuesta"))
        self.assertEqual(s.sql[0][1]["prog"], "%Sistemas%")
        self.assertIsNone(s.sql[0][1]["ciudad"])  # sin filtro: no se restringe

    async def test_filtros_reales_segun_el_lado(self):
        self.assertEqual(await svc.filtros_contrapartes(Session([("Bucaramanga",)]), "empresa"), {"ciudades": ["Bucaramanga"], "sectores": []})
        self.assertEqual(await svc.filtros_contrapartes(Session([("Bucaramanga",)], [("Salud",)]), "ies"), {"ciudades": ["Bucaramanga"], "sectores": ["Salud"]})


class CondicionesTests(unittest.IsolatedAsyncioTestCase):
    def sesion(self):
        return Session(("aprobado", "aprobado"), None, uuid.uuid4(), ("Acme", "x", "Acme"), ("rector@uts.co", "Rector", "UTS"))

    async def test_guarda_las_condiciones_sin_repetir_compromisos(self):
        s = self.sesion()
        detalle = {"modalidad": "hibrido", "remuneracion": "con_auxilio", "compromisos": ["ferias_visitas", "ferias_visitas", "charlas_empleabilidad"],
                   "responsable_nombre": "  Ana Ruiz ", "responsable_contacto": "ana@acme.co"}
        with patch.object(svc, "send_vincula_email", new_callable=AsyncMock, return_value=True):
            await svc.proponer(s, "empresa", EMP, IES, "Pasantía", 2, 1, [], None, detalle)
        p = s.sql[2][1]
        self.assertEqual((p["mod"], p["rem"], p["comp"], p["rn"], p["rc"]), ("hibrido", "con_auxilio", ["ferias_visitas", "charlas_empleabilidad"], "Ana Ruiz", "ana@acme.co"))

    async def test_condiciones_son_opcionales(self):
        s = self.sesion()
        with patch.object(svc, "send_vincula_email", new_callable=AsyncMock, return_value=True):
            await svc.proponer(s, "empresa", EMP, IES, "Pasantía", 2, 1, [], None)
        p = s.sql[2][1]
        self.assertEqual((p["mod"], p["rem"], p["comp"], p["rn"], p["rc"]), (None, None, [], None, None))

    async def test_valores_fuera_de_la_lista_se_rechazan(self):
        for malo in ({"modalidad": "volando"}, {"remuneracion": "mucha"}, {"compromisos": ["regalar_un_carro"]}):
            with self.assertRaises(HTTPException) as ctx:
                await svc.proponer(Session(), "empresa", EMP, IES, "Pasantía", 1, 1, [], None, malo)
            self.assertEqual(ctx.exception.status_code, 422)


class ResponderTests(unittest.IsolatedAsyncioTestCase):
    def propuesta(self, estado="pendiente", iniciada_por="empresa"):
        return (uuid.UUID(EMP), uuid.UUID(IES), estado, iniciada_por, "Pasantía", 2)

    async def test_rechazar_exige_motivo(self):
        for notas in (None, "", "  "):
            with self.assertRaises(HTTPException) as e:
                await svc.responder(Session(), "ies", IES, str(uuid.uuid4()), "rechazar", notas)
            self.assertEqual(e.exception.status_code, 422)

    async def test_propuesta_ajena_o_inexistente_es_404(self):
        with self.assertRaises(HTTPException) as e:
            await svc.responder(Session(None), "ies", OTRO, str(uuid.uuid4()), "aceptar", None)
        self.assertEqual(e.exception.status_code, 404)

    async def test_ya_resuelta_es_409(self):
        with self.assertRaises(HTTPException) as e:
            await svc.responder(Session(self.propuesta("aprobada")), "ies", IES, str(uuid.uuid4()), "aceptar", None)
        self.assertEqual(e.exception.status_code, 409)

    async def test_quien_propuso_no_puede_aceptar_su_propia_propuesta(self):
        with self.assertRaises(HTTPException) as e:
            await svc.responder(Session(self.propuesta(iniciada_por="empresa")), "empresa", EMP, str(uuid.uuid4()), "aceptar", None)
        self.assertEqual(e.exception.status_code, 403)

    async def test_quien_recibe_no_puede_retirar(self):
        with self.assertRaises(HTTPException) as e:
            await svc.responder(Session(self.propuesta(iniciada_por="empresa")), "ies", IES, str(uuid.uuid4()), "retirar", None)
        self.assertEqual(e.exception.status_code, 403)

    async def test_aceptar_crea_el_convenio_y_avisa_a_quien_propuso(self):
        id_conv = uuid.uuid4()
        s = Session(self.propuesta(), id_conv, None, ("Univ", "x", "UTS"), ("acme@x.co", "Ana", "Acme"))
        with patch.object(svc, "send_vincula_email", new_callable=AsyncMock, return_value=True) as correo:
            out = await svc.responder(s, "ies", IES, str(uuid.uuid4()), "aceptar", None)
        self.assertEqual((out["estado"], out["id_convenio"]), ("aprobada", str(id_conv)))
        self.assertTrue(any("INSERT INTO convenios_interinstitucionales" in q for q, _ in s.sql))
        self.assertEqual(correo.call_args.args[:2], ("convenio_respuesta", "acme@x.co"))

    async def test_retirar_la_propia_propuesta_no_crea_convenio_ni_avisa(self):
        s = Session(self.propuesta(iniciada_por="ies"), None)
        with patch.object(svc, "send_vincula_email", new_callable=AsyncMock) as correo:
            out = await svc.responder(s, "ies", IES, str(uuid.uuid4()), "retirar", None)
        self.assertEqual(out["estado"], "retirada")
        self.assertFalse(any("INSERT INTO convenios" in q for q, _ in s.sql))
        correo.assert_not_awaited()


class VacanteExclusivaTests(unittest.IsolatedAsyncioTestCase):
    async def test_convenio_de_otra_empresa_o_vencido_no_sirve(self):
        with self.assertRaises(HTTPException) as e:
            await svc.validar_convenio_de_empresa(Session(None), uuid.UUID(EMP), str(uuid.uuid4()))
        self.assertEqual((e.exception.status_code, e.exception.detail["codigo"]), (422, "CONVENIO_NO_VIGENTE"))
        with self.assertRaises(HTTPException):
            await svc.validar_convenio_de_empresa(Session(), uuid.UUID(EMP), "no-es-uuid")

    async def test_convenio_vigente_de_la_empresa_se_acepta(self):
        cid = uuid.uuid4()
        self.assertEqual(await svc.validar_convenio_de_empresa(Session((1,)), uuid.UUID(EMP), str(cid)), cid)

    def test_visitante_solo_ve_las_abiertas_a_todos(self):
        col = table("vacantes", column("id_convenio")).c.id_convenio
        sql = str(visible_para(col, None).compile(dialect=postgresql.dialect()))
        self.assertEqual(sql.strip(), "vacantes.id_convenio IS NULL")

    def test_egresado_ve_ademas_las_de_su_ies_con_convenio_vigente(self):
        col = table("vacantes", column("id_convenio")).c.id_convenio
        sql = str(visible_para(col, uuid.uuid4()).compile(dialect=postgresql.dialect()))
        for parte in ("IS NULL", "academicos_egresado", "convenios_interinstitucionales", "estado", "fecha_vencimiento", "current_date"):
            self.assertIn(parte.lower(), sql.lower())
        self.assertIn("v.id_convenio IS NULL", SQL_VISIBLE_PARA_EG)  # el mismo criterio en el SQL del copiloto
        self.assertIn("CURRENT_DATE", SQL_VISIBLE_PARA_EG)


if __name__ == "__main__":
    unittest.main()
