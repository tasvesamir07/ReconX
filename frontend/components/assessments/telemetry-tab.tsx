"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, ArrowDownCircle, Search, Filter } from "lucide-react";
import { ScanEvent } from "@/types";
import { Card } from "@/components/ui/card";

interface TelemetryTabProps {
  events: ScanEvent[];
  isLive?: boolean;
}

export function TelemetryTab({ events, isLive = true }: TelemetryTabProps) {
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events.length, autoScroll]);

  const filteredEvents = searchFilter.trim()
    ? events.filter(
        (ev) =>
          ev.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
          ev.event_type.toLowerCase().includes(searchFilter.toLowerCase()) ||
          ev.severity.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : events;

  return (
    <Card className="p-0 border border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden rounded-xl">
      {/* Terminal Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Kali Linux Worker Telemetry & Execution Stream</span>
          {isLive && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-0.5" />
              <span>LIVE IPC STREAM</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter logs (e.g. cve, curl)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[11px] transition font-medium ${
              autoScroll
                ? "bg-emerald-950/70 border-emerald-600/60 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title="Auto-scroll terminal to newest logs"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Auto-scroll: {autoScroll ? "ON" : "OFF"}</span>
          </button>

          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            {events.length} events
          </span>
        </div>
      </div>

      {/* Terminal Log Console */}
      {events.length === 0 ? (
        <div className="font-mono text-xs text-slate-400 text-center py-16 space-y-2">
          <div className="inline-block w-3 h-3 rounded-full bg-emerald-500/50 animate-ping mb-2" />
          <p className="text-slate-300">Connecting to Kali Linux execution engine IPC stream...</p>
          <p className="text-slate-500 text-[11px]">Worker events and autonomous AI tactical decisions will stream live here.</p>
        </div>
      ) : (
        <div className="p-4 space-y-2 font-mono text-xs max-h-[560px] overflow-y-auto scrollbar-thin pr-2 bg-slate-950/90 select-text">
          {filteredEvents.map((ev, index) => {
            const isDecision = ev.event_type === "ai_decision";
            const isTriage = ev.event_type === "ai_interpretation";
            const isCheckStart = ev.event_type === "check_start";
            const isCheckDone = ev.event_type === "check_complete";
            const isCritical = ev.severity === "critical";

            return (
              <div
                key={ev.id || index}
                className={`p-2.5 rounded-lg border flex items-start space-x-3 transition font-mono ${
                  isDecision
                    ? "bg-rose-950/30 border-rose-800/50 text-rose-100"
                    : isTriage
                    ? "bg-cyan-950/30 border-cyan-800/50 text-cyan-100"
                    : isCheckStart
                    ? "bg-amber-950/20 border-amber-800/40 text-amber-100"
                    : isCheckDone
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-100"
                    : "bg-slate-900/60 border-slate-800 text-slate-300"
                }`}
              >
                {/* Timestamp */}
                <span className="text-slate-500 text-[11px] font-mono flex-shrink-0 pt-0.5">
                  {new Date(ev.created_at).toLocaleTimeString()}
                </span>

                {/* Event Type Badge */}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 border ${
                    isDecision
                      ? "bg-rose-900/70 text-rose-200 border-rose-700/80"
                      : isTriage
                      ? "bg-cyan-900/70 text-cyan-200 border-cyan-700/80"
                      : isCheckDone
                      ? "bg-emerald-900/70 text-emerald-200 border-emerald-700/80"
                      : isCheckStart
                      ? "bg-amber-900/70 text-amber-200 border-amber-700/80"
                      : isCritical
                      ? "bg-red-900 text-red-100 border-red-700"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {isDecision
                    ? "🧠 AI PLANNER"
                    : isTriage
                    ? "🔍 AI TRIAGE"
                    : isCheckStart
                    ? "⚡ PROBE EXEC"
                    : isCheckDone
                    ? "✓ RESULT"
                    : ev.event_type}
                </span>

                {/* Event Log Message */}
                <span className="leading-relaxed flex-1 break-words font-mono text-[12px]">
                  {ev.message}
                </span>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}
    </Card>
  );
}
