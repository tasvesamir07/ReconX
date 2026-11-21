import { cn } from "@/lib/utils";

export function PostureGauge({
  score,
  label,
  detail,
}: {
  score: number | null;
  label: string;
  detail?: string;
}) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const safeScore = score === null ? 0 : Math.max(0, Math.min(100, score));
  const color =
    score === null
      ? "#94a3b8"
      : safeScore >= 80
      ? "#059669"
      : safeScore >= 60
      ? "#0284c7"
      : safeScore >= 40
      ? "#d97706"
      : "#dc2626";

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative h-36 w-36 shrink-0">
        <svg
          viewBox="0 0 140 140"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={
            score === null ? "Posture score unavailable" : `Posture score ${score} out of 100`
          }
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          {score !== null ? (
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(safeScore / 100) * circumference} ${circumference}`}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-ink font-mono">
            {score === null ? "—" : score}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle font-mono mt-0.5">
            / 100
          </span>
        </div>
      </div>

      <div className="w-full pt-4 mt-3 border-t border-line/60 text-center">
        <p className={cn("text-xs font-semibold", score === null ? "text-subtle" : "text-ink")}>
          {label}
        </p>
        {detail ? <p className="mt-1 text-center text-[11px] text-muted truncate">{detail}</p> : null}
      </div>
    </div>
  );
}
