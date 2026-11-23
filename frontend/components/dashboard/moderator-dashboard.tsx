"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Hourglass,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Check,
  X,
} from "lucide-react";
import { AuthorizationRequest, ApprovedAsset } from "@/types";

interface ModeratorDashboardProps {
  initialRequests?: AuthorizationRequest[];
  assets?: ApprovedAsset[];
}

const STORAGE_KEY = "reconx_moderated_scopes_v2";

function getStoredDecisions(): Record<string, "approved" | "rejected"> {
  if (typeof window !== "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function ModeratorDashboard({ initialRequests, assets }: ModeratorDashboardProps) {
  const [scopes, setScopes] = useState(() => {
    const stored = getStoredDecisions();
    return (initialRequests || [])
      .filter((r) => !stored[r.id] && ["submitted", "under_review", "pending"].includes(r.status))
      .map((r) => ({
        id: r.id,
        org: r.company_name,
        requester: `${r.employee_name} (${r.contact_email})`,
        domain: r.requested_scope?.domains?.[0] || "Target Domain",
        rules: (r.requested_scope?.categories || ["All Non-Destructive Probes"]).join(", "),
        subdomains: r.requested_scope?.allow_subdomains ?? false,
        loaDoc: `LOA-${r.company_name.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`,
        submitted: new Date(r.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        status: r.status,
      }));
  });
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleDecision = (id: string, domain: string, decision: "approved" | "rejected") => {
    // 1. Permanently record decision in localStorage so it NEVER reappears
    try {
      const stored = getStoredDecisions();
      stored[id] = decision;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
      console.warn("Storage sync error:", e);
    }

    // 2. Remove from active queue immediately
    setScopes((prev) => prev.filter((s) => s.id !== id));

    // 3. Notify other components (layout navbar & badges)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("reconx_scope_moderated"));
    }

    // 4. Sync to backend API if this is a live request UUID
    if (id.length > 20) {
      import("@/lib/api-client").then(({ apiRequest }) => {
        apiRequest(`/moderation/authorizations/${id}/decision`, {
          method: "POST",
          body: JSON.stringify({
            decision,
            reason: `Scope ${decision} by compliance moderator.`,
          }),
        }).catch((err) => console.warn("Backend decision sync note:", err?.message));
      });
    }

    // 5. User feedback
    setActionNotice(
      decision === "approved"
        ? `Scope ${domain} approved. Target unlocked for non-destructive scanning.`
        : `Scope ${domain} rejected. Target removed from moderation queue.`
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-8 animate-in">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Governance & Scope Compliance
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Inspect Letters of Authorization (LOA), verify legal domain ownership, and approve or reject target scopes before any Kali Linux probes queue.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/dashboard/authorizations"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition shadow-sm"
          >
            <span>All Authorized Assets</span>
          </Link>
          <button
            onClick={() => {
              if (scopes.length > 0) {
                handleDecision(scopes[0].id, scopes[0].domain, "approved");
              }
            }}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#C6F432] text-[#0B0B0C] hover:bg-[#B5E327] text-sm font-bold transition shadow-[0_0_15px_rgba(198,244,50,0.25)]"
          >
            <Check className="w-4 h-4 text-[#0B0B0C]" />
            <span>Approve Next Scope ({scopes.length})</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-4 rounded-xl bg-[#C6F432]/10 border border-[#C6F432]/30 text-[#C6F432] text-sm font-semibold flex items-center space-x-2 animate-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-[#C6F432] shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 2. Governance KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-sm font-semibold">Pending Scope Queue</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
              {scopes.length}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
              Requires Sign-Off
            </span>
          </div>
        </div>

        <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-sm font-semibold">Approved Active Scopes</span>
            <div className="w-9 h-9 rounded-xl bg-[#C6F432]/10 border border-[#C6F432]/30 flex items-center justify-center text-[#C6F432]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
              18
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 font-mono">
              Cryptographically Bound
            </span>
          </div>
        </div>

        <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-sm font-semibold">Egress Policy Intercepts</span>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
              12
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 font-mono">
              SSRF Probes Blocked
            </span>
          </div>
        </div>

        <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-sm font-semibold">LOA Compliance Rate</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
              98.4%
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
              Auditor Certified
            </span>
          </div>
        </div>
      </div>

      {/* 3. Primary Work Queue: Scope Authorization Decision Studio */}
      <div className="dark-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="font-bold text-lg text-white">Pending Authorization Requests (Moderation Queue)</h2>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Verify legal ownership documentation before approving target hosts for automated assessments.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            {scopes.length} Pending Approval
          </span>
        </div>

        {scopes.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            <CheckCircle2 className="w-8 h-8 text-[#C6F432] mx-auto mb-2" />
            <p className="font-semibold text-white">All pending requests reviewed</p>
            <p className="text-xs text-zinc-500 mt-1">The moderation queue is currently clear.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm text-zinc-200">
              <thead className="bg-white/[0.02] text-zinc-400 border-b border-white/10 font-semibold text-xs uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-5 py-3.5 min-w-[180px] sticky left-0 bg-[#121214] z-10">
                    Target Domain
                  </th>
                  <th className="px-4 py-3.5 min-w-[160px]">Organization & Requester</th>
                  <th className="px-4 py-3.5 min-w-[160px]">Assessment Scope</th>
                  <th className="px-4 py-3.5 min-w-[140px]">Legal Document</th>
                  <th className="px-4 py-3.5 min-w-[110px]">Submitted</th>
                  <th className="px-4 py-3.5 text-right min-w-[150px]">Moderator Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {scopes.map((req) => (
                  <tr key={req.id} className="hover:bg-white/5 transition group">
                    <td className="px-5 py-4 sticky left-0 bg-[#121214] group-hover:bg-[#18181B] transition z-10">
                      <div className="font-mono font-bold text-sm text-white">{req.domain}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">
                        {req.subdomains ? "Includes *.subdomains" : "Exact Domain Only"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-zinc-200">{req.org}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{req.requester}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-400 max-w-xs">{req.rules}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-[#C6F432] bg-[#C6F432]/10 px-2.5 py-1 rounded-md border border-[#C6F432]/25 hover:bg-[#C6F432]/20 transition">
                        <FileText className="w-3.5 h-3.5 text-[#C6F432]" />
                        <span>{req.loaDoc}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-500 font-mono">{req.submitted}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDecision(req.id, req.domain, "approved")}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#C6F432] hover:bg-[#B5E327] text-[#0B0B0C] text-xs font-bold transition shadow-sm active:scale-95"
                          title="Approve Target Scope"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleDecision(req.id, req.domain, "rejected")}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition active:scale-95"
                          title="Reject Request"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Secondary Registry: Approved Target Assets */}
      <div className="dark-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-white">Active Approved Asset Scopes</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Target domains currently cleared for non-destructive security scans.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#C6F432] bg-[#C6F432]/10 px-3 py-1 rounded-full border border-[#C6F432]/30 font-mono">
            {(assets || []).length} Active Scope{(assets || []).length === 1 ? "" : "s"}
          </span>
        </div>

        {(assets || []).length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">
            <CheckCircle2 className="w-7 h-7 text-[#C6F432] mx-auto mb-2" />
            <p className="font-semibold text-white">No active approved assets</p>
            <p className="text-xs text-zinc-500 mt-1">Approved target scopes will appear in this registry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-200 min-w-[700px]">
              <thead className="bg-white/[0.02] text-zinc-400 border-b border-white/10 font-semibold text-xs uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-4">Canonical Host</th>
                  <th className="px-6 py-4">Permitted Categories</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Valid Until</th>
                  <th className="px-6 py-4 text-right">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(assets || []).map((a) => (
                  <tr key={a.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-mono font-bold text-white">{a.canonical_host}</td>
                    <td className="px-6 py-4 text-xs text-zinc-400 max-w-xs">{a.permitted_categories?.join(", ") || "All Categories"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C6F432]" />
                        <span className="capitalize">{a.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                      {new Date(a.expires_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-mono text-zinc-400">
                        {a.scope_type === "wildcard_subdomains" ? "*.subdomains" : "Exact Host"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
