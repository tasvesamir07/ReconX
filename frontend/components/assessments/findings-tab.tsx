"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  ChevronDown,
  ShieldAlert,
  Wrench,
  Boxes,
  Flame,
  Sparkles,
  ListChecks,
  ExternalLink,
  Package,
} from "lucide-react";
import type { Evidence, ExecutiveSummary, Finding, FindingClass } from "@/types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";

interface FindingsTabProps {
  findings: Finding[];
  evidence?: Evidence[];
  summary?: ExecutiveSummary | null;
}

type Filter = "all" | "confirmed" | "kev";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "informational"] as const;

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
  informational: "bg-slate-50 text-slate-600 border-slate-200",
};

const SECTIONS: { cls: FindingClass; title: string; hint: string; icon: typeof ShieldAlert }[] = [
  {
    cls: "vulnerability",
    title: "Vulnerabilities",
    hint: "Exploitable flaws, confirmed on the target or matched to NVD / OSV by exact version.",
    icon: ShieldAlert,
  },
  {
    cls: "hardening",
    title: "Hardening gaps",
    hint: "Missing or weak defences. Not directly exploitable, but they raise the impact of other issues.",
    icon: Wrench,
  },
  {
    cls: "inventory",
    title: "Attack surface inventory",
    hint: "Technologies, ports and entry points, for context and follow-up testing.",
    icon: Boxes,
  },
];

const SOURCE_LABEL: Record<string, string> = {
  check: "ReconX check",
  nvd: "NVD",
  osv: "OSV",
  nuclei: "Nuclei",
  "nvd+nuclei": "NVD + Nuclei",
  "osv+nuclei": "OSV + Nuclei",
};

const sevRank = (s: string) => {
  const i = SEVERITY_ORDER.indexOf(s as (typeof SEVERITY_ORDER)[number]);
  return i === -1 ? 9 : i;
};

