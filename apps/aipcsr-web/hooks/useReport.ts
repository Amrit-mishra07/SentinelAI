import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Report } from '@/types';

export function useReport(scanId: string) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      const data = await apiClient.get<Report>(`/reports/${scanId}`);
      setReport(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report');
      // Mock for dev
      setReport({
        id: 'rep-1', scan_id: scanId, vulnerabilities_count: 2, severity: 'high', created_at: new Date().toISOString(),
        vulnerabilities: [
          { id: 'v1', report_id: 'rep-1', rule_id: 'B101', message: 'Use of assert detected.', file_path: 'core/auth.py', line_number: 45, severity: 'medium', created_at: new Date().toISOString() },
          { id: 'v2', report_id: 'rep-1', rule_id: 'B501', message: 'Request with verify=False.', file_path: 'core/http.py', line_number: 12, severity: 'high', created_at: new Date().toISOString(), ai_analysis: 'The SSL verification is disabled, which makes the connection vulnerable to MITM attacks. Attackers on the same network can intercept and manipulate the traffic.', ai_patch: 'requests.get(url, verify=True)' },
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}
