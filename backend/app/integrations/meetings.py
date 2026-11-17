"""Enlaces de reunión virtual para las entrevistas."""

import re
import secrets

JITSI_BASE = "https://meet.jit.si"
# Sin espacios ni caracteres que rompan HTML: el enlace viaja en el correo tal cual.
_URL = re.compile(r"https?://[^\s<>\"']+")


def generate_meeting_link() -> str:
    """Sala de Jitsi Meet con nombre aleatorio (96 bits): no requiere cuentas ni claves de API.

    shortcut: Jitsi público, sin anfitrión de Vincula; para Google Meet con la cuenta de cada
    reclutador habría que integrar su OAuth de Google Calendar.
    """
    return f"{JITSI_BASE}/Vincula-{secrets.token_urlsafe(12)}"


def is_valid_meeting_url(value: str) -> bool:
    return bool(value) and len(value) <= 300 and _URL.fullmatch(value) is not None
