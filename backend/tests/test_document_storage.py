import unittest
from unittest.mock import patch

from app.integrations.supabase_storage import SupabaseStorageService


class DocumentStorageTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_storage_never_returns_a_mock_document(self):
        with patch("app.integrations.supabase_storage.settings") as config:
            config.SUPABASE_URL = ""
            config.SUPABASE_SERVICE_ROLE_KEY = ""
            with self.assertRaises(RuntimeError):
                await SupabaseStorageService.upload_document_pdf("docs", b"%PDF-1.4\noriginal", "a.pdf")
            with self.assertRaises(RuntimeError):
                await SupabaseStorageService.create_signed_url("docs", "a.pdf")

    async def test_invalid_pdf_cannot_be_stored_as_a_document(self):
        with patch("app.integrations.supabase_storage.settings") as config:
            config.SUPABASE_URL = "https://example.supabase.co"
            config.SUPABASE_SERVICE_ROLE_KEY = "test"
            for content in (b"", b"not-a-pdf"):
                with self.subTest(content=content), self.assertRaises(ValueError):
                    await SupabaseStorageService.upload_document_pdf("docs", content, "a.pdf")


if __name__ == "__main__":
    unittest.main()
