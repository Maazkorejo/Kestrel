/**
 * Kestrel AI - Internal Exploit Sandbox & Attack Simulator Client.
 */
import { request } from '../client';

export interface BackendSandboxResult {
  engine: string;
  isolated: boolean;
  vulnerable_run: {
    status: string;
    exit_code: number;
    stdout: string;
    stderr: string;
    exploit_success: boolean;
    duration_ms: number;
  };
  patched_run: {
    status: string;
    exit_code: number;
    stdout: string;
    stderr: string;
    exploit_mitigated: boolean;
    duration_ms: number;
  };
  mitigation_verified: boolean;
  summary: string;
}

export interface BackendAttackScenario {
  id: string;
  name: string;
  cwe: string;
  category: string;
  description: string;
  default_vector: string;
  alt_vectors: string[];
  vulnerability_sink: string;
  indicator: string;
  mitigation?: string;
}

export interface BackendSimulatorRunResponse {
  scenario_id: string;
  scenario_name: string;
  cwe: string;
  verdict: 'VULNERABLE' | 'DEFENDED' | 'TIMEOUT';
  isolated: boolean;
  isolation_engine: string;
  target_function: string;
  payload_injected: string;
  sink_identified?: string | null;
  exit_code: number;
  stdout: string;
  stderr: string;
  elapsed_ms: number;
  exploit_succeeded: boolean;
  message: string;
  suggested_mitigation?: string | null;
}

export async function getSandboxStatus(): Promise<{
  docker_available: boolean;
  engine: string;
  description: string;
}> {
  return request('/api/sandbox/status');
}

export async function simulateSandbox(
  vulnerable_code: string,
  patched_code: string,
  filename = 'sample.py'
): Promise<BackendSandboxResult> {
  return request<BackendSandboxResult>('/api/sandbox/simulate', {
    method: 'POST',
    body: JSON.stringify({ vulnerable_code, patched_code, filename }),
  });
}

export async function getAttackScenarios(): Promise<BackendAttackScenario[]> {
  return request<BackendAttackScenario[]>('/api/simulator/scenarios');
}

export async function simulateCustomAttack(payload: {
  code: string;
  filename?: string;
  scenario_id: string;
  custom_vector?: string;
  function_name?: string;
  force_sandbox?: string;
}): Promise<BackendSimulatorRunResponse> {
  return request<BackendSimulatorRunResponse>('/api/simulator/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
