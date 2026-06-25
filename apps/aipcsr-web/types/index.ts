export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'
export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed'
export type PatchStatus = 'pending' | 'applied' | 'rejected'

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
  ai_analysis?: string | null
  ai_patch?: string | null
  patch_status?: PatchStatus
}

export interface Report {
  id: string
  scan_id: string
  vulnerabilities_count: number
  severity: SeverityLevel | null
  created_at: string
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
