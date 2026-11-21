export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  status: "active" | "suspended" | "pending";
  platform_role: "USER" | "MODERATOR" | "SUPER_ADMIN" | "DEVELOPER";
  email_verified_at: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived";
  created_at: string;
  role?: string;
}

export interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";
  status: string;
  joined_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export interface AuthorizationRequest {
  id: string;
  organization_id: string | null;
  requested_by?: string;
  company_name: string;
  employee_name: string;
  contact_email: string;
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "info_requested"
    | "approved"
    | "rejected"
    | "expired"
    | "revoked";
  requested_scope: {
    domains: string[];
    allow_subdomains: boolean;
    categories: string[];
  };
  requested_start_at: string;
  requested_expiry_at: string;
  ai_extraction_status: string;
  ai_extracted_fields?: Record<string, any>;
  ai_flags?: Array<{ type: string; message: string }>;
  moderator_id: string | null;
  moderator_decision_at: string | null;
  moderator_reason: string | null;
  created_at: string;
}

export interface ApprovedAsset {
  id: string;
  organization_id: string | null;
  canonical_host: string;
  scope_type: "exact_host" | "wildcard_subdomains";
  permitted_categories: string[];
  valid_from: string;
  expires_at: string;
  status: "active" | "revoked" | "expired";
  created_at: string;
  revoked_at?: string | null;
}

export type ScanStatus =
  | "draft"
  | "validating"
  | "queued"
  | "provisioning"
  | "running"
  | "stopping"
  | "completed"
  | "partial"
  | "cancelled"
  | "failed"
  | "rejected";

export interface Scan {
  id: string;
  organization_id: string | null;
  requested_by: string;
  approved_asset_id: string;
  target_url: string;
  resolved_ip: string | null;
  preset: "normal" | "moderate" | "ultimate";
  status: ScanStatus;
  budget_seconds_snapshot: number;
  started_at: string | null;
  finished_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  finding_count: number;
  has_report: boolean;
}

export interface ScanEvent {
  id: string;
  scan_id: string;
  sequence_number: number;
  event_type: string;
  severity: "info" | "low" | "medium" | "high" | "critical" | "warning";
  message: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface Finding {
  id: string;
  scan_id: string;
  finding_key: string;
  title: string;
  category: string;
  severity: "informational" | "low" | "medium" | "high" | "critical";
  confidence: "confirmed" | "likely" | "unconfirmed" | "informational";
  status: string;
  affected_asset: string;
  description: string;
  impact: string;
  remediation: string;
  references?: string[];
  evidence_ids?: string[];
  created_at: string;
}

export interface Evidence {
  id: string;
  scan_id: string;
  check_run_id: string | null;
  evidence_type: string;
  normalized_data: Record<string, any>;
  source: string;
  confidence: number;
  content_hash: string;
  observed_at: string;
}

export interface CheckRun {
  id: string;
  scan_id: string;
  capability_id: string;
  status: "pending" | "running" | "success" | "failed" | "timed_out" | "skipped";
  started_at: string | null;
  finished_at: string | null;
  exit_code: number | null;
  output_summary: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  scan_id: string;
  status: "draft" | "generating" | "completed" | "partial" | "failed";
  format: string;
  storage_path: string | null;
  generated_at: string;
}

export interface SeverityDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
}

export interface TrendPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
}

export interface AttentionFinding {
  id: string;
  scan_id: string;
  target_url: string;
  title: string;
  severity: Finding["severity"];
  confidence: Finding["confidence"];
  affected_asset: string;
  created_at: string;
}

export interface RecentScan {
  id: string;
  target_url: string;
  preset: string;
  status: ScanStatus;
  budget_seconds_snapshot: number;
  created_at: string;
  finished_at: string | null;
  finding_count: number;
}

export interface PostureSummary {
  score: number | null;
  label: string;
  scan_id: string | null;
  scan_date: string | null;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DashboardSummary {
  organization_id: string | null;
  organization_name: string | null;
  active_scans: number;
  completed_scans: number;
  total_scans: number;
  approved_assets: number;
  pending_authorizations: number;
  total_findings: number;
  severity_distribution: SeverityDistribution;
  scan_trend: TrendPoint[];
  posture: PostureSummary;
  needs_attention: AttentionFinding[];
  recent_scans: RecentScan[];
  generated_at: string;
}

export interface PolicyCheck {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn" | "skip";
  detail: string;
}

export interface PolicySimulation {
  allowed: boolean;
  target_url: string;
  canonical_host: string | null;
  resolved_ip: string | null;
  matched_asset_id: string | null;
  authorization_id: string | null;
  organization_id: string | null;
  scope_type: string | null;
  expires_at: string | null;
  checks: PolicyCheck[];
  error_code: string | null;
  error_message: string | null;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | string;
  database_connected: boolean;
  database_latency_ms: number | null;
  ai_primary_provider: string;
  ai_fallback_provider: string;
  ai_primary_configured: boolean;
  ai_fallback_configured: boolean;
  worker_concurrency_limit: number;
  active_environment: string;
  execution_mode: string;
  queued_scans: number;
  active_scans: number;
  worker_instances: number;
}

export interface PresetPolicy {
  budget_seconds: number;
  max_concurrency: number;
}

export interface PresetPolicies {
  presets: Record<string, PresetPolicy>;
  max_worker_concurrency: number;
  default_timeout_seconds: number;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor_id: string | null;
  organization_id: string | null;
  resource_type: string;
  resource_id: string;
  decision: string | null;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}
