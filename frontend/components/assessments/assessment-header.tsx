"use client";

import { useState, useEffect } from "react";
import { Download, StopCircle, Trash2, Clock, Activity } from "lucide-react";
import { Scan as ScanType } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";

interface AssessmentHeaderProps {
  scan: ScanType;
  budgetSeconds?: number;
  evidenceCount: number;
  isTerminal: boolean;
  canDelete?: boolean;
  onStopClick?: () => void;
  onCancelClick?: () => void;
  onDeleteClick?: () => void;
}

export function AssessmentHeader({
  scan,
  budgetSeconds = scan.budget_seconds_snapshot || 300,
  evidenceCount,
  isTerminal,
  canDelete = true,
  onStopClick,
  onCancelClick,
  onDeleteClick,
}: AssessmentHeaderProps) {
  const handleStop = onStopClick || onCancelClick;

  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (isTerminal || !scan.created_at) return;
    const startTime = new Date(scan.created_at).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - startTime) / 1000)));
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [isTerminal, scan.created_at]);

  const remaining = Math.max(0, budgetSeconds - elapsed);

  return (
    <Card className="p-5 sm:p-6 border border-slate-200/90 bg-white shadow-sm space-y-4">
      {/* 1. Header Top Controls Row: Status & Scopes on Left, Actions on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              scan.status === "completed"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : scan.status === "running"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : scan.status === "queued"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : scan.status === "cancelled"
                ? "bg-slate-100 text-slate-700 border border-slate-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                scan.status === "completed"
                  ? "bg-emerald-600"
                  : scan.status === "running"
                  ? "bg-emerald-500 animate-pulse"
                  : scan.status === "queued"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-slate-400"
              }`}
            />
            <span className="capitalize">{scan.status}</span>
          </span>

          {!isTerminal && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm animate-pulse">
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span className="font-mono">
                ⏱️ {elapsed}s elapsed · {remaining}s left ({Math.round(((elapsed) / Math.max(1, budgetSeconds)) * 100)}%)
              </span>
            </span>
          )}

          <Badge variant="outline" className="font-mono text-xs bg-slate-50 border-slate-200 text-slate-700 font-semibold px-2.5 py-0.5">
            Preset: {scan.preset} ({budgetSeconds}s)
          </Badge>

          {scan.resolved_ip && (
            <Badge variant="neutral" className="font-mono text-xs bg-slate-100 border-slate-200 text-slate-700 font-semibold px-2.5 py-0.5">
              IP: {scan.resolved_ip}
            </Badge>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {scan.status === "completed" && (
            <a
              href={`http://localhost:8000/api/v1/scans/${scan.id}/report/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </a>
          )}
          {!isTerminal && handleStop && (
            <Button variant="danger" size="sm" onClick={handleStop}>
              <StopCircle className="w-4 h-4 mr-1.5" />
              <span>Stop Assessment</span>
            </Button>
          )}
          {canDelete && onDeleteClick && (
            <button
              onClick={onDeleteClick}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition shadow-sm"
              title="Permanently delete this assessment and all telemetry"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Target Scope Headline - Full Width with Fluid Typography & Zero Word-Splitting */}
      <div className="flex items-center space-x-3 min-w-0">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-slate-900 tracking-tight break-words select-all">
          {scan.target_url}
        </h1>
        <CopyButton value={scan.target_url} />
      </div>

      {/* 3. Non-Breaking Metadata Chips */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs text-slate-500 pt-0.5">
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-medium text-slate-600 whitespace-nowrap shrink-0">
          <span className="text-slate-400">Initiated:</span>
          <strong className="text-slate-800 font-mono font-semibold">{formatDateTime(scan.created_at)}</strong>
        </span>

        {!isTerminal ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-medium text-emerald-800 whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span className="text-emerald-700">Live Timer:</span>
            <strong className="text-emerald-950 font-mono font-bold">{elapsed}s / {budgetSeconds}s</strong>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-medium text-slate-600 whitespace-nowrap shrink-0">
            <span className="text-slate-400">Total Duration:</span>
            <strong className="text-slate-800 font-mono font-semibold">
              {scan.finished_at && scan.created_at ? `${Math.max(1, Math.round((new Date(scan.finished_at).getTime() - new Date(scan.created_at).getTime()) / 1000))}s` : `${budgetSeconds}s budget`}
            </strong>
          </span>
        )}

        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-medium text-slate-600 whitespace-nowrap shrink-0">
          <span className="text-slate-400">Evidence Records:</span>
          <strong className="text-slate-800 font-mono font-semibold">{evidenceCount}</strong>
        </span>
      </div>
    </Card>
  );
}
