"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Scan as ScanType, ApprovedAsset, AuthorizationRequest, User } from "@/types";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

import { AnalystDashboard } from "@/components/dashboard/analyst-dashboard";
import { ModeratorDashboard } from "@/components/dashboard/moderator-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [scans, setScans] = useState<ScanType[]>([]);
  const [assets, setAssets] = useState<ApprovedAsset[]>([]);
  const [authorizations, setAuthorizations] = useState<AuthorizationRequest[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [adminAuditEvents, setAdminAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async (isInitial = false) => {
    try {
      let currentUser = user;
      if (!currentUser || isInitial) {
        const userData = await apiRequest<{ user: User }>("/auth/me");
        currentUser = userData.user;
        setUser(userData.user);
      }

      const isModeratorOrAdmin =
        currentUser?.platform_role === "MODERATOR" ||
        currentUser?.platform_role === "SUPER_ADMIN";

      const [scansData, assetsData, authzData, metricsData, auditData] = await Promise.all([
        apiRequest<ScanType[]>("/scans"),
        apiRequest<ApprovedAsset[]>("/assets"),
        isModeratorOrAdmin
          ? apiRequest<AuthorizationRequest[]>("/moderation/authorizations").catch(() => [])
          : apiRequest<AuthorizationRequest[]>("/authorizations"),
        apiRequest<any>("/scans/metrics/summary"),
        currentUser?.platform_role === "SUPER_ADMIN"
          ? apiRequest<any[]>("/admin/audit-events").catch(() => [])
          : Promise.resolve([]),
      ]);
      setScans(scansData);
      setAssets(assetsData);
      setAuthorizations(authzData);
      setMetrics(metricsData);
      setAdminAuditEvents(auditData);
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401 || err?.code === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Real-time Event Listeners & Polling for seamless zero-refresh UI updates
  useEffect(() => {
    const handleScanDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const deletedId = customEvent.detail?.id;
      if (deletedId) {
        setScans((prev) => prev.filter((s) => s.id !== deletedId));
      }
      apiRequest<any>("/scans/metrics/summary").then(setMetrics).catch(() => {});
      fetchDashboardData(false);
    };

    const handleRefresh = () => {
      fetchDashboardData(false);
    };

    window.addEventListener("reconx_scan_deleted", handleScanDeleted);
    window.addEventListener("reconx_scan_created", handleRefresh);
    window.addEventListener("reconx_scan_updated", handleRefresh);
    window.addEventListener("reconx_scope_moderated", handleRefresh);
    window.addEventListener("reconx_scope_submitted", handleRefresh);

    // Auto-refresh interval (every 4 seconds) to capture worker completion & real-time updates
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 4000);

    return () => {
      window.removeEventListener("reconx_scan_deleted", handleScanDeleted);
      window.removeEventListener("reconx_scan_created", handleRefresh);
      window.removeEventListener("reconx_scan_updated", handleRefresh);
      window.removeEventListener("reconx_scope_moderated", handleRefresh);
      window.removeEventListener("reconx_scope_submitted", handleRefresh);
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  const handleScanDeletedCallback = useCallback((deletedId: string) => {
    setScans((prev) => prev.filter((s) => s.id !== deletedId));
    apiRequest<any>("/scans/metrics/summary").then(setMetrics).catch(() => {});
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  // 1. Role-specific Dashboard Routing
  if (user?.platform_role === "MODERATOR") {
    return <ModeratorDashboard initialRequests={authorizations} assets={assets} />;
  }

  if (user?.platform_role === "SUPER_ADMIN") {
    return <AdminDashboard scans={scans} auditEvents={adminAuditEvents} />;
  }

  // 2. Default: Security Analyst Dashboard
  return (
    <AnalystDashboard
      scans={scans}
      assets={assets}
      authorizations={authorizations}
      metrics={metrics}
      onScanDeleted={handleScanDeletedCallback}
    />
  );
}
