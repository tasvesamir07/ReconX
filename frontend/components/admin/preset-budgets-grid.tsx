"use client";

import { Card } from "@/components/ui/card";

interface PresetBudgetsGridProps {
  policies: any;
}

export function PresetBudgetsGrid({ policies }: PresetBudgetsGridProps) {
  if (!policies || !policies.presets) return null;

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-semibold text-ink text-base">Hard Scan Presets Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(policies.presets).map(([key, val]: any) => (
          <div key={key} className="p-4 rounded-lg bg-canvas border border-line">
            <div className="font-bold text-ink capitalize text-sm">{key} Preset</div>
            <div className="text-xs text-muted mt-1">
              Budget: <span className="font-mono text-accent">{val.budget_seconds} seconds</span>
            </div>
            <div className="text-xs text-muted mt-0.5">
              Concurrency: <span className="font-mono text-accent">{val.max_concurrency} worker</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
