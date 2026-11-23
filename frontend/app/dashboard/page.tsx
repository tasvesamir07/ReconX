"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Scan as ScanType, ApprovedAsset, AuthorizationRequest, User } from "@/types";
import {
  DEMO_SCANS,
  DEMO_APPROVED_ASSETS,
  DEMO_AUTHORIZATION_REQUESTS,
  DEMO_METRICS,
  isSimulationActive,
} from "@/lib/demo-simulation";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

import { AnalystDashboard } from "@/components/dashboard/analyst-dashboard";
import { ModeratorDashboard } from "@/components/dashboard/moderator-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("reconx_cached_session_user");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [scans, setScans] = useState<ScanType[]>(() => {
    return isSimulationActive() ? DEMO_SCANS : [];
  });
  const [assets, setAssets] = useState<ApprovedAsset[]>(() => {
    return isSimulationActive() ? DEMO_APPROVED_ASSETS : [];
  });
  const [authorizations, setAuthorizations] = useState<AuthorizationRequest[]>(() => {
    return isSimulationActive() ? DEMO_AUTHORIZATION_REQUESTS : [];
  });
  const [metrics, setMetrics] = useState<any>(() => {
    return isSimulationActive() ? DEMO_METRICS : null;
  });
  const [adminAuditEvents, setAdminAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      const isSim = isSimulationActive();
      const finalScans = scansData && scansData.length > 0 ? scansData : isSim ? DEMO_SCANS : [];
      const finalAssets = assetsData && assetsData.length > 0 ? assetsData : isSim ? DEMO_APPROVED_ASSETS : [];
      const finalAuthz = authzData && authzData.length > 0 ? authzData : isSim ? DEMO_AUTHORIZATION_REQUESTS : [];
      const finalMetrics =
        metricsData && metricsData.posture_score !== undefined && scansData && scansData.length > 0
          ? metricsData
          : isSim
          ? DEMO_METRICS
          : metricsData;

      setScans(finalScans);
      setAssets(finalAssets);
      setAuthorizations(finalAuthz);
      setMetrics(finalMetrics);
      setAdminAuditEvents(auditData);
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401 || err?.code === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      console.error("Failed to load dashboard metrics:", err);
      if (isSimulationActive()) {
        setScans(DEMO_SCANS);
        setAssets(DEMO_APPROVED_ASSETS);
        setAuthorizations(DEMO_AUTHORIZATION_REQUESTS);
        setMetrics(DEMO_METRICS);
      }
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

    // Auto-refresh interval (every 10 seconds, visibility-aware) to capture worker completion
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchDashboardData(false);
      }
    }, 10000);

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
