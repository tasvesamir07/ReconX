"use client";

import { HardDrive, Cpu, Activity } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface SystemHealthGridProps {
  health: any;
  activeScansCount: number;
}

export function SystemHealthGrid({ health, activeScansCount }: SystemHealthGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <StatCard
        label="System Status"
        value={health?.status ? health.status.toUpperCase() : "OPERATIONAL"}
        hint="PostgreSQL Database: Connected"
        icon={HardDrive}
        tone="success"
      />

      <StatCard
        label="AI Model Orchestrator"
        value={`${health?.ai_primary_provider || "Groq"} → ${health?.ai_fallback_provider || "Gemini"}`}
        hint="Deterministic fallback chain"
        icon={Cpu}
        tone="accent"
      />

      <StatCard
        label="Worker Concurrency Limit"
        value={`${activeScansCount} / ${health?.worker_concurrency_limit || 5}`}
        hint="Active execution slots allocated"
        icon={Activity}
        tone="info"
      />
    </div>
  );
}
