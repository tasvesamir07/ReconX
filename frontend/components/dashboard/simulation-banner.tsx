"use client";

import { useState, useEffect } from "react";
import { Sparkles, Database, RotateCcw, ShieldCheck, Cpu } from "lucide-react";
import { isSimulationActive, setSimulationActive } from "@/lib/demo-simulation";
import { clearApiCache } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

export function SimulationBanner({ onDataRefresh }: { onDataRefresh?: () => void }) {
  const { toast } = useToast();
  const [active, setActive] = useState(true);

  useEffect(() => {
    setActive(isSimulationActive());
    const handleToggle = (e: Event) => {
      const custom = e as CustomEvent<{ active: boolean }>;
      setActive(custom.detail?.active ?? true);
    };
    window.addEventListener("reconx_simulation_toggled", handleToggle);
    return () => window.removeEventListener("reconx_simulation_toggled", handleToggle);
  }, []);

  const handleToggleMode = () => {
    const next = !active;
    setSimulationActive(next);
    clearApiCache();
    toast({
      title: next ? "Simulation Mode Activated" : "Live Workspace Mode Activated",
      description: next
        ? "Displaying pre-populated high-assurance enterprise security telemetry and LOA scopes."
        : "Displaying live production data directly from your backend services.",
      variant: "success",
    });
    if (onDataRefresh) onDataRefresh();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("reconx_scope_submitted"));
      window.dispatchEvent(new Event("reconx_scan_created"));
    }
  };

  const handleResetData = () => {
    setSimulationActive(true);
    clearApiCache();
    toast({
      title: "Enterprise Simulation Reset",
      description: "Sample assets, LOA records, and Kali worker telemetry restored.",
      variant: "info",
    });
    if (onDataRefresh) onDataRefresh();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("reconx_scope_submitted"));
      window.dispatchEvent(new Event("reconx_scan_created"));
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#C6F432]/30 bg-gradient-to-r from-[#121214] via-[#151710] to-[#121214] p-3.5 sm:p-4 text-white shadow-[0_4px_24px_rgba(198,244,50,0.06)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#C6F432]/10 border border-[#C6F432]/30 text-[#C6F432]">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C6F432] font-mono">
                {active ? "Enterprise Simulation Active" : "Live Cluster Mode"}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30">
                4 Kali Workers Online
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {active
                ? "Simulating ISO-27001 LOA dual-control scopes, real-time Kali telemetry, and CVE vulnerability analysis."
                : "Connected to live API backend. All operations target live provisioned assets."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {active && (
            <button
              onClick={handleResetData}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
              title="Reset simulation data to default baseline"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C6F432]" />
              <span className="hidden md:inline">Reset Baseline</span>
            </button>
          )}

          <button
            onClick={handleToggleMode}
            type="button"
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
              active
                ? "bg-[#C6F432] text-[#0B0B0C] hover:bg-[#b5e327]"
                : "bg-white/10 text-white hover:bg-white/15 border border-white/15"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{active ? "Simulation Mode" : "Switch to Simulation"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
