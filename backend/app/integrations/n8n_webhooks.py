"""
Despachador Asíncrono de Webhooks hacia el Orquestador n8n.
Permite disparar correos transaccionales y notificaciones sin llamadas bloqueantes.
"""

from typing import Dict, Any, Optional
import httpx
from app.core.config import settings


class N8nWebhookDispatcher:
    @staticmethod
    async def dispatch_event(
        event_name: str,
        payload: Dict[str, Any]
    ) -> bool:
        """
        Envía un payload de evento hacia n8n en segundo plano.
        Eventos comunes:
          - 'empresa.registrada' (notifica SLA 72h)
          - 'empresa.subsanacion_requerida' (notifica motivo de rechazo de documento)
          - 'empresa.aprobada' (bienvenida y fin de cuarentena)
          - 'egresado.diploma_validado' (sello institucional otorgado)
        """
        if not settings.N8N_WEBHOOK_BASE_URL:
            # Modo desarrollo: Log silencioso
            return True

        url = f"{settings.N8N_WEBHOOK_BASE_URL}/{event_name}"
        headers = {
            "Content-Type": "application/json",
            "X-Vincula-Event": event_name,
        }
        if settings.N8N_WEBHOOK_SECRET:
            headers["Authorization"] = f"Bearer {settings.N8N_WEBHOOK_SECRET}"

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                return response.status_code in [200, 201, 202]
        except Exception:
            # Los fallos de webhook no deben quebrar la transacción web principal
            return False

