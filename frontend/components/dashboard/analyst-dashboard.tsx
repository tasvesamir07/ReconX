"use client";

import { useState } from "react";
import { Scan, ApprovedAsset, AuthorizationRequest } from "@/types";
import { PostureMetrics } from "@/components/dashboard/posture-metrics";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { PriorityFindings } from "@/components/dashboard/priority-findings";
import { RecentAssessmentsTable } from "@/components/dashboard/recent-assessments-table";
import { SimulationBanner } from "@/components/dashboard/simulation-banner";
import CapitalioDashboardDemo from "@/components/watermelon/capitalio-dashboard/demo";
import { LayoutGrid, Sparkles } from "lucide-react";

interface AnalystDashboardProps {
  scans: Scan[];
  assets: ApprovedAsset[];
  authorizations: AuthorizationRequest[];
  metrics: any;
  onScanDeleted?: (id: string) => void;
}

export function AnalystDashboard({ scans, assets, authorizations, metrics, onScanDeleted }: AnalystDashboardProps) {
  const [dashboardMode, setDashboardMode] = useState<"standard" | "capitalio">("standard");

  const completedScans = scans.filter((s) => s.status === "completed").length;
  const activeScans = scans.filter((s) => ["queued", "running", "provisioning"].includes(s.status)).length;
  const pendingAuthz = authorizations.filter((a) => ["submitted", "under_review"].includes(a.status)).length;

  return (
    <div className="space-y-6 animate-in">
      {/* Simulation Engine Banner */}
      <SimulationBanner />

      {/* Capitalio Layout Switcher Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-white/8">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Security Intelligence</h2>
          <p className="text-xs text-zinc-400">Autonomous vulnerability assessments & cryptographic evidence ledger</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121214] border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setDashboardMode("standard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              dashboardMode === "standard"
                ? "bg-[#18181B] text-[#C6F432] font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Operational Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setDashboardMode("capitalio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              dashboardMode === "capitalio"
                ? "bg-[#C6F432] text-[#0B0B0C] font-bold shadow-[0_0_12px_rgba(198,244,50,0.3)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Capitalio Design</span>
            <span className="text-[9px] font-mono px-1 rounded bg-[#C6F432]/20 text-[#C6F432] group-hover:bg-[#C6F432]/30">PRO</span>
          </button>
        </div>
      </div>

      {dashboardMode === "capitalio" ? (
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <CapitalioDashboardDemo />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Key Metrics Grid with Comfortable Fonts & Icons */}
          <PostureMetrics
            activeScans={activeScans}
            completedScans={completedScans}
            approvedAssetsCount={assets.length}
            pendingAuthzCount={pendingAuthz}
          />

          {/* 2. Real Persisted Data Analytics Charts */}
          <AnalyticsCharts
            postureScore={metrics?.posture_score ?? 100}
            severityCounts={
              metrics?.severity_counts ?? {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                informational: 0,
              }
            }
            trend={metrics?.trend ?? []}
          />

          {/* 3. Priority Needs Attention Findings */}
          <PriorityFindings items={metrics?.needs_attention} />

          {/* 4. Recent Scans Table */}
          <RecentAssessmentsTable
            scans={scans}
            isOversightRole={false}
            onScanDeleted={onScanDeleted}
          />
        </div>
      )}
    </div>
  );
}
