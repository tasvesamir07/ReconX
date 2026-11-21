"use client";

import Link from "next/link";
import { Radio, Terminal, StopCircle } from "lucide-react";
import { Scan } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlatformScansTableProps {
  scans: Scan[];
  activeScansCount: number;
  onStopScan: (id: string) => void;
}

export function PlatformScansTable({
  scans,
  activeScansCount,
  onStopScan,
}: PlatformScansTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-line flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-accent animate-pulse" />
          <h3 className="font-semibold text-ink text-base">Live Platform Assessments (All Workspaces)</h3>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {activeScansCount} active scan(s) in progress
        </Badge>
      </div>

      {scans.length === 0 ? (
        <div className="p-12 text-center text-muted text-sm">
          No assessments currently recorded on the platform.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-canvas uppercase tracking-wider text-subtle border-b border-line">
              <tr>
                <th className="px-5 py-3">Target URL</th>
                <th className="px-5 py-3">Preset</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Budget</th>
                <th className="px-5 py-3">Started</th>
                <th className="px-5 py-3 text-right">Monitoring Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-sans">
              {scans.map((scan) => (
                <tr key={scan.id} className="hover:bg-elevated/40 transition">
                  <td className="px-5 py-3 font-mono text-accent">{scan.target_url}</td>
                  <td className="px-5 py-3 capitalize font-medium">{scan.preset}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        scan.status === "completed"
                          ? "bg-success/10 text-success border border-success/30"
                          : scan.status === "running" || scan.status === "queued"
                          ? "bg-accent/10 text-accent border border-accent/30 animate-pulse"
                          : scan.status === "cancelled"
                          ? "bg-elevated text-muted border border-line"
                          : "bg-danger/10 text-danger border border-danger/30"
                      }`}
                    >
                      {scan.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted font-mono">{scan.budget_seconds_snapshot}s</td>
                  <td className="px-5 py-3 text-muted">{formatDateTime(scan.created_at)}</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <Link
                      href={`/dashboard/assessments/${scan.id}`}
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded-md bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 font-semibold transition"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Inspect Live Logs</span>
                    </Link>
                    {(scan.status === "running" || scan.status === "queued") && (
                      <button
                        onClick={() => onStopScan(scan.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 font-semibold transition"
                        title="Emergency stop active scan"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
