"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  Search,
  Calendar,
  Lock,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { Scan } from "@/types";
import { DEMO_SCANS, isSimulationActive } from "@/lib/demo-simulation";
import { SimulationBanner } from "@/components/dashboard/simulation-banner";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function ReportsArchivePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [scans, setScans] = useState<Scan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteScan = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await apiRequest(`/scans/${deleteTargetId}`, { method: "DELETE" });
      setScans((prev) => prev.filter((s) => s.id !== deleteTargetId));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("reconx_scan_deleted", { detail: { id: deleteTargetId } }));
      }
      toast({
        title: "Report Deleted",
        description: "The assessment report and evidence ledger have been removed.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.message || "Could not delete assessment.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const loadReports = useCallback(async () => {
    try {
      const scanList = await apiRequest<Scan[]>("/scans");
      const isSim = isSimulationActive();
      const finalScans = scanList && scanList.length > 0 ? scanList : isSim ? DEMO_SCANS : [];
      setScans(finalScans);
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401) {
        router.replace("/login");
        return;
      }
      console.error("Failed to load assessments archive:", err);
      if (isSimulationActive()) {
        setScans(DEMO_SCANS);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const completedScans = scans.filter((s) =>
    ["completed", "partial", "cancelled", "running"].includes(s.status)
  );

  const filteredScans = completedScans.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.target_url.toLowerCase().includes(query) ||
      (s.resolved_ip && s.resolved_ip.toLowerCase().includes(query)) ||
      s.preset.toLowerCase().includes(query)
    );
  });

  const handleDownloadPdf = async (scanId: string) => {
    setDownloadingId(scanId);
    try {
      const response = await fetch(`/api/v1/scans/${scanId}/report/download`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Could not retrieve PDF report.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ReconX_Assessment_${scanId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Report Downloaded",
        description: "Official ReportLab assessment deliverable saved.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err?.message || "Report is currently being compiled.",
        variant: "error",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadEvidence = async (scanId: string) => {
    try {
      const response = await fetch(`/api/v1/scans/${scanId}/evidence/download`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not download evidence.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ReconX_Evidence_${scanId.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Evidence Exported",
        description: "Cryptographic SHA-256 evidence ledger downloaded.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Failed to download evidence JSON.",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Simulation Engine Banner */}
      <SimulationBanner onDataRefresh={loadReports} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Assessment Reports & Evidence Archive
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Permanent, tamper-evident repository of all security audit deliverables. Access, view, or download PDF reports and SHA-256 cryptographic evidence records at any time.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-mono font-semibold text-zinc-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
            {completedScans.length} Recorded Deliverables
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl dark-card border border-white/10 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reports by target domain, resolved IP, or preset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-transparent focus:outline-none placeholder:text-zinc-500 text-white font-sans"
          />
        </div>
      </div>

      {/* Reports Table or Empty State */}
      {loading ? (
        <Card className="p-6">
          <SkeletonTable rows={5} />
        </Card>
      ) : filteredScans.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? "No Matching Reports" : "No Assessment Reports Yet"}
          description={
            searchQuery
              ? `No assessments found matching "${searchQuery}".`
              : "Completed security assessments will automatically generate formal ReportLab PDF deliverables and cryptographic evidence ledgers here, or preload sample reports."
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScans(DEMO_SCANS);
                toast({
                  title: "Enterprise Demo Deliverables Loaded",
                  description: "Sample reports and cryptographic ledgers loaded.",
                  variant: "success",
                });
              }}
              className="border-[#C6F432]/30 text-white hover:bg-[#C6F432]/10"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-[#C6F432]" />
              <span>Load Enterprise Demo Reports</span>
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-white/10 dark-card shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-200 min-w-[800px]">
              <thead className="bg-white/[0.02] text-zinc-400 border-b border-white/10 font-semibold text-xs uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-5 py-3.5">Target Scope</th>
                  <th className="px-5 py-3.5">Audit Date & Time</th>
                  <th className="px-5 py-3.5">Preset</th>
                  <th className="px-5 py-3.5">Findings</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Deliverables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredScans.map((scan) => {
                  const dateStr = scan.finished_at || scan.started_at || scan.created_at;
                  const formattedDate = new Date(dateStr).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZoneName: "short",
                  });

                  return (
                    <tr key={scan.id} className="hover:bg-white/5 transition">
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-xs sm:text-sm text-white truncate max-w-xs">
                          {scan.target_url}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-500 mt-0.5">
                          {scan.resolved_ip || "Public IPv4"} · ID: {scan.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-zinc-400">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white/5 text-zinc-300 border border-white/10 capitalize font-mono">
                          {scan.preset}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border font-mono ${
                            scan.finding_count > 0
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30"
                          }`}
                        >
                          {scan.finding_count} Finding{scan.finding_count === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize font-mono ${
                            scan.status === "completed"
                              ? "bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30"
                              : scan.status === "running"
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                              : "bg-white/5 text-zinc-400 border-white/10"
                          }`}
                        >
                          {scan.status === "completed" && (
                            <CheckCircle2 className="w-3 h-3 text-[#C6F432]" />
                          )}
                          <span>{scan.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/dashboard/assessments/${scan.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition shadow-sm"
                            title="View interactive assessment report"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                          <button
                            onClick={() => handleDownloadPdf(scan.id)}
                            disabled={downloadingId === scan.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-[#C6F432]/40 bg-[#C6F432] hover:bg-[#B5E327] text-[#0B0B0C] text-xs font-bold transition shadow-sm disabled:opacity-50"
                            title="Download official ReportLab PDF deliverable"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{downloadingId === scan.id ? "PDF..." : "PDF"}</span>
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(scan.id)}
                            className="inline-flex items-center space-x-1 px-2 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition shadow-sm"
                            title="Delete this assessment deliverable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
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
      )}

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Assessment Record & Deliverables?"
        description="Are you sure you want to permanently delete this assessment record? All associated findings, cryptographic evidence, and generated reports will be permanently purged."
        confirmLabel="Delete Record"
        cancelLabel="Keep Record"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteScan}
      />
    </div>
  );
}
