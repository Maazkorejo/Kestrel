/**
 * Kestrel AI - Internal Cyber Terminal Client.
 */
import { request } from '../client';

export async function executeTerminalCommand(
  command: string,
  active_filename = 'sample.py',
  active_code = ''
): Promise<{ output: string; exit_code: number }> {
  return request('/api/terminal/exec', {
    method: 'POST',
    body: JSON.stringify({ command, active_filename, active_code }),
  });
}
