"use client";

import { Card } from "@/components/ui/card";
import type { Finding } from "@/types";

interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface SeverityStripProps {
  findings?: Finding[];
  severityCounts?: SeverityCounts;
  totalFindings?: number;
}

export function SeverityStrip({
  findings,
  severityCounts: rawCounts,
  totalFindings: rawTotal,
}: SeverityStripProps) {
  let counts: SeverityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  if (findings) {
    findings.forEach((f) => {
      if (f.severity === "critical") counts.critical++;
      else if (f.severity === "high") counts.high++;
      else if (f.severity === "medium") counts.medium++;
      else if (f.severity === "low") counts.low++;
      else counts.info++;
    });
  } else if (rawCounts) {
    counts = rawCounts;
  }

  const total = rawTotal ?? (findings ? findings.length : Object.values(counts).reduce((a, b) => a + b, 0));

  return (
    <Card className="p-5 space-y-3 border border-line bg-surface">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">
          Identified Security Findings: <strong className="font-mono text-ink">{total}</strong>
        </span>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 text-[#dc2626] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
            <span>{counts.critical} Critical</span>
          </span>
          <span className="flex items-center space-x-1 text-[#ea580c] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
            <span>{counts.high} High</span>
          </span>
          <span className="flex items-center space-x-1 text-[#d97706] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#d97706]" />
            <span>{counts.medium} Med</span>
          </span>
          <span className="flex items-center space-x-1 text-[#0284c7] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
            <span>{counts.low} Low</span>
          </span>
          <span className="flex items-center space-x-1 text-[#64748b] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#64748b]" />
            <span>{counts.info} Info</span>
          </span>
        </div>
      </div>

      {/* Horizontal Stacked Bar */}
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex border border-line">
        {total === 0 ? (
          <div className="h-full w-full bg-emerald-100" title="Zero findings reported" />
        ) : (
          <>
            {counts.critical > 0 && (
              <div
                style={{ width: `${(counts.critical / total) * 100}%` }}
                className="bg-[#dc2626] h-full transition-all duration-300"
              />
            )}
            {counts.high > 0 && (
              <div
                style={{ width: `${(counts.high / total) * 100}%` }}
                className="bg-[#ea580c] h-full transition-all duration-300"
              />
            )}
            {counts.medium > 0 && (
              <div
                style={{ width: `${(counts.medium / total) * 100}%` }}
                className="bg-[#d97706] h-full transition-all duration-300"
              />
            )}
            {counts.low > 0 && (
              <div
                style={{ width: `${(counts.low / total) * 100}%` }}
                className="bg-[#0284c7] h-full transition-all duration-300"
              />
            )}
            {counts.info > 0 && (
              <div
                style={{ width: `${(counts.info / total) * 100}%` }}
                className="bg-[#64748b] h-full transition-all duration-300"
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
}
