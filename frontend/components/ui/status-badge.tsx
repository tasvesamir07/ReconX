import { Badge } from "@/components/ui/badge";
import type { Finding, Scan } from "@/types";
import { cn } from "@/lib/utils";

const scanStatusMap: Record<
  Scan["status"],
  { label: string; variant: "neutral" | "primary" | "success" | "warning" | "danger" | "info" }
> = {
  draft: { label: "Draft", variant: "neutral" },
  validating: { label: "Validating", variant: "info" },
  queued: { label: "Queued", variant: "info" },
  provisioning: { label: "Preparing", variant: "info" },
  running: { label: "Running", variant: "primary" },
  stopping: { label: "Stopping", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  failed: { label: "Failed", variant: "danger" },
  rejected: { label: "Rejected", variant: "danger" },
};

export function ScanStatusBadge({
  status,
  className,
}: {
  status: Scan["status"];
  className?: string;
}) {
  const meta = scanStatusMap[status] ?? { label: status, variant: "neutral" as const };
  return (
    <Badge variant={meta.variant} dot className={className}>
      {meta.label}
    </Badge>
  );
}

const severityClasses: Record<Finding["severity"], string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-sky-200 bg-sky-50 text-sky-700",
  informational: "border-slate-200 bg-slate-50 text-slate-700",
};

const severityLabels: Record<Finding["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  informational: "Info",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Finding["severity"];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        severityClasses[severity] ?? severityClasses.informational,
        className
      )}
    >
      {severityLabels[severity] ?? severity}
    </span>
  );
}

const confidenceMap: Record<
  Finding["confidence"],
  { label: string; variant: "success" | "warning" | "neutral" | "info" }
> = {
  confirmed: { label: "Confirmed", variant: "success" },
  likely: { label: "Likely", variant: "warning" },
  unconfirmed: { label: "Unconfirmed", variant: "neutral" },
  informational: { label: "Informational", variant: "info" },
};

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: Finding["confidence"];
  className?: string;
}) {
  const meta = confidenceMap[confidence] ?? confidenceMap.unconfirmed;
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}

const authorizationStatusMap: Record<
  string,
  { label: string; variant: "neutral" | "primary" | "success" | "warning" | "danger" | "info" }
> = {
  draft: { label: "Draft", variant: "neutral" },
  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under review", variant: "primary" },
  info_requested: { label: "Info requested", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  expired: { label: "Expired", variant: "neutral" },
};

export function AuthorizationStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = authorizationStatusMap[status] ?? {
    label: status,
    variant: "neutral" as const,
  };
  return (
    <Badge variant={meta.variant} dot className={className}>
      {meta.label}
    </Badge>
  );
}
