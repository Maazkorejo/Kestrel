/**
 * Kestrel AI - Internal Settings Client.
 */
import { request } from '../client';

export async function getCurrentSettings(): Promise<{
  model: string;
  nebius_key_masked: string;
  tavily_key_masked: string;
  llm_provider: string;
  ollama_url: string;
  ollama_model: string;
  offline_mode: boolean;
  active_workspace: string;
}> {
  return request('/api/settings/current');
}

export async function saveSettings(payload: Record<string, any>): Promise<{ status: string; message: string }> {
  return request('/api/settings/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
