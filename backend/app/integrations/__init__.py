"""
Integraciones Externas - Supabase Storage y Webhooks n8n.
"""
from app.integrations.supabase_storage import SupabaseStorageService
from app.integrations.n8n_webhooks import N8nWebhookDispatcher

__all__ = ["SupabaseStorageService", "N8nWebhookDispatcher"]

