"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Scan,
  FileCheck2,
  Users,
  Shield,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Command,
  X
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}

export function CommandPalette({ open, onOpenChange, userRole }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [mode, setMode] = React.useState<"navigate" | "simulator">("navigate");

  // Policy Simulator state
  const [simUrl, setSimUrl] = React.useState("https://example.com");
  const [simScope, setSimScope] = React.useState("example.com");
  const [allowSubdomains, setAllowSubdomains] = React.useState(false);
  const [simResult, setSimResult] = React.useState<{
    allowed: boolean;
    reason: string;
    details?: string[];
  } | null>(null);

  // Keyboard shortcut listener for ⌘K / Ctrl+K
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const navItems = [
    { label: "Dashboard Overview & Scans", href: "/dashboard", icon: LayoutDashboard, category: "Navigation" },
    ...(userRole !== "MODERATOR" && userRole !== "SUPER_ADMIN"
      ? [{ label: "Launch Assessment", href: "/dashboard/assessments/new", icon: Scan, category: "Actions" }]
      : []),
    { label: "Authorizations & Scope", href: "/dashboard/authorizations", icon: FileCheck2, category: "Navigation" },
    { label: "Team & Organization Members", href: "/dashboard/team", icon: Users, category: "Navigation" },
    ...(userRole === "MODERATOR" || userRole === "SUPER_ADMIN"
      ? [{ label: "Moderator Review Queue", href: "/dashboard/moderator", icon: Shield, category: "Compliance" }]
      : []),
    ...(userRole === "SUPER_ADMIN"
      ? [{ label: "Super Admin Console & Live Logs", href: "/dashboard/admin", icon: Settings, category: "Administration" }]
      : []),
  ];

  const filteredNav = navItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectNav = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const runSimulation = () => {
    try {
      const parsed = new URL(simUrl);
      const host = parsed.hostname.toLowerCase();
      const scheme = parsed.protocol.replace(":", "").toLowerCase();

      // 1. Scheme check
      if (scheme !== "http" && scheme !== "https") {
        setSimResult({
          allowed: false,
          reason: "UNSUPPORTED_SCHEME: Only HTTP and HTTPS protocols are permitted.",
        });
        return;
      }

      // 2. SSRF check
      const ssrfPatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^169\.254\./,
        /^0\.0\.0\.0$/,
        /^::1$/,
        /^fc00:/i,
        /^fe80:/i,
      ];
      if (ssrfPatterns.some((p) => p.test(host))) {
        setSimResult({
          allowed: false,
          reason: "SSRF_BLOCKLIST_TRIGGERED: Target resolves to loopback, private, link-local or metadata range.",
          details: ["Target IP matches private/link-local boundary", "Pre-execution DNS check would abort immediately"],
        });
        return;
      }

      // 3. Scope match check
      const canonicalScope = simScope.trim().toLowerCase();
      let inScope = false;
      if (allowSubdomains) {
        inScope = host === canonicalScope || host.endsWith("." + canonicalScope);
      } else {
        inScope = host === canonicalScope;
      }

      if (!inScope) {
        setSimResult({
          allowed: false,
          reason: `OUT_OF_SCOPE: Host '${host}' is not within the authorized scope of '${canonicalScope}' (Wildcard subdomains: ${allowSubdomains ? "Enabled" : "Disabled"}).`,
          details: ["Host does not match exact approved asset", "Policy Engine deterministic match returned false"],
        });
        return;
      }

      setSimResult({
        allowed: true,
        reason: `TARGET_APPROVED: Host '${host}' is strictly within approved scope and passed all SSRF blocklist filters.`,
        details: [
          `Protocol validated: ${scheme.toUpperCase()}`,
          `Scope rule verified: ${canonicalScope}`,
          `Pre-execution DNS re-resolution scheduled`,
        ],
      });
    } catch (err) {
      setSimResult({
        allowed: false,
        reason: "INVALID_URL: Target string is not a well-formed RFC URL.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "navigate" ? "Command Palette" : "Policy Engine Simulator"}
      size="md"
    >
      <div className="space-y-4">
        {/* Mode Switcher */}
        <div className="flex items-center space-x-2 border-b border-line pb-3">
          <Button
            variant={mode === "navigate" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setMode("navigate")}
          >
            Navigation & Actions
          </Button>
          <Button
            variant={mode === "simulator" ? "primary" : "ghost"}
            size="sm"
            onClick={() => {
              setMode("simulator");
              if (!simResult) runSimulation();
            }}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            <span>Policy Simulator</span>
          </Button>
        </div>

        {mode === "navigate" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-subtle" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a page name or action..."
                className="w-full rounded-lg border border-line bg-elevated pl-9 pr-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin pt-1">
              {filteredNav.length === 0 ? (
                <div className="py-6 text-center text-xs text-subtle">No matching commands or pages found.</div>
              ) : (
                filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleSelectNav(item.href)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-ink hover:bg-elevated transition text-left group"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="p-1.5 rounded-md bg-canvas border border-line text-accent">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="font-medium text-ink">{item.label}</div>
                          <div className="text-[10px] text-muted">{item.category}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-subtle group-hover:text-ink transition" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted leading-relaxed">
              Test whether a given target URL would be permitted by the ReconX deterministic Policy Engine before running any scans.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">Target URL to Evaluate</label>
                <input
                  type="text"
                  value={simUrl}
                  onChange={(e) => setSimUrl(e.target.value)}
                  placeholder="https://example.com/api"
                  className="w-full font-mono rounded-lg border border-line bg-elevated px-3 py-2 text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Approved Host Scope</label>
                  <input
                    type="text"
                    value={simScope}
                    onChange={(e) => setSimScope(e.target.value)}
                    placeholder="example.com"
                    className="w-full font-mono rounded-lg border border-line bg-elevated px-3 py-2 text-ink placeholder:text-subtle focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center space-x-2 cursor-pointer text-ink select-none">
                    <input
                      type="checkbox"
                      checked={allowSubdomains}
                      onChange={(e) => setAllowSubdomains(e.target.checked)}
                      className="rounded border-line bg-elevated text-accent focus:ring-accent"
                    />
                    <span>Allow Wildcard Subdomains</span>
                  </label>
                </div>
              </div>

              <Button variant="primary" size="sm" onClick={runSimulation} className="w-full">
                Run Policy Evaluation
              </Button>
            </div>

            {simResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                  simResult.allowed
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-danger/30 bg-danger/10 text-danger"
                }`}
              >
                <div className="flex items-center space-x-2 font-bold">
                  {simResult.allowed ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                  <span>{simResult.allowed ? "POLICY PASSED: ASSESSMENT ALLOWED" : "POLICY REJECTED: BLOCKED"}</span>
                </div>
                <p className="text-muted leading-relaxed font-mono text-[11px]">{simResult.reason}</p>
                {simResult.details && (
                  <ul className="list-disc list-inside text-[11px] text-muted space-y-0.5 pt-1">
                    {simResult.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
