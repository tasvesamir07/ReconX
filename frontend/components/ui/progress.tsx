import { cn } from "@/lib/utils";

type ProgressTone = "accent" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<ProgressTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-subtle",
};

export function Progress({
  value,
  max = 100,
  tone = "accent",
  label,
  valueLabel,
  size = "md",
  className,
}: {
  value: number;
  max?: number;
  tone?: ProgressTone;
  label?: string;
  valueLabel?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const safeMax = max > 0 ? max : 100;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className={cn("space-y-1.5", className)}>
      {label || valueLabel ? (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted">{label}</span>
          {valueLabel ? <span className="tabular-nums text-subtle font-mono">{valueLabel}</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.round(value)}
        aria-label={label ?? "Progress"}
        className={cn(
          "w-full overflow-hidden rounded-full bg-line/80",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", toneClasses[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
