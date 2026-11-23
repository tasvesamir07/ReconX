import { Badge } from "@/components/ui/badge";
import type { Finding, Scan } from "@/types";
import { cn } from "@/lib/utils";

const scanStatusMap: Record<
  Scan["status"],
  { label: string; variant: "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "primary-glass" | "success-glass" | "warning-glass" | "danger-glass" | "info-glass" }
> = {
  draft: { label: "Draft", variant: "neutral" },
  validating: { label: "Validating", variant: "info-glass" },
  queued: { label: "Queued", variant: "info-glass" },
  provisioning: { label: "Preparing", variant: "info-glass" },
  running: { label: "Running", variant: "primary-glass" },
  stopping: { label: "Stopping", variant: "warning-glass" },
  completed: { label: "Completed", variant: "success-glass" },
  partial: { label: "Partial", variant: "warning-glass" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  failed: { label: "Failed", variant: "danger-glass" },
  rejected: { label: "Rejected", variant: "danger-glass" },
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

const severityMap: Record<
  Finding["severity"],
  { variant: "danger-glass" | "warning-glass" | "success-glass" | "primary-glass" | "info-glass"; label: string }
> = {
  critical: { label: "Critical", variant: "danger-glass" },
  high: { label: "High", variant: "warning-glass" },
  medium: { label: "Medium", variant: "success-glass" },
  low: { label: "Low", variant: "info-glass" },
  informational: { label: "Info", variant: "info-glass" },
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Finding["severity"];
  className?: string;
}) {
  const meta = severityMap[severity] ?? { label: severity, variant: "info-glass" as const };
  return (
    <Badge variant={meta.variant} className={cn("capitalize", className)}>
      {meta.label}
    </Badge>
  );
}

const confidenceMap: Record<
  Finding["confidence"],
  { label: string; variant: "success-glass" | "warning-glass" | "neutral" | "info-glass" }
> = {
  confirmed: { label: "Confirmed", variant: "success-glass" },
  likely: { label: "Likely", variant: "warning-glass" },
  unconfirmed: { label: "Unconfirmed", variant: "neutral" },
  informational: { label: "Informational", variant: "info-glass" },
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
  { label: string; variant: "neutral" | "primary-glass" | "success-glass" | "warning-glass" | "danger-glass" | "info-glass" }
> = {
  draft: { label: "Draft", variant: "neutral" },
  submitted: { label: "Submitted", variant: "info-glass" },
  under_review: { label: "Under review", variant: "primary-glass" },
  info_requested: { label: "Info requested", variant: "warning-glass" },
  approved: { label: "Approved", variant: "success-glass" },
  rejected: { label: "Rejected", variant: "danger-glass" },
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