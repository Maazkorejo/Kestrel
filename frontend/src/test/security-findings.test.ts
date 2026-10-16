import { describe, expect, it } from 'vitest';
import { initialFiles, initialFindings, secureInference } from '@/components/ide/data';

describe('Vulnerability locations', () => {
  it('identifies the unsafe shell command rather than neighboring safe code', () => {
    const finding = initialFindings.find(f => f.cwe === 'CWE-78');
    expect(finding?.line).toBe(48);
    const code = initialFiles[finding?.file ?? '']?.split('\n')[(finding?.line ?? 0) - 1];
    expect(code).toContain('shell=True');
  });
  it('identifies the API key assignment', () => {
    const finding = initialFindings.find(f => f.cwe === 'CWE-798');
    expect(initialFiles[finding?.file ?? '']?.split('\n')[(finding?.line ?? 0) - 1]).toContain('API_KEY =');
  });
  it('identifies the weak hash call', () => {
    const finding = initialFindings.find(f => f.cwe === 'CWE-327');
    expect(initialFiles[finding?.file ?? '']?.split('\n')[(finding?.line ?? 0) - 1]).toContain('hashlib.md5');
  });
  it('the proposed patch removes shell interpretation and validates the address', () => {
    expect(secureInference).not.toContain('shell=True');
    expect(secureInference).toContain('ipaddress.ip_address(sample.source_ip)');
    expect(secureInference).toContain('shell=False, timeout=5');
  });
});
