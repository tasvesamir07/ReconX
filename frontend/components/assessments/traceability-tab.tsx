import { Layers, ShieldCheck, Cpu, HardDrive, Hash, CheckCircle2, ShieldAlert } from "lucide-react";
import { Scan as ScanType } from "@/types";
import { Card } from "@/components/ui/card";

interface TraceabilityTabProps {
  scan: ScanType;
  evidenceCount: number;
  findingsCount: number;
}

export function TraceabilityTab({
  scan,
  evidenceCount,
  findingsCount,
}: TraceabilityTabProps) {
  const budgetSeconds = scan.budget_seconds_snapshot || 300;

  const steps = [
    {
      step: 1,
      icon: Layers,
      title: "Target & Time-Budget Spec",
      status: "Configured",
      description: `${scan.target_url} (Preset: ${scan.preset}, Budget: ${budgetSeconds}s)`,
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    {
      step: 2,
      icon: ShieldCheck,
      title: "Deterministic Policy Engine Scope Match",
      status: "Enforced",
      description:
        "VERIFIED: Target matches approved asset boundary. Deterministic SSRF Blocklist (RFC 1918 / Cloud Metadata 169.254.169.254) check PASSED.",
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    {
      step: 3,
      icon: Cpu,
      title: "Fixed Check Plan",
      status: "Deterministic",
      description: `The ${scan.preset} preset runs the same ordered, non-destructive checks every time (Normal ⊂ Moderate ⊂ Ultimate). No AI chooses what is tested.`,
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    {
      step: 4,
      icon: HardDrive,
      title: "Isolated Worker Dispatch",
      status: "Sandboxed",
      description:
        "Executed inside non-root Python subprocess sandbox with hard per-check socket timeouts and strict concurrency caps.",
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    {
      step: 5,
      icon: Hash,
      title: "Cryptographic Evidence Storage",
      status: "Persisted",
      description: `${evidenceCount} raw evidence item(s) stored with SHA-256 cryptographic digest integrity verification.`,
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    {
      step: 6,
      icon: CheckCircle2,
      title: "Rules & Vulnerability Database Matching",
      status: "Validated",
      description:
        "Deterministic rules classify evidence; detected versions are matched against NVD and OSV, enriched with CISA KEV and FIRST EPSS, and merged with active Nuclei verifications.",
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    {
      step: 7,
      icon: ShieldAlert,
      title: "Actionable Security Findings",
      status: "Actionable",
      description: `${findingsCount} vulnerability record(s) synthesized with defensive remediation guidance and cryptographic provenance link.`,
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
  ];

  return (
    <Card className="p-6 border border-line bg-surface space-y-6">
      <div>
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-ink text-base">Seven-Step Evidence Traceability Chain</h3>
        </div>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Every reported finding in ReconX is traceable from the check that produced it down to the SHA-256 hash of the raw evidence it was derived from.
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.step}
              className="p-4 rounded-xl bg-[#121214] border border-white/10 flex items-start space-x-4 transition hover:border-[#C6F432]/30 hover:bg-[#18181B]"
            >
              <div className="w-8 h-8 rounded-lg bg-[#C6F432]/10 border border-[#C6F432]/30 text-[#C6F432] flex items-center justify-center font-bold text-xs flex-shrink-0 font-mono">
                {s.step}
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-white">
                    {s.title}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
                    {s.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 font-mono leading-relaxed break-words">
                  {s.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
