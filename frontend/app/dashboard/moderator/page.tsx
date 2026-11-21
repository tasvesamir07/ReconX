"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  Scan,
  ShieldAlert,
  Globe
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { AuthorizationRequest, User } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

export default function ModeratorQueuePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<AuthorizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionModal, setDecisionModal] = useState<AuthorizationRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | "info_requested">("approved");
  const [modAllowSubdomains, setModAllowSubdomains] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      const [sessionData, pendingData] = await Promise.all([
        apiRequest<{ user: User }>("/auth/me"),
        apiRequest<AuthorizationRequest[]>("/moderation/authorizations"),
      ]);
      setCurrentUser(sessionData.user);
      setRequests(pendingData);
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401 || err?.code === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal) return;
    setSubmitting(true);

    try {
      await apiRequest(`/moderation/authorizations/${decisionModal.id}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reason,
          approved_domains: decisionModal.requested_scope.domains,
          allow_subdomains: modAllowSubdomains,
        }),
      });
      toast({
        title: `Scope ${decision.toUpperCase()}`,
        description: `Decision recorded for ${decisionModal.company_name}.`,
        variant: decision === "approved" ? "success" : "info",
      });
      setDecisionModal(null);
      setReason("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("reconx_scope_moderated"));
      }
      await loadData();
    } catch (err: any) {
      toast({
        title: "Decision Failed",
        description: err.message || "Could not record moderator decision.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Compliance Moderator Queue</h1>
        <p className="text-muted text-sm mt-1">
          Review authorization letters, company identity, and approve target domain scope.
        </p>
      </div>

      {/* Info Callout */}
      <Card className="p-5 space-y-2">
        <div className="flex items-center space-x-2 text-accent text-xs font-semibold uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          <span>Moderator Governance & Separation of Duties</span>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          • <strong>Audit Authority:</strong> Your responsibility as a Compliance Moderator is to inspect company ownership letters and approve or reject target domain scopes.
        </p>
        <p className="text-xs text-muted leading-relaxed">
          • <strong>Separation of Duties (Section 09):</strong> Compliance Moderators audit and approve scopes, but <strong>do not launch security assessments</strong>. Scans are executed by authorized <strong>Security Analysts</strong> once scopes are approved.
        </p>
        <p className="text-xs text-warning leading-relaxed">
          • <strong>4-Eyes Principle:</strong> You cannot approve authorization requests you personally submitted. Another Compliance Moderator or Super Admin must review them.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-line">
          <h3 className="font-semibold text-ink text-base">Pending Authorization Submissions</h3>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={3} />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="Moderation Queue Clear"
            description="There are currently no authorization requests awaiting compliance review."
          />
        ) : (
          <div className="divide-y divide-line/60">
            {requests.map((req) => {
              const isSelfSubmitted = currentUser?.id === req.requested_by;

              return (
                <div key={req.id} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-ink text-lg">{req.company_name}</h4>
                    <span className="text-xs text-muted">Submitted {formatDateTime(req.created_at)}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted">
                    <div>
                      <span className="text-subtle">Authorized Contact: </span>
                      <span className="text-ink font-medium">
                        {req.employee_name} ({req.contact_email})
                      </span>
                    </div>
                    <div>
                      <span className="text-subtle">Requested Domains: </span>
                      <span className="font-mono text-accent">
                        {req.requested_scope.domains.join(", ")}
                      </span>
                      {req.requested_scope.allow_subdomains && (
                        <span className="ml-1 text-[11px] text-muted">(+ wildcard subdomains)</span>
                      )}
                    </div>
                  </div>

                  {req.ai_flags && req.ai_flags.length > 0 && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning space-y-1">
                      <strong className="block font-semibold">Advisory AI Extraction Flags:</strong>
                      {req.ai_flags.map((f, i) => (
                        <div key={i}>• {f.message}</div>
                      ))}
                    </div>
                  )}

                  {isSelfSubmitted && (
                    <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>
                        <strong>Conflict of Interest Guard:</strong> You submitted this request. Under ReconX policy, another Moderator or Super Admin must review it.
                      </span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    {isSelfSubmitted ? (
                      <Button variant="ghost" size="sm" disabled>
                        Self-Submitted (Awaiting Another Moderator)
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setDecisionModal(req);
                          setModAllowSubdomains(Boolean(req.requested_scope?.allow_subdomains));
                          setReason("");
                        }}
                      >
                        Review & Decide Scope
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Decision Dialog */}
      <Dialog
        open={!!decisionModal}
        onOpenChange={(open) => !open && setDecisionModal(null)}
        title={`Review Scope: ${decisionModal?.company_name || ""}`}
        description="Verify target domain ownership and record your formal compliance decision."
        size="md"
      >
        {decisionModal && (
          <form onSubmit={handleDecision} className="space-y-4">
            <div>
              <label htmlFor="decisionSelect" className="block text-xs font-semibold text-ink mb-1.5">Compliance Decision</label>
              <select
                id="decisionSelect"
                value={decision}
                onChange={(e: any) => setDecision(e.target.value)}
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
              >
                <option value="approved">Approve Target Scope & Expiry</option>
                <option value="rejected">Reject Submission</option>
                <option value="info_requested">Request Additional Information</option>
              </select>
            </div>

            {decision === "approved" && (
              <div className="p-3 rounded-lg bg-canvas border border-line space-y-1">
                <label htmlFor="modAllowSubdomains" className="flex items-center space-x-2 text-xs text-ink cursor-pointer select-none">
                  <input
                    id="modAllowSubdomains"
                    type="checkbox"
                    checked={modAllowSubdomains}
                    onChange={(e) => setModAllowSubdomains(e.target.checked)}
                    className="rounded border-line bg-elevated text-accent focus:ring-accent"
                  />
                  <span>Authorize Wildcard Subdomains (*.{decisionModal.requested_scope.domains.join(", *.")})</span>
                </label>
                <span className="text-[11px] text-muted block pl-5">
                  Allows security analysts to target any subdomain under the approved parent domain(s).
                </span>
              </div>
            )}

            <div>
              <label htmlFor="decisionReason" className="block text-xs font-semibold text-ink mb-1.5">
                Mandatory Review Reason / Audit Note
              </label>
              <textarea
                id="decisionReason"
                required
                minLength={5}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State reason for decision (e.g., Company contact verified via registry)..."
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-line">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDecisionModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={submitting}
              >
                Confirm Decision
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
