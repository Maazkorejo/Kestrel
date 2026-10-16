/**
 * Kestrel AI - Internal CI/CD Pipeline Generator Client.
 */
import { request } from '../client';

export async function generateCicd(
  provider = 'github_actions'
): Promise<{ provider: string; filename: string; content: string; message: string }> {
  return request('/api/cicd/generate', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}
