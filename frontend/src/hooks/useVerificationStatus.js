import { useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService.js';

const API = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export function useVerificationStatus(enabled = true) {
  const [status, setStatus] = useState(null);
  const requestNumber = useRef(0);

  useEffect(() => {
    if (!enabled || !authService.getToken()) {
      setStatus(null);
      return undefined;
    }
    let active = true;
    async function refresh() {
      const currentRequest = ++requestNumber.current;
      try {
        const response = await fetch(`${API}/auth/estado-documental`, {
          headers: { Authorization: `Bearer ${authService.getToken()}` },
        });
        if (!response.ok) throw new Error('No se pudo confirmar el estado de verificación.');
        const result = await response.json();
        if (active && currentRequest === requestNumber.current) setStatus(result);
      } catch {
        if (active && currentRequest === requestNumber.current) setStatus(null);
      }
    }
    refresh();
    window.addEventListener('vincula:documentos-actualizados', refresh);
    return () => { active = false; requestNumber.current++; window.removeEventListener('vincula:documentos-actualizados', refresh); };
  }, [enabled]);

  return status;
}