function SeverityPill({ severity }: { severity: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
        SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.informational
      }`}
    >
      {severity === "informational" ? "info" : severity}
    </span>
  );
}

function Chip({ children, tone = "neutral", title }: { children: React.ReactNode; tone?: string; title?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-50 text-slate-600 border-slate-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    likely: "bg-amber-50 text-amber-800 border-amber-200",
    kev: "bg-rose-50 text-rose-700 border-rose-300",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function FindingMeta({ f }: { f: Finding }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {f.confidence === "confirmed" ? (
        <Chip tone="confirmed" title="Observed directly on the target, or verified by an active non-destructive check">
          Confirmed
        </Chip>
      ) : (
        <Chip
          tone="likely"
          title="The detected version is listed as affected in a vulnerability database. Distribution backports can make this a false positive."
        >
          Likely · version match
        </Chip>
      )}
      {f.is_kev && (
        <Chip tone="kev" title="Listed in the CISA Known Exploited Vulnerabilities catalog">
          <Flame className="h-3 w-3" aria-hidden="true" />
          Known exploited
        </Chip>
      )}
      {typeof f.cvss_score === "number" && <Chip title={f.cvss_vector ?? undefined}>CVSS {f.cvss_score.toFixed(1)}</Chip>}
      {typeof f.epss_score === "number" && (
        <Chip title="FIRST EPSS: probability of exploitation in the next 30 days">
          EPSS {(f.epss_score * 100).toFixed(f.epss_score < 0.01 ? 2 : 0)}%
        </Chip>
      )}
      <Chip>{SOURCE_LABEL[f.source ?? "check"] ?? f.source}</Chip>
    </div>
  );
}

function FindingCard({
  f,
  refLabel,
  expanded,
  onToggle,
}: {
  f: Finding;
  refLabel?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card id={`finding-${f.id}`} className="overflow-hidden border border-line bg-surface scroll-mt-24">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-elevated/40 sm:p-5"
      >
        <SeverityPill severity={f.severity} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-sm font-semibold leading-snug text-ink sm:text-[15px]">{f.title}</h3>
            {refLabel && <span className="font-mono text-[11px] text-subtle">[{refLabel}]</span>}
          </div>
          {f.component && <p className="text-xs text-muted">{f.component}</p>}
          <FindingMeta f={f} />
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-subtle transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="animate-fade-in space-y-4 border-t border-line bg-elevated/40 px-4 pb-5 pt-4 text-xs sm:px-5">
          <div>
            <span className="mb-1 block font-semibold text-ink">Observation</span>
            <p className="whitespace-pre-line leading-relaxed text-muted">{f.description}</p>
          </div>
          <div>
            <span className="mb-1 block font-semibold text-ink">Impact</span>
            <p className="leading-relaxed text-muted">{f.impact}</p>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold text-emerald-700">Remediation</span>
              <CopyButton value={f.remediation} label="Copy remediation" />
            </div>
            <p className="rounded-lg border border-line bg-white p-3 leading-relaxed text-slate-800">{f.remediation}</p>
          </div>
          {((f.cve_ids && f.cve_ids.length > 0) || (f.cwe_ids && f.cwe_ids.length > 0)) && (
            <div className="flex flex-wrap gap-1.5">
              {(f.cve_ids ?? []).map((c) => (
                <a
                  key={c}
                  href={`https://nvd.nist.gov/vuln/detail/${c}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink hover:border-emerald-300"
                >
                  {c}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ))}
              {(f.cwe_ids ?? []).map((c) => (
                <span key={c} className="rounded-md border border-line bg-white px-1.5 py-0.5 font-mono text-[11px] text-muted">
                  {c}
                </span>
              ))}
            </div>
          )}
          {f.references && f.references.length > 0 && (
            <div>
              <span className="mb-1 block font-semibold text-ink">References</span>
              <ul className="space-y-0.5">
                {f.references.slice(0, 6).map((r) => (
                  <li key={r} className="truncate">
                    <a href={r} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                      {r}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ComponentGroup({
  component,
  items,
  refFor,
  expanded,
  toggle,
  open,
  onOpenChange,
}: {
  component: string;
  items: Finding[];
  refFor: (id: string) => string | undefined;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const worst = items.reduce((w, f) => (sevRank(f.severity) < sevRank(w) ? f.severity : w), "informational");
  const kev = items.filter((f) => f.is_kev).length;
  const confirmed = items.filter((f) => f.confidence === "confirmed").length;
  const visible = showAll ? items : items.slice(0, 6);

  return (
    <div className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl p-4 text-left transition hover:bg-elevated/40"
      >
        <Package className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{component}</p>
          <p className="text-xs text-muted">
            {items.length} known vulnerabilit{items.length === 1 ? "y" : "ies"} for this version
            {confirmed > 0 && ` · ${confirmed} actively verified`}
          </p>
        </div>
        {kev > 0 && (
          <Chip tone="kev">
            <Flame className="h-3 w-3" aria-hidden="true" />
            {kev} known exploited
          </Chip>
        )}
        <SeverityPill severity={worst} />
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-3 sm:p-4">
          {visible.map((f) => (
            <FindingCard key={f.id} f={f} refLabel={refFor(f.id)} expanded={!!expanded[f.id]} onToggle={() => toggle(f.id)} />
          ))}
          {items.length > visible.length && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full rounded-lg border border-dashed border-line py-2 text-xs font-semibold text-muted transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Show all {items.length}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ summary, onRef }: { summary: ExecutiveSummary; onRef: (ref: string) => void }) {
  const refs = summary.refs ?? {};
  const render = (text: string) =>
    text.split(/(\bF\d+\b)/g).map((part, i) =>
      refs[part] ? (
        <button
          key={i}
          type="button"
          onClick={() => onRef(part)}
          className="mx-0.5 rounded bg-emerald-50 px-1 font-mono text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          {part}
        </button>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  return (
    <Card className="space-y-3 border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Executive summary</h2>
        <span
          className="inline-flex items-center gap-1 text-[11px] text-subtle"
          title={
            summary.source === "ai"
              ? "Written by AI from the findings below; rejected automatically if it cites anything the findings do not support"
              : "Generated directly from the findings below"
          }
        >
          {summary.source === "ai" && <Sparkles className="h-3 w-3" aria-hidden="true" />}
          {summary.source === "ai" ? "AI-written · validated against findings" : "Generated from findings"}
        </span>
      </div>
      {summary.paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-muted">
          {render(p.text)}
        </p>
      ))}
    </Card>
  );
}

function CoveragePanel({ evidence }: { evidence: Evidence[] }) {
  const [open, setOpen] = useState(false);
  const manifest = evidence.find((e) => e.evidence_type === "engine.manifest")?.normalized_data as
    | { outcomes?: { title: string; status: string; reason?: string | null }[]; preset?: string }
    | undefined;
  const outcomes = manifest?.outcomes ?? [];
  if (outcomes.length === 0) return null;
  const done = outcomes.filter((o) => o.status === "ok").length;
  const notDone = outcomes.filter((o) => o.status !== "ok");
  return (
    <Card className="border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <ListChecks className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Coverage: {done} of {outcomes.length} checks completed
          </p>
          {notDone.length > 0 && (
            <p className="truncate text-xs text-amber-700">
              Not run: {notDone.map((o) => o.title).join(", ")}
            </p>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line text-xs">
          {outcomes.map((o) => (
            <li key={o.title} className="flex items-start justify-between gap-4 px-4 py-2">
              <span className="text-ink">{o.title}</span>
              <span className={`text-right ${o.status === "ok" ? "text-emerald-700" : "text-amber-700"}`}>
                {o.status === "ok" ? "Completed" : o.reason || o.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function FindingsTab({ findings, evidence = [], summary }: FindingsTabProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Filter>("all");

  const refByFinding = useMemo(() => {
    const out: Record<string, string> = {};
    Object.entries(summary?.refs ?? {}).forEach(([ref, id]) => (out[id] = ref));
    return out;
  }, [summary]);

  const filtered = useMemo(
    () =>
      findings.filter((f) =>
        filter === "confirmed" ? f.confidence === "confirmed" : filter === "kev" ? !!f.is_kev : true
      ),
    [findings, filter]
  );

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const jumpToRef = (ref: string) => {
    const id = summary?.refs?.[ref];
    if (!id) return;
    const f = findings.find((x) => x.id === id);
    if (f?.component && (f.cve_ids?.length ?? 0) > 0) setOpenGroups((g) => ({ ...g, [f.component as string]: true }));
    setFilter("all");
    setExpanded((prev) => ({ ...prev, [id]: true }));
    requestAnimationFrame(() =>
      document.getElementById(`finding-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    );
  };

  const kevCount = findings.filter((f) => f.is_kev).length;

  return (
    <div className="space-y-5">
      {summary && summary.paragraphs?.length > 0 && <SummaryCard summary={summary} onRef={jumpToRef} />}
      <CoveragePanel evidence={evidence} />

      {findings.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No findings"
          description="None of the checks that ran found a vulnerability, hardening gap or exposed component."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter findings">
            {(
              [
                ["all", `All (${findings.length})`],
                ["confirmed", `Confirmed only (${findings.filter((f) => f.confidence === "confirmed").length})`],
                ["kev", `Known exploited (${kevCount})`],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                disabled={key === "kev" && kevCount === 0}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                  filter === key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-line bg-surface text-muted hover:border-slate-300 hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {SECTIONS.map(({ cls, title, hint, icon: Icon }) => {
            const items = filtered.filter((f) => (f.finding_class ?? "vulnerability") === cls);
            if (items.length === 0) return null;
            // Database matches are grouped per component; everything else is listed individually.
            const groups = new Map<string, Finding[]>();
            const singles: Finding[] = [];
            items.forEach((f) => {
              if (f.component && (f.cve_ids?.length ?? 0) > 0 && f.source !== "check" && f.source !== "nuclei") {
                groups.set(f.component, [...(groups.get(f.component) ?? []), f]);
              } else {
                singles.push(f);
              }
            });
            const orderedGroups = [...groups.entries()].sort(
              ([, a], [, b]) =>
                b.filter((f) => f.is_kev).length - a.filter((f) => f.is_kev).length ||
                sevRank(a[0].severity) - sevRank(b[0].severity) ||
                b.length - a.length
            );
            return (
              <section key={cls} className="space-y-3" aria-labelledby={`section-${cls}`}>
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  <div>
                    <h2 id={`section-${cls}`} className="text-sm font-semibold text-ink">
                      {title} <span className="font-mono text-muted">({items.length})</span>
                    </h2>
                    <p className="text-xs text-muted">{hint}</p>
                  </div>
                </div>
                {singles.map((f) => (
                  <FindingCard
                    key={f.id}
                    f={f}
                    refLabel={refByFinding[f.id]}
                    expanded={!!expanded[f.id]}
                    onToggle={() => toggle(f.id)}
                  />
                ))}
                {orderedGroups.map(([component, list]) => (
                  <ComponentGroup
                    key={component}
                    component={component}
                    items={list}
                    refFor={(id) => refByFinding[id]}
                    expanded={expanded}
                    toggle={toggle}
                    open={openGroups[component] ?? orderedGroups.length === 1}
                    onOpenChange={(o) => setOpenGroups((g) => ({ ...g, [component]: o }))}
                  />
                ))}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
