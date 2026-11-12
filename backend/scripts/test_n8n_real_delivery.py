"""
Script de Prueba de Entrega Real para Notificaciones Transaccionales n8n.
Uso:
  python backend/scripts/test_n8n_real_delivery.py --email destino@ejemplo.com --tipo registro_egresado
"""

import sys
import os
import argparse
import asyncio
from dotenv import load_dotenv

# Cargar entorno de backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

# Agregar backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.integrations.transactional_notifications import send_vincula_email


async def main():
    parser = argparse.ArgumentParser(description="Prueba de entrega real n8n")
    parser.add_argument("--email", required=True, help="Correo destinatario de prueba")
    parser.add_argument("--tipo", default="registro_egresado", 
                        choices=["registro_egresado", "registro_empresa", "registro_ies", 
                                 "egresado_verificado", "empresa_aprobada", "ies_aprobada", "fase_postulacion"],
                        help="Tipo de correo a probar")
    args = parser.parse_args()

    print("\n" + "="*60)
    print(" VINCULA - PRUEBA DE ENTREGA REAL DE CORREOS TRANSACCIONALES")
    print("="*60)
    print(f"URL Base n8n: {settings.N8N_WEBHOOK_BASE_URL or '[NO CONFIGURADA]'}")
    print(f"Webhook Secret: {'[CONFIGURADO]' if settings.N8N_WEBHOOK_SECRET else '[NO CONFIGURADO]'}")
    print(f"Destinatario:   {args.email}")
    print(f"Tipo de correo: {args.tipo}")
    print("-" * 60)

    if not settings.N8N_WEBHOOK_BASE_URL or not settings.N8N_WEBHOOK_SECRET:
        print("\n[ERROR] Debes configurar N8N_WEBHOOK_BASE_URL y N8N_WEBHOOK_SECRET en backend/.env antes de probar.")
        sys.exit(1)

    print("\nDespachando evento hacia n8n...")
    
    # Datos de prueba según el tipo
    test_payloads = {
        "registro_egresado": {"nombre": "Juan David Pabón", "carrera": "Ingeniería de Sistemas"},
        "registro_empresa": {"empresa": "Tech Solutions SAS", "radicado": "RAD-EMP-2026-TEST01"},
        "registro_ies": {"institucion": "Unidades Tecnológicas de Santander", "radicado": "RAD-IES-2026-TEST01"},
        "egresado_verificado": {"nombre": "Juan David Pabón", "institucion": "UTS", "programa": "Ingeniería de Sistemas", "acta": "ACTA-2026-999"},
        "empresa_aprobada": {"empresa": "Tech Solutions SAS"},
        "ies_aprobada": {"institucion": "Unidades Tecnológicas de Santander"},
        "fase_postulacion": {"nombre": "Juan David", "vacante": "Desarrollador Full Stack", "empresa": "Tech Solutions SAS", "fase_nueva": "entrevista"},
    }

    extra_data = test_payloads.get(args.tipo, {})
    success = await send_vincula_email(args.tipo, args.email, **extra_data)

    if success:
        print("\n [ÉXITO] n8n aceptó y confirmó el envío del correo.")
        print(f"Revisa ahora la bandeja de entrada (y spam) de {args.email} y el historial de ejecuciones en n8n.")
    else:
        print("\n [FALLO] n8n no confirmó el correo. Revisa los logs o que el workflow esté activo con Gmail OAuth.")


if __name__ == "__main__":
    asyncio.run(main())

