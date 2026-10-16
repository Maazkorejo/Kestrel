/**
 * Kestrel AI - External AI Reasoning & Specialist Client.
 */
import { request } from '../client';

export interface BackendAskAiResponse {
  answer: string;
  is_guarded: boolean;
  relevant_cwe: string;
  suggested_fix?: string | null;
}

export async function askAi(payload: {
  question: string;
  code?: string;
  filename?: string;
  finding_title?: string;
  cwe_id?: string;
  code_snippet?: string;
  line_number?: number;
}): Promise<BackendAskAiResponse> {
  return request<BackendAskAiResponse>('/api/ai/ask', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
