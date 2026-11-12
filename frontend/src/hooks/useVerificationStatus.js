import { useEffect, useState } from 'react';
import { authService } from '../services/authService.js';

const API = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export function useVerificationStatus(enabled = true) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!enabled || !authService.getToken()) return undefined;
    let active = true;
    async function refresh() {
      try {
        const response = await fetch(`${API}/auth/estado-documental`, {
          headers: { Authorization: `Bearer ${authService.getToken()}` },
        });
        if (response.ok && active) setStatus(await response.json());
      } catch { /* Se conserva el enlace cuando no se puede verificar el estado. */ }
    }
    refresh();
    window.addEventListener('vincula:documentos-actualizados', refresh);
    return () => { active = false; window.removeEventListener('vincula:documentos-actualizados', refresh); };
  }, [enabled]);

  return status;
}
