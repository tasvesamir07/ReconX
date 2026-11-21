"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { Scan } from "@/types";
import { apiRequest } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface RecentAssessmentsTableProps {
  scans: Scan[];
  isOversightRole: boolean;
  onScanDeleted?: (id: string) => void;
}

export function RecentAssessmentsTable({ scans, isOversightRole, onScanDeleted }: RecentAssessmentsTableProps) {
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const handleDeleteScan = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);

    try {
      await apiRequest(`/scans/${deleteTargetId}`, { method: "DELETE" });
      toast({
        title: "Assessment Deleted",
        description: "The assessment record has been permanently removed.",
        variant: "success",
      });
      setDeletedIds((prev) => [...prev, deleteTargetId]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("reconx_scan_deleted", { detail: { id: deleteTargetId } }));
      }
      if (onScanDeleted) {
        onScanDeleted(deleteTargetId);
      }
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

  const rows = scans
    .filter((s) => !deletedIds.includes(s.id))
    .slice(0, 8)
    .map((s, idx) => ({
      id: s.id,
      url: s.target_url,
      meta: s.resolved_ip ? `${s.resolved_ip} · ID: ${s.id.slice(0, 8)}` : `198.51.100.${idx + 10} · ID: ${s.id.slice(0, 8)}`,
      preset: s.preset ? s.preset.charAt(0).toUpperCase() + s.preset.slice(1) : "Moderate",
      status: s.status,
      budget: `${s.budget_seconds_snapshot || 300}s`,
      started: new Date(s.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " · UTC",
    }));

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Running</span>
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base sm:text-lg text-slate-900">Recent Assessments</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Authorized scans dispatched to isolated Kali Linux workers
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition w-fit shadow-sm"
        >
          <span>View All</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Table Content with Comfortable Sizing */}
      {rows.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <p className="font-semibold text-slate-800">No assessments found</p>
          <p className="text-xs text-slate-400 mt-1">
            Launch a new assessment to begin testing authorized target scopes.
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
                <th className="px-6 py-4">Budget</th>
                <th className="px-6 py-4">Started Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-sm text-slate-900 break-words max-w-sm select-all">{row.url}</div>
                    <div className="font-mono text-xs text-slate-400 mt-1">{row.meta}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {row.preset}
                    </span>
                  </td>
                  <td className="px-6 py-4">{renderStatusBadge(row.status)}</td>
                  <td className="px-6 py-4 font-mono font-medium text-slate-600 text-sm">{row.budget}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{row.started}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/dashboard/assessments/${row.id}`}
                        className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-slate-800 hover:text-emerald-700 hover:underline"
                      >
                        <span>Telemetry</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setDeleteTargetId(row.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                        title="Delete assessment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Assessment Record?"
        description="Are you sure you want to delete this assessment? All associated worker telemetry and findings will be removed."
        confirmLabel="Delete Assessment"
        cancelLabel="Keep Record"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteScan}
      />
    </div>
  );
}
