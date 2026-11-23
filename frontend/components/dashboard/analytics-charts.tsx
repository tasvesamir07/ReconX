"use client";

import { TrendPoint, TrendBars } from "@/components/charts/trend-bars";

interface AnalyticsChartsProps {
  postureScore: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  trend: TrendPoint[];
}

export function AnalyticsCharts({ postureScore, severityCounts, trend }: AnalyticsChartsProps) {
  const critical = severityCounts?.critical || 0;
  const high = severityCounts?.high || 0;
  const medium = severityCounts?.medium || 0;
  const low = severityCounts?.low || 0;
  const info = severityCounts?.informational || 0;
  const totalFindings = critical + high + medium + low + info;

  const trendList = trend || [];
  const totalTrendScans = trendList.reduce((acc, t) => acc + (t.total || 0), 0);
  const startDate = trendList[0]?.date || "14d ago";
  const midDate = trendList[Math.floor(trendList.length / 2)]?.date || "7d ago";
  const endDate = trendList[trendList.length - 1]?.date || "Today";

  const score =
    totalFindings === 0
      ? 100
      : postureScore > 0
      ? postureScore
      : Math.max(10, 100 - (critical * 25 + high * 15 + medium * 5 + low * 2));

  const grade =
    totalFindings === 0
      ? "Grade A+"
      : score >= 90
      ? "Grade A"
      : score >= 80
      ? "Grade B+"
      : score >= 70
      ? "Grade B"
      : score >= 60
      ? "Grade C"
      : "Grade D";

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (score / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* 1. Posture Score Card */}
      <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Posture Score</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Overall security hygiene</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30 font-mono">
              {grade}
            </span>
          </div>

          {/* Donut Chart */}
          <div className="py-7 flex items-center justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="11"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#C6F432"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-bold font-mono text-white tracking-tight">
                  {score}
                </span>
                <span className="text-xs font-semibold uppercase text-zinc-500 font-mono mt-0.5">
                  / 100
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-mono">
            {totalFindings} confirmed {totalFindings === 1 ? "finding" : "findings"}
          </span>
          {totalFindings === 0 ? (
            <span className="text-[#C6F432] font-semibold font-mono">100% Secure</span>
          ) : (
            <span className="text-zinc-300 font-semibold font-mono">{score}/100 Rating</span>
          )}
        </div>
      </div>

      {/* 2. Severity Breakdown Card */}
      <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Severity Breakdown</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Confirmed vulnerabilities</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-zinc-300 border border-white/10 font-mono">
              {totalFindings} total
            </span>
          </div>

          {/* Segmented Horizontal Progress Bar */}
          <div className="mt-6 mb-6 h-3 w-full bg-white/10 rounded-full flex overflow-hidden gap-0.5">
            {totalFindings === 0 ? (
              <div className="w-full bg-[#C6F432]/30 h-full rounded-full" title="Zero vulnerabilities reported" />
            ) : (
              <>
                <div style={{ width: `${(critical / totalFindings) * 100}%` }} className="bg-red-500 h-full rounded-l-full" />
                <div style={{ width: `${(high / totalFindings) * 100}%` }} className="bg-orange-500 h-full" />
                <div style={{ width: `${(medium / totalFindings) * 100}%` }} className="bg-amber-500 h-full" />
                <div style={{ width: `${(low / totalFindings) * 100}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${(info / totalFindings) * 100}%` }} className="bg-zinc-500 h-full rounded-r-full" />
              </>
            )}
          </div>

          {/* List of Severities */}
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span className="font-medium">Critical</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">{critical}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span className="font-medium">High</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">{high}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-medium">Medium</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">{medium}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-medium">Low</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">{low}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 shrink-0" />
                <span className="font-medium">Info</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">{info}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 14-Day Activity Trend Card */}
      <div className="dark-card p-6 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all group">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base text-white">14-Day Activity Trend</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Assessments completed per day</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-zinc-300 border border-white/10 font-mono">
              {totalTrendScans} {totalTrendScans === 1 ? "scan" : "scans"}
            </span>
          </div>

          {/* Real Dynamic 14-Day Activity Bar Chart */}
          <div className="mt-6 mb-2">
            <TrendBars data={trendList} />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>{startDate}</span>
          <span>{midDate}</span>
          <span>{endDate}</span>
        </div>
      </div>
    </div>
  );
}
