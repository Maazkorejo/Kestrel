/**
 * Kestrel AI - HTTP API Client Base.
 * Manages API_BASE URL discovery, authentication headers, error unpacking, and JSON requests.
 */

export const API_BASE = 
  typeof window !== 'undefined' && window.location.port === '8000'
    ? window.location.origin
    : 'http://127.0.0.1:8000';

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('secstudio.auth_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API ${path} failed (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorMsg = errJson.detail;
      else if (errJson.message) errorMsg = errJson.message;
    } catch {
      const errorBody = await response.text();
      if (errorBody) errorMsg = errorBody;
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
