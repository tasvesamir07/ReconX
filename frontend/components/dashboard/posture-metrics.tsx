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
      <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
        <div className="flex items-center justify-between text-zinc-300">
          <span className="text-xs sm:text-sm font-semibold text-zinc-300">Active Assessments</span>
          <div className="w-9 h-9 rounded-xl bg-[#C6F432]/10 border border-[#C6F432]/30 flex items-center justify-center text-[#C6F432] group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
            {displayActive}
          </span>
          {displayActive > 0 ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30">
              <span className="w-2 h-2 rounded-full bg-[#C6F432] animate-pulse" />
              <span>LIVE</span>
            </span>
          ) : (
            <span className="text-xs text-zinc-500 font-medium font-mono">Idle</span>
          )}
        </div>
      </div>

      {/* 2. Completed Scans */}
      <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
        <div className="flex items-center justify-between text-zinc-300">
          <span className="text-xs sm:text-sm font-semibold text-zinc-300">Completed Scans</span>
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#C6F432]" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
            {displayCompleted}
          </span>
          <span className="text-xs text-zinc-500 font-medium font-sans">
            Historical assessments
          </span>
        </div>
      </div>

      {/* 3. Approved Assets */}
      <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
        <div className="flex items-center justify-between text-zinc-300">
          <span className="text-xs sm:text-sm font-semibold text-zinc-300">Approved Assets</span>
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
            {displayAssets}
          </span>
          <span className="text-xs text-zinc-500 font-medium font-sans">
            Active LOA scopes
          </span>
        </div>
      </div>

      {/* 4. Pending Scopes */}
      <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
        <div className="flex items-center justify-between text-zinc-300">
          <span className="text-xs sm:text-sm font-semibold text-zinc-300">Pending Scopes</span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <Hourglass className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
            {displayPending}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Awaiting review
          </span>
        </div>
      </div>
    </div>
  );
}
