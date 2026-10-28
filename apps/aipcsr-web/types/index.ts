export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'
export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed'
export type PatchStatus = 'pending' | 'validating' | 'pr_opened' | 'failed' | 'applied' | 'rejected'

export interface User {
  id: string
  email: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Repository {
  id: string
  name: string
  url: string
  owner_id: string
  default_branch: string
  created_at: string
  updated_at: string
  last_scan_at?: string
  last_scan_severity?: SeverityLevel | null
  total_vulnerabilities?: number
}

export interface Scan {
  id: string
  repository_id: string
  repository_name?: string
  branch: string
  commit_hash: string | null
  status: ScanStatus
  stage?: string
  engine_results?: Record<string, EngineResult> | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
  vulnerabilities_count?: number
  severity?: SeverityLevel | null
  error_message?: string | null
}

export interface Vulnerability {
  id: string
  report_id: string
  rule_id: string
  message: string
  file_path: string
  line_number: number | null
  severity: SeverityLevel
  created_at: string
  scan_id?: string
  repository_name?: string
  ai_status?: string | null
  ai_provider?: string | null
  ai_error?: string | null
  validation?: unknown
  ai_analysis?: string | null
  ai_patch?: string | null
  patch_status?: PatchStatus
  pr_url?: string | null
  patch_error?: string | null
}

export interface Report {
  id: string
  scan_id: string
  vulnerabilities_count: number
  severity: SeverityLevel | null
  created_at: string
  status?: 'pending' | 'ready' | 'failed'
  error_message?: string | null
  pdf_ready?: boolean
  severity_counts?: SeverityCounts
  pagination?: { total: number; skip: number; limit: number }
  repository_name?: string
  vulnerabilities?: Vulnerability[]
}

export interface SeverityCounts {
  critical: number
  high: number
  medium: number
  low: number
}

export interface ApiError {
  status: number
  message: string
  detail?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

export interface EngineResult {
  status?: string
  error?: string | null
  findings_count?: number
  vulnerabilities?: unknown[]
}

export interface DashboardMetrics {
  metrics: { total_vulnerabilities: number; critical_count: number; scans_today: number; patched_percentage: number }
  trends?: { total_vulnerabilities: number; critical_count: number; scans_today: number; patched_percentage: number }
  severity_distribution: SeverityCounts
  timeline: { date: string; count: number; severity?: SeverityLevel | null }[]
}
