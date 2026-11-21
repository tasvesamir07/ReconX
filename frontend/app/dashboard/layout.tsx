"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Scan,
  FileCheck2,
  Users,
  Shield,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  Search,
  Check,
  Globe,
  ChevronsUpDown,
  HardDrive,
  Activity,
  AlertTriangle,
  FileText,
  Building,
  User as UserIcon,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { User, Organization } from "@/types";
import { CommandPalette } from "@/components/command-palette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Shell UI states
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const fetchPendingQueue = async () => {
    try {
      const pendingList = await apiRequest<any[]>("/moderation/authorizations");
      const rawStored = typeof window !== "undefined" ? localStorage.getItem("reconx_moderated_scopes_v2") : null;
      const stored = rawStored ? JSON.parse(rawStored) : {};
      const actualPending = Array.isArray(pendingList) ? pendingList.filter((item) => !stored[item.id]) : [];
      setPendingCount(actualPending.length);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    async function loadSession() {
      try {
        const sessionData = await apiRequest<{ user: User }>("/auth/me");
        setUser(sessionData.user);

        // Super Admin operates platform-wide and is not tied to any tenant
        if (sessionData.user.platform_role !== "SUPER_ADMIN") {
          const orgList = await apiRequest<Organization[]>("/organizations").catch(() => []);
          setOrgs(orgList);
          if (orgList.length > 0) {
            setCurrentOrg(orgList[0]);
          }
        }

        if (sessionData.user.platform_role === "MODERATOR" || sessionData.user.platform_role === "SUPER_ADMIN") {
          fetchPendingQueue();
        }
      } catch (err) {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOrgDropdownOpen(false);
  }, [pathname]);

  // Mobile drawer: lock background scroll and close on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleQueueSync = () => {
      fetchPendingQueue();
    };
    window.addEventListener("reconx_scope_moderated", handleQueueSync);
    window.addEventListener("reconx_scope_submitted", handleQueueSync);
    return () => {
      window.removeEventListener("reconx_scope_moderated", handleQueueSync);
      window.removeEventListener("reconx_scope_submitted", handleQueueSync);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  if (loading) {
    // Skeleton shell mirrors the real layout so the page feels instant
    return (
      <div className="min-h-screen flex bg-slate-50/50" aria-busy="true" aria-label="Loading workspace">
        <aside className="hidden md:flex w-72 flex-col shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200 p-5 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl skeleton" />
            <div className="h-5 w-28 rounded-md skeleton" />
          </div>
          <div className="h-14 rounded-xl skeleton" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 rounded-xl skeleton" />
            ))}
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="h-16 border-b border-slate-200/80 bg-white px-4 sm:px-8 flex items-center">
            <div className="h-4 w-56 rounded-md skeleton" />
          </div>
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 route-enter">
            <div className="h-8 w-72 rounded-lg skeleton" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-28 rounded-xl skeleton" />
              ))}
            </div>
            <div className="h-72 rounded-xl skeleton" />
          </div>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.platform_role === "SUPER_ADMIN";
  const isModerator = user?.platform_role === "MODERATOR";

  const getBreadcrumb = () => {
    if (pathname === "/dashboard") {
      if (isModerator) return "Governance & Scope Compliance";
      if (isSuperAdmin) return "Platform Infrastructure Console";
      return "Overview & Scans";
    }
    if (pathname === "/dashboard/assessments/new") return "New Assessment Studio";
    if (pathname.startsWith("/dashboard/assessments/")) return "Live Assessment Telemetry";
    if (pathname === "/dashboard/authorizations") return "Authorizations & Scope";
    if (pathname === "/dashboard/reports") return "Reports & Evidence Archive";
    if (pathname === "/dashboard/profile") return "Operator Profile & Identity";
    if (pathname === "/dashboard/team") return "Team & Members";
    if (pathname === "/dashboard/moderator") return "Moderation Review Queue";
    if (pathname === "/dashboard/admin") return "System Infrastructure";
    if (pathname === "/dashboard/admin/logs") return "Platform Execution & Audit Logs";
    if (pathname === "/dashboard/admin/organizations") return "Organizations Directory";
    if (pathname === "/dashboard/admin/users") return "Platform User Profiles";
    return "Dashboard";
  };

  const orgName = isSuperAdmin
    ? "Platform Root"
    : currentOrg
    ? currentOrg.name
    : "Freelancer / Personal Workspace";

  const orgInitials = isSuperAdmin
    ? "RX"
    : currentOrg
    ? currentOrg.name.slice(0, 2).toUpperCase()
    : "PW";

  const userInitials = user?.display_name
    ? user.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "RX";

  const userRoleDisplay =
    user?.platform_role === "SUPER_ADMIN"
      ? "Platform Super Admin"
      : user?.platform_role === "MODERATOR"
      ? "Compliance Moderator"
      : currentOrg
      ? `${currentOrg.role || "Member"} (${currentOrg.name})`
      : "Freelancer Analyst";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* 1. Header & Logo */}
      <div className="h-16 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">ReconX</span>
          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            v2.4
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Tenant Context or Super Admin Banner */}
      {isSuperAdmin ? (
        <div className="p-4 border-b border-slate-200/80 shrink-0">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white tracking-tight">Platform Root</div>
                <div className="text-[10px] font-mono text-emerald-400 font-semibold tracking-wider uppercase mt-0.5">
                  Global Oversight
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              Admin
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-slate-200/80 relative shrink-0">
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {orgInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{orgName}</div>
                <div className="text-[11px] text-slate-500 font-medium capitalize mt-0.5">
                  {currentOrg ? (currentOrg.role || "Active Tenant") : "Solo Practitioner"}
                </div>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
          </button>

          {orgDropdownOpen && (
            <div className="absolute left-4 right-4 top-16 z-50 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 space-y-1 animate-in">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 tracking-wider">
                Select Workspace Mode
              </div>
              {/* Personal / Freelancer Mode */}
              <button
                onClick={() => {
                  setCurrentOrg(null);
                  setOrgDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                  currentOrg === null
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">Personal Workspace (Freelancer)</span>
                </div>
                {currentOrg === null && <Check className="w-4 h-4 shrink-0 ml-2 text-emerald-600" />}
              </button>

              {/* Organization list */}
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setCurrentOrg(org);
                    setOrgDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                    currentOrg?.id === org.id
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  {currentOrg?.id === org.id && <Check className="w-4 h-4 shrink-0 ml-2 text-emerald-600" />}
                </button>
              ))}

              <div className="border-t border-slate-100 pt-1.5 mt-1">
                <Link
                  href="/dashboard/team"
                  className="w-full block px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                >
                  Manage Team Members →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Grouped Navigation Links (Strictly Role-Filtered) */}
      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Security Analyst & Regular User View */}
        {!isModerator && !isSuperAdmin && (
          <>
            <div className="space-y-1">
              <div className="px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Operations
              </div>
              <Link
                href="/dashboard"
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                  pathname === "/dashboard"
                    ? "nav-item-active"
                    : "nav-item-idle"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="truncate">Overview & Scans</span>
              </Link>
              <Link
                href="/dashboard/assessments/new"
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                  pathname === "/dashboard/assessments/new"
                    ? "nav-item-active"
                    : "nav-item-idle"
                }`}
              >
                <Scan className="w-4 h-4 shrink-0" />
                <span className="truncate">Launch Assessment</span>
              </Link>
            </div>

            <div className="space-y-1">
              <div className="px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Governance & Reports
              </div>
              <Link
                href="/dashboard/authorizations"
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                  pathname === "/dashboard/authorizations"
                    ? "nav-item-active"
                    : "nav-item-idle"
                }`}
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span className="truncate">Authorizations & Scope</span>
              </Link>
              <Link
                href="/dashboard/reports"
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                  pathname === "/dashboard/reports"
                    ? "nav-item-active"
                    : "nav-item-idle"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">Reports & Evidence Archive</span>
              </Link>
            </div>
          </>
        )}

        {/* Compliance Moderator View */}
        {isModerator && (
          <div className="space-y-1">
            <div className="px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Compliance & Scope
            </div>
            <Link
              href="/dashboard"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                pathname === "/dashboard" || pathname === "/dashboard/moderator"
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Shield className="w-4 h-4 shrink-0" />
                <span className="truncate">Moderation Queue</span>
              </div>
              {pendingCount > 0 ? (
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  pathname === "/dashboard" || pathname === "/dashboard/moderator"
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}>
                  {pendingCount} Pending
                </span>
              ) : (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  pathname === "/dashboard" || pathname === "/dashboard/moderator"
                    ? "bg-white/10 text-white/80"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  Clear
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/authorizations"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                pathname === "/dashboard/authorizations"
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
            >
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Authorized Assets Ledger</span>
            </Link>
            <Link
              href="/dashboard/reports"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                pathname === "/dashboard/reports"
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">Reports & Evidence</span>
            </Link>
          </div>
        )}

        {/* Super Admin View */}
        {isSuperAdmin && (
          <div className="space-y-1">
            <div className="px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Platform Oversight
            </div>
            <Link
              href="/dashboard"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                pathname === "/dashboard" || pathname === "/dashboard/admin"
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
            >
              <HardDrive className="w-4 h-4 shrink-0" />
              <span className="truncate">System Infrastructure</span>
            </Link>
            <Link
              href="/dashboard/admin/logs"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                pathname === "/dashboard/admin/logs"
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
            >
              <Terminal className="w-4 h-4 shrink-0" />
              <span className="truncate">Platform Execution Logs</span>
            </Link>
            <Link
              href="/dashboard/admin/organizations"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                pathname === "/dashboard/admin/organizations"
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
            >
              <Building className="w-4 h-4 shrink-0" />
              <span className="truncate">Organizations Directory</span>
            </Link>
            <Link
              href="/dashboard/admin/users"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                pathname === "/dashboard/admin/users"
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Platform User Profiles</span>
            </Link>
          </div>
        )}

        {/* Team & Members Group (Only for users belonging to an organization) */}
        {!isSuperAdmin && (
          <div className="space-y-1">
            <div className="px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Workspace
            </div>
            <Link
              href="/dashboard/team"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
                pathname === "/dashboard/team"
                  ? "nav-item-active"
                  : "nav-item-idle"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Team & Members</span>
            </Link>
          </div>
        )}

        {/* Dedicated My Profile Menu Item for All Users */}
        <div className="space-y-1">
          <div className="px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Account & Identity
          </div>
          <Link
            href="/dashboard/profile"
            className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm nav-item ${
              pathname === "/dashboard/profile"
                ? "nav-item-active"
                : "nav-item-idle"
            }`}
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">My Profile & Security</span>
          </Link>
        </div>
      </nav>

      {/* 4. Bottom Profile Card -> Links to /dashboard/profile */}
      <div className="p-3 border-t border-slate-200/80 bg-white shrink-0">
        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
          <Link
            href="/dashboard/profile"
            className="flex items-center space-x-2.5 min-w-0 flex-1 hover:opacity-80 transition group"
            title="View personal profile & identity"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-800 shadow-sm shrink-0 group-hover:border-slate-400">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.display_name || "User"}
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate">
                {userRoleDisplay}
              </div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Sign Out"
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white hover:border hover:border-slate-200 transition shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50/50 text-slate-900 font-sans antialiased">
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-72 flex-col shrink-0 h-screen sticky top-0 bg-white z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="drawer-enter relative w-80 max-w-full h-full flex flex-col z-10 bg-white shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between bg-white/95 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Trail */}
            <nav className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-500 truncate">
              <span className="truncate max-w-[120px] sm:max-w-[200px] text-slate-600 font-medium">
                {isSuperAdmin ? "Platform Administration" : orgName}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-bold truncate">{getBreadcrumb()}</span>
            </nav>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Search Input Bar with ⌘K badge */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-xs sm:text-sm text-slate-500 transition"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="hidden sm:inline">Search domains, scans, LOAs</span>
              <span className="sm:hidden">Search</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Role-Specific Primary CTA Button */}
            {!isModerator && !isSuperAdmin && (
              <Link
                href="/dashboard/assessments/new"
                className="inline-flex items-center space-x-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Launch Scan</span>
              </Link>
            )}

            {isModerator && (
              <Link
                href="/dashboard/moderator"
                className="inline-flex items-center space-x-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95"
              >
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Review Scope{pendingCount > 0 ? ` (${pendingCount})` : ""}</span>
              </Link>
            )}

            {isSuperAdmin && (
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center space-x-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95"
              >
                <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Fleet Telemetry</span>
              </Link>
            )}
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {/* Keyed by route so every page transition plays the same enter animation */}
          <div key={pathname} className="route-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        userRole={user?.platform_role}
      />
    </div>
  );
}
