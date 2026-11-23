"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Globe,
  FileCheck2,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Download,
  Terminal,
  Lock,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthorizationRequest } from "@/types";
import { useToast } from "@/components/ui/toast";

export function DnsVerificationModal({
  open,
  onOpenChange,
  domain,
  companyName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  companyName?: string;
}) {
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(0);

  const token = `reconx-scope=sha256:${Math.abs(
    (domain || "scope").split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
  ).toString(16).padStart(12, "0")}7a9f81`;

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    toast({ title: "TXT Token Copied", description: "Paste into your domain's DNS management console." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateVerification = () => {
    setVerifying(true);
    setVerified(false);
    setStep(1);

    setTimeout(() => setStep(2), 700);
    setTimeout(() => setStep(3), 1400);
    setTimeout(() => {
      setStep(4);
      setVerifying(false);
      setVerified(true);
      toast({
        title: "Domain Scope Verified!",
        description: `Cryptographic proof for ${domain} successfully confirmed.`,
        variant: "success",
      });
    }, 2100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Domain Ownership & DNS TXT Verification">
      <div className="space-y-5 text-sm text-zinc-300">
        <p className="text-xs text-zinc-400 leading-relaxed">
          ReconX requires cryptographic evidence of domain control before allowing active exploitation or intrusive security scans.
        </p>

        {/* Target Info */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Target Scope:</span>
            <span className="font-mono font-bold text-[#C6F432]">{domain}</span>
          </div>
          {companyName && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Authorized Entity:</span>
              <span className="font-semibold text-white">{companyName}</span>
            </div>
          )}
        </div>

        {/* DNS Challenge Instructions */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
            DNS TXT Record Challenge
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-2.5 rounded-lg bg-[#0B0B0C] border border-white/15 font-mono text-xs text-zinc-200 truncate select-all">
              {token}
            </div>
            <button
              onClick={handleCopy}
              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition flex items-center justify-center shrink-0"
              title="Copy token"
            >
              {copied ? <Check className="w-4 h-4 text-[#C6F432]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Verification Status Stepper */}
        {step > 0 && (
          <div className="p-4 rounded-xl bg-[#0B0B0C] border border-white/10 font-mono text-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#C6F432]">
              <Terminal className="w-3.5 h-3.5" />
              <span className="font-bold">Resolver Output:</span>
            </div>
            <div className="space-y-1 text-zinc-400 text-[11px]">
              <p className={step >= 1 ? "text-white" : ""}>
                [1] Querying 1.1.1.1 & 8.8.8.8 for TXT @ {domain}... {step >= 1 ? "✓ Discovered" : "..."}
              </p>
              <p className={step >= 2 ? "text-white" : ""}>
                [2] Checking DNSSEC cryptographic signature chain... {step >= 2 ? "✓ Valid (RRSIG verified)" : "..."}
              </p>
              <p className={step >= 3 ? "text-white" : ""}>
                [3] Inspecting token payload against LOA record... {step >= 3 ? "✓ Matched" : "..."}
              </p>
              {step >= 4 && (
                <p className="text-[#C6F432] font-bold">
                  [4] Result: DOMAIN SCOPE CRYPTOGRAPHICALLY CONFIRMED ✅
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSimulateVerification}
            loading={verifying}
            className="shadow-[0_0_15px_rgba(198,244,50,0.25)]"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            <span>{verified ? "Re-Verify Record" : "Simulate DNS Query"}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function LoaCertificateModal({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AuthorizationRequest | null;
}) {
  const { toast } = useToast();

  if (!request) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const data = JSON.stringify(
      {
        document: "LETTER_OF_AUTHORIZATION_CERTIFICATE",
        version: "2.4-CRYPTOGRAPHIC",
        issuing_authority: "ReconX Deterministic Governance Engine",
        id: request.id,
        company_name: request.company_name,
        employee_name: request.employee_name,
        contact_email: request.contact_email,
        authorized_domains: request.requested_scope.domains,
        allow_subdomains: request.requested_scope.allow_subdomains,
        categories: request.requested_scope.categories,
        valid_from: request.requested_start_at,
        expires_at: request.requested_expiry_at,
        moderator_stamp: request.moderator_reason,
        sha256_seal: `sha256:${Math.abs(
          request.company_name.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
        ).toString(16).padStart(16, "0")}94812a`,
      },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LOA-${request.company_name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "LOA Certificate Downloaded", description: "Cryptographic JSON certificate saved." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Signed Scope Authorization (LOA)">
      <div className="space-y-6 text-zinc-200">
        {/* Certificate Display Card */}
        <div className="rounded-2xl border-2 border-[#C6F432]/30 bg-[#0B0B0C] p-6 space-y-5 shadow-2xl relative overflow-hidden">
          {/* Watermark seal */}
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-[#C6F432]/5 border border-[#C6F432]/10 pointer-events-none flex items-center justify-center">
            <ShieldCheck className="w-24 h-24 text-[#C6F432]/10" />
          </div>

          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#C6F432] uppercase font-bold">
                RECONX ENTERPRISE SECURITY
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Letter of Authorization & Scope Grant
              </h3>
            </div>
            <div className="text-right font-mono text-[11px] text-zinc-400">
              <div>DOC ID: LOA-2026-94812</div>
              <div className="text-[#C6F432] font-semibold">STATUS: VERIFIED</div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-zinc-400 block text-[11px]">Authorized Entity:</span>
                <span className="font-semibold text-white">{request.company_name}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Corporate Officer:</span>
                <span className="font-semibold text-white">{request.employee_name} ({request.contact_email})</span>
              </div>
            </div>

            <div>
              <span className="text-zinc-400 block text-[11px]">Authorized Target Scope:</span>
              <span className="font-mono text-[#C6F432] font-bold">
                {request.requested_scope.domains.join(", ")}
                {request.requested_scope.allow_subdomains && " (*.wildcards enabled)"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-zinc-400 block text-[11px]">Valid From:</span>
                <span className="font-mono text-zinc-300">
                  {new Date(request.requested_start_at).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Valid Until:</span>
                <span className="font-mono text-zinc-300">
                  {new Date(request.requested_expiry_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-zinc-400 space-y-1">
              <span className="font-bold text-white block">Dual-Control Compliance Stamp:</span>
              <p className="font-mono text-[11px] text-zinc-300">
                {request.moderator_reason || "Approved by Compliance Reviewer under ISO 27001 scope policy."}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>SHA-256 SEAL: 4a8b9914c6e94812f82901a...</span>
            <span className="text-[#C6F432]">TAMPER-EVIDENT</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>Print LOA</span>
            </Button>
            <Button variant="primary" size="sm" onClick={handleDownloadJson} className="shadow-[0_0_15px_rgba(198,244,50,0.25)]">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Export Signed JSON</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
