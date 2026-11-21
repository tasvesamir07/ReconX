import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger";

const variants: Record<
  AlertVariant,
  { icon: typeof Info; container: string; iconClass: string }
> = {
  info: {
    icon: Info,
    container: "border-info/30 bg-info/10",
    iconClass: "text-info",
  },
  success: {
    icon: CheckCircle2,
    container: "border-success/30 bg-success/10",
    iconClass: "text-success",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-warning/30 bg-warning/10",
    iconClass: "text-warning",
  },
  danger: {
    icon: XCircle,
    container: "border-danger/30 bg-danger/10",
    iconClass: "text-danger",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  action,
  className,
}: {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const meta = variants[variant];
  const Icon = meta.icon;
  return (
    <div
      role={variant === "danger" || variant === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5",
        meta.container,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", meta.iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold text-ink">{title}</p> : null}
        {children ? (
          <div className={cn("text-sm leading-relaxed text-muted", title && "mt-1")}>
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
