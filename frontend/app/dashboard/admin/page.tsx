"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { Scan } from "@/types";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

import { SystemHealthGrid } from "@/components/admin/system-health-grid";
import { PlatformScansTable } from "@/components/admin/platform-scans-table";
import { PresetBudgetsGrid } from "@/components/admin/preset-budgets-grid";
import { AuditEventsTable } from "@/components/admin/audit-events-table";

export default function AdminConsolePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [health, setHealth] = useState<any>(null);
  const [policies, setPolicies] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopScanTargetId, setStopScanTargetId] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  async function loadAdminData() {
    try {
      const [healthData, policiesData, auditData, scansData] = await Promise.all([
        apiRequest("/admin/health"),
        apiRequest("/admin/policies"),
        apiRequest("/admin/audit-events"),
        apiRequest<Scan[]>("/scans"),
      ]);
      setHealth(healthData);
      setPolicies(policiesData);
      setAuditEvents(auditData);
      setScans(scansData);
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
    loadAdminData();
  }, []);

  const executeStopScan = async () => {
    if (!stopScanTargetId) return;
    setStopping(true);
    try {
      await apiRequest(`/scans/${stopScanTargetId}/cancel`, { method: "POST" });
      toast({
        title: "Assessment Halted",
        description: "Emergency cancellation signal delivered to worker node.",
        variant: "warning",
      });
      await loadAdminData();
    } catch (err: any) {
      toast({
        title: "Stop Failed",
        description: err.message || "Could not halt assessment.",
        variant: "error",
      });
    } finally {
      setStopping(false);
      setStopScanTargetId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  const activeScans = scans.filter((s) => ["queued", "running", "provisioning"].includes(s.status));

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Super Admin Operations & Log Monitoring</h1>
        <p className="text-muted text-sm mt-1">
          Monitor system services, active scans in progress, real-time worker logs, and immutable audit logs.
        </p>
      </div>

      {/* Separation of Duties Banner */}
      <Card className="p-5 border-accent/20 bg-accent/5 space-y-2">
        <div className="flex items-center space-x-2 text-accent text-xs font-semibold uppercase tracking-wider">
          <Activity className="w-4 h-4" />
          <span>Administrator Oversight & Live Monitoring Mode</span>
        </div>
        <p className="text-xs text-ink leading-relaxed">
          • <strong>Live Assessment Telemetry:</strong> Admins can inspect real-time logs and worker execution status for all active scans across the platform.
        </p>
        <p className="text-xs text-muted leading-relaxed">
          • <strong>Separation of Duties (Section 09):</strong> Administrators govern safety limits and monitor operations, but <strong>cannot launch scans</strong>. Scans must be initiated by authorized <strong>Security Analysts</strong>.
        </p>
        <p className="text-xs text-warning leading-relaxed">
          • <strong>Emergency Control:</strong> Super Admins possess authorization to emergency-halt or cancel any runaway scan.
        </p>
      </Card>

      {/* 1. System Health Cards */}
      <SystemHealthGrid health={health} activeScansCount={activeScans.length} />

      {/* 2. Live Platform Scans Table */}
      <PlatformScansTable
        scans={scans}
        activeScansCount={activeScans.length}
        onStopScan={(id) => setStopScanTargetId(id)}
      />

      {/* 3. Preset Budgets */}
      <PresetBudgetsGrid policies={policies} />

      {/* 4. Platform Audit Log */}
      <AuditEventsTable auditEvents={auditEvents} />

      {/* Emergency Cancellation Dialog */}
      <ConfirmDialog
        open={!!stopScanTargetId}
        onOpenChange={(open) => !open && setStopScanTargetId(null)}
        title="Emergency Halt Assessment?"
        description="Are you sure you want to emergency stop this assessment across all workers? The scan will be moved to cancelled state immediately."
        confirmLabel="Halt Assessment"
        cancelLabel="Keep Running"
        variant="danger"
        loading={stopping}
        onConfirm={executeStopScan}
      />
    </div>
  );
}
