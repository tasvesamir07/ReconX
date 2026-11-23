import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "glass",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "default" | "glass";
}) {
  const variants = {
    default: "rounded-xl border border-dashed border-line bg-surface/40 px-6 py-14 text-center",
    glass: "rounded-2xl glass-card px-6 py-14 text-center border border-dashed border-border/30",
  };

  return (
    <div
      className={cn(variants[variant], className)}
    >
      {Icon ? (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl glass-pill text-text-muted">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}