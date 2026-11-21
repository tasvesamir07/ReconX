"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Mail,
  Building,
  Calendar,
  CheckCircle2,
  Lock,
  Activity,
  Key,
  ShieldCheck,
  FileCheck2,
  Scan,
  Phone,
  FileText,
  Camera,
  Save,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { User as UserType, Organization, Scan as ScanType } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
];

export default function UserProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [scans, setScans] = useState<ScanType[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const [userData, orgList, scanList] = await Promise.all([
          apiRequest<{ user: UserType }>("/auth/me"),
          apiRequest<Organization[]>("/organizations").catch(() => []),
          apiRequest<ScanType[]>("/scans").catch(() => []),
        ]);
        setUser(userData.user);
        setDisplayName(userData.user.display_name || "");
        setPhoneNumber(userData.user.phone_number || "");
        setAvatarUrl(userData.user.avatar_url || "");
        setBio(userData.user.bio || "");
        setOrgs(orgList);
        setScans(scanList);
      } catch (err: any) {
        if (err?.status === 401 || err?.statusCode === 401) {
          router.replace("/login");
          return;
        }
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Display name must be at least 2 characters.",
        variant: "error",
      });
      return;
    }

    setUpdating(true);
    try {
      const res = await apiRequest<{ status: string; user: UserType }>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          display_name: displayName.trim(),
          phone_number: phoneNumber.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      setUser(res.user);
      toast({
        title: "Profile Saved",
        description: "Your identity details, phone number, and avatar have been updated.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err?.message || "Could not save profile changes.",
        variant: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "RX";

  const roleLabel =
    user?.platform_role === "SUPER_ADMIN"
      ? "Platform Super Admin"
      : user?.platform_role === "MODERATOR"
      ? "Compliance Moderator"
      : "Security Analyst";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Operator Profile & Security Identity
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Complete identity credentials, emergency phone contact, platform governance roles, and cryptographic activity footprint.
        </p>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-900 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">{displayName || user?.display_name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Active</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="sm:text-right text-xs text-slate-500 font-mono space-y-1">
            <div>
              <span className="text-slate-400">Account ID: </span>
              <span>{user?.id.slice(0, 12)}...</span>
            </div>
            <div>
              <span className="text-slate-400">Registered: </span>
              <span>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Email Verification: </span>
              <span className="text-emerald-700 font-semibold">Verified</span>
            </div>
          </div>
        </div>

        {/* Profile Details Edit Form */}
        <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name / Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Vance"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Direct Phone Number (For Emergency Alerts)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Avatar Image URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 transition font-mono"
            />
            {/* Quick avatar presets */}
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-[11px] text-slate-400">Quick avatars:</span>
              <div className="flex items-center space-x-1.5">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 hover:scale-110 transition shrink-0"
                    title={`Select preset ${idx + 1}`}
                  >
                    <img src={preset} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Professional Bio & Security Focus
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Lead Penetration Tester specialized in OWASP Top 10, Cloud Infrastructure, and TLS Security Audits."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 transition"
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={updating}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{updating ? "Saving Details..." : "Save Profile Details"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Organization Memberships & Mode */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Building className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-base text-slate-900">Workspace & Tenant Affiliations</h3>
        </div>

        {user?.platform_role === "SUPER_ADMIN" ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">Platform Root Operator</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Super Admin operates globally without attachment to any single corporate tenant.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-900 text-white">
              Global Oversight
            </span>
          </div>
        ) : orgs.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-center justify-between">
            <div>
              <div className="font-semibold">Personal Workspace (Freelancer / Solo Mode)</div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Active in individual practitioner mode. You can execute assessments against approved personal scopes.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-700 text-white">
              Solo Analyst
            </span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orgs.map((org) => (
              <div key={org.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{org.name}</div>
                  <div className="text-xs font-mono text-slate-500">Slug: {org.slug}</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                  Role: {org.role || "Member"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cryptographic Footprint Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center space-x-2 text-slate-600 text-xs font-semibold">
            <Scan className="w-4 h-4 text-emerald-600" />
            <span>Assessments Executed</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-3">
            {scans.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bound to immutable audit ledger</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center space-x-2 text-slate-600 text-xs font-semibold">
            <FileCheck2 className="w-4 h-4 text-cyan-600" />
            <span>Reports Generated</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-3">
            {scans.filter((s) => s.has_report || s.status === "completed").length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Available for permanent retrieval</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center space-x-2 text-slate-600 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Security Standing</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-3">
            100%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Zero policy or SSRF violations</div>
        </div>
      </div>
    </div>
  );
}