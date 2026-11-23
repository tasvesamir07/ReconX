import { cn } from "@/lib/utils";

type ProgressTone = "accent" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<ProgressTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-accentWarm",
  danger: "bg-destructive",
  neutral: "bg-text-subtle",
};

export function Progress({
  value,
  max = 100,
  tone = "accent",
  label,
  valueLabel,
  size = "md",
  variant = "glass",
  className,
}: {
  value: number;
  max?: number;
  tone?: ProgressTone;
  label?: string;
  valueLabel?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass";
  className?: string;
}) {
  const safeMax = max > 0 ? max : 100;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));

  const variants = {
    default: "w-full overflow-hidden rounded-full bg-line/80",
    glass: "w-full overflow-hidden rounded-full bg-surface/40 backdrop-blur-sm border border-border/30",
  };

  const sizes = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label || valueLabel ? (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-text-muted">{label}</span>
          {valueLabel ? <span className="tabular-nums text-text-subtle font-mono">{valueLabel}</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.round(value)}
        aria-label={label ?? "Progress"}
        className={cn(variants[variant], sizes[size])}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-smooth", toneClasses[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}