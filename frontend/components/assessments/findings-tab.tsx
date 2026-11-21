"use client";

import { useState } from "react";
import { ShieldCheck, ChevronDown, Copy } from "lucide-react";
import { Finding } from "@/types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";

interface FindingsTabProps {
  findings: Finding[];
}

export function FindingsTab({ findings }: FindingsTabProps) {
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  const toggleFindingExpand = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (findings.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No Weaknesses Identified"
        description="No policy violations or misconfigurations were discovered for this target scope."
      />
    );
  }

  return (
    <div className="space-y-4">
      {findings.map((finding) => {
        const isExpanded = expandedFindings[finding.id];
        return (
          <Card key={finding.id} className="overflow-hidden border border-line bg-surface">
            <div className="p-5 flex items-start justify-between hover:bg-elevated/40 transition gap-4">
              <div className="flex items-start space-x-3">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold uppercase mt-0.5 font-mono ${
                    finding.severity === "critical"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : finding.severity === "high"
                      ? "bg-orange-50 text-orange-700 border border-orange-200"
                      : finding.severity === "medium"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-sky-50 text-sky-700 border border-sky-200"
                  }`}
                >
                  {finding.severity}
                </span>
                <div>
                  <h3 className="font-semibold text-ink text-base">{finding.title}</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{finding.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 flex-shrink-0">
                <span className="text-[11px] text-subtle font-mono capitalize px-2 py-0.5 rounded bg-elevated border border-line">
                  Confidence: {finding.confidence}
                </span>
                <button
                  type="button"
                  onClick={() => toggleFindingExpand(finding.id)}
                  aria-label={isExpanded ? `Collapse finding ${finding.title}` : `Expand finding ${finding.title}`}
                  className="p-1 text-subtle hover:text-ink transition"
                  tabIndex={0}
                >
                  <ChevronDown
                    className={`w-4 h-4 text-subtle transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {/* Expandable Details */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-3 border-t border-line bg-elevated/40 space-y-4 text-xs animate-fade-in">
                {finding.impact && (
                  <div>
                    <span className="font-semibold text-ink block mb-1">Potential Impact:</span>
                    <p className="text-muted leading-relaxed">{finding.impact}</p>
                  </div>
                )}

                {finding.remediation && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-emerald-700">
                        Remediation & Defense Guidance:
                      </span>
                      <CopyButton value={finding.remediation} label="Copy Remediation" />
                    </div>
                    <pre className="text-slate-800 leading-relaxed font-mono text-[11px] bg-slate-50 p-3 rounded-lg border border-line overflow-x-auto scrollbar-thin whitespace-pre-wrap break-all">
                      <code>{finding.remediation}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
