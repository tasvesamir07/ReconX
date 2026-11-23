export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
}

const segments = [
  { key: "critical" as const, label: "Critical", color: "#dc2626" },
  { key: "high" as const, label: "High", color: "#ea580c" },
  { key: "medium" as const, label: "Medium", color: "#d97706" },
  { key: "low" as const, label: "Low", color: "#0284c7" },
  { key: "informational" as const, label: "Info", color: "#64748b" },
];

export function SeverityDonut({ counts }: { counts: SeverityCounts }) {
  const total = segments.reduce((sum, segment) => sum + (counts[segment.key] ?? 0), 0);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Centered Donut SVG */}
      <div className="relative h-36 w-36 shrink-0">
        <svg
          viewBox="0 0 140 140"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={
            total === 0
              ? "No findings recorded"
              : `Severity distribution: ${segments
                  .map((segment) => `${segment.label} ${counts[segment.key] ?? 0}`)
                  .join(", ")}`
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
          {segments.map((segment) => {
            const value = counts[segment.key] ?? 0;
            const length = total > 0 ? (value / total) * circumference : 0;
            if (length <= 0) return null;
            const dash = `${length} ${circumference - length}`;
            const element = (
              <circle
                key={segment.key}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return element;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-ink font-mono">
            {total}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle font-mono mt-0.5">
            FINDINGS
          </span>
        </div>
      </div>

      {/* Symmetrical & Non-Overlapping Legend Below */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 pt-4 mt-3 border-t border-line/60">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="flex items-center justify-between gap-1.5 min-w-0 bg-white/[0.03] hover:bg-white/[0.06] px-2 py-1 rounded-md border border-white/10 transition-colors"
          >
            <span className="flex items-center gap-1.5 min-w-0 truncate text-[11px] text-zinc-400">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: segment.color }}
                aria-hidden="true"
              />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="font-mono font-semibold text-[11px] text-ink tabular-nums shrink-0 ml-1">
              {counts[segment.key] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
