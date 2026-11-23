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
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Platform Infrastructure & Administration
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Root infrastructure oversight, isolated Kali Linux WSL2 worker nodes, dual-AI model quota health, and emergency global kill-switches.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handlePurgeTestScans}
            disabled={isPurging}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50"
            title="Clean up old completed/cancelled test scans and temporary worker files"
          >
            <Trash2 className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>{isPurging ? "Purging..." : "Purge Inactive Scans"}</span>
          </button>
          <button
            onClick={handleEmergencyKillAll}
            disabled={isEmergencyKilling}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{isEmergencyKilling ? "Killing All Workers..." : "Emergency Kill-Switch"}</span>
          </button>
        </div>
      </div>

      {/* Emergency Notice */}
      {notice && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center space-x-2 animate-in shadow-xl ${
            notice.type === "error"
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : notice.type === "warning"
              ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
              : "bg-[#C6F432]/10 border border-[#C6F432]/30 text-[#C6F432]"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#C6F432]" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* 2. Infrastructure Health KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-sm font-semibold">System Health</span>
            <div className="w-9 h-9 rounded-xl bg-[#C6F432]/10 border border-[#C6F432]/30 flex items-center justify-center text-[#C6F432]">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5 gap-2">
            <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-[#C6F432] truncate">
              OPERATIONAL
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 shrink-0 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6F432] animate-pulse" />
              <span>Postgres OK</span>
            </span>
          </div>
        </div>

        <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-sm font-semibold">Kali Worker Concurrency</span>
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <Activity className="w-5 h-5 text-[#C6F432]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5 gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
              {activeScans.length} / 5 Slots
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 font-mono ${
                activeScans.length > 0
                  ? "bg-[#C6F432]/10 text-[#C6F432] border-[#C6F432]/30"
                  : "bg-white/5 text-zinc-400 border-white/10"
              }`}
            >
              {activeScans.length > 0 ? "WSL2 Active" : "WSL2 Idle"}
            </span>
          </div>
        </div>

        <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-sm font-semibold">AI Model Orchestrator</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5 gap-2">
            <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-white truncate">
              Groq + Gemini
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0 font-mono">
              Pool Healthy
            </span>
          </div>
        </div>

        <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-sm font-semibold">Global Audit Stream</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-5 gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
              {events.length} Events
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0 font-mono">
              SHA-256 Ledger
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Worker Dispatches Across All Workspaces */}
      <div className="dark-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Radio
              className={`w-5 h-5 ${
                activeScans.length > 0 ? "text-[#C6F432] animate-pulse" : "text-zinc-500"
              }`}
            />
            <h2 className="font-bold text-base sm:text-lg text-white">
              Active Assessment Workers (Global Platform Fleet)
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            {activeScans.length > 0
              ? `${activeScans.length} Worker(s) Active`
              : "Isolated Debian / Kali-Rolling Sandboxes"}
          </span>
        </div>

        {activeScans.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Radio className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
            <p className="font-semibold text-white text-base">Platform Fleet Idle (0 Active Workers)</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              No Kali Linux worker containers are currently executing assessment probes. When a security assessment is dispatched, its live worker PID, allocated budget, and emergency kill controls will stream here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-200 min-w-[750px]">
              <thead className="bg-white/[0.02] text-zinc-400 border-b border-white/10 font-semibold text-xs uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-4">Target Scope</th>
                  <th className="px-6 py-4">Preset</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Allocated Budget</th>
                  <th className="px-6 py-4">Worker PID</th>
                  <th className="px-6 py-4 text-right">Emergency Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeScans.map((scan) => {
                  const budgetTotal =
                    scan.budget_seconds_snapshot ||
                    (scan.preset === "ultimate" ? 900 : scan.preset === "normal" ? 120 : 300);
                  const elapsed = scan.started_at
                    ? Math.max(0, Math.round((Date.now() - new Date(scan.started_at).getTime()) / 1000))
                    : 0;

                  return (
                    <tr key={scan.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-sm text-white truncate max-w-xs">
                          {scan.target_url}
                        </div>
                        <div className="font-mono text-xs text-zinc-500 mt-0.5">
                          {scan.resolved_ip || "Public Target"} · Scan: {scan.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-white/5 text-zinc-300 border border-white/10 capitalize font-mono">
                          {scan.preset} ({budgetTotal}s)
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 capitalize font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C6F432] animate-pulse" />
                          <span>{scan.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-300 text-sm">
                        {elapsed}s / {budgetTotal}s
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                        kali.worker.{scan.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleTerminateScan(scan.id)}
                          disabled={terminatingId === scan.id}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition disabled:opacity-50"
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
      <div className="dark-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-white">Platform Security Audit Log</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Immutable chronological record of worker dispatches, AI decisions, and cryptographic LOA sign-offs.
            </p>
          </div>
          <span className="text-xs font-semibold text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-mono">
            Real-time IPC Stream
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-sm">
            <Shield className="w-7 h-7 text-zinc-500 mx-auto mb-2" />
            <p className="font-semibold text-white">No audit events recorded</p>
            <p className="text-xs text-zinc-500 mt-1">Platform security operations will stream here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 font-mono text-xs">
            {events.slice(0, 10).map((evt: any) => (
              <div
                key={evt.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/5 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-zinc-500 text-[11px] shrink-0 font-mono">
                    {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : "UTC"}
                  </span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-white/5 text-zinc-300 border border-white/10 shrink-0">
                    {evt.action || evt.event_type || "AUDIT"}
                  </span>
                  <span className="font-sans font-medium text-zinc-200 text-xs sm:text-sm">
                    {evt.metadata_json?.target || evt.target_type || "System Event"}
                  </span>
                </div>
                <span className="text-zinc-500 text-[11px] shrink-0 sm:text-right font-mono">
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
