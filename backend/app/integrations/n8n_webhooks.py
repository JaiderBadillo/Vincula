"""
Despachador Asíncrono de Webhooks hacia el Orquestador n8n.
Permite disparar correos transaccionales y notificaciones sin llamadas bloqueantes.
"""

from typing import Dict, Any, Optional
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger("vincula.n8n")


class N8nWebhookDispatcher:
    @staticmethod
    async def dispatch_event(
        event_name: str,
        payload: Dict[str, Any]
    ) -> bool:
        """
        Envía un payload de evento hacia n8n en segundo plano.
        Eventos comunes:
          - 'registro-egresado' (bienvenida y llamado a completar hoja de vida)
          - 'registro-empresa' (notificación de radicación y SLA 72h de cuarentena)
          - 'empresa.subsanacion_requerida' (notifica motivo de rechazo de documento)
          - 'empresa.aprobada' (bienvenida y fin de cuarentena)
        """
        if not settings.N8N_WEBHOOK_BASE_URL:
            logger.info(f"n8n Webhook simulado (sin URL configurada). Evento: {event_name}")
            return True

        base = settings.N8N_WEBHOOK_BASE_URL.rstrip('/')
        url = f"{base}/{event_name.lstrip('/')}"
        
        headers = {
            "Content-Type": "application/json",
            "X-Vincula-Event": event_name,
        }
        if settings.N8N_WEBHOOK_SECRET:
            headers["Authorization"] = f"Bearer {settings.N8N_WEBHOOK_SECRET}"

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                success = response.status_code in [200, 201, 202]
                if success:
                    logger.info(f"n8n Webhook despachado exitosamente: {event_name} -> {url}")
                else:
                    logger.warning(f"n8n Webhook respondió con código {response.status_code}: {response.text}")
                return success
        except Exception as e:
            # Los fallos de webhook no deben quebrar la transacción web principal
            logger.warning(f"Error despachando webhook n8n ({event_name}): {str(e)}")
            return False
