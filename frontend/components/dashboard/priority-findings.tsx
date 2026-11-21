"use client";

import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

export interface PriorityFindingItem {
  id: string;
  title: string;
  severity: string;
  scan_id: string;
  created_at?: string;
}

export interface PriorityFindingsProps {
  findings?: PriorityFindingItem[];
  items?: PriorityFindingItem[];
}

export function PriorityFindings({ findings, items }: PriorityFindingsProps) {
  const list = (findings && findings.length > 0 ? findings : items && items.length > 0 ? items : []);

  if (list.length === 0) {
    return null;
  }

  return (
    <div className="p-6 rounded-2xl border border-red-200 bg-red-50/40 space-y-4 shadow-sm">
      <div className="flex items-center space-x-2.5 text-red-700 text-sm font-bold">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <span>Needs Attention — Priority Security Findings</span>
      </div>
      <div className="divide-y divide-red-200/60">
        {list.map((item) => (
          <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
            <div className="flex items-center space-x-3">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase font-mono tracking-wider ${
                item.severity.toUpperCase() === "CRITICAL"
                  ? "bg-red-200/80 text-red-900 border border-red-300"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}>
                {item.severity}
              </span>
              <span className="font-semibold text-slate-900">{item.title}</span>
            </div>
            <Link
              href={`/dashboard/assessments/${item.scan_id}`}
              className="text-xs sm:text-sm text-emerald-700 hover:text-emerald-800 hover:underline font-semibold flex items-center space-x-1.5 transition shrink-0"
            >
              <span>Inspect Evidence</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
