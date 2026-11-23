import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

export function JsonViewer({
  data,
  className,
  maxHeight = "16rem",
  variant = "glass",
}: {
  data: unknown;
  className?: string;
  maxHeight?: string;
  variant?: "default" | "glass";
}) {
  const text = JSON.stringify(data ?? null, null, 2);

  const variants = {
    default: "overflow-hidden rounded-lg border border-line bg-canvas/70",
    glass: "overflow-hidden rounded-xl glass-card border border-border/50",
  };

  return (
    <div className={cn(variants[variant], className)}>
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          JSON payload
        </span>
        <CopyButton value={text} label="Copy" variant="ghost-glass" size="sm" />
      </div>
      <pre
        className="overflow-auto p-3 font-mono text-[11px] leading-relaxed text-text scrollbar-thin"
        style={{ maxHeight }}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}