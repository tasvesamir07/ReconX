import { AuthorizationRequest, ApprovedAsset, Scan, Finding } from "@/types";

export const DEMO_AUTHORIZATION_REQUESTS: AuthorizationRequest[] = [
  {
    id: "auth-demo-01",
    organization_id: "org-acme-defense",
    company_name: "Acme Cyber Defense Corp",
    employee_name: "Md. Tasve Al Samir",
    contact_email: "samir@acmedefense.com",
    status: "approved",
    requested_scope: {
      domains: ["acmedefense.com", "api.acmedefense.internal", "auth.acme-corp.com"],
      allow_subdomains: true,
      categories: ["api", "web", "network", "tls"],
    },
    requested_start_at: "2026-11-20T00:00:00Z",
    requested_expiry_at: "2027-11-20T23:59:59Z",
    ai_extraction_status: "verified",
    ai_extracted_fields: {
      loa_signed_by: "Md. Tasve Al Samir, Chief Security Analyst",
      signer_authority: "Executive Security Director",
      authorized_cidrs: ["198.51.100.0/24", "10.0.0.0/16"],
      rate_limit_policy: "50 requests/sec non-destructive",
    },
    moderator_id: "mod-sys-01",
    moderator_decision_at: "2026-11-20T10:15:00Z",
    moderator_reason:
      "LOA-2026-94812 cryptographically verified. DNS TXT record validated (reconx-verification=sha256:4a8b9914c6e...). Dual-signatory compliance satisfied.",
    created_at: "2026-11-20T09:45:00Z",
  },
  {
    id: "auth-demo-02",
    organization_id: "org-acme-defense",
    company_name: "FinTech Settlement Mesh",
    employee_name: "Dr. Elena Rostova",
    contact_email: "elena.rostova@acmepayments.net",
    status: "approved",
    requested_scope: {
      domains: ["staging-mesh.acmedefense.internal", "pay.acmepayments.net"],
      allow_subdomains: false,
      categories: ["api", "cloud", "envoy"],
    },
    requested_start_at: "2026-11-21T00:00:00Z",
    requested_expiry_at: "2027-05-21T23:59:59Z",
    ai_extraction_status: "verified",
    ai_extracted_fields: {
      loa_signed_by: "Dr. Elena Rostova, VP Infrastructure Security",
      signer_authority: "Corporate VP",
      authorized_cidrs: ["10.0.98.0/24"],
      rate_limit_policy: "25 requests/sec",
    },
    moderator_id: "mod-sys-01",
    moderator_decision_at: "2026-11-21T14:30:00Z",
    moderator_reason:
      "SOC2 Type II Letter of Authorization verified. Testing restricted to staging gateway environments.",
    created_at: "2026-11-21T12:00:00Z",
  },
  {
    id: "auth-demo-03",
    organization_id: "org-acme-defense",
    company_name: "Global Edge CDN & VPN Hub",
    employee_name: "Marcus Vance",
    contact_email: "ops@acmedefense.com",
    status: "under_review",
    requested_scope: {
      domains: ["vpn-gateway.acmedefense.com", "edge-waf.acmedefense.net"],
      allow_subdomains: true,
      categories: ["network", "vpn", "waf"],
    },
    requested_start_at: "2026-11-23T00:00:00Z",
    requested_expiry_at: "2027-11-23T23:59:59Z",
    ai_extraction_status: "processing",
    ai_extracted_fields: {
      loa_signed_by: "Marcus Vance, Lead Site Reliability Engineer",
      signer_authority: "Operations Lead",
      rate_limit_policy: "Under Review by Compliance Officer",
    },
    moderator_id: null,
    moderator_decision_at: null,
    moderator_reason: null,
    created_at: "2026-11-23T08:15:00Z",
  },
];

export const DEMO_APPROVED_ASSETS: ApprovedAsset[] = [
  {
    id: "asset-demo-01",
    organization_id: "org-acme-defense",
    canonical_host: "api.acmedefense.internal",
    scope_type: "exact_host",
    permitted_categories: ["api", "web", "port-443", "graphql", "oauth2"],
    valid_from: "2026-11-20T10:15:00Z",
    expires_at: "2027-11-20T23:59:59Z",
    status: "active",
    created_at: "2026-11-20T10:15:00Z",
  },
  {
    id: "asset-demo-02",
    organization_id: "org-acme-defense",
    canonical_host: "auth.acme-corp.com",
    scope_type: "exact_host",
    permitted_categories: ["oidc", "saml2", "web", "port-443", "session-mgmt"],
    valid_from: "2026-11-20T10:15:00Z",
    expires_at: "2027-11-20T23:59:59Z",
    status: "active",
    created_at: "2026-11-20T10:15:00Z",
  },
  {
    id: "asset-demo-03",
    organization_id: "org-acme-defense",
    canonical_host: "*.acmedefense.com",
    scope_type: "wildcard_subdomains",
    permitted_categories: ["subdomains", "dns", "tls", "reconnaissance"],
    valid_from: "2026-11-20T10:15:00Z",
    expires_at: "2027-11-20T23:59:59Z",
    status: "active",
    created_at: "2026-11-20T10:15:00Z",
  },
  {
    id: "asset-demo-04",
    organization_id: "org-acme-defense",
    canonical_host: "staging-mesh.acmedefense.internal",
    scope_type: "exact_host",
    permitted_categories: ["k8s-ingress", "envoy", "rest", "internal-mesh"],
    valid_from: "2026-11-21T14:30:00Z",
    expires_at: "2027-05-21T23:59:59Z",
    status: "active",
    created_at: "2026-11-21T14:30:00Z",
  },
];

