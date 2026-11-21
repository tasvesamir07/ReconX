"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Activity, Clock } from "lucide-react";
import { Scan as ScanType } from "@/types";
import { Card } from "@/components/ui/card";

interface ExecutionStepperProps {
  scan: ScanType;
  eventsCount: number;
  evidenceCount: number;
  isTerminal: boolean;
}

export function ExecutionStepper({
  scan,
  eventsCount,
  evidenceCount,
  isTerminal,
}: ExecutionStepperProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (isTerminal) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isTerminal]);

  const createdAt = new Date(scan.created_at).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((now - createdAt) / 1000));
  const budgetSeconds = scan.budget_seconds_snapshot || 300;
  const remainingSeconds = Math.max(0, budgetSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / budgetSeconds) * 100));

  const stages = [
    {
      id: 1,
      name: "Queued",
      active: scan.status === "queued",
      completed: scan.status !== "queued",
    },
    {
      id: 2,
      name: "Policy Verified",
      active: scan.status === "provisioning",
      completed: ["running", "completed", "partial"].includes(scan.status),
    },
    {
      id: 3,
      name: "AI Planning",
      active: scan.status === "running" && eventsCount < 3,
      completed: eventsCount >= 3 || scan.status === "completed",
    },
    {
      id: 4,
      name: "Worker Execution",
      active: scan.status === "running" && eventsCount >= 3,
      completed: scan.status === "completed",
    },
    {
      id: 5,
      name: "Evidence Verified",
      active: false,
      completed: evidenceCount > 0 || scan.status === "completed",
    },
    {
      id: 6,
      name: "Report Generated",
      active: false,
      completed: scan.status === "completed",
    },
  ];

  return (
    <Card className="p-5 border border-line bg-surface space-y-4">
      <div className="flex items-center justify-between text-xs font-medium text-muted">
        <span>Execution Pipeline</span>
        <span className="font-mono text-xs text-muted">
          Preset: {scan.preset} ({budgetSeconds}s)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`p-2.5 rounded-lg border text-center transition ${
              stage.completed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : stage.active
                ? "border-emerald-300 bg-emerald-100/70 text-emerald-900 ring-1 ring-emerald-400"
                : "border-line bg-slate-50 text-subtle"
            }`}
          >
            <div className="flex items-center justify-center space-x-1.5 mb-1">
              {stage.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : stage.active ? (
                <Activity className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] font-mono text-slate-500">
                  {stage.id}
                </span>
              )}
            </div>
            <div className="text-xs font-semibold truncate">{stage.name}</div>
          </div>
        ))}
      </div>

      {/* Real-time Time-Budget Countdown Bar */}
      {!isTerminal && (
        <div className="pt-3 border-t border-line space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>
                Elapsed: <strong className="text-ink font-mono">{elapsedSeconds}s</strong>
              </span>
              <span>/</span>
              <span>
                Remaining: <strong className="text-ink font-mono">{remainingSeconds}s</strong>
              </span>
            </div>
            <span className="font-mono text-emerald-400 font-semibold">
              {progressPercent}% Time Allocated
            </span>
          </div>
          <div className="h-1.5 w-full bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000 ease-linear rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
