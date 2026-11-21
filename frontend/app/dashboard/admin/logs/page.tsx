"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Activity,
  Search,
  Filter,
  Shield,
  User,
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  StopCircle,
  RefreshCw,
  Calendar,
  Layers,
  ChevronDown,
  X,
  FileText,
  Radio,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface ExecutionLogItem {
  id: string;
  target_url: string;
  resolved_ip: string | null;
  preset: string;
  status: string;
  budget_seconds: number;
  duration_seconds: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  cancelled_at: string | null;
  operator: {
    id: string | null;
    display_name: string;
    email: string;
    phone_number: string | null;
    platform_role: string;
  };
  organization: {
    id: string | null;
    name: string;
    slug: string | null;
  };
  findings_count: number;
  events_count: number;
  recent_events: Array<{
    seq: number;
    type: string;
    severity: string;
    message: string;
    created_at: string | null;
  }>;
}

interface AuditEventItem {
  id: string;
  action: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string | null;
  organization_id: string | null;
  organization_name: string;
  resource_type: string;
  resource_id: string;
  decision: string | null;
  reason: string | null;
  ip_address: string | null;
  metadata: any;
  created_at: string;
}

export default function AdminLogsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"executions" | "audit">("executions");
  const [executions, setExecutions] = useState<ExecutionLogItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [inspectScan, setInspectScan] = useState<ExecutionLogItem | null>(null);
  const [stopTargetId, setStopTargetId] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [deleteScanTargetId, setDeleteScanTargetId] = useState<string | null>(null);
  const [deletingScan, setDeletingScan] = useState(false);

  const handleDeleteScan = async () => {
    if (!deleteScanTargetId) return;
    setDeletingScan(true);
    try {
      await apiRequest(`/scans/${deleteScanTargetId}`, { method: "DELETE" });
      setExecutions((prev) => prev.filter((e) => e.id !== deleteScanTargetId));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("reconx_scan_deleted", { detail: { id: deleteScanTargetId } }));
      }
      toast({
        title: "Assessment Deleted",
        description: "The assessment record, telemetry, and evidence have been purged.",
        variant: "success",
      });
      if (inspectScan && inspectScan.id === deleteScanTargetId) {
        setInspectScan(null);
      }
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.message || "Could not delete assessment.",
        variant: "error",
      });
    } finally {
      setDeletingScan(false);
      setDeleteScanTargetId(null);
    }
  };

  async function loadLogs() {
    setLoading(true);
    try {
      const [execData, auditData] = await Promise.all([
        apiRequest<ExecutionLogItem[]>("/admin/execution-logs"),
        apiRequest<AuditEventItem[]>("/admin/audit-events"),
      ]);
      setExecutions(execData);
      setAuditEvents(auditData);
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401) {
        router.replace("/login");
        return;
      }
      console.error("Failed to load platform logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [router]);

  const handleStopScan = async () => {
    if (!stopTargetId) return;
    setStopping(true);
    try {
      await apiRequest(`/scans/${stopTargetId}/cancel`, { method: "POST" });
      toast({
        title: "Assessment Terminated",
        description: "Emergency cancellation delivered to worker node.",
        variant: "warning",
      });
      await loadLogs();
      if (inspectScan && inspectScan.id === stopTargetId) {
        setInspectScan({ ...inspectScan, status: "cancelled" });
      }
    } catch (err: any) {
      toast({
        title: "Stop Failed",
        description: err?.message || "Could not halt assessment worker.",
        variant: "error",
      });
    } finally {
      setStopping(false);
      setStopTargetId(null);
    }
  };

  const filteredExecutions = executions.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.target_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.operator.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.operator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.organization.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || s.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const filteredAuditEvents = auditEvents.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      e.actor_name.toLowerCase().includes(q) ||
      (e.actor_email && e.actor_email.toLowerCase().includes(q)) ||
      (e.ip_address && e.ip_address.toLowerCase().includes(q)) ||
      e.organization_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Platform Execution & Security Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Immutable operational telemetries across all operators, assessments, and workspaces. Inspect worker outputs and compliance actions even after months.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-sm disabled:opacity-50"
            title="Refresh logs from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-semibold">Total Assessments Executed</span>
            <Terminal className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-3">
            {executions.length} Scans
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Multi-tenant execution history</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-semibold">Currently Active Workers</span>
            <Activity className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-600 mt-3">
            {executions.filter((e) => ["running", "queued", "provisioning"].includes(e.status)).length} Active
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Kali Linux sandboxes live</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-semibold">Security Audit Events</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-3">
            {auditEvents.length} Events
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cryptographic compliance trail</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-semibold">Active Operators Tracked</span>
            <User className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-3">
            {new Set(executions.map((e) => e.operator.email).filter(Boolean)).size} Operators
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Analysts & Solo Practitioners</div>
        </div>
      </div>

      {/* 3. Tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("executions")}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
            activeTab === "executions"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Platform Execution Logs ({executions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
            activeTab === "audit"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security Audit Trail ({auditEvents.length})</span>
        </button>
      </div>

      {/* 4. Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === "executions"
                ? "Filter by operator email, target URL, org, or scan ID..."
                : "Filter by action, actor, IP address, or tenant..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
          />
        </div>

        {activeTab === "executions" && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        )}
      </div>

      {/* 5. Main Content Tables */}
      {loading ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200">
          <SkeletonTable rows={5} />
        </div>
      ) : activeTab === "executions" ? (
        /* Tab A: Platform Execution Logs */
        filteredExecutions.length === 0 ? (
          <EmptyState
            icon={Terminal}
            title="No Execution Records Found"
            description="No assessment worker telemetry matches your search parameters."
          />
        ) : (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-800 min-w-[850px]">
                <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Target Scope</th>
                    <th className="px-5 py-3.5">Operator (Who Ran It)</th>
                    <th className="px-5 py-3.5">Workspace / Org</th>
                    <th className="px-5 py-3.5">Preset & Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Operational Telemetry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExecutions.map((item) => {
                    const isRunning = ["running", "queued", "provisioning"].includes(item.status);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-slate-900 truncate max-w-[200px]">
                            {item.target_url}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {item.resolved_ip ? `IP: ${item.resolved_ip}` : `ID: ${item.id.slice(0, 8)}`}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.operator.display_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {item.operator.email}
                          </div>
                          {item.operator.phone_number && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Tel: {item.operator.phone_number}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-xs font-semibold text-slate-700">
                            {item.organization.name}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-semibold text-slate-800 capitalize">
                            {item.preset} ({item.budget_seconds}s)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {formatDateTime(item.created_at)}
                          </div>
                          {item.duration_seconds && (
                            <div className="text-[10px] text-emerald-600 font-mono font-semibold mt-0.5">
                              Duration: {item.duration_seconds}s
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              item.status === "completed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : item.status === "running"
                                ? "bg-cyan-50 text-cyan-800 border-cyan-200 animate-pulse"
                                : item.status === "queued"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : item.status === "cancelled"
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === "completed"
                                  ? "bg-emerald-600"
                                  : item.status === "running"
                                  ? "bg-cyan-600"
                                  : item.status === "queued"
                                  ? "bg-amber-600"
                                  : "bg-slate-400"
                              }`}
                            />
                            <span className="capitalize">{item.status}</span>
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setInspectScan(item)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold transition"
                            >
                              <Terminal className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Logs ({item.events_count})</span>
                            </button>
                            {isRunning && (
                              <button
                                onClick={() => setStopTargetId(item.id)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition"
                                title="Emergency Stop Scan"
                              >
                                <StopCircle className="w-3.5 h-3.5" />
                                <span>Halt</span>
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteScanTargetId(item.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                              title="Permanently Delete Assessment Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Tab B: Security Audit Stream */
        filteredAuditEvents.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No Audit Records Found"
            description="No compliance audit events match your search query."
          />
        ) : (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-800 min-w-[800px]">
                <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Actor (Operator)</th>
                    <th className="px-5 py-3.5">Tenant / Workspace</th>
                    <th className="px-5 py-3.5">Target Resource</th>
                    <th className="px-5 py-3.5">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(ev.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                          {ev.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{ev.actor_name}</div>
                        {ev.actor_email && (
                          <div className="text-[11px] text-slate-500 font-mono">{ev.actor_email}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-700">
                        {ev.organization_name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 truncate max-w-[150px]">
                        {ev.resource_type}: {ev.resource_id.slice(0, 12)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                        {ev.ip_address || "Internal Engine"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* 6. Execution Telemetry Drawer / Modal */}
      {inspectScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 font-mono">
                    {inspectScan.target_url}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Operator: {inspectScan.operator.display_name} ({inspectScan.operator.email}) · Scan ID: {inspectScan.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectScan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Telemetry Log Terminal */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Workspace:</span>
                  <strong className="text-slate-900">{inspectScan.organization.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Preset / Budget:</span>
                  <strong className="text-slate-900 font-mono">{inspectScan.preset} ({inspectScan.budget_seconds}s)</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Started:</span>
                  <strong className="text-slate-900 font-mono">{formatDateTime(inspectScan.created_at)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Duration:</span>
                  <strong className="text-slate-900 font-mono">{inspectScan.duration_seconds ? `${inspectScan.duration_seconds}s` : "In Progress"}</strong>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Chronological Worker Probe Events ({inspectScan.recent_events.length})
                </h4>
                <div className="rounded-xl bg-[#0a0f1d] p-4 font-mono text-xs text-slate-300 space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin">
                  {inspectScan.recent_events.length === 0 ? (
                    <div className="text-slate-500 py-4 text-center">No execution events recorded yet.</div>
                  ) : (
                    inspectScan.recent_events.map((ev, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-[11px] leading-relaxed">
                        <span className="text-slate-500 shrink-0">[{ev.seq.toString().padStart(2, "0")}]</span>
                        <span
                          className={`font-semibold shrink-0 uppercase ${
                            ev.severity === "critical" || ev.severity === "error"
                              ? "text-red-400"
                              : ev.severity === "warning"
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {ev.type}:
                        </span>
                        <span className="text-slate-200 flex-1">{ev.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Admin Oversight Mode: Execution logs are retained permanently for auditing.
              </span>
              <button
                onClick={() => setInspectScan(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
              >
                Close Log Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Cancellation Dialog */}
      <ConfirmDialog
        open={!!stopTargetId}
        onOpenChange={(open) => !open && setStopTargetId(null)}
        title="Emergency Halt Assessment?"
        description="Are you sure you want to emergency halt this running assessment across worker nodes? The worker will receive an immediate cancellation flag."
        confirmLabel="Halt Assessment"
        cancelLabel="Keep Running"
        variant="danger"
        loading={stopping}
        onConfirm={handleStopScan}
      />

      {/* Permanent Deletion Dialog */}
      <ConfirmDialog
        open={!!deleteScanTargetId}
        onOpenChange={(open) => !open && setDeleteScanTargetId(null)}
        title="Delete Platform Assessment?"
        description="Are you sure you want to permanently delete this assessment record across the platform? All worker logs, evidence items, and findings will be permanently purged."
        confirmLabel="Delete Assessment"
        cancelLabel="Keep Record"
        variant="danger"
        loading={deletingScan}
        onConfirm={handleDeleteScan}
      />
    </div>
  );
}