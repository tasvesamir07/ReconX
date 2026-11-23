import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "accent" | "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<StatTone, string> = {
  accent: "bg-[#C6F432]/10 text-[#C6F432] border border-[#C6F432]/30",
  success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  danger: "bg-red-500/10 text-red-400 border border-red-500/30",
  info: "bg-sky-500/10 text-sky-400 border border-sky-500/30",
  neutral: "bg-white/5 text-zinc-300 border border-white/10",
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
    <Card className={cn("lift p-5 border border-line bg-surface", className)}>
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
