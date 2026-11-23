"use client";

import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  FileText,
  Lock,
  Terminal,
} from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      id="top"
      className="min-h-screen flex flex-col bg-[#0B0B0C] text-white font-sans selection:bg-[#C6F432] selection:text-[#0B0B0C] relative overflow-x-hidden antialiased"
    >
      {/* Background Vertical Fluted Lines & Ambient Luminous Lime Beam */}
      <div className="absolute inset-0 bg-fluted-grid pointer-events-none opacity-50 -z-10" aria-hidden="true" />
      <div
        className="absolute top-24 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-lime-beam pointer-events-none blur-3xl opacity-75 -z-10"
        aria-hidden="true"
      />

      {/* 1. Northline Top Navigation Bar */}
      <header className="pt-6 px-4 sm:px-6 lg:px-8 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <a
            href="#top"
            onClick={scrollToTop}
            className="flex items-center space-x-2.5 text-white hover:text-zinc-200 transition-colors group cursor-pointer"
            title="Scroll to top"
          >
            <div className="w-7 h-7 rounded-lg bg-[#18181B] border border-white/15 flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:border-[#C6F432]/50 transition-colors">
              R
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              Recon<span className="text-[#C6F432]">X</span>
            </span>
          </a>

          {/* Center Navigation Links (Northline style) */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-mono text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors flex items-center space-x-1.5">
              <span className="text-[#C6F432]">●</span>
              <span>Features</span>
            </a>
            <a href="#engine" className="hover:text-white transition-colors">
              AI Engine
            </a>
            <a href="#pipeline" className="hover:text-white transition-colors">
              Audit Ledger
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            <a href="#docs" className="hover:text-white transition-colors">
              Docs
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-300 hover:text-white transition-colors px-2 py-1"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all shadow-sm"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1">
        <section className="pt-20 pb-16 sm:pt-24 sm:pb-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-6xl mx-auto relative">
            {/* Left Metric Callouts (Northline signature layout) */}
            <div className="hidden xl:flex absolute left-0 top-10 flex-col text-left space-y-8 select-none pointer-events-none">
              <div>
                <div className="text-4xl font-serif text-white tracking-tight">3x</div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase mt-0.5">
                  FASTER AUDITING
                </div>
              </div>
              <div>
                <div className="text-4xl font-serif text-white tracking-tight">87%</div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase mt-0.5">
                  BUGS CAUGHT PRE-MERGE
                </div>
              </div>
            </div>

            {/* Right Metric Callouts (Northline signature layout) */}
            <div className="hidden xl:flex absolute right-0 top-10 flex-col text-right space-y-8 select-none pointer-events-none">
              <div>
                <div className="text-4xl font-serif text-white tracking-tight">120K+</div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase mt-0.5">
                  TARGETS CONNECTED
                </div>
              </div>
              <div>
                <div className="text-4xl font-serif text-white tracking-tight">2.4M</div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase mt-0.5">
                  PROBES SEALED
                </div>
              </div>
            </div>

            {/* Center Content */}
            <div className="max-w-2xl mx-auto text-center space-y-6">
              {/* Northline Headline: Serif with Lime Green italic accent word */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif tracking-tight text-white leading-[1.08] text-balance">
                Audit <span className="italic text-[#C6F432] font-normal">faster</span> than
                <br />
                your standup
              </h1>

              {/* Subheadline: Outcome & clarity without hyphens */}
              <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto font-sans leading-relaxed text-pretty">
                Review every pull request and web target against live exploit intel before your team even opens Slack.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="px-6 py-2.5 rounded-full bg-[#C6F432] hover:bg-[#B5E327] text-[#0B0B0C] font-semibold text-xs sm:text-sm shadow-[0_0_24px_rgba(198,244,50,0.35)] transition-all hover:scale-105 active:scale-95"
                >
                  Try it free
                </Link>
                <a
                  href="#pipeline"
                  className="px-6 py-2.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs sm:text-sm transition-all"
                >
                  Book a demo
                </a>
              </div>
            </div>

            {/* 3. The 3 Signature Northline Dark Cards Trio */}
            <div className="pt-16 sm:pt-20 grid grid-cols-1 lg:grid-cols-3 gap-5 text-left max-w-5xl mx-auto">
              {/* Card 1: Pull requests / Active Target Probes */}
              <div className="dark-card rounded-2xl p-5 space-y-3.5 flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 pb-2">
                    <span className="text-[#C6F432]">●</span>
                    <span className="font-semibold text-zinc-300">Pull requests</span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {[
                      {
                        avatar: "AK",
                        title: "auth: rotate session tokens",
                        badge: "Merged",
                        badgeStyle: "bg-[#C6F432] text-[#0B0B0C] font-bold",
                      },
                      {
                        avatar: "MS",
                        title: "billing: retry webhooks",
                        badge: "Ready",
                        badgeStyle: "border border-[#C6F432]/50 text-[#C6F432] bg-[#C6F432]/10 font-semibold",
                      },
                      {
                        avatar: "JA",
                        title: "ui: mobile nav overflow",
                        badge: "In review",
                        badgeStyle: "border border-white/10 text-zinc-400 bg-white/5",
                      },
                      {
                        avatar: "RP",
                        title: "api: rate limit by team",
                        badge: "Draft",
                        badgeStyle: "border border-white/10 text-zinc-500",
                      },
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 text-[10px] font-mono font-bold text-zinc-300 flex items-center justify-center shrink-0">
                            {row.avatar}
                          </div>
                          <span className="text-xs font-mono text-zinc-300 truncate">{row.title}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0 ml-2 ${row.badgeStyle}`}>
                          {row.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-[11px] font-mono text-zinc-500 flex justify-between border-t border-white/5">
                  <span>Target scope verified</span>
                  <span className="text-[#C6F432]">4 active</span>
                </div>
              </div>

              {/* Card 2: Review Score with Upward Trending Lime Green Sparkline */}
              <div className="dark-card rounded-2xl p-6 space-y-4 flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                      <span className="text-[#C6F432]">●</span>
                      <span className="font-semibold text-zinc-300">Review score</span>
                    </div>
                    <span className="border border-[#C6F432]/50 bg-[#C6F432]/10 text-[#C6F432] text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full">
                      Auto-fix on
                    </span>
                  </div>

                  <div className="pt-3 flex items-baseline space-x-2">
                    <span className="text-5xl font-serif font-bold text-white tracking-tight leading-none">94</span>
                    <span className="text-xs font-mono text-zinc-400">/ 100 repo health</span>
                  </div>

                  {/* Upward Trending Sparkline Chart */}
                  <div className="w-full h-28 relative mt-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 200 80" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C6F432" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#C6F432" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 65 Q 25 60 50 52 T 100 48 T 150 28 T 200 12"
                        fill="none"
                        stroke="#C6F432"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 0 65 Q 25 60 50 52 T 100 48 T 150 28 T 200 12 L 200 80 L 0 80 Z"
                        fill="url(#limeGradient)"
                      />
                      <circle cx="200" cy="12" r="3.5" fill="#C6F432" />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/5">
                  <span>09:00</span>
                  <span>10:00</span>
                  <span>11:00</span>
                  <span>12:00</span>
                  <span>13:00</span>
                </div>
              </div>

              {/* Card 3: Merge Timeline / Scan Execution Gantt */}
              <div className="dark-card rounded-2xl p-5 space-y-4 flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 pb-1">
                    <span className="text-[#C6F432]">●</span>
                    <span className="font-semibold text-zinc-300">Merge timeline</span>
                  </div>

                  {/* Time Markers */}
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-1 pb-3">
                    <span>09:30</span>
                    <span>10:00</span>
                    <span className="text-[#C6F432] font-semibold">11:00</span>
                    <span>12:00</span>
                    <span>13:00</span>
                  </div>

                  {/* Gantt Timeline Tracks with Glowing Vertical Lime Needle */}
                  <div className="relative space-y-2.5 py-1">
                    {/* Glowing Needle at 11:00 */}
                    <div
                      className="absolute top-0 bottom-0 left-[52%] w-[1.5px] bg-[#C6F432] shadow-[0_0_8px_#C6F432] z-10 pointer-events-none"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -top-1 left-[52%] -translate-x-1/2 w-2 h-2 rounded-full bg-[#C6F432] z-20 pointer-events-none"
                      aria-hidden="true"
                    />

                    {/* Track 1 */}
                    <div className="flex items-center gap-1.5 h-4">
                      <div className="w-[18%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[42%] bg-[#C6F432] rounded-md h-3.5 shadow-[0_0_10px_rgba(198,244,50,0.3)]" />
                      <div className="w-[22%] bg-zinc-800/80 rounded-md h-3.5" />
                    </div>

                    {/* Track 2 */}
                    <div className="flex items-center gap-1.5 h-4">
                      <div className="w-[10%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[50%] bg-[#C6F432] rounded-md h-3.5 shadow-[0_0_10px_rgba(198,244,50,0.3)]" />
                      <div className="w-[25%] bg-zinc-800/80 rounded-md h-3.5" />
                    </div>

                    {/* Track 3 */}
                    <div className="flex items-center gap-1.5 h-4">
                      <div className="w-[28%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[15%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[35%] bg-[#C6F432] rounded-md h-3.5 shadow-[0_0_10px_rgba(198,244,50,0.3)]" />
                    </div>

                    {/* Track 4 */}
                    <div className="flex items-center gap-1.5 h-4">
                      <div className="w-[38%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[28%] bg-[#C6F432] rounded-md h-3.5 shadow-[0_0_10px_rgba(198,244,50,0.3)]" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] font-mono text-zinc-500 flex justify-between border-t border-white/5">
                  <span>Current phase: Active verification</span>
                  <span className="text-[#C6F432]">In sync</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Problem to Solution Section */}
        <section id="features" className="py-20 border-t border-white/10 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-center">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C6F432] font-semibold">
                Problem to solution
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white text-balance">
                Vulnerability backlogs are filled with unverified noise
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto text-pretty">
                Traditional scanners dump generic alerts into engineering boards. ReconX deploys an autonomous pentest
                brain that validates real exploitability with cryptographic evidence before creating a ticket.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left pt-4">
              {[
                {
                  title: "Deterministic proof",
                  desc: "Every finding links to raw network evidence and an immutable SHA 256 hash. Zero guesswork.",
                },
                {
                  title: "Safe scope pinning",
                  desc: "Edge platforms like Vercel and Cloudflare are detected automatically to prevent probing shared proxies.",
                },
                {
                  title: "Autonomous AI escalation",
                  desc: "The reasoning loop starts with non intrusive recon and escalates only when fingerprint signals confirm relevancy.",
                },
              ].map((item, i) => (
                <div key={i} className="dark-card p-6 rounded-2xl border border-white/10 space-y-2.5">
                  <h3 className="text-sm font-semibold text-white font-mono">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. How It Works (3 Steps) */}
        <section id="engine" className="py-20 border-t border-white/10 bg-[#070708]/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C6F432] font-semibold">
                Execution lifecycle
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white">How ReconX operates</h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto">
                From authorized domain enrollment to verified cryptographic report in three steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  step: "01",
                  title: "Scope pinning",
                  desc: "Authorize domain boundaries with dual verification tokens. Guardrails strictly enforce allowed hosts.",
                },
                {
                  step: "02",
                  title: "Autonomous probing",
                  desc: "The AI Pentest Planner evaluates real time headers, open ports, and live CVE advisories to pick each probe.",
                },
                {
                  step: "03",
                  title: "Evidence sealing",
                  desc: "Confirmed results are sealed with cryptographic timestamps and exported into executive ready PDF reports.",
                },
              ].map((step, idx) => (
                <div key={idx} className="dark-card p-6 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-xs font-mono text-[#C6F432] font-bold">{step.step}</span>
                  <h3 className="text-base font-semibold text-white font-serif">{step.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. FAQ Section (6 Questions for Objection Handling & AEO) */}
        <section id="faq" className="py-20 border-t border-white/10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C6F432] font-semibold">
                Frequently asked questions
              </span>
              <h2 className="text-3xl font-serif text-white">Got questions? We have answers.</h2>
            </div>

            <div className="space-y-3 pt-4">
              {[
                {
                  q: "How does ReconX prevent testing out of scope targets?",
                  a: "Every scan requires an authorized domain scope with human moderator approval or DNS ownership verification. Probes resolve target IP addresses before each request and drop any traffic directed at shared provider edge infrastructure.",
                },
                {
                  q: "Does the AI scanner execute destructive exploits?",
                  a: "No. ReconX uses safe proof payloads designed to verify misconfigurations, exposed secrets, or vulnerable dependencies without modifying databases or altering server state.",
                },
                {
                  q: "What tools are bundled with the autonomous worker?",
                  a: "Workers include pure Python network checkers, TLS protocol evaluators, HTTP security analyzers, and automatic fallbacks. If optional external tools like Nuclei are installed, the engine escalates to active CVE verification.",
                },
                {
                  q: "How does the cold start pre warming work?",
                  a: "The frontend sends a lightweight health beacon immediately upon page arrival, waking cloud backend instances in parallel while the user navigates.",
                },
                {
                  q: "Can I export reports for external compliance auditors?",
                  a: "Yes. Executive summaries and technical findings can be downloaded in PDF and JSON formats with full SHA 256 evidence hashes.",
                },
                {
                  q: "Is there a free trial or demo account?",
                  a: "Yes. You can explore complete live dashboards immediately using the one click demo accounts on the sign in page without entering credit card details.",
                },
              ].map((faq, index) => (
                <div
                  key={index}
                  className="dark-card rounded-xl border border-white/10 p-4 transition-colors cursor-pointer"
                  onClick={() => toggleFaq(index)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-semibold text-white">{faq.q}</h3>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform ${openFaq === index ? "rotate-180 text-[#C6F432]" : ""}`}
                    />
                  </div>
                  {openFaq === index && (
                    <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed font-sans">{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Final CTA Section */}
        <section className="py-20 border-t border-white/10 bg-[#070708]/60 relative">
          <div className="max-w-2xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-serif text-white text-balance">
              Start auditing with autonomous evidence
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto">
              Join security engineers running continuous, non destructive assessment pipelines.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#C6F432] hover:bg-[#B5E327] text-[#0B0B0C] font-semibold text-xs sm:text-sm shadow-[0_0_24px_rgba(198,244,50,0.35)] transition-all hover:scale-105 active:scale-95"
              >
                <span>Try it free</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="border-t border-white/10 py-10 px-4 sm:px-6 text-zinc-500 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-zinc-900 border border-white/10 flex items-center justify-center text-white text-[10px] font-bold">
              R
            </div>
            <span className="font-semibold text-white">ReconX Security Intelligence</span>
          </div>
          <div className="flex items-center space-x-6 text-[11px] font-mono">
            <Link href="/login" className="hover:text-white transition-colors">
              Analyst Console
            </Link>
            <a href="#pipeline" className="hover:text-white transition-colors">
              Evidence Ledger
            </a>
            <span className="text-zinc-600">v1.0.0 · Production</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
