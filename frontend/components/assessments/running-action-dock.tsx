"use client";

import { useState, useEffect } from "react";
import { StopCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RunningActionDockProps {
  targetUrl: string;
  createdAt?: string;
  budgetSeconds?: number;
  onStopClick: () => void;
}

export function RunningActionDock({
  targetUrl,
  createdAt,
  budgetSeconds = 300,
  onStopClick,
}: RunningActionDockProps) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!createdAt) return;
    const startTime = new Date(createdAt).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - startTime) / 1000)));
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [createdAt]);

  const remaining = Math.max(0, budgetSeconds - elapsed);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[calc(100%-2rem)] rounded-full bg-slate-900/95 backdrop-blur-md border border-slate-700 px-5 py-2.5 shadow-2xl flex items-center justify-between ring-1 ring-emerald-500/30 animate-slide-up text-white">
      <div className="flex items-center space-x-2.5 text-xs min-w-0 pr-3">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
        <span className="text-emerald-400 text-[11px] uppercase font-bold tracking-wider flex-shrink-0">
          Auditing:
        </span>
        <span className="font-mono font-semibold text-white truncate max-w-[130px] sm:max-w-[200px]">
          {targetUrl}
        </span>
        <span className="hidden sm:inline-flex items-center space-x-1 pl-2 border-l border-slate-700 text-[11px] font-mono text-emerald-300">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{elapsed}s elapsed · {remaining}s left</span>
        </span>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        <Button
          variant="danger"
          size="sm"
          className="text-xs py-1 h-7 rounded-full px-3 bg-rose-600 hover:bg-rose-700 text-white border-none shadow-sm"
          onClick={onStopClick}
          aria-label={`Halt assessment for ${targetUrl}`}
        >
          <StopCircle className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
          <span>Halt</span>
        </Button>
      </div>
    </div>
  );
}
