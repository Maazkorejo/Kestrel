/**
 * Kestrel AI - Internal Authentication & Accounts Client.
 */
import { request } from '../client';

export async function getCurrentUser(): Promise<any> {
  return request('/api/auth/me');
}

export async function loginUser(payload: {
  provider: string;
  email?: string | undefined;
  name?: string | undefined;
  role?: string | undefined;
}): Promise<{ status: string; user: any; token?: string }> {
  const res = await request<{ status: string; user: any; token?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token && typeof localStorage !== 'undefined') {
    localStorage.setItem('secstudio.auth_token', res.token);
    localStorage.removeItem('secstudio.guest_mode');
  }
  return res;
}

export async function loginWithCredentials(payload: {
  email: string;
  password: string;
  provider?: string | undefined;
}): Promise<{ status: string; user: any; token: string }> {
  const res = await request<{ status: string; user: any; token: string }>('/api/auth/login-credentials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token && typeof localStorage !== 'undefined') {
    localStorage.setItem('secstudio.auth_token', res.token);
    localStorage.removeItem('secstudio.guest_mode');
  }
  return res;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  name?: string | undefined;
  role?: string | undefined;
  provider?: string | undefined;
}): Promise<{ status: string; user: any; token: string }> {
  const res = await request<{ status: string; user: any; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token && typeof localStorage !== 'undefined') {
    localStorage.setItem('secstudio.auth_token', res.token);
    localStorage.removeItem('secstudio.guest_mode');
  }
  return res;
}

export async function continueAsGuest(): Promise<{ status: string; user: any }> {
  const res = await request<{ status: string; user: any }>('/api/auth/guest', {
    method: 'POST',
  });
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('secstudio.auth_token');
    localStorage.setItem('secstudio.guest_mode', 'true');
  }
  return res;
}

export async function logoutUser(): Promise<{ status: string; user: any }> {
  const res = await request<{ status: string; user: any }>('/api/auth/logout', { method: 'POST' });
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('secstudio.auth_token');
    localStorage.removeItem('secstudio.guest_mode');
  }
  return res;
}

export async function getSavedAccounts(): Promise<{ accounts: Array<{
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
  avatar_url?: string;
  provider: string;
  last_login: number;
}> }> {
  return request('/api/auth/saved-accounts');
}

export async function switchAccount(userId: string): Promise<{ status: string; user: any; token: string }> {
  const res = await request<{ status: string; user: any; token: string }>('/api/auth/switch-account', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
  if (res.token && typeof localStorage !== 'undefined') {
    localStorage.setItem('secstudio.auth_token', res.token);
    localStorage.removeItem('secstudio.guest_mode');
  }
  return res;
}

export async function getOAuthConfig(): Promise<{
  github_enabled: boolean;
  google_enabled: boolean;
  github_client_id: string;
  google_client_id: string;
}> {
  return request('/api/auth/oauth-config');
}

export async function saveOAuthConfig(payload: {
  google_client_id?: string;
  google_client_secret?: string;
  github_client_id?: string;
  github_client_secret?: string;
}): Promise<{
  github_enabled: boolean;
  google_enabled: boolean;
  github_client_id: string;
  google_client_id: string;
}> {
  return request('/api/auth/oauth-config/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAuthProviders(): Promise<{
  google: { enabled: boolean; client_id: string };
  github: { enabled: boolean; client_id: string };
}> {
  return request('/api/auth/providers');
}

export async function checkBackendHealth(): Promise<{ status: string; service: string; model: string }> {
  return request<{ status: string; service: string; model: string }>('/api/health');
}
