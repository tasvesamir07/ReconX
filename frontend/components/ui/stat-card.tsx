import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "accent" | "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<StatTone, string> = {
  accent: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-sky-50 text-sky-700 border border-sky-200",
  neutral: "bg-slate-50 text-slate-700 border border-slate-200",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <Card className={cn("p-5 border border-line bg-surface hover:border-line-strong transition-colors", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              toneClasses[tone]
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-ink font-mono">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </Card>
  );
}
