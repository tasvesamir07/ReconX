import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

export function JsonViewer({
  data,
  className,
  maxHeight = "16rem",
}: {
  data: unknown;
  className?: string;
  maxHeight?: string;
}) {
  const text = JSON.stringify(data ?? null, null, 2);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-canvas/70", className)}>
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
          JSON payload
        </span>
        <CopyButton value={text} label="Copy" />
      </div>
      <pre
        className="overflow-auto p-3 font-mono text-[11px] leading-relaxed text-muted scrollbar-thin"
        style={{ maxHeight }}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}
