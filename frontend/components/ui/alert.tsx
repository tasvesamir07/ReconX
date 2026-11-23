import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger";

const variants: Record<
  AlertVariant,
  { icon: typeof Info; container: string; iconClass: string; border: string }
> = {
  info: {
    icon: Info,
    container: "glass-card bg-accentCool/10",
    iconClass: "text-accentCool",
    border: "border-accentCool/30",
  },
  success: {
    icon: CheckCircle2,
    container: "glass-card bg-success/10",
    iconClass: "text-success",
    border: "border-success/30",
  },
  warning: {
    icon: AlertTriangle,
    container: "glass-card bg-accentWarm/10",
    iconClass: "text-accentWarm",
    border: "border-accentWarm/30",
  },
  danger: {
    icon: XCircle,
    container: "glass-card bg-destructive/10",
    iconClass: "text-destructive",
    border: "border-destructive/30",
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
        "flex items-start gap-3 rounded-xl px-4 py-3.5",
        meta.container,
        meta.border,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", meta.iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold text-text">{title}</p> : null}
        {children ? (
          <div className={cn("text-sm leading-relaxed text-text-muted", title && "mt-1")}>
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}