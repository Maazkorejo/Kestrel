/**
 * Kestrel AI - External Threat Intelligence Client.
 */
import { request } from '../client';

export interface BackendThreatRecord {
  cve_id?: string;
  title: string;
  source_url: string;
  published_date?: string;
  summary: string;
  cvss_score?: number;
  mitigation?: string;
}

export async function fetchThreatIntel(
  cwe_id: string,
  keyword = ''
): Promise<{ query: string; records: BackendThreatRecord[] }> {
  return request('/api/intel/cve', {
    method: 'POST',
    body: JSON.stringify({ cwe_id, keyword }),
  });
}
