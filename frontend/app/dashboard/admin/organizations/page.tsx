"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building,
  Users,
  Search,
  Scan,
  Shield,
  Calendar,
  ExternalLink,
  CheckCircle2,
  X,
  Layers,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  member_count: number;
  scan_count: number;
}

interface OrgMemberDetail {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  joined_at: string;
}

export default function AdminOrganizationsDirectoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Members modal
  const [selectedOrg, setSelectedOrg] = useState<AdminOrg | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMemberDetail[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const data = await apiRequest<AdminOrg[]>("/admin/organizations");
        setOrgs(data);
      } catch (err: any) {
        if (err?.status === 401 || err?.statusCode === 401) {
          router.replace("/login");
          return;
        }
        console.error("Failed to load organizations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrganizations();
  }, [router]);

  const handleInspectMembers = async (org: AdminOrg) => {
    setSelectedOrg(org);
    setLoadingMembers(true);
    try {
      const members = await apiRequest<OrgMemberDetail[]>(`/admin/organizations/${org.id}/members`);
      setOrgMembers(members);
    } catch (err: any) {
      toast({
        title: "Load Failed",
        description: err?.message || "Could not retrieve members for this organization.",
        variant: "error",
      });
      setOrgMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredOrgs = orgs.filter((org) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q);
  });

  const totalMembers = orgs.reduce((acc, curr) => acc + (curr.member_count || 0), 0);
  const totalScans = orgs.reduce((acc, curr) => acc + (curr.scan_count || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Organizations Directory & Tenant Oversight
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Global directory of all organizations registered on ReconX. Inspect multi-tenant governance, member headcounts, and assessment dispatch activity.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
            {orgs.length} Total Organizations
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 dark-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Registered Organizations</span>
            <Building className="w-4 h-4 text-[#C6F432]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-3">
            {orgs.length} Tenants
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">Multi-tenant isolated workspaces</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 dark-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Total Organization Members</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-3">
            {totalMembers} Operators
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">Analysts, Admins, & Viewers</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/10 dark-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold">Assessments Dispatched</span>
            <Scan className="w-4 h-4 text-[#C6F432]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-3">
            {totalScans} Scans
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">Across all organizational scopes</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 dark-card shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search organizations by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-transparent focus:outline-none placeholder:text-zinc-500 text-white font-sans"
          />
        </div>
      </div>

      {/* Organizations Table */}
      {loading ? (
        <Card className="p-6">
          <SkeletonTable rows={4} />
        </Card>
      ) : filteredOrgs.length === 0 ? (
        <EmptyState
          icon={Building}
          title={searchQuery ? "No Matching Organizations" : "No Organizations Registered"}
          description="Organizations created by users will appear here with complete member listings and telemetry."
        />
      ) : (
        <div className="rounded-2xl border border-white/10 dark-card shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-200 min-w-[750px]">
              <thead className="bg-white/[0.02] text-zinc-400 border-b border-white/10 font-semibold text-xs uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Slug</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5">Members</th>
                  <th className="px-5 py-3.5">Total Scans</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Oversight Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgs.map((org) => {
                  const createdDate = org.created_at
                    ? new Date(org.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A";

                  return (
                    <tr key={org.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                          <Building className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>{org.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {org.slug}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">
                        {createdDate}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                          <Users className="w-3 h-3 text-cyan-600 shrink-0" />
                          <span>{org.member_count} Members</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">
                        {org.scan_count} Scans
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleInspectMembers(org)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-sm"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Members ({org.member_count})</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Members Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                  <Building className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{selectedOrg.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">Members Directory (Tenant ID: {selectedOrg.id.slice(0, 8)})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrg(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingMembers ? (
              <div className="py-8">
                <SkeletonTable rows={3} />
              </div>
            ) : orgMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active members found for this organization.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {orgMembers.map((member) => (
                  <div key={member.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{member.display_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{member.email}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                        {member.role}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOrg(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
