"""
Conector con Supabase Storage (Almacenamiento S3 de Documentos Oficiales en PDF).
Gestiona buckets:
- 'vincula-documentos-auditoria': PDFs corporativos e institucionales (RUT, Cámara de Comercio, SNIES, Actas)
- 'vincula-diplomas-validados': Diplomas oficiales y actas de grado de egresados.
"""

from typing import Dict, Any, Optional
import httpx
from app.core.config import settings


class SupabaseStorageService:
    @staticmethod
    def get_public_url(bucket_name: str, file_path: str) -> str:
        """
        Genera la URL pública estándar para un objeto del bucket.
        """
        clean_path = file_path.lstrip("/")
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{clean_path}"

    @staticmethod
    async def create_signed_url(bucket_name: str, file_path: str, expires_in: int = 3600) -> str:
        """
        Genera una URL firmada temporal de descarga protegida para documentos de auditoría (Super Admin).
        Vigencia por defecto: 1 hora (3600s).
        """
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return f"/storage/mock/signed/{bucket_name}/{file_path}?token=mock_dev"

        clean_path = file_path.lstrip("/")
        url = f"{settings.SUPABASE_URL}/storage/v1/object/sign/{bucket_name}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json={"expiresIn": expires_in})
                if res.status_code == 200:
                    signed_path = res.json().get("signedURL", "")
                    return f"{settings.SUPABASE_URL}{signed_path}"
                else:
                    return SupabaseStorageService.get_public_url(bucket_name, file_path)
        except Exception:
            return SupabaseStorageService.get_public_url(bucket_name, file_path)

    @staticmethod
    async def upload_document_pdf(
        bucket_name: str,
        file_bytes: bytes,
        destination_path: str,
        content_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """
        Sube un PDF a Supabase Storage con sobrescritura automática (upsert=true).
        """
        clean_path = destination_path.lstrip("/")

        # Modo de contingencia local si faltaran credenciales
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return {
                "success": True,
                "simulated": True,
                "bucket": bucket_name,
                "path": clean_path,
                "url": f"/storage/local-mock/{bucket_name}/{clean_path}",
                "size_bytes": len(file_bytes)
            }

        url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket_name}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": content_type,
            "x-upsert": "true"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=headers, content=file_bytes)
            if res.status_code not in (200, 201):
                raise RuntimeError(
                    f"Error al subir archivo a Supabase Storage [{res.status_code}]: {res.text}"
                )

        public_url = SupabaseStorageService.get_public_url(bucket_name, clean_path)

        return {
            "success": True,
            "simulated": False,
            "bucket": bucket_name,
            "path": clean_path,
            "url": public_url,
            "size_bytes": len(file_bytes)
        }

    @staticmethod
    async def delete_document(bucket_name: str, file_path: str) -> bool:
        """
        Elimina un documento de Supabase Storage.
        """
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return True

        clean_path = file_path.lstrip("/")
        url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket_name}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.request("DELETE", url, headers=headers, json={"prefixes": [clean_path]})
                return res.status_code == 200
        except Exception:
            return False
