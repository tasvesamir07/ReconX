"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Scan,
  AlertCircle,
  ArrowRight,
  Zap,
  Check,
  ShieldAlert,
  Clock,
  Sparkles,
  Layers
} from "lucide-react";
import { apiRequest, ReconXApiError } from "@/lib/api-client";
import { ApprovedAsset, User } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

export default function NewAssessmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<ApprovedAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [preset, setPreset] = useState<"normal" | "moderate" | "ultimate">("moderate");
  const [loading, setLoading] = useState(false);
  const [fetchingAssets, setFetchingAssets] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [userData, assetsData] = await Promise.all([
          apiRequest<{ user: User }>("/auth/me"),
          apiRequest<ApprovedAsset[]>("/assets"),
        ]);
        setUser(userData.user);
        setAssets(assetsData);
        if (assetsData.length > 0) {
          setSelectedAssetId(assetsData[0].id);
          setTargetUrl(`https://${assetsData[0].canonical_host}`);
        }
      } catch (err: any) {
        if (err?.status === 401 || err?.statusCode === 401 || err?.code === "UNAUTHORIZED") {
          router.replace("/login");
          return;
        }
        console.error("Failed to fetch initial data:", err);
      } finally {
        setFetchingAssets(false);
      }
    }
    loadData();
  }, []);

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
    const asset = assets.find((a) => a.id === assetId);
    if (asset) {
      setTargetUrl(`https://${asset.canonical_host}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const scan = await apiRequest("/scans", {
        method: "POST",
        body: JSON.stringify({
          approved_asset_id: selectedAssetId,
          target_url: targetUrl,
          preset,
        }),
      });
      toast({
        title: "Assessment Launched",
        description: `Target verified against policy. Worker dispatched with preset '${preset}'.`,
        variant: "success",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("reconx_scan_created", { detail: scan }));
      }
      router.push(`/dashboard/assessments/${scan.id}`);
    } catch (err: any) {
      if (err instanceof ReconXApiError) {
        setError(err.message);
      } else {
        setError("Failed to create assessment. Verify target scope and policy limits.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isOversightRole = user?.platform_role === "MODERATOR" || user?.platform_role === "SUPER_ADMIN";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">Launch Security Assessment</h1>
        <p className="text-muted text-sm mt-1">
          Select an authorized domain and scan preset. Actions are strictly validated by the deterministic policy engine.
        </p>
      </div>

      {isOversightRole && (
        <Card className="p-4 border-warning/30 bg-warning/5 flex items-start space-x-3 text-warning text-xs">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-ink block">Separation of Duties Notice</span>
            <p className="text-muted leading-relaxed">
              You are signed in as a <strong>{user?.platform_role.replace("_", " ")}</strong>. Under ReconX security governance (Section 09), Platform Administrators and Compliance Moderators have oversight, audit, and log-viewing authority only and <strong>cannot launch scans</strong>. To launch assessments, sign in as a <strong>Security Analyst</strong> (e.g. <span className="font-mono text-accent">analyst@reconx.local</span>). You can monitor running scans and live logs from the Dashboard Overview.
            </p>
          </div>
        </Card>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-start space-x-3 text-danger text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {fetchingAssets ? (
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Approved Assets Available"
          description="Before scanning, you must submit an authorization document and obtain Moderator approval for your domains."
          action={
            <Button variant="primary" size="sm" asChild>
              <Link href="/dashboard/authorizations">Submit Authorization Scope</Link>
            </Button>
          }
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Selection */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-ink text-base">1. Select Approved Domain Scope</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleAssetSelect(asset.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedAssetId === asset.id
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-line bg-canvas hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-accent">{asset.canonical_host}</span>
                    {selectedAssetId === asset.id && <Check className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="text-xs text-muted mt-2">
                    Scope: <span className="capitalize text-ink">{asset.scope_type.replace("_", " ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Target URL */}
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold text-ink text-base">2. Specify Target URL</h3>
            <p className="text-xs text-muted leading-relaxed">
              Target host must exactly match or reside within the approved scope above.
            </p>
            <input
              type="url"
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full font-mono text-sm rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
            />
          </Card>

          {/* Preset Selection */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-ink text-base">3. Choose Assessment Preset</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Normal */}
              <div
                onClick={() => setPreset("normal")}
                className={`p-5 rounded-xl border cursor-pointer transition ${
                  preset === "normal"
                    ? "border-accent bg-accent/10 shadow-sm ring-1 ring-accent"
                    : "border-line bg-canvas hover:border-line-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-ink">Normal (Basic Recon)</span>
                  <Badge variant="outline" className="font-mono text-[10px]">120s · 8 checks</Badge>
                </div>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Version fingerprinting with CVE matching (NVD / OSV), sensitive-file exposure, TLS, CORS, security headers, cookies and email spoofing protection.
                </p>
                <div className="mt-3 text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                  ⚡ Passive-first · Fast (~30s)
                </div>
              </div>

              {/* Moderate */}
              <div
                onClick={() => setPreset("moderate")}
                className={`p-5 rounded-xl border cursor-pointer transition relative ${
                  preset === "moderate"
                    ? "border-accent bg-accent/10 shadow-sm ring-1 ring-accent"
                    : "border-line bg-canvas hover:border-line-strong"
                }`}
              >
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded text-[10px] font-semibold bg-accent text-canvas">
                  Standard Profile
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-ink">Moderate (Standard Pentest)</span>
                  <Badge variant="outline" className="font-mono text-[10px]">300s · 17 checks</Badge>
                </div>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Everything in Normal, plus error disclosure, directory listing, admin and API exposure, open redirect, service versions (nmap -sV) and active CVE verification (Nuclei).
                </p>
                <div className="mt-3 text-[11px] font-mono text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200/60">
                  🛡️ Active verification · In-Depth
                </div>
              </div>

              {/* Ultimate */}
              <div
                onClick={() => setPreset("ultimate")}
                className={`p-5 rounded-xl border cursor-pointer transition relative ${
                  preset === "ultimate"
                    ? "border-purple-500 bg-purple-50 shadow-sm ring-1 ring-purple-500"
                    : "border-line bg-canvas hover:border-line-strong"
                }`}
              >
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-600 text-white">
                  God Mode
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-purple-700">Ultimate (God Mode Pentest)</span>
                  <Badge variant="outline" className="font-mono text-[10px] text-purple-700 border-purple-300">600s · 22 checks</Badge>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Everything in Moderate, at full depth: top-1000 port service scan, every safe Nuclei template, deeper JavaScript library analysis, cache poisoning, WebSocket origin, SRI and WHOIS.
                </p>
                <div className="mt-3 text-[11px] font-mono text-purple-700 bg-purple-100/50 p-2 rounded-lg border border-purple-200">
                  🔥 Full Depth · Still non-destructive
                </div>
              </div>
            </div>
          </Card>

          {/* Launch Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={isOversightRole}
            className="w-full text-base font-bold shadow-sm"
          >
            <Scan className="w-5 h-5 mr-2" />
            <span>
              {isOversightRole
                ? "Scans Must Be Initiated by Security Analysts (Oversight Role)"
                : loading
                ? "Validating Target & Initializing Scan..."
                : "Start Authorized Assessment"}
            </span>
          </Button>
        </form>
      )}
    </div>
  );
}
