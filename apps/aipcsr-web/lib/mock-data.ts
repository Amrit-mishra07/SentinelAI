import { Scan, Vulnerability, Report, Repository, SeverityLevel } from '../types';

export const mockRepositories: Repository[] = [
  { id: 'repo-1', name: 'auth-api', url: 'https://github.com/user/auth-api', owner_id: 'user-1', default_branch: 'main', created_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-24T10:00:00Z', last_scan_at: new Date().toISOString(), last_scan_severity: 'critical', total_vulnerabilities: 12 },
  { id: 'repo-2', name: 'frontend-web', url: 'https://github.com/user/frontend-web', owner_id: 'user-1', default_branch: 'main', created_at: '2026-06-02T10:00:00Z', updated_at: '2026-06-23T10:00:00Z', last_scan_at: new Date(Date.now() - 86400000).toISOString(), last_scan_severity: 'medium', total_vulnerabilities: 4 },
  { id: 'repo-3', name: 'payment-service', url: 'https://github.com/user/payment-service', owner_id: 'user-1', default_branch: 'master', created_at: '2026-06-03T10:00:00Z', updated_at: '2026-06-22T10:00:00Z', last_scan_at: new Date(Date.now() - 86400000 * 2).toISOString(), last_scan_severity: 'high', total_vulnerabilities: 8 },
  { id: 'repo-4', name: 'mobile-app', url: 'https://github.com/user/mobile-app', owner_id: 'user-1', default_branch: 'main', created_at: '2026-06-04T10:00:00Z', updated_at: '2026-06-21T10:00:00Z', last_scan_at: new Date(Date.now() - 86400000 * 3).toISOString(), last_scan_severity: 'low', total_vulnerabilities: 2 },
  { id: 'repo-5', name: 'docs-site', url: 'https://github.com/user/docs-site', owner_id: 'user-1', default_branch: 'main', created_at: '2026-06-05T10:00:00Z', updated_at: '2026-06-20T10:00:00Z', last_scan_at: new Date(Date.now() - 86400000 * 4).toISOString(), last_scan_severity: null, total_vulnerabilities: 0 },
];

export const mockScans: Scan[] = [
  { id: 'scan-1a2b3c4d', repository_id: 'repo-1', repository_name: 'auth-api', branch: 'main', commit_hash: 'a1b2c3d', status: 'scanning', created_at: new Date().toISOString(), started_at: new Date().toISOString(), completed_at: null, updated_at: new Date().toISOString() },
  { id: 'scan-2b3c4d5e', repository_id: 'repo-2', repository_name: 'frontend-web', branch: 'feat/new-ui', commit_hash: 'b2c3d4e', status: 'completed', created_at: new Date(Date.now() - 3600000).toISOString(), started_at: new Date(Date.now() - 3600000).toISOString(), completed_at: new Date(Date.now() - 3500000).toISOString(), updated_at: new Date(Date.now() - 3500000).toISOString(), vulnerabilities_count: 4, severity: 'medium' },
  { id: 'scan-3c4d5e6f', repository_id: 'repo-3', repository_name: 'payment-service', branch: 'master', commit_hash: 'c3d4e5f', status: 'failed', created_at: new Date(Date.now() - 86400000).toISOString(), started_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date(Date.now() - 86300000).toISOString(), updated_at: new Date(Date.now() - 86300000).toISOString(), error_message: 'Repository cloning timed out after 60 seconds.' },
  { id: 'scan-4d5e6f7g', repository_id: 'repo-4', repository_name: 'mobile-app', branch: 'main', commit_hash: 'd4e5f6g', status: 'pending', created_at: new Date(Date.now() - 10000).toISOString(), started_at: null, completed_at: null, updated_at: new Date(Date.now() - 10000).toISOString() },
  { id: 'scan-5e6f7g8h', repository_id: 'repo-1', repository_name: 'auth-api', branch: 'main', commit_hash: 'e5f6g7h', status: 'completed', created_at: new Date(Date.now() - 86400000 * 2).toISOString(), started_at: new Date(Date.now() - 86400000 * 2).toISOString(), completed_at: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(), updated_at: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(), vulnerabilities_count: 12, severity: 'critical' },
  { id: 'scan-6f7g8h9i', repository_id: 'repo-5', repository_name: 'docs-site', branch: 'main', commit_hash: 'f6g7h8i', status: 'completed', created_at: new Date(Date.now() - 86400000 * 4).toISOString(), started_at: new Date(Date.now() - 86400000 * 4).toISOString(), completed_at: new Date(Date.now() - 86400000 * 4 + 45000).toISOString(), updated_at: new Date(Date.now() - 86400000 * 4 + 45000).toISOString(), vulnerabilities_count: 0, severity: null },
];

export const mockDashboardData = {
  metrics: {
    total_vulnerabilities: 24,
    critical_count: 3,
    scans_today: 7,
    patched_percentage: 89,
    vs_yesterday: { total: 4, critical: 1, scans: -2, patched: 2 }
  },
  severity_distribution: {
    critical: 3,
    high: 8,
    medium: 9,
    low: 4
  },
  timeline: Array.from({ length: 30 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    
    // Generate some random looking data, with a spike recently
    let count = Math.floor(Math.random() * 8);
    let severity: SeverityLevel | null = null;
    
    if (count > 0) {
      const rand = Math.random();
      if (rand > 0.9) severity = 'critical';
      else if (rand > 0.6) severity = 'high';
      else if (rand > 0.3) severity = 'medium';
      else severity = 'low';
    } else if (i === 29) {
      // Ensure today has data
      count = 7;
      severity = 'critical';
    }
    
    return {
      date: date.toISOString(),
      count,
      severity
    };
  }),
  recent_ai_activity: [
    { time: new Date(Date.now() - 1000 * 60 * 2).toISOString(), file: 'db/queries.py:42', status: 'Patch generated', severity: 'critical' as SeverityLevel },
    { time: new Date(Date.now() - 1000 * 60 * 15).toISOString(), file: 'utils/auth.js:17', status: 'Patch generated', severity: 'high' as SeverityLevel },
    { time: new Date(Date.now() - 1000 * 60 * 98).toISOString(), file: 'components/Modal.tsx:88', status: 'Patch pending', severity: 'medium' as SeverityLevel },
    { time: new Date(Date.now() - 1000 * 60 * 140).toISOString(), file: 'api/routes.go:112', status: 'Patch applied', severity: 'low' as SeverityLevel },
  ]
};
