/**
 * Kestrel AI - External Threat Modeling Client.
 */
import { request } from '../client';

export interface BackendThreatModelGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: 'source' | 'sanitizer' | 'sink';
    line?: number;
    code?: string;
    cwe?: string;
    compromised?: boolean;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
    compromised?: boolean;
  }>;
  summary: string;
}

export async function getThreatModelGraph(
  code: string,
  filename = 'sample.py'
): Promise<BackendThreatModelGraph> {
  return request<BackendThreatModelGraph>('/api/threat-model/graph', {
    method: 'POST',
    body: JSON.stringify({ code, filename }),
  });
}
