"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Terminal, Fingerprint, Layers, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { Scan as ScanType, ScanEvent, Finding, Evidence } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { AssessmentHeader } from "@/components/assessments/assessment-header";
import { ExecutionStepper } from "@/components/assessments/execution-stepper";
import { SeverityStrip } from "@/components/assessments/severity-strip";
import { FindingsTab } from "@/components/assessments/findings-tab";
import { TelemetryTab } from "@/components/assessments/telemetry-tab";
import { EvidenceTab } from "@/components/assessments/evidence-tab";
import { TraceabilityTab } from "@/components/assessments/traceability-tab";
import { RunningActionDock } from "@/components/assessments/running-action-dock";

const TABS = [
  { id: "findings", label: "Security Findings", icon: ShieldAlert },
  { id: "activity", label: "Execution Telemetry & Logs", icon: Terminal },
  { id: "evidence", label: "Cryptographic Evidence", icon: Fingerprint },
  { id: "traceability", label: "Traceability Pipeline", icon: Layers },
] as const;

export default function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: scanId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [scan, setScan] = useState<ScanType | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("findings");
  const [userSelectedTab, setUserSelectedTab] = useState(false);

  useEffect(() => {
    async function fetchScanData() {
      try {
        const [scanData, eventsData, findingsData, evidenceData] = await Promise.all([
          apiRequest<ScanType>(`/scans/${scanId}`),
          apiRequest<ScanEvent[]>(`/scans/${scanId}/events`),
          apiRequest<Finding[]>(`/scans/${scanId}/findings`),
          apiRequest<Evidence[]>(`/scans/${scanId}/evidence`),
        ]);
        setScan(scanData);
        setEvents(eventsData);
        setFindings(findingsData);
        setEvidenceList(evidenceData);

        // Auto-switch tab based on execution state if user hasn't manually pinned a tab
        if (!userSelectedTab) {
          if (scanData.status === "running" || scanData.status === "queued") {
            setActiveTab("activity");
          } else if (scanData.status === "completed") {
            setActiveTab("findings");
          }
        }
      } catch (err: any) {
        if (err?.status === 401 || err?.statusCode === 401 || err?.code === "UNAUTHORIZED") {
          router.replace("/login");
          return;
        }
        console.error("Failed to load scan details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchScanData();
    const interval = setInterval(() => {
      if (scan && !["completed", "cancelled", "failed", "partial"].includes(scan.status)) fetchScanData();
    }, 1000);
    return () => clearInterval(interval);
  }, [scanId, scan?.status, userSelectedTab]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiRequest(`/scans/${scanId}/cancel`, { method: "POST" });
      setScan(await apiRequest<ScanType>(`/scans/${scanId}`));
      toast({ title: "Assessment Cancelled", description: "Background execution was halted.", variant: "warning" });
    } catch (err: any) {
      toast({ title: "Cancellation Failed", description: err.message || "Could not halt assessment.", variant: "error" });
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiRequest(`/scans/${scanId}`, { method: "DELETE" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("reconx_scan_deleted", { detail: { id: scanId } }));
      }
      toast({
        title: "Assessment Deleted",
        description: "The assessment record and all telemetry have been removed.",
        variant: "success",
      });
      router.push("/dashboard");
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message || "Could not delete assessment.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div>
        <SkeletonTable rows={4} />
      </div>
    );
  }

  if (!scan) {
    return <EmptyState icon={AlertCircle} title="Assessment Not Found" description="The requested assessment record does not exist or has been removed." action={<Button variant="secondary" onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>} />;
  }

  const isTerminal = ["completed", "cancelled", "failed", "partial"].includes(scan.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 animate-fade-in">
      <AssessmentHeader
        scan={scan}
        evidenceCount={evidenceList.length}
        isTerminal={isTerminal}
        onStopClick={() => setConfirmCancelOpen(true)}
        onDeleteClick={() => setConfirmDeleteOpen(true)}
      />
      <ExecutionStepper scan={scan} eventsCount={events.length} evidenceCount={evidenceList.length} isTerminal={isTerminal} />
      <SeverityStrip findings={findings} />

      <div className="flex border-b border-line space-x-6 text-sm overflow-x-auto scrollbar-thin whitespace-nowrap pb-px">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              setUserSelectedTab(true);
            }}
            className={`pb-3 font-semibold transition inline-flex items-center space-x-2 ${
              activeTab === id ? "text-emerald-700 border-b-2 border-emerald-600" : "text-muted hover:text-ink"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>
              {label}
              {id === "findings"
                ? ` (${findings.length})`
                : id === "activity"
                ? ` (${events.length})`
                : id === "evidence"
                ? ` (${evidenceList.length})`
                : ""}
            </span>
          </button>
        ))}
      </div>

      {activeTab === "findings" && (
        <FindingsTab findings={findings} evidence={evidenceList} summary={scan.executive_summary} />
      )}
      {activeTab === "activity" && <TelemetryTab events={events} isLive={!isTerminal} />}
      {activeTab === "evidence" && <EvidenceTab evidenceList={evidenceList} />}
      {activeTab === "traceability" && (
        <TraceabilityTab scan={scan} evidenceCount={evidenceList.length} findingsCount={findings.length} />
      )}
      {!isTerminal && (
        <RunningActionDock
          targetUrl={scan.target_url}
          createdAt={scan.created_at}
          budgetSeconds={scan.budget_seconds_snapshot || 300}
          onStopClick={() => setConfirmCancelOpen(true)}
        />
      )}

      <ConfirmDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen} title="Stop Active Assessment?" description="Are you sure you want to emergency halt this running assessment? All active worker checks will be immediately stopped." confirmLabel="Halt Assessment" cancelLabel="Keep Running" variant="danger" loading={cancelling} onConfirm={handleCancel} />
      <ConfirmDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen} title="Delete Assessment Record?" description="Are you sure you want to permanently delete this assessment? All findings, telemetry, evidence, and reports will be removed." confirmLabel="Delete Assessment" cancelLabel="Keep Record" variant="danger" loading={deleting} onConfirm={handleDelete} />
    </div>
  );
}
