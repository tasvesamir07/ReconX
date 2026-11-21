import { Fingerprint } from "lucide-react";
import { Evidence } from "@/types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { JsonViewer } from "@/components/ui/json-viewer";

interface EvidenceTabProps {
  evidenceList: Evidence[];
}

export function EvidenceTab({ evidenceList }: EvidenceTabProps) {
  if (evidenceList.length === 0) {
    return (
      <EmptyState
        icon={Fingerprint}
        title="No Raw Evidence Persisted Yet"
        description="Evidence items are cryptographically hashed with SHA-256 and stored during worker execution."
      />
    );
  }

  return (
    <div className="space-y-4">
      {evidenceList.map((ev) => (
        <Card key={ev.id} className="p-5 border border-line bg-surface space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {ev.evidence_type}
              </span>
              <span className="text-xs font-medium text-ink">Source: {ev.source}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-subtle font-mono">
                SHA-256: {ev.content_hash.slice(0, 16)}...
              </span>
              <CopyButton value={ev.content_hash} label="Copy Hash" />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted mb-1.5">
              Normalized Raw Payload
            </div>
            <JsonViewer data={ev.normalized_data} />
          </div>
        </Card>
      ))}
    </div>
  );
}
