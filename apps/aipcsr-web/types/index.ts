export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Scan {
  id: string;
  repository: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  created_at: string;
}

export interface Report {
  id: string;
  scan_id: string;
  vulnerabilities_count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}
