export interface TrendPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
}

export function TrendBars({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-subtle">
        No scan activity recorded yet.
      </div>
    );
  }

  const width = 520;
  const height = 150;
  const chartTop = 10;
  const chartBottom = 120;
  const chartHeight = chartBottom - chartTop;
  const max = Math.max(1, ...data.map((point) => point.total));
  const slot = width / data.length;
  const barWidth = Math.max(8, Math.min(26, slot - 8));
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label="Scan activity over the last 14 days"
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          x1="0"
          y1={chartBottom}
          x2={width}
          y2={chartBottom}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        {data.map((point, index) => {
          const totalHeight = (point.total / max) * chartHeight;
          const completedHeight = (point.completed / max) * chartHeight;
          const x = index * slot + (slot - barWidth) / 2;
          const label =
            point.total === 0
              ? `${point.date}: no scans`
              : `${point.date}: ${point.total} scan${point.total === 1 ? "" : "s"}, ${point.completed} completed`;
          return (
            <g key={point.date}>
              <title>{label}</title>
              <rect
                x={x}
                y={chartBottom - totalHeight}
                width={barWidth}
                height={Math.max(totalHeight, point.total > 0 ? 3 : 0)}
                rx="3"
                fill="#f1f5f9"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              {point.completed > 0 ? (
                <rect
                  x={x}
                  y={chartBottom - completedHeight}
                  width={barWidth}
                  height={Math.max(completedHeight, 3)}
                  rx="3"
                  fill="#059669"
                  opacity="0.9"
                />
              ) : null}
              {index % labelEvery === 0 ? (
                <text
                  x={index * slot + slot / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {formatDay(point.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-accent" aria-hidden="true" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#f1f5f9] border border-[#cbd5e1]" aria-hidden="true" />
          Total scans
        </span>
      </div>
    </div>
  );
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
