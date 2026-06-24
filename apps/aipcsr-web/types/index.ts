export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  owner_id: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  repository_id: string;
  branch: string;
  commit_hash: string | null;
  status: ScanStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  // joined fields from API (add if backend supports)
  repository_name?: string;
  vulnerabilities_count?: number;
  severity?: SeverityLevel;
}

export interface Vulnerability {
  id: string;
  report_id: string;
  rule_id: string;
  message: string;
  file_path: string;
  line_number: number | null;
  severity: SeverityLevel;
  created_at: string;
  ai_analysis?: string;
  ai_patch?: string;
}

export interface Report {
  id: string;
  scan_id: string;
  vulnerabilities_count: number;
  severity: SeverityLevel;
  created_at: string;
  vulnerabilities?: Vulnerability[];
}

export interface DashboardStats {
  total_scans: number;
  scans_today: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  patched_percentage: number;
  repositories_count: number;
}
