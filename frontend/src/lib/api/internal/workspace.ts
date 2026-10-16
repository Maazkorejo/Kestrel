/**
 * Kestrel AI - Internal Workspace & File System Client.
 */
import { request } from '../client';

export interface BackendFileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  extension?: string;
  children?: BackendFileNode[];
}

export interface BackendWorkspaceTreeResponse {
  root_path: string;
  root_name: string;
  tree: BackendFileNode[];
}

export async function getWorkspaceTree(): Promise<BackendWorkspaceTreeResponse> {
  return request<BackendWorkspaceTreeResponse>('/api/workspace/tree');
}

export async function openWorkspaceFolder(folder_path: string): Promise<BackendWorkspaceTreeResponse> {
  return request<BackendWorkspaceTreeResponse>('/api/workspace/open', {
    method: 'POST',
    body: JSON.stringify({ folder_path }),
  });
}

export async function getSystemDirectories(): Promise<{
  home: string;
  desktop: string;
  downloads: string;
  documents: string;
}> {
  return request('/api/workspace/system-directories');
}

export async function readWorkspaceFile(path: string): Promise<{
  path: string;
  content: string;
  size: number;
  language: string;
}> {
  return request('/api/workspace/read', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
}

export async function writeWorkspaceFile(
  path: string,
  content: string
): Promise<{ success: boolean; path: string; bytes_written: number; message: string }> {
  return request('/api/workspace/write', {
    method: 'POST',
    body: JSON.stringify({ path, content }),
  });
}

export async function createWorkspaceNode(
  path: string,
  is_dir = false,
  content = ''
): Promise<{ success: boolean; path: string }> {
  return request('/api/workspace/create', {
    method: 'POST',
    body: JSON.stringify({ path, is_dir, content }),
  });
}

export async function getAuditHistory(): Promise<
  Array<{ id?: number; timestamp: string; files_scanned: number; total_findings: number }>
> {
  return request('/api/workspace/history');
}

export async function clearCache(): Promise<{ status: string; message: string }> {
  return request('/api/workspace/clear-cache', { method: 'POST' });
}
