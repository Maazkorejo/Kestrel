/**
 * Kestrel AI - Extensions API Client.
 * Queries live Open VSX Registry and manages IDE extension state.
 */
import { request } from '../client';

export interface ExtensionItem {
  id: string;
  name: string;
  namespace?: string;
  author: string;
  description: string;
  version: string;
  downloads: string;
  rating: string;
  installed: boolean;
  icon: string;
  category: string;
}

export async function searchExtensions(
  query: string = '',
  category: string = '',
  size: number = 30
): Promise<{ results: ExtensionItem[]; total: number }> {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (category) params.append('category', category);
  params.append('size', String(size));

  return request<{ results: ExtensionItem[]; total: number }>(`/api/extensions/search?${params.toString()}`);
}

export async function getInstalledExtensions(): Promise<{ installed: any[]; total: number }> {
  return request<{ installed: any[]; total: number }>('/api/extensions/installed');
}

export async function installExtension(extension: ExtensionItem): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>('/api/extensions/install', {
    method: 'POST',
    body: JSON.stringify(extension),
  });
}

export async function uninstallExtension(id: string): Promise<{ status: string; message: string }> {
  return request<{ status: string; message: string }>('/api/extensions/uninstall', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}
