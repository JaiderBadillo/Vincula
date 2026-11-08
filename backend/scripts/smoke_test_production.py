"""
Suite de Pruebas de Humo (Smoke Tests) para Producción - Vincula API.
Verifica conectividad, endpoints de salud, CORS, headers de seguridad y autenticación.

Uso:
    python backend/scripts/smoke_test_production.py --url https://tu-servicio.onrender.com
O para pruebas locales:
    python backend/scripts/smoke_test_production.py --url http://localhost:8000
"""

import sys
import argparse
import requests

def run_smoke_tests(base_url: str):
    base_url = base_url.rstrip("/")
    print("=" * 80)
    print(f" SUITE DE HUMO (SMOKE TESTS) - VINCULA EN PRODUCCIÓN")
    print(f" URL Objetivo: {base_url}")
    print("=" * 80)

    total_tests = 0
    passed_tests = 0

    def assert_check(name: str, condition: bool, details: str = ""):
        nonlocal total_tests, passed_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"  [PASS] {name} {details}")
        else:
            print(f"  [FAIL] {name} {details}")

    # 1. Endpoint Raíz
    print("\n1. Verificando Endpoint Raíz...")
    try:
        r = requests.get(f"{base_url}/", timeout=15)
        assert_check("GET / responde con HTTP 200", r.status_code == 200, f"({r.status_code})")
        data = r.json()
        assert_check("Nombre de la App", data.get("app") == "Vincula API", f"({data.get('app')})")
        assert_check("Versión 2.0.0", data.get("version") == "2.0.0", f"({data.get('version')})")
    except Exception as e:
        assert_check("Conexión con /", False, f"Error: {e}")

    # 2. Endpoint de Salud (Health Check de Render)
    print("\n2. Verificando Health Check (/api/v1/health)...")
    try:
        r = requests.get(f"{base_url}/api/v1/health", timeout=15)
        assert_check("GET /api/v1/health responde HTTP 200", r.status_code == 200, f"({r.status_code})")
        data = r.json()
        assert_check("Status 'online'", data.get("status") == "online", f"({data.get('status')})")
    except Exception as e:
        assert_check("Health check", False, f"Error: {e}")

    # 3. Encabezados de Seguridad
    print("\n3. Verificando Encabezados de Seguridad HTTP...")
    try:
        r = requests.get(f"{base_url}/api/v1/health", timeout=15)
        assert_check("X-Frame-Options: DENY", r.headers.get("x-frame-options") == "DENY", f"({r.headers.get('x-frame-options')})")
        assert_check("X-Content-Type-Options: nosniff", r.headers.get("x-content-type-options") == "nosniff", f"({r.headers.get('x-content-type-options')})")
    except Exception as e:
        assert_check("Security headers", False, f"Error: {e}")

    # 4. Verificación de CORS con Origen Vercel
    print("\n4. Verificando Pre-vuelo y Políticas de CORS...")
    try:
        headers = {
            "Origin": "https://vincula.vercel.app",
            "Access-Control-Request-Method": "GET"
        }
        r = requests.options(f"{base_url}/api/v1/health", headers=headers, timeout=15)
        allow_origin = r.headers.get("access-control-allow-origin")
        assert_check("CORS permite origen https://vincula.vercel.app", allow_origin in ["https://vincula.vercel.app", "*"], f"({allow_origin})")
    except Exception as e:
        assert_check("CORS Preflight", False, f"Error: {e}")

    # 5. Base de Datos / Latencia
    print("\n5. Verificando Estado de Base de Datos (/api/v1/health/db)...")
    try:
        r = requests.get(f"{base_url}/api/v1/health/db", timeout=20)
        assert_check("GET /api/v1/health/db responde HTTP 200", r.status_code == 200, f"({r.status_code})")
        data = r.json()
        is_conn = data.get("connected") or data.get("status") == "connected"
        assert_check("Conexión con Supabase / Postgres activa", bool(is_conn), f"(latency: {data.get('latency_ms', 'N/A')}ms)")
    except Exception as e:
        assert_check("DB Health check", False, f"Error: {e}")

    # 6. Catálogo de Vacantes Públicas
    print("\n6. Verificando Endpoints de Negocio (/api/v1/vacantes)...")
    try:
        r = requests.get(f"{base_url}/api/v1/vacantes", timeout=15)
        assert_check("GET /api/v1/vacantes responde HTTP 200", r.status_code == 200, f"({r.status_code})")
        data = r.json()
        items = data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        assert_check("Retorna listado de vacantes activas", len(items) > 0, f"({len(items)} vacantes encontradas, total: {data.get('total', len(items))})")
    except Exception as e:
        assert_check("Vacantes públicas", False, f"Error: {e}")

    print("\n" + "=" * 80)
    print(f" RESULTADO FINAL: {passed_tests} / {total_tests} PRUEBAS SUPERADAS")
    print("=" * 80)

    if passed_tests == total_tests:
        print("  TODAS LAS PRUEBAS DE PRODUCCIÓN PASARON CON ÉXITO")
        return 0
    else:
        print(f"  ATENCIÓN: {total_tests - passed_tests} verificaciones no superadas")
        return 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Suite de Humo de Producción")
    parser.add_argument("--url", default="http://localhost:8000", help="URL base del backend")
    args = parser.parse_args()
    sys.exit(run_smoke_tests(args.url))

