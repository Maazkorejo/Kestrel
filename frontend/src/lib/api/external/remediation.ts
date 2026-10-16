/**
 * Kestrel AI - External AI Patch Remediation Client.
 */
import { request } from '../client';
import type { BackendFinding } from '../internal/scanner';

export interface BackendRemediationResult {
  finding_id: string;
  root_cause: string;
  exploit_scenario: string;
  patch_summary: string;
  diff: string;
  patched_full_code: string;
}

export async function remediateFinding(payload: {
  filename: string;
  language: string;
  code: string;
  finding: BackendFinding;
  threat_intel?: any;
}): Promise<BackendRemediationResult> {
  return request<BackendRemediationResult>('/api/remediate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
