"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Building,
  Scan,
  AlertTriangle,
  X,
  Lock,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

interface AdminUserItem {
  id: string;
  email: string;
  display_name: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  platform_role: string;
  status: "active" | "suspended" | "pending";
  created_at: string;
  email_verified_at: string | null;
  organizations: Array<{ id: string; name: string; role: string }>;
  total_scans: number;
}

export default function AdminUsersDirectoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Profile modal
  const [inspectUser, setInspectUser] = useState<AdminUserItem | null>(null);

  async function loadUsers() {
    try {
      const data = await apiRequest<AdminUserItem[]>("/admin/users");
      setUsers(data);
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401) {
        router.replace("/login");
        return;
      }
      console.error("Failed to load user directory:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [router]);

  const handleToggleStatus = async (user: AdminUserItem) => {
    setTogglingId(user.id);
    const actionLabel = user.status === "active" ? "suspend" : "activate";

    try {
      const res = await apiRequest<{ status: string; user_id: string; account_status: "active" | "suspended"; message: string }>(
        `/admin/users/${user.id}/toggle-status`,
        { method: "POST" }
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: res.account_status } : u))
      );
      if (inspectUser && inspectUser.id === user.id) {
        setInspectUser({ ...inspectUser, status: res.account_status });
      }
      toast({
        title: `Account ${res.account_status === "suspended" ? "Suspended" : "Activated"}`,
        description: res.message,
        variant: res.account_status === "suspended" ? "warning" : "success",
      });
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err?.message || `Could not ${actionLabel} account.`,
        variant: "error",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.display_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.platform_role.toLowerCase().includes(q)
    );
  });

  const activeUsersCount = users.filter((u) => u.status === "active").length;
  const suspendedUsersCount = users.filter((u) => u.status === "suspended").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Platform User Directory & Identity Oversight
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Complete registry of all registered operators, analysts, and moderators. Monitor activity footprints and manage suspension controls against suspicious behavior.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
            {users.length} Registered Accounts
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 dark-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Total Platform Users</span>
            <Users className="w-4 h-4 text-[#C6F432]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-3">
            {users.length} Users
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">Across all role categories</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 dark-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Active Operators</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#C6F432] mt-3">
            {activeUsersCount} Active
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">Verified and authorized to operate</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 dark-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Suspended / Flagged</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-500 mt-3">
            {suspendedUsersCount} Suspended
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">Immediate access revoked</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 dark-card shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-transparent focus:outline-none placeholder:text-zinc-500 text-white font-sans"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <Card className="p-6">
          <SkeletonTable rows={5} />
        </Card>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={User}
          title={searchQuery ? "No Matching Users" : "No Users Found"}
          description="Registered platform operators will appear here."
        />
      ) : (
        <div className="rounded-2xl border border-white/10 dark-card shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-200 min-w-[850px]">
              <thead className="bg-white/[0.02] text-zinc-400 border-b border-white/10 font-semibold text-xs uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-5 py-3.5">Operator Identity</th>
                  <th className="px-5 py-3.5">Platform Role</th>
                  <th className="px-5 py-3.5">Organization(s)</th>
                  <th className="px-5 py-3.5">Scans</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Security Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const initials = u.display_name
                    ? u.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                    : "RX";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{u.display_name}</div>
                            <div className="text-xs font-mono text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                          {u.platform_role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {u.organizations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.organizations.map((org) => (
                              <span
                                key={org.id}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                              >
                                {org.name} ({org.role})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Freelancer / Personal</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">
                        {u.total_scans} Scans
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            u.status === "active"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-red-50 text-red-800 border-red-200"
                          }`}
                        >
                          {u.status === "active" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                          )}
                          <span className="capitalize">{u.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setInspectUser(u)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-sm"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Profile</span>
                          </button>
                          {u.platform_role !== "SUPER_ADMIN" && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={togglingId === u.id}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition shadow-sm disabled:opacity-50 ${
                                u.status === "active"
                                  ? "border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                                  : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>
                                {togglingId === u.id
                                  ? "Updating..."
                                  : u.status === "active"
                                  ? "Suspend"
                                  : "Activate"}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Profile Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                {inspectUser.avatar_url ? (
                  <img
                    src={inspectUser.avatar_url}
                    alt={inspectUser.display_name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {inspectUser.display_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base text-slate-900">{inspectUser.display_name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{inspectUser.email}</p>
                  {inspectUser.phone_number && (
                    <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                      Phone: {inspectUser.phone_number}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setInspectUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 font-mono">
              {inspectUser.bio && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-sans text-xs text-slate-700">
                  <span className="font-semibold text-slate-900 block mb-1">Professional Bio:</span>
                  <p className="leading-relaxed">{inspectUser.bio}</p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Account ID:</span>
                  <span className="text-slate-800 font-semibold">{inspectUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Platform Role:</span>
                  <span className="text-slate-800 font-bold uppercase">{inspectUser.platform_role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone Number:</span>
                  <span className="text-slate-800 font-semibold">{inspectUser.phone_number || "Not Registered"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Status:</span>
                  <span
                    className={`font-bold capitalize ${
                      inspectUser.status === "active" ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {inspectUser.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Scans Executed:</span>
                  <span className="text-slate-800">{inspectUser.total_scans}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registered At:</span>
                  <span className="text-slate-800">
                    {new Date(inspectUser.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <div className="font-bold font-sans text-slate-800 text-xs mb-1.5">
                  Associated Organizations:
                </div>
                {inspectUser.organizations.length > 0 ? (
                  <div className="space-y-1">
                    {inspectUser.organizations.map((org) => (
                      <div
                        key={org.id}
                        className="p-2 rounded-lg bg-slate-100 flex items-center justify-between text-slate-700"
                      >
                        <span className="font-sans font-semibold">{org.name}</span>
                        <span className="text-[11px] font-bold uppercase text-slate-500">
                          {org.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No corporate memberships. Freelancer mode.</div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {inspectUser.platform_role !== "SUPER_ADMIN" ? (
                <button
                  onClick={() => handleToggleStatus(inspectUser)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    inspectUser.status === "active"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {inspectUser.status === "active" ? "Suspend Account" : "Activate Account"}
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
