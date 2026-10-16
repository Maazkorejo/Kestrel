/**
 * Kestrel AI - Internal Project Search & Replace Client.
 */
import { request } from '../client';

export async function searchProject(
  query: string,
  options: { is_regex?: boolean; match_case?: boolean; match_whole_word?: boolean } = {}
): Promise<{
  query: string;
  total_matches: number;
  files_matched: number;
  results: Array<{
    file: string;
    matches: Array<{ line: number; column: number; text: string }>;
  }>;
}> {
  return request('/api/search/project', {
    method: 'POST',
    body: JSON.stringify({ query, ...options }),
  });
}

export async function replaceProject(
  query: string,
  replacement: string,
  options: { is_regex?: boolean; match_case?: boolean; match_whole_word?: boolean } = {}
): Promise<{ query: string; replacement: string; files_modified: number; replacements_count: number }> {
  return request('/api/search/replace-all', {
    method: 'POST',
    body: JSON.stringify({ query, replacement, ...options }),
  });
}
