/**
 * Kestrel AI - Internal Git Source Control Client.
 */
import { request } from '../client';

export interface BackendGitStatusResponse {
  branch: string;
  is_repo: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export async function getGitStatus(): Promise<BackendGitStatusResponse> {
  return request<BackendGitStatusResponse>('/api/git/status');
}

export async function gitStage(path = ''): Promise<{ success: boolean; output: string }> {
  return request('/api/git/stage', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
}

export async function gitUnstage(path = ''): Promise<{ success: boolean; output: string }> {
  return request('/api/git/unstage', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
}

export async function gitCommit(message: string): Promise<{ success: boolean; output: string }> {
  return request('/api/git/commit', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function gitPush(): Promise<{ success: boolean; output: string }> {
  return request('/api/git/push', { method: 'POST' });
}

export async function gitPull(): Promise<{ success: boolean; output: string }> {
  return request('/api/git/pull', { method: 'POST' });
}
