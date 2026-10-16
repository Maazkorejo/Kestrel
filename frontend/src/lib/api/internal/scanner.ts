/**
 * Kestrel AI - Internal AST Security Scanner Client.
 */
import { request } from '../client';
import type { BackendThreatRecord } from '../external/intel';
import type { BackendRemediationResult } from '../external/remediation';

export interface BackendFinding {
  id: string;
  rule_id: string;
  title: string;
  description: string;
  cwe_id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  line_start: number;
  line_end: number;
  code_snippet: string;
  scanner: string;
  architectural_role?: string;
  enclosing_function?: string;
}

export interface BackendScanResponse {
  code_hash: string;
  total_findings: number;
  severities: Record<string, number>;
  findings: BackendFinding[];
}

export async function scanStatic(
  code: string,
  filename = 'sample.py',
  language = 'python'
): Promise<BackendScanResponse> {
  return request<BackendScanResponse>('/api/scan/static', {
    method: 'POST',
    body: JSON.stringify({ code, filename, language }),
  });
}

export async function scanFull(
  code: string,
  filename = 'sample.py',
  language = 'python'
): Promise<{
  scan: BackendScanResponse;
  threat_intel: Record<string, BackendThreatRecord | null>;
  remediation: Record<string, BackendRemediationResult | null>;
}> {
  return request('/api/scan/full', {
    method: 'POST',
    body: JSON.stringify({ code, filename, language }),
  });
}

export async function scanWorkspace(): Promise<{
  workspace_path: string;
  total_files_scanned: number;
  total_findings: number;
  health_score: number;
  severities: Record<string, number>;
  findings_by_file: Record<string, BackendFinding[]>;
  dependency_vulnerabilities: any[];
  top_cwe_distribution: Record<string, number>;
}> {
  return request('/api/scan/workspace', { method: 'POST' });
}

export async function exportSarifReport(findings?: any[]): Promise<any> {
  return request('/api/export/sarif', {
    method: 'POST',
    body: JSON.stringify({ findings }),
  });
}
