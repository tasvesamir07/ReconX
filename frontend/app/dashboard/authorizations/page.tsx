"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertCircle,
  Plus,
  ArrowRight,
  Shield,
  ShieldOff,
  FileCheck2,
  Globe,
  Trash2,
  Lock,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiRequest, ReconXApiError } from "@/lib/api-client";
import { AuthorizationRequest, ApprovedAsset, User, Organization } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

export default function AuthorizationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [requests, setRequests] = useState<AuthorizationRequest[]>([]);
  const [assets, setAssets] = useState<ApprovedAsset[]>([]);
  const [activeTab, setActiveTab] = useState<"authorizations" | "assets">("authorizations");

  // Submission modal state
  const [showModal, setShowModal] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [domainsInput, setDomainsInput] = useState("");
  const [allowSubdomains, setAllowSubdomains] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sudo Re-Authentication & Governance Action states
  const [actionType, setActionType] = useState<"revoke_auth" | "delete_auth" | "revoke_asset" | "delete_asset" | null>(null);
  const [targetReq, setTargetReq] = useState<AuthorizationRequest | null>(null);
  const [targetAsset, setTargetAsset] = useState<ApprovedAsset | null>(null);
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadData() {
    try {
      const [sessionData, authData, assetData, orgsData] = await Promise.all([
        apiRequest<{ user: User }>("/auth/me"),
        apiRequest<AuthorizationRequest[]>("/authorizations"),
        apiRequest<ApprovedAsset[]>("/assets?include_inactive=true").catch(() => []),
        apiRequest<Organization[]>("/organizations").catch(() => []),
      ]);
      setUser(sessionData.user);
      setRequests(authData || []);
      setAssets(assetData || []);
      setOrgs(orgsData || []);
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401 || err?.code === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      console.error("Failed to load authorization requests:", err);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Dual-Control Governance Check:
  // ONLY Compliance Moderator, Platform Super Admin, or Org Owner/Admin can revoke/delete.
  // Security Analysts have strictly read-only access to authorized scopes.
  const isPlatformGovernance = user?.platform_role === "SUPER_ADMIN" || user?.platform_role === "MODERATOR";
  const isOrgLeader = orgs.some((o) => o.role === "OWNER" || o.role === "ADMIN");
  const isGovernanceAdmin = isPlatformGovernance || isOrgLeader;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const domains = domainsInput
      .split(/[\n,]/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);

    if (domains.length === 0) {
      setError("Please specify at least one valid domain.");
      setLoading(false);
      return;
    }

    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 30);

    try {
      await apiRequest("/authorizations", {
        method: "POST",
        body: JSON.stringify({
          company_name: companyName,
          employee_name: employeeName,
          contact_email: contactEmail,
          requested_domains: domains,
          allow_subdomains: allowSubdomains,
          requested_start_at: now.toISOString(),
          requested_expiry_at: expiry.toISOString(),
        }),
      });
      setShowModal(false);
      setCompanyName("");
      setEmployeeName("");
      setContactEmail("");
      setDomainsInput("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("reconx_scope_submitted"));
      }
      await loadData();
      toast({
        title: "Scope Submitted",
        description: "Your authorization request is now awaiting Compliance Moderator review.",
        variant: "success",
      });
    } catch (err: any) {
      if (err instanceof ReconXApiError) {
        setError(err.message);
      } else {
        setError("Failed to submit authorization request.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (
    type: "revoke_auth" | "delete_auth" | "revoke_asset" | "delete_asset",
    req?: AuthorizationRequest,
    asset?: ApprovedAsset
  ) => {
    setActionType(type);
    setTargetReq(req || null);
    setTargetAsset(asset || null);
    setAuthPassword("");
    setActionReason("");
    setActionError(null);
  };

  const closeActionModal = () => {
    setActionType(null);
    setTargetReq(null);
    setTargetAsset(null);
    setAuthPassword("");
    setActionReason("");
    setActionError(null);
  };

  const handleExecuteGovernanceAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPassword) {
      setActionError("Please enter your account password to verify identity.");
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      if (actionType === "revoke_auth" && targetReq) {
        await apiRequest(`/authorizations/${targetReq.id}/revoke`, {
          method: "POST",
          body: JSON.stringify({ password: authPassword, reason: actionReason }),
        });
        toast({
          title: "Authorization Revoked",
          description: `Testing access for ${targetReq.company_name} has been immediately revoked.`,
          variant: "success",
        });
      } else if (actionType === "delete_auth" && targetReq) {
        await apiRequest(`/authorizations/${targetReq.id}`, {
          method: "DELETE",
          body: JSON.stringify({ password: authPassword, reason: actionReason }),
        });
        toast({
          title: "Record Deleted",
          description: `Authorization record for ${targetReq.company_name} was removed.`,
          variant: "success",
        });
      } else if (actionType === "revoke_asset" && targetAsset) {
        await apiRequest(`/assets/${targetAsset.id}/revoke`, {
          method: "POST",
          body: JSON.stringify({ password: authPassword, reason: actionReason }),
        });
        toast({
          title: "Asset Scope Revoked",
          description: `Testing scope for ${targetAsset.canonical_host} has been revoked.`,
          variant: "success",
        });
      } else if (actionType === "delete_asset" && targetAsset) {
        await apiRequest(`/assets/${targetAsset.id}`, {
          method: "DELETE",
          body: JSON.stringify({ password: authPassword, reason: actionReason }),
        });
        toast({
          title: "Asset Removed",
          description: `Asset ${targetAsset.canonical_host} was removed.`,
          variant: "success",
        });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("reconx_scope_submitted"));
        window.dispatchEvent(new Event("reconx_scope_moderated"));
      }
      closeActionModal();
      await loadData();
    } catch (err: any) {
      setActionError(err?.message || "Governance action failed. Please check credentials.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Authorization & Domain Scope</h1>
          <p className="text-muted text-sm mt-1">
            Manage signed company authorization records, moderator-approved testing domains, and access control.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Submit Authorization Scope</span>
        </Button>
      </div>

      {/* Workflow Explainer Banner */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center space-x-2 text-accent text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>ReconX Dual-Control Authorization Flow</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-canvas border border-line space-y-1">
            <div className="font-semibold text-ink">1. Submit Scope</div>
            <p className="text-muted leading-relaxed">
              Submit company details and target domain(s). This creates a pending request under review.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-canvas border border-line space-y-1">
            <div className="font-semibold text-ink">2. Moderator Review</div>
            <p className="text-muted leading-relaxed">
              A Compliance Moderator verifies company authorization and approves domains in the Moderator Queue.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-canvas border border-line space-y-1">
            <div className="font-semibold text-ink">3. Governance & Revocation</div>
            <p className="text-muted leading-relaxed">
              Security Analysts execute authorized tests. Only Compliance Moderators and Org Admins hold revocation privileges.
            </p>
          </div>
        </div>

        {/* Role Privileges Banner */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between border-t border-line text-xs gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-muted">Current Role:</span>
            <span className="font-semibold text-ink font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {user?.platform_role === "SUPER_ADMIN"
                ? "Platform Super Admin"
                : user?.platform_role === "MODERATOR"
                ? "Compliance Moderator"
                : orgs.length > 0
                ? `${orgs[0].role || "Member"} (${orgs[0].name})`
                : "Security Analyst"}
            </span>
            {!isGovernanceAdmin && (
              <span className="text-[11px] text-muted flex items-center space-x-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>(Read-Only Scope Inventory)</span>
              </span>
            )}
          </div>

          {(user?.platform_role === "MODERATOR" || user?.platform_role === "SUPER_ADMIN") && (
            <Link
              href="/dashboard/moderator"
              className="inline-flex items-center space-x-1.5 text-accent hover:text-accent-strong font-medium"
            >
              <span>Go to Moderator Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </Card>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab("authorizations")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "authorizations"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-muted hover:text-ink hover:bg-canvas"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Authorization Records</span>
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-current">
              {requests.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "assets"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-muted hover:text-ink hover:bg-canvas"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Authorized Assets Ledger</span>
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-current">
              {assets.length}
            </span>
          </button>
        </div>

        {!isGovernanceAdmin && (
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Analyst View: Revocation restricted to Compliance & Org Admin</span>
          </div>
        )}
      </div>

      {/* TAB 1: Authorization Records */}
      {activeTab === "authorizations" && (
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-line flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-ink text-base">Submitted Authorization Records</h3>
              <p className="text-xs text-muted mt-0.5">
                Corporate authorization scope records and moderator decision trails.
              </p>
            </div>
          </div>

          {fetching ? (
            <div className="p-6">
              <SkeletonTable rows={3} />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="No Authorization Records Found"
              description="Submit your company authorization letter to authorize target domains for assessment."
              action={
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Submit Authorization Request</span>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-line/60">
              {requests.map((req) => (
                <div key={req.id} className="p-6 space-y-4 hover:bg-slate-50/50 transition">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
                          req.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                            : req.status === "revoked"
                            ? "bg-rose-50 text-rose-700 border border-rose-300"
                            : req.status === "under_review" || req.status === "submitted"
                            ? "bg-amber-50 text-amber-700 border border-amber-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {req.status === "revoked" ? "Access Revoked" : req.status.replace("_", " ")}
                      </span>
                      <h4 className="font-semibold text-ink text-base">{req.company_name}</h4>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted mr-2 hidden md:inline">
                        Submitted: {formatDateTime(req.created_at)}
                      </span>

                      {/* Privileged Governance Actions (Moderator / Admin ONLY with Password Re-Authentication) */}
                      {isGovernanceAdmin ? (
                        <>
                          {req.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openActionModal("revoke_auth", req)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200"
                              title="Revoke testing access (Requires password)"
                            >
                              <ShieldOff className="w-3.5 h-3.5 mr-1" />
                              <span>Revoke Access</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openActionModal("delete_auth", req)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete authorization record (Requires password)"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>Delete</span>
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono italic">
                          Authorized Scope
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted">
                    <div>
                      <span className="text-subtle">Authorized Contact: </span>
                      <span className="text-ink font-medium">
                        {req.employee_name} ({req.contact_email})
                      </span>
                    </div>
                    <div>
                      <span className="text-subtle">Target Domains: </span>
                      <span className="font-mono text-accent">
                        {req.requested_scope.domains.join(", ")}
                      </span>
                      {req.requested_scope.allow_subdomains && (
                        <span className="ml-1 text-[11px] text-muted">(+ wildcard subdomains)</span>
                      )}
                    </div>
                  </div>

                  {req.moderator_reason && (
                    <div className="p-3 rounded-lg bg-canvas border border-line text-xs">
                      <span className="font-semibold text-muted block mb-0.5">Moderator Decision Note:</span>
                      <span className="text-ink font-mono">{req.moderator_reason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Approved Assets Ledger */}
      {activeTab === "assets" && (
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-line flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-ink text-base">Authorized Target Assets Ledger</h3>
              <p className="text-xs text-muted mt-0.5">
                Target domains authorized for penetration testing and automated vulnerability assessments.
              </p>
            </div>
            {!isGovernanceAdmin && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                🔒 Read-Only
              </span>
            )}
          </div>

          {fetching ? (
            <div className="p-6">
              <SkeletonTable rows={3} />
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No Authorized Assets Registered"
              description="Approved target scopes will appear here once reviewed by Compliance."
              action={
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Submit Scope Authorization</span>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-line/60">
              {assets.map((asset) => (
                <div key={asset.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center space-x-2.5">
                      <Globe className="w-4 h-4 text-accent shrink-0" />
                      <span className="font-mono font-semibold text-ink text-sm truncate">
                        {asset.canonical_host}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          asset.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                            : "bg-rose-50 text-rose-700 border border-rose-300"
                        }`}
                      >
                        {asset.status === "active" ? "Active Scope" : "Revoked"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-canvas border border-line text-muted font-mono">
                        {asset.scope_type === "wildcard_subdomains" ? "*.wildcard" : "exact_host"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>Expires: {formatDateTime(asset.expires_at)}</span>
                      {asset.revoked_at && (
                        <span className="text-rose-600 font-medium">
                          Revoked at: {formatDateTime(asset.revoked_at)}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        {asset.permitted_categories?.map((c) => (
                          <span key={c} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Asset Action Buttons (ONLY visible for Moderator / Org Admin) */}
                  {isGovernanceAdmin ? (
                    <div className="flex items-center space-x-2 shrink-0">
                      {asset.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openActionModal("revoke_asset", undefined, asset)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200"
                          title="Revoke asset testing rights (Requires password)"
                        >
                          <ShieldOff className="w-3.5 h-3.5 mr-1" />
                          <span>Revoke</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openActionModal("delete_asset", undefined, asset)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Remove asset from ledger (Requires password)"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 font-mono italic">
                      Active Target Scope
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Submission Dialog */}
      <Dialog
        open={showModal}
        onOpenChange={setShowModal}
        title="Submit Scope Authorization Request"
        description="Provide company details and the target domains you are authorized to test."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="companyName" className="text-xs font-semibold text-ink block">Company / Client Name</label>
            <input
              id="companyName"
              required
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="employeeName" className="text-xs font-semibold text-ink block">Authorized Contact Name</label>
              <input
                id="employeeName"
                required
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="contactEmail" className="text-xs font-semibold text-ink block">Contact Email</label>
              <input
                id="contactEmail"
                required
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="security@acme.com"
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="domainsInput" className="text-xs font-semibold text-ink block">
              Authorized Target Domains (comma or newline separated)
            </label>
            <textarea
              id="domainsInput"
              required
              rows={3}
              value={domainsInput}
              onChange={(e) => setDomainsInput(e.target.value)}
              placeholder="example.com, test.example.com"
              className="w-full font-mono rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
            />
            <span className="text-[11px] text-muted block">
              Hostnames will be normalized into lowercase canonical format.
            </span>
          </div>

          <div className="pt-1">
            <label htmlFor="allowSubdomains" className="flex items-center space-x-2 text-xs text-ink cursor-pointer select-none">
              <input
                id="allowSubdomains"
                type="checkbox"
                checked={allowSubdomains}
                onChange={(e) => setAllowSubdomains(e.target.checked)}
                className="rounded border-line bg-elevated text-accent focus:ring-accent"
              />
              <span>Allow assessment of all subdomains (*.domain.com)</span>
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
            >
              Submit Authorization Record
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Privileged Governance Re-Authentication Modal */}
      <Dialog
        open={actionType !== null}
        onOpenChange={(open) => !open && closeActionModal()}
        title={
          actionType === "revoke_auth"
            ? "Revoke Scope Authorization"
            : actionType === "delete_auth"
            ? "Delete Authorization Record"
            : actionType === "revoke_asset"
            ? "Revoke Target Asset Scope"
            : "Remove Target Asset"
        }
        description="Dual-control compliance: Identity re-authentication is required to authorize scope alterations."
        size="md"
      >
        <form onSubmit={handleExecuteGovernanceAction} className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
            <KeyRound className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Privileged Operator Identity Verification</span>
              <span>
                {actionType === "revoke_auth" || actionType === "revoke_asset"
                  ? "Revocation will immediately terminate all active assessment rights and cancel any in-progress scans. This action is permanently audited."
                  : "Permanent deletion will remove this authorization record from the corporate ledger."}
              </span>
            </div>
          </div>

          {actionError && (
            <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-canvas border border-line text-xs space-y-1">
            <div className="text-subtle">Target Scope:</div>
            <div className="font-mono font-semibold text-ink">
              {targetReq
                ? `${targetReq.company_name} (${targetReq.requested_scope.domains.join(", ")})`
                : targetAsset?.canonical_host}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-muted text-xs">
              Signed in as: <strong className="text-ink">{user?.email || "Operator"}</strong>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="authPassword" className="text-xs font-semibold text-ink block">
                Confirm Operator Password <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-muted hover:text-ink flex items-center space-x-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
            <input
              id="authPassword"
              required
              type={showPassword ? "text" : "password"}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Enter your account login password"
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
              autoFocus
            />
            <p className="text-[11px] text-muted">
              For your protection, scope revocation requires re-entering your own account password.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="actionReason" className="text-xs font-semibold text-ink block">
              Reason for Revocation / Removal <span className="text-muted font-normal">(Optional)</span>
            </label>
            <input
              id="actionReason"
              type="text"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Authorized testing window concluded, client request"
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeActionModal}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={actionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <ShieldOff className="w-3.5 h-3.5 mr-1" />
              <span>
                {actionType?.includes("delete") ? "Confirm Deletion" : "Confirm Revocation"}
              </span>
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
