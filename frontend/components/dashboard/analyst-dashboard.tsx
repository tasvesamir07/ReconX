"use client";

import { Scan, ApprovedAsset, AuthorizationRequest } from "@/types";
import { PostureMetrics } from "@/components/dashboard/posture-metrics";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { PriorityFindings } from "@/components/dashboard/priority-findings";
import { RecentAssessmentsTable } from "@/components/dashboard/recent-assessments-table";

interface AnalystDashboardProps {
  scans: Scan[];
  assets: ApprovedAsset[];
  authorizations: AuthorizationRequest[];
  metrics: any;
  onScanDeleted?: (id: string) => void;
}

export function AnalystDashboard({ scans, assets, authorizations, metrics, onScanDeleted }: AnalystDashboardProps) {
  const completedScans = scans.filter((s) => s.status === "completed").length;
  const activeScans = scans.filter((s) => ["queued", "running", "provisioning"].includes(s.status)).length;
  const pendingAuthz = authorizations.filter((a) => ["submitted", "under_review"].includes(a.status)).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="pb-2 border-b border-white/8">
        <h2 className="text-lg font-bold text-white tracking-tight">Security Intelligence</h2>
        <p className="text-xs text-zinc-400">Autonomous vulnerability assessments & cryptographic evidence ledger</p>
      </div>

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
    </div>
  );
}
