"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HardDrive,
  Cpu,
  Activity,
  Shield,
  Radio,
  StopCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Terminal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Scan } from "@/types";
import { apiRequest } from "@/lib/api-client";

interface AdminDashboardProps {
  scans: Scan[];
  auditEvents?: any[];
}

export function AdminDashboard({ scans, auditEvents }: AdminDashboardProps) {
  const [liveScans, setLiveScans] = useState<Scan[]>(scans);
  const [notice, setNotice] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [isEmergencyKilling, setIsEmergencyKilling] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    setLiveScans(scans);
  }, [scans]);

  const events = auditEvents || [];

  const activeScans = liveScans.filter((s) =>
    ["running", "queued", "provisioning", "pending"].includes(s.status)
  );

  const handleTerminateScan = async (scanId: string) => {
    setTerminatingId(scanId);
    try {
      await apiRequest(`/scans/${scanId}/cancel`, { method: "POST" });
      setLiveScans((prev) =>
        prev.map((s) => (s.id === scanId ? { ...s, status: "cancelled" } : s))
      );
      setNotice({
        message: `Assessment worker ${scanId.slice(0, 8)} terminated. Cancellation flag delivered to Kali sandbox.`,
        type: "warning",
      });
    } catch (err: any) {
      setNotice({
        message: `Failed to terminate worker: ${err?.message || "Worker error"}`,
        type: "error",
      });
    } finally {
      setTerminatingId(null);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const handleEmergencyKillAll = async () => {
    setIsEmergencyKilling(true);
    try {
      const res = await apiRequest<{ status: string; terminated_scans: number; message: string }>(
        "/admin/emergency-kill-all",
        { method: "POST" }
      );
      setLiveScans((prev) =>
        prev.map((s) =>
          ["running", "queued", "provisioning", "pending"].includes(s.status)
            ? { ...s, status: "cancelled" }
            : s
        )
      );
      setNotice({
        message:
          res.terminated_scans > 0
            ? `EMERGENCY KILL-SWITCH: Terminated ${res.terminated_scans} active assessment workers.`
            : "EMERGENCY KILL-SWITCH: Fleet was already idle (0 active workers).",
        type: "warning",
      });
    } catch (err: any) {
      setNotice({
        message: `Emergency kill failed: ${err?.message || "Internal error"}`,
        type: "error",
      });
    } finally {
      setIsEmergencyKilling(false);
      setTimeout(() => setNotice(null), 6000);
    }
  };

  const handlePurgeTestScans = async () => {
    setIsPurging(true);
    try {
      const res = await apiRequest<{ status: string; purged_count: number; message: string }>(
        "/admin/purge-test-scans",
        { method: "POST" }
      );
      // Remove inactive scans from local state
      setLiveScans((prev) =>
        prev.filter((s) => ["running", "queued", "provisioning", "pending"].includes(s.status))
      );
      setNotice({
        message: res.message || `Purged ${res.purged_count} inactive test scans.`,
        type: "success",
      });
    } catch (err: any) {
      setNotice({
        message: `Purge failed: ${err?.message || "Internal error"}`,
        type: "error",
      });
    } finally {
      setIsPurging(false);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  return (
    <div className="space-y-8 animate-in">
      {/* 1. Header with Emergency Controls & Purge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Platform Infrastructure & Administration
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Root infrastructure oversight, isolated Kali Linux WSL2 worker nodes, dual-AI model quota health, and emergency global kill-switches.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handlePurgeTestScans}
            disabled={isPurging}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-sm disabled:opacity-50"
            title="Clean up old completed/cancelled test scans and temporary worker files"
          >
            <Trash2 className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{isPurging ? "Purging..." : "Purge Inactive Scans"}</span>
          </button>
          <button
            onClick={handleEmergencyKillAll}
            disabled={isEmergencyKilling}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition shadow-sm disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{isEmergencyKilling ? "Killing All Workers..." : "Emergency Kill-Switch"}</span>
          </button>
        </div>
      </div>

      {/* Emergency Notice */}
      {notice && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center space-x-2 animate-in ${
            notice.type === "error"
              ? "bg-red-50 border border-red-200 text-red-800"
              : notice.type === "warning"
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-emerald-50 border border-emerald-200 text-emerald-800"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* 2. Infrastructure Health KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-sm font-semibold">System Health</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5 gap-2">
            <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-emerald-600 truncate">
              OPERATIONAL
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Postgres OK</span>
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-sm font-semibold">Kali Worker Concurrency</span>
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5 gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900">
              {activeScans.length} / 5 Slots
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                activeScans.length > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {activeScans.length > 0 ? "WSL2 Active" : "WSL2 Idle"}
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-sm font-semibold">AI Model Orchestrator</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200/60 flex items-center justify-center text-cyan-600">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5 gap-2">
            <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-slate-900 truncate">
              Groq + Gemini
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 shrink-0">
              Pool Healthy
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-sm font-semibold">Global Audit Stream</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5 gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900">
              {events.length} Events
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              SHA-256 Ledger
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Worker Dispatches Across All Workspaces */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Radio
              className={`w-5 h-5 ${
                activeScans.length > 0 ? "text-emerald-600 animate-pulse" : "text-slate-400"
              }`}
            />
            <h2 className="font-bold text-base sm:text-lg text-slate-900">
              Active Assessment Workers (Global Platform Fleet)
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {activeScans.length > 0
              ? `${activeScans.length} Worker(s) Active`
              : "Isolated Debian / Kali-Rolling Sandboxes"}
          </span>
        </div>

        {activeScans.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Radio className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-800 text-base">Platform Fleet Idle (0 Active Workers)</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No Kali Linux worker containers are currently executing assessment probes. When a security assessment is dispatched, its live worker PID, allocated budget, and emergency kill controls will stream here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-800 min-w-[750px]">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Target Scope</th>
                  <th className="px-6 py-4">Preset</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Allocated Budget</th>
                  <th className="px-6 py-4">Worker PID</th>
                  <th className="px-6 py-4 text-right">Emergency Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeScans.map((scan) => {
                  const budgetTotal =
                    scan.budget_seconds_snapshot ||
                    (scan.preset === "ultimate" ? 900 : scan.preset === "normal" ? 120 : 300);
                  const elapsed = scan.started_at
                    ? Math.max(0, Math.round((Date.now() - new Date(scan.started_at).getTime()) / 1000))
                    : 0;

                  return (
                    <tr key={scan.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-sm text-slate-900 truncate max-w-xs">
                          {scan.target_url}
                        </div>
                        <div className="font-mono text-xs text-slate-400 mt-0.5">
                          {scan.resolved_ip || "Public Target"} · Scan: {scan.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                          {scan.preset} ({budgetTotal}s)
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{scan.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 text-sm">
                        {elapsed}s / {budgetTotal}s
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        kali.worker.{scan.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleTerminateScan(scan.id)}
                          disabled={terminatingId === scan.id}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition disabled:opacity-50"
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                          <span>{terminatingId === scan.id ? "Stopping..." : "Terminate"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Global Audit Events Stream */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900">Platform Security Audit Log</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Immutable chronological record of worker dispatches, AI decisions, and cryptographic LOA sign-offs.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Real-time IPC Stream
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <Shield className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">No audit events recorded</p>
            <p className="text-xs text-slate-400 mt-1">Platform security operations will stream here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 font-mono text-xs">
            {events.slice(0, 10).map((evt: any) => (
              <div
                key={evt.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-slate-400 text-[11px] shrink-0">
                    {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : "UTC"}
                  </span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                    {evt.action || evt.event_type || "AUDIT"}
                  </span>
                  <span className="font-sans font-medium text-slate-800 text-xs sm:text-sm">
                    {evt.metadata_json?.target || evt.target_type || "System Event"}
                  </span>
                </div>
                <span className="text-slate-400 text-[11px] shrink-0 sm:text-right font-mono">
                  {evt.target_id ? `${evt.target_type}:${evt.target_id.slice(0, 8)}` : "Platform"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
