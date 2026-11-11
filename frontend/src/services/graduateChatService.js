import { authService, extractErrorMessage } from './authService.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request(path, body, signal) {
  const form = body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}/ia/chat${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authService.getToken()}`,
      ...(!form ? { 'Content-Type': 'application/json' } : {}),
    },
    body: form ? body : JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, 'No pudimos completar la consulta. Intenta nuevamente.'));
  }
  return data;
}

export const graduateChatService = {
  send(payload, signal) {
    return request('', payload, signal);
  },
  readDocument(file, signal) {
    const form = new FormData();
    form.append('file', file);
    return request('/documento', form, signal);
  },
};
