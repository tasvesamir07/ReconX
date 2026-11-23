"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Mail,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Key,
  ArrowRight,
  UserMinus,
  Shield,
  Building,
  Lock,
} from "lucide-react";
import { apiRequest, ReconXApiError } from "@/lib/api-client";
import { OrgMember, Organization, User } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

export default function TeamManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string>("");
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [emailToInvite, setEmailToInvite] = useState("");
  const [roleToInvite, setRoleToInvite] = useState<"ADMIN" | "ANALYST" | "VIEWER">("ANALYST");
  const [acceptToken, setAcceptToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function loadData() {
    try {
      const [sessionData, orgList] = await Promise.all([
        apiRequest<{ user: User }>("/auth/me"),
        apiRequest<Organization[]>("/organizations").catch(() => []),
      ]);
      setCurrentUser(sessionData.user);
      setOrgs(orgList);
      if (orgList.length > 0) {
        const activeId = currentOrgId || orgList[0].id;
        setCurrentOrgId(activeId);
        const memberList = await apiRequest<OrgMember[]>(`/organizations/${activeId}/members`);
        // Filter out any anomalous platform admin entries
        setMembers(memberList.filter((m) => m.email !== "admin@reconx.local"));
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401 || err?.code === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentOrgId]);

  const activeOrg = orgs.find((o) => o.id === currentOrgId);
  const isOrgModerator =
    activeOrg?.role === "OWNER" ||
    activeOrg?.role === "ADMIN" ||
    currentUser?.platform_role === "MODERATOR";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOrgModerator) {
      toast({
        title: "Permission Denied",
        description: "Only an Organization Moderator or Admin can invite new members.",
        variant: "error",
      });
      return;
    }

    if (!currentOrgId) {
      toast({
        title: "No Organization Selected",
        description: "Please select an organization before sending invitations.",
        variant: "warning",
      });
      return;
    }
    setLoading(true);

    try {
      await apiRequest(`/organizations/${currentOrgId}/invitations`, {
        method: "POST",
        body: JSON.stringify({
          email: emailToInvite,
          role: roleToInvite,
        }),
      });
      toast({
        title: "Invitation Dispatched",
        description: `Invitation token sent to ${emailToInvite}.`,
        variant: "success",
      });
      setEmailToInvite("");
    } catch (err: any) {
      toast({
        title: "Invitation Failed",
        description: err instanceof ReconXApiError ? err.message : "Failed to send invitation.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest("/organizations/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: acceptToken }),
      });
      toast({
        title: "Invitation Accepted",
        description: "You have successfully joined the organization workspace.",
        variant: "success",
      });
      setAcceptToken("");
      await loadData();
    } catch (err: any) {
      toast({
        title: "Acceptance Failed",
        description: err instanceof ReconXApiError ? err.message : "Failed to accept invitation token.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeMember = async (member: OrgMember) => {
    if (!isOrgModerator) {
      toast({
        title: "Permission Denied",
        description: "Only Organization Moderators and Admins can revoke access.",
        variant: "error",
      });
      return;
    }

    if (member.role === "OWNER") {
      const ownerCount = members.filter((m) => m.role === "OWNER").length;
      if (ownerCount <= 1) {
        toast({
          title: "Cannot Revoke Owner",
          description: "An organization must retain at least one active Owner.",
          variant: "warning",
        });
        return;
      }
    }

    const confirmed = window.confirm(
      `Revoke access for ${member.display_name} (${member.email})? They will no longer be able to log in or access assessments under ${activeOrg?.name}.`
    );
    if (!confirmed) return;

    setRevokingId(member.user_id);
    try {
      await apiRequest(`/organizations/${currentOrgId}/members/${member.user_id}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
      toast({
        title: "Access Revoked",
        description: `${member.display_name}'s access has been terminated.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Revocation Failed",
        description: err?.message || "Could not revoke member access.",
        variant: "error",
      });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Team & Member Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            {isOrgModerator
              ? "Organization moderation controls: invite analysts, assign roles, and revoke member permissions."
              : "Organization team directory. View your organization's members and assigned roles."}
          </p>
        </div>
        {orgs.length > 1 && (
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Workspace:</span>
            <select
              value={currentOrgId}
              onChange={(e) => setCurrentOrgId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none"
            >
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Freelancer notice if not in an org */}
      {orgs.length === 0 && !fetching && (
        <div className="p-8 rounded-2xl border border-white/10 dark-card text-center space-y-3 shadow-2xl">
          <Building className="w-10 h-10 text-zinc-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Freelancer Mode Active</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            You are operating in Freelancer / Solo mode. You are not currently part of a corporate organization. You can submit authorization requests directly and run scans independently.
          </p>
        </div>
      )}

      {/* Role Notice for Analysts */}
      {orgs.length > 0 && !isOrgModerator && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center space-x-2.5">
          <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
          <span>
            <strong>Analyst View (Read-Only):</strong> You are an authorized Security Analyst in <strong>{activeOrg?.name}</strong>. Only the Organization Moderator can invite new members or revoke permissions.
          </span>
        </div>
      )}

      {/* Moderation Controls: Only visible to Organization Moderator / Admin */}
      {isOrgModerator ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Invite Member */}
          <div className="p-6 rounded-2xl border border-white/10 dark-card shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 font-bold text-white text-sm sm:text-base">
              <UserPlus className="w-4 h-4 text-[#C6F432]" />
              <span>Invite Security Analyst</span>
            </div>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label htmlFor="inviteEmail" className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  id="inviteEmail"
                  type="email"
                  required
                  value={emailToInvite}
                  onChange={(e) => setEmailToInvite(e.target.value)}
                  placeholder="analyst@company.com"
                  className="w-full rounded-xl border border-white/10 bg-[#18181B] px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-[#C6F432]/50 focus:outline-none focus:ring-1 focus:ring-[#C6F432]/30 transition"
                />
              </div>
              <div>
                <label htmlFor="inviteRole" className="block text-xs font-semibold text-zinc-300 mb-1">
                  Assigned Workspace Role
                </label>
                <select
                  id="inviteRole"
                  value={roleToInvite}
                  onChange={(e: any) => setRoleToInvite(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#18181B] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#C6F432]/50 focus:outline-none focus:ring-1 focus:ring-[#C6F432]/30 transition"
                >
                  <option value="ANALYST">Security Analyst (Run Scans, View Reports)</option>
                  <option value="ADMIN">Organization Admin (Manage Scopes & Team)</option>
                  <option value="VIEWER">Viewer (Read-Only Deliverables)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#C6F432] hover:bg-[#B5E327] text-[#0B0B0C] text-xs sm:text-sm font-bold transition shadow-[0_0_15px_rgba(198,244,50,0.25)] disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Invitation Token"}
              </button>
            </form>
          </div>

          {/* Accept Token */}
          <div className="p-6 rounded-2xl border border-white/10 dark-card shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 font-bold text-white text-sm sm:text-base">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Redeem Workspace Invitation</span>
            </div>
            <form onSubmit={handleAcceptInvite} className="space-y-3">
              <div>
                <label htmlFor="acceptToken" className="block text-xs font-semibold text-zinc-300 mb-1">
                  64-Character Invitation Token
                </label>
                <input
                  id="acceptToken"
                  type="text"
                  required
                  value={acceptToken}
                  onChange={(e) => setAcceptToken(e.target.value)}
                  placeholder="Paste token received via email..."
                  className="w-full font-mono text-xs rounded-xl border border-white/10 bg-[#18181B] px-3.5 py-2 text-white placeholder:text-zinc-500 focus:border-[#C6F432]/50 focus:outline-none focus:ring-1 focus:ring-[#C6F432]/30 transition"
                />
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Accepting an invitation binds an account to this organization workspace.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-semibold transition disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join Organization Workspace"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Active Members Table */}
      <div className="rounded-2xl border border-white/10 dark-card shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base">
              Members of {activeOrg ? activeOrg.name : "Workspace"}
            </h3>
            <p className="text-zinc-400 text-xs mt-0.5">Active operators and analysts under this tenant</p>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-300 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
            {members.length} Member{members.length === 1 ? "" : "s"}
          </span>
        </div>

        {fetching ? (
          <div className="p-6">
            <SkeletonTable rows={3} />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Members Registered"
            description="Invite colleagues or analysts to collaborate on authorized assessments."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-zinc-200 min-w-[700px]">
              <thead className="bg-white/[0.02] text-zinc-400 border-b border-white/10 font-semibold text-xs uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Joined At</th>
                  {isOrgModerator && <th className="px-6 py-3.5 text-right">Moderator Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-semibold text-white flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#18181B] text-[#C6F432] border border-white/15 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {member.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[160px]">{member.display_name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">{member.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border font-mono ${
                          member.role === "OWNER"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : member.role === "ADMIN"
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            : member.role === "ANALYST"
                            ? "bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30"
                            : "bg-white/5 text-zinc-300 border border-white/10"
                        }`}
                      >
                        {member.role === "OWNER" ? "ORGANIZATION MODERATOR" : member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-zinc-400">
                      {formatDateTime(member.joined_at)}
                    </td>
                    {isOrgModerator && (
                      <td className="px-6 py-4 text-right">
                        {member.user_id !== currentUser?.id && (
                          <button
                            onClick={() => handleRevokeMember(member)}
                            disabled={revokingId === member.user_id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition disabled:opacity-40"
                            title="Revoke member access permanently"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>{revokingId === member.user_id ? "Revoking..." : "Revoke Access"}</span>
                          </button>
                        )}
                      </td>
                    )}
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
