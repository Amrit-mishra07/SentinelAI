import { Vulnerability } from '../types';

export const mockVulnerabilities: Vulnerability[] = [
  { id: 'v1', report_id: 'rep-1', rule_id: 'B101', message: 'Use of assert detected.', file_path: 'core/auth.py', line_number: 45, severity: 'medium', created_at: new Date().toISOString(), patch_status: 'pending' },
  { id: 'v2', report_id: 'rep-1', rule_id: 'B501', message: 'Request with verify=False.', file_path: 'core/http.py', line_number: 12, severity: 'high', created_at: new Date().toISOString(), ai_analysis: 'The SSL verification is disabled, which makes the connection vulnerable to MITM attacks.', ai_patch: 'requests.get(url, verify=True)', patch_status: 'applied' },
  { id: 'v3', report_id: 'rep-1', rule_id: 'B303', message: 'Use of insecure MD5 hash function.', file_path: 'utils/crypto.py', line_number: 88, severity: 'medium', created_at: new Date(Date.now() - 86400000).toISOString(), patch_status: 'rejected' }
];
