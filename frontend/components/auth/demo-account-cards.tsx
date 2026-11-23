"use client";

import { Sparkles, UserCheck, Shield, KeyRound, ArrowRight, Loader2, LucideIcon } from "lucide-react";

export interface DemoPreset {
  role: string;
  email: string;
  password: string;
  description: string;
  icon: LucideIcon | any;
  tag: string;
  badgeColor?: string;
}

// Demo shortcuts for seamless trial and review across all 3 platform roles.
export const DEMO_ACCOUNTS_ENABLED =
  process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== "false";

const DEMO_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_PASSWORD || "DemoPassword2026!";

export const DEMO_PRESETS: DemoPreset[] = [
  {
    role: "Security Analyst",
    email: "analyst@reconx.local",
    password: DEMO_PASSWORD,
    description: "Launch scans & download reports",
    icon: UserCheck,
    tag: "Execution Role",
    badgeColor: "bg-accent-soft text-accent border-accent/30",
  },
  {
    role: "Compliance Moderator",
    email: "moderator@reconx.local",
    password: DEMO_PASSWORD,
    description: "Review & approve domain scopes",
    icon: Shield,
    tag: "Governance Role",
    badgeColor: "bg-accentWarm-soft text-accentWarm border-accentWarm/30",
  },
  {
    role: "Platform Super Admin",
    email: "admin@reconx.local",
    password: DEMO_PASSWORD,
    description: "System health, workers & live logs",
    icon: KeyRound,
    tag: "Oversight Role",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  },
];

export interface DemoAccountCardsProps {
  selectedRole?: string | null;
  autoFilledRole?: string | null;
  loggingInRole: string | null;
  loading: boolean;
  onAutofill?: (preset: DemoPreset) => void;
  onAutofillOnly?: (preset: DemoPreset) => void;
  onQuickLogin?: (preset: DemoPreset) => void;
  onOneClickLogin?: (preset: DemoPreset) => void;
}

export function DemoAccountCards({
  selectedRole,
  autoFilledRole,
  loggingInRole,
  loading,
  onAutofill,
  onAutofillOnly,
  onQuickLogin,
  onOneClickLogin,
}: DemoAccountCardsProps) {
  const currentRole = selectedRole !== undefined ? selectedRole : autoFilledRole;
  const doAutofill = onAutofill || onAutofillOnly || (() => {});
  const doQuickLogin = onQuickLogin || onOneClickLogin || (() => {});

  if (!DEMO_ACCOUNTS_ENABLED || !DEMO_PASSWORD) {
    return null;
  }

  return (
    <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-label-sm font-semibold text-accent flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Demo Environments</span>
        </span>
        <span className="text-label-xs text-text-subtle font-mono">1-click authentication</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {DEMO_PRESETS.map((demo) => {
          const Icon = demo.icon;
          const isSelected = currentRole === demo.role;
          const isThisLoggingIn = loggingInRole === demo.role;

          return (
            <div
              key={demo.email}
              className={`p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between ${
                isSelected
                  ? "border-accent/50 bg-accent/5 ring-1 ring-accent/20"
                  : "border-border bg-surface hover:border-border-strong hover:bg-surface-elevated"
              }`}
            >
              <div
                onClick={() => doAutofill(demo)}
                className="flex items-center space-x-2.5 truncate cursor-pointer flex-1 mr-2"
                title="Click to fill credentials into form"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    doAutofill(demo);
                  }
                }}
              >
                <div className="w-7 h-7 rounded-md bg-surface-elevated border border-border flex items-center justify-center text-text-muted flex-shrink-0">
                  <Icon className="w-4 h-4 text-accent" aria-hidden="true" />
                </div>
                <div className="truncate">
                  <div className="text-label-md font-semibold text-text truncate flex items-center space-x-1.5">
                    <span>{demo.role}</span>
                  </div>
                  <div className="text-body-xs text-text-subtle truncate">{demo.description}</div>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => doQuickLogin(demo)}
                className="inline-flex items-center space-x-1 text-label-xs font-semibold text-accent hover:text-white hover:bg-accent bg-accent-soft border border-accent/25 px-2.5 py-1 rounded-md transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={isThisLoggingIn ? `Signing in as ${demo.role}...` : `Sign in as ${demo.role}`}
              >
                {isThisLoggingIn ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}