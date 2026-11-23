"use client";

import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  CheckCircle2,
  FileText,
  Compass,
  Terminal,
  ShieldAlert,
  Network,
  Eye,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Server,
  Fingerprint,
} from "lucide-react";

export default function LandingPage() {
  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      id="top"
      className="min-h-screen flex flex-col bg-forest-darker bg-dot-matrix text-sand font-sans selection:bg-electric selection:text-white relative overflow-x-hidden antialiased"
    >
      {/* Centered Ambient Electric Purple Bloom */}
      <div
        className="absolute top-16 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-purple-bloom pointer-events-none blur-3xl opacity-80 -z-10"
        aria-hidden="true"
      />

      {/* Floating Top Rotating Badge (AI 2.0 / ACTIVE) */}
      <div
        className="hidden lg:flex fixed top-24 right-10 xl:right-24 z-40 items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        <div className="relative w-20 h-20 rounded-full bg-electric/90 text-white shadow-[0_0_35px_rgba(139,92,246,0.6)] border border-purple-300/40 flex flex-col items-center justify-center text-center transform hover:rotate-12 transition-transform duration-500">
          <span className="text-[9px] tracking-widest font-mono font-bold leading-none text-sand/80">AI 2.0</span>
          <span className="text-[11px] font-black tracking-wider uppercase text-white mt-0.5">ACTIVE</span>
          <div className="w-1.5 h-1.5 rounded-full bg-sand mt-1 animate-ping" />
        </div>
      </div>

      {/* 1. Floating Pill Capsule Navigation Bar */}
      <header className="pt-6 px-4 sm:px-6 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Brand Pill */}
          <a
            href="#top"
            onClick={scrollToTop}
            className="glass-pill px-4 py-2.5 rounded-full flex items-center space-x-2.5 text-sand hover:text-white transition-all shadow-lg shadow-black/20 group"
            title="Scroll to top"
          >
            <div className="w-6 h-6 rounded-full bg-electric flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-sand group-hover:text-white">
              Recon<span className="text-electric-light">X</span>
            </span>
          </a>

          {/* Center Navigation Capsule */}
          <nav className="hidden md:flex items-center space-x-1 glass-pill px-3 py-1.5 rounded-full shadow-lg shadow-black/20 text-xs font-medium text-sand/80">
            <a
              href="#top"
              className="bg-forest-surface text-sand px-3 py-1.5 rounded-full font-semibold shadow-sm transition-colors"
            >
              Home
            </a>
            <a
              href="#pipeline"
              className="px-3 py-1.5 rounded-full hover:text-sand hover:bg-forest/40 transition-colors"
            >
              Traceability
            </a>
            <a
              href="#engine"
              className="px-3 py-1.5 rounded-full hover:text-sand hover:bg-forest/40 transition-colors"
            >
              AI Engine
            </a>
            <a
              href="#guardrails"
              className="px-3 py-1.5 rounded-full hover:text-sand hover:bg-forest/40 transition-colors"
            >
              Guardrails
            </a>
            <a
              href="#architecture"
              className="px-3 py-1.5 rounded-full hover:text-sand hover:bg-forest/40 transition-colors"
            >
              Evidence
            </a>
          </nav>

          {/* Right Action Pill */}
          <div className="flex items-center space-x-2">
            <Link
              href="/login"
              className="glass-pill hover:bg-sand/15 text-sand text-xs font-semibold px-4 py-2 rounded-full border border-sand/20 transition-all shadow-md"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="bg-electric hover:bg-electric-hover text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg shadow-purple-600/30 transition-all"
            >
              Launch Assessment
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Fernwood Aesthetic) */}
      <main className="flex-1">
        <section className="pt-16 pb-20 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Sub-nav Eyebrows with arrows */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-medium text-sand/70 tracking-wide">
              <a href="#pipeline" className="hover:text-sand transition-colors inline-flex items-center gap-1.5">
                <span>←</span> Live evidence probes
              </a>
              <a href="#guardrails" className="hover:text-sand transition-colors inline-flex items-center gap-1.5">
                <span>←</span> Scope pinning
              </a>
              <a href="#engine" className="hover:text-sand transition-colors inline-flex items-center gap-1.5">
                <span>←</span> AI Pentest Brain
              </a>
            </div>

            {/* Signature Headline */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif tracking-tight text-sand leading-[1.08]">
                Audit something deeper,
              </h1>
              <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                <span className="inline-flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-electric text-white shadow-lg shadow-purple-600/40 animate-pulse">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                </span>
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif tracking-tight text-sand leading-[1.08]">
                  one probe at a time.
                </h1>
              </div>
            </div>

            {/* Hero Subtitle */}
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-sand/75 leading-relaxed font-sans font-light">
              Targeted, verified, and backed by cryptographically sealed evidence.
              Autonomous reconnaissance that escalates only with cryptographic proof.
            </p>

            {/* Hero Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-electric hover:bg-electric-hover text-white font-medium text-sm shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <span>Start my assessment</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <a
                href="#pipeline"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full glass-pill hover:bg-sand/15 text-sand font-medium text-sm border border-sand/20 transition-all"
              >
                How it works
              </a>
            </div>

            {/* 3. The 3 Signature Fernwood Cards Trio */}
            <div className="pt-12 sm:pt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-end text-left">
              {/* Left Card: Sand Beige Posture Card with Horizontal Progress Bars */}
              <div className="bg-sand text-forest rounded-3xl p-6 sm:p-7 shadow-2xl relative border border-sand/30 flex flex-col justify-between min-h-[320px]">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-electric/15 text-electric-hover text-xs font-bold tracking-wide">
                      <Activity className="w-3.5 h-3.5" />
                      Coverage posture
                    </span>
                    <span className="text-xs font-mono font-semibold text-sand-muted">15 / 17 checks</span>
                  </div>

                  <div className="space-y-4 pt-1">
                    {[
                      { label: "Target Scope Validation", score: 98, width: "98%" },
                      { label: "Fingerprint & Tech Stack", score: 95, width: "95%" },
                      { label: "TLS & Protocol Config", score: 92, width: "92%" },
                      { label: "Sensitive Files & Secrets", score: 87, width: "87%" },
                      { label: "Active CVE & Probes", score: 81, width: "81%" },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-forest/90">{item.label}</span>
                          <span className="font-mono font-bold text-forest">{item.score}</span>
                        </div>
                        <div className="w-full bg-forest/15 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-electric h-full rounded-full transition-all duration-700"
                            style={{ width: item.width }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5 border-t border-forest/10 flex items-center justify-between text-[11px] text-sand-muted">
                  <span>Cryptographic evidence sealed</span>
                  <span className="font-mono font-semibold text-forest">SHA-256</span>
                </div>
              </div>

              {/* Center Card: Elevated Electric Purple Card with Semi-Circle Gauge Meter */}
              <div className="bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-white rounded-3xl p-7 sm:p-8 shadow-2xl shadow-purple-900/40 relative border border-purple-400/30 flex flex-col items-center justify-between min-h-[350px] lg:-translate-y-4">
                <div className="w-full text-center">
                  <span className="text-xs font-mono uppercase tracking-widest text-purple-200/90 font-semibold">
                    Autonomous Security Index
                  </span>
                </div>

                {/* SVG Semi-Circle Gauge */}
                <div className="relative w-48 h-28 my-3 flex items-end justify-center">
                  <svg className="w-48 h-28 overflow-visible" viewBox="0 0 100 50">
                    {/* Background Arc */}
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.22)"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    {/* Foreground Value Arc (92% value) */}
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="125.66"
                      strokeDashoffset="12"
                    />
                  </svg>
                  {/* Centered Score */}
                  <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black font-sans tracking-tight text-white leading-none">
                      94
                    </span>
                  </div>
                </div>

                <div className="w-full text-center space-y-1">
                  <p className="text-xs font-medium text-purple-100">
                    Deep verification · thriving
                  </p>
                  <p className="text-[11px] text-purple-200/70 font-mono">
                    Zero false positives · 100% confirmed
                  </p>
                </div>
              </div>

              {/* Right Card: Sand Beige Streak Card with SVG Sparkline Line Chart */}
              <div className="bg-sand text-forest rounded-3xl p-6 sm:p-7 shadow-2xl relative border border-sand/30 flex flex-col justify-between min-h-[320px]">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-electric/15 text-electric-hover text-xs font-bold tracking-wide">
                      <Zap className="w-3.5 h-3.5" />
                      Verification streak
                    </span>
                    <span className="text-xs font-mono font-semibold text-sand-muted">12 weeks</span>
                  </div>

                  {/* Sparkline Graphic */}
                  <div className="w-full h-36 relative mt-2">
                    {/* Subtle Gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                      <div className="border-b border-forest w-full" />
                      <div className="border-b border-forest w-full" />
                      <div className="border-b border-forest w-full" />
                      <div className="border-b border-forest w-full" />
                    </div>

                    {/* SVG Sparkline */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 200 90" preserveAspectRatio="none">
                      <path
                        d="M 0 75 Q 30 70 50 60 T 90 65 T 125 45 T 160 30 T 200 15"
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Gradient Fill under sparkline */}
                      <path
                        d="M 0 75 Q 30 70 50 60 T 90 65 T 125 45 T 160 30 T 200 15 L 200 90 L 0 90 Z"
                        fill="rgba(139, 92, 246, 0.12)"
                      />
                      {/* End point marker */}
                      <circle cx="200" cy="15" r="4.5" fill="#8B5CF6" stroke="#E8DCC4" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                <div className="pt-4 border-t border-forest/10 flex items-center justify-between text-[11px] text-sand-muted">
                  <span>Continuous live probe telemetry</span>
                  <span className="font-mono font-semibold text-electric-hover">100% active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Traceability & Evidence Ledger Section */}
        <section id="pipeline" className="py-20 sm:py-24 border-t border-sand/10 relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-electric-light font-semibold">
                Audit Trail & Traceability
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-sand">
                Every probe sealed in an immutable ledger.
              </h2>
              <p className="max-w-2xl mx-auto text-sm sm:text-base text-sand/75">
                No black-box results or vague severities. ReconX captures raw HTTP request/response
                payloads, binds them to cryptographic hashes, and guarantees reproducible proof.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Fingerprint,
                  title: "Cryptographic Evidence",
                  desc: "Every finding references an immutable SHA-256 hash of the exact network packet exchange.",
                },
                {
                  icon: ShieldAlert,
                  title: "Strict Scope Pinning",
                  desc: "Zero probes touch third-party CDN or shared platform infrastructure outside your authorized domain.",
                },
                {
                  icon: Lock,
                  title: "Auditable Governance",
                  desc: "Dual-authorization tokens, moderation review logs, and tamper-evident event streaming.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="glass-pill p-6 rounded-2xl border border-sand/15 hover:border-sand/30 transition-all space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-forest-surface flex items-center justify-center text-electric-light">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-sand">{feature.title}</h3>
                  <p className="text-xs text-sand/70 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. AI Pentest Engine Architecture Section */}
        <section id="engine" className="py-20 sm:py-24 border-t border-sand/10 bg-forest-dark/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-electric-light font-semibold">
                Autonomous Decision Brain
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-sand">
                AI chooses the probe. Evidence confirms the vulnerability.
              </h2>
              <p className="max-w-2xl mx-auto text-sm sm:text-base text-sand/75">
                The scanner doesn&apos;t run hardcoded blindly sequential scripts. The ReconX AI agent evaluates
                fingerprint observations and escalates scope dynamically.
              </p>
            </div>

            <div className="glass-pill p-6 sm:p-8 rounded-3xl border border-sand/15 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                {[
                  { step: "01", name: "RECON", detail: "Scope boundary & baseline", badge: "Non-intrusive" },
                  { step: "02", name: "ENUM", detail: "Tech stack & fingerprint", badge: "Header & socket" },
                  { step: "03", name: "VULN", detail: "Config, CORS & secret exposure", badge: "Pure-Python checks" },
                  { step: "04", name: "DEEP", detail: "CVE verification & Nuclei", badge: "Evidence-backed" },
                ].map((phase, idx) => (
                  <div key={idx} className="bg-forest-darker/70 p-4 rounded-2xl border border-sand/10 space-y-2">
                    <span className="text-xs font-mono text-electric-light font-bold">{phase.step}</span>
                    <h4 className="text-sm font-bold text-sand tracking-wide">{phase.name}</h4>
                    <p className="text-[11px] text-sand/70">{phase.detail}</p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-electric/15 text-sand font-mono">
                      {phase.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 6. Security Guardrails Section */}
        <section id="guardrails" className="py-20 sm:py-24 border-t border-sand/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-electric-light font-semibold">
                Non-Destructive Guarantee
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-sand">
                Enterprise safe by design.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Strict rate limits (maximum 50 requests/sec with jitter)",
                "Safe fallback mode when nmap or external tools are missing",
                "Non-destructive payloads (zero SQL drop, zero buffer floods)",
                "Vercel / Cloudflare edge safety: skips shared provider ports",
                "Pre-warmed cold start resilience for instant dashboard response",
                "Cryptographic event chain verifiable by external auditors",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 glass-pill rounded-xl border border-sand/10">
                  <CheckCircle2 className="w-4 h-4 text-electric-light shrink-0" />
                  <span className="text-xs font-medium text-sand/90">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="border-t border-sand/10 py-12 px-4 sm:px-6 text-sand/60 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-full bg-electric flex items-center justify-center text-white">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <span className="font-semibold text-sand">ReconX Identity & Assessment Platform</span>
          </div>
          <div className="flex items-center space-x-6 text-[11px]">
            <Link href="/login" className="hover:text-sand transition-colors">
              Analyst Console
            </Link>
            <a href="#pipeline" className="hover:text-sand transition-colors">
              Evidence Ledger
            </a>
            <span className="text-sand/40">v1.0.0 · Production</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