export const DEMO_SCANS: Scan[] = [
  {
    id: "scan-demo-01",
    organization_id: "org-acme-defense",
    requested_by: "Md. Tasve Al Samir",
    approved_asset_id: "asset-demo-01",
    target_url: "https://api.acmedefense.internal",
    resolved_ip: "10.0.42.18",
    preset: "ultimate",
    status: "running",
    budget_seconds_snapshot: 300,
    started_at: new Date(Date.now() - 145000).toISOString(),
    finished_at: null,
    cancelled_at: null,
    created_at: new Date(Date.now() - 150000).toISOString(),
    finding_count: 4,
    has_report: true,
    executive_summary: {
      source: "ai",
      provider: "ReconX Deterministic Audit Core",
      paragraphs: [
        {
          text: "Active automated reconnaissance against api.acmedefense.internal identified multiple endpoint misconfigurations including Broken Object Level Authorization (BOLA) in the tenant resolution handler and unkeyed caching headers.",
          refs: ["F1", "F2"],
        },
      ],
      refs: {
        F1: "find-demo-01",
        F2: "find-demo-02",
      },
    },
  },
  {
    id: "scan-demo-02",
    organization_id: "org-acme-defense",
    requested_by: "Md. Tasve Al Samir",
    approved_asset_id: "asset-demo-02",
    target_url: "https://auth.acme-corp.com",
    resolved_ip: "198.51.100.42",
    preset: "moderate",
    status: "completed",
    budget_seconds_snapshot: 300,
    started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    finished_at: new Date(Date.now() - 86400000 * 2 + 180000).toISOString(),
    cancelled_at: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    finding_count: 6,
    has_report: true,
  },
  {
    id: "scan-demo-03",
    organization_id: "org-acme-defense",
    requested_by: "Md. Tasve Al Samir",
    approved_asset_id: "asset-demo-04",
    target_url: "https://staging-mesh.acmedefense.internal",
    resolved_ip: "10.0.98.5",
    preset: "normal",
    status: "completed",
    budget_seconds_snapshot: 180,
    started_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    finished_at: new Date(Date.now() - 86400000 * 4 + 112000).toISOString(),
    cancelled_at: null,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    finding_count: 2,
    has_report: true,
  },
  {
    id: "scan-demo-04",
    organization_id: "org-acme-defense",
    requested_by: "Md. Tasve Al Samir",
    approved_asset_id: "asset-demo-03",
    target_url: "https://vpn-gateway.acmedefense.com",
    resolved_ip: "203.0.113.88",
    preset: "moderate",
    status: "completed",
    budget_seconds_snapshot: 300,
    started_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    finished_at: new Date(Date.now() - 86400000 * 7 + 240000).toISOString(),
    cancelled_at: null,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    finding_count: 1,
    has_report: true,
  },
];

export const DEMO_METRICS = {
  posture_score: 89,
  severity_counts: {
    critical: 1,
    high: 3,
    medium: 5,
    low: 4,
    informational: 7,
  },
  trend: [
    { date: "Nov 10", completed: 2, total: 2 },
    { date: "Nov 11", completed: 3, total: 3 },
    { date: "Nov 12", completed: 1, total: 1 },
    { date: "Nov 13", completed: 4, total: 5 },
    { date: "Nov 14", completed: 2, total: 2 },
    { date: "Nov 15", completed: 3, total: 3 },
    { date: "Nov 16", completed: 5, total: 5 },
    { date: "Nov 17", completed: 2, total: 2 },
    { date: "Nov 18", completed: 4, total: 4 },
    { date: "Nov 19", completed: 3, total: 4 },
    { date: "Nov 20", completed: 6, total: 6 },
    { date: "Nov 21", completed: 4, total: 4 },
    { date: "Nov 22", completed: 5, total: 5 },
    { date: "Nov 23", completed: 4, total: 5 },
  ],
  needs_attention: [
    {
      id: "find-demo-01",
      title: "CVE-2024-21413: Remote NTLM Reflection Vector in SSO Handshake",
      severity: "critical",
      target: "auth.acme-corp.com",
      category: "Authentication Bypass",
      cvss: 9.8,
      cve: "CVE-2024-21413",
      discovered_at: "2 hours ago",
    },
    {
      id: "find-demo-02",
      title: "BOLA / IDOR in GraphQL Node Resolver (/graphql?query=tenant)",
      severity: "high",
      target: "api.acmedefense.internal",
      category: "Broken Object Level Authorization",
      cvss: 8.4,
      cve: "CWE-639",
      discovered_at: "4 hours ago",
    },
    {
      id: "find-demo-03",
      title: "Unauthenticated Prometheus Metrics Exposure (/metrics endpoint)",
      severity: "high",
      target: "staging-mesh.acmedefense.internal",
      category: "Information Disclosure",
      cvss: 7.5,
      cve: "CWE-200",
      discovered_at: "1 day ago",
    },
  ],
};

const SIMULATION_KEY = "reconx_simulation_active";

export function isSimulationActive(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SIMULATION_KEY);
  if (stored === null) return true; // Default to active so the user sees rich, compelling data
  return stored === "true";
}

export function setSimulationActive(active: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIMULATION_KEY, active ? "true" : "false");
  window.dispatchEvent(new CustomEvent("reconx_simulation_toggled", { detail: { active } }));
}
