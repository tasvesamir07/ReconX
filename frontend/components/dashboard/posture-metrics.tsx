"use client";

import { Activity, CheckCircle2, ShieldCheck, Hourglass } from "lucide-react";

export interface PostureMetricsProps {
  activeScans: number;
  completedScans: number;
  approvedAssetsCount: number;
  pendingScopesCount?: number;
  pendingAuthzCount?: number;
}

export function PostureMetrics({
  activeScans,
  completedScans,
  approvedAssetsCount,
  pendingScopesCount,
  pendingAuthzCount,
}: PostureMetricsProps) {
  const pending = pendingScopesCount ?? pendingAuthzCount ?? 0;
  const displayActive = activeScans ?? 0;
  const displayCompleted = completedScans ?? 0;
  const displayAssets = approvedAssetsCount ?? 0;
  const displayPending = pending ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Active Assessments */}
      <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div className="flex items-center justify-between text-slate-700">
          <span className="text-sm font-semibold">Active Assessments</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-mono">
            {displayActive}
          </span>
          {displayActive > 0 ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Idle</span>
          )}
        </div>
      </div>

      {/* 2. Completed Scans */}
      <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div className="flex items-center justify-between text-slate-700">
          <span className="text-sm font-semibold">Completed Scans</span>
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-mono">
            {displayCompleted}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Historical assessments
          </span>
        </div>
      </div>

      {/* 3. Approved Assets */}
      <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div className="flex items-center justify-between text-slate-700">
          <span className="text-sm font-semibold">Approved Assets</span>
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-mono">
            {displayAssets}
          </span>
          <span className="text-xs sm:text-sm text-slate-500 font-medium">
            Active LOA scopes
          </span>
        </div>
      </div>

      {/* 4. Pending Scopes */}
      <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div className="flex items-center justify-between text-slate-700">
          <span className="text-sm font-semibold">Pending Scopes</span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <Hourglass className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-mono">
            {displayPending}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Awaiting review
          </span>
        </div>
      </div>
    </div>
  );
}
