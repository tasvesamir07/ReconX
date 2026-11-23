"use client";

import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  Activity,
  Terminal,
  Code2,
  Lock,
  Layers,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Skiper103, ThemeToggleButton3 } from "@/components/ui/skiper-ui";

// Mandatory B11: Tagline Word-by-Word Scroll Reveal Component
function TaglineReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealedCount, setRevealedCount] = useState<number>(0);

  const words = [
    "We",
    "verify",
    "every",
    "exploit",
    "against",
    "cryptographic",
    "evidence",
    "so",
    "your",
    "engineering",
    "team",
    "never",
    "wastes",
    "another",
    "sprint",
    "chasing",
    "unconfirmed",
    "false",
    "positives",
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const ratio = entry.intersectionRatio;
            const targetCount = Math.min(
              words.length,
              Math.floor(ratio * words.length * 1.35) + 3
            );
            setRevealedCount((prev) => Math.max(prev, targetCount));
          }
        });
      },
      {
        threshold: [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0],
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [words.length]);

  return (
    <div ref={containerRef} className="py-24 sm:py-32 border-t border-white/10 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#C6F432] font-semibold">
          Autonomous Guarantee
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif leading-[1.2] tracking-tight max-w-3xl mx-auto text-balance">
          {words.map((word, index) => {
            const isRevealed = index < revealedCount;
            const isKey = word === "cryptographic" || word === "evidence";
            return (
              <span
                key={index}
                className={`inline-block mx-1.5 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isRevealed
                    ? isKey
                      ? "text-[#C6F432] font-normal"
                      : "text-white font-medium"
                    : "text-zinc-600/40"
                }`}
              >
                {word}
              </span>
            );
          })}
        </h2>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Card 1: Interactive Tabs
  const [activeTab, setActiveTab] = useState<"prs" | "probes">("prs");

  // Card 2: Interactive Auto-Fix Switch & Chart Scrubber
  const [autoFixOn, setAutoFixOn] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Card 3: Interactive Gantt Hover
  const [activeGanttPhase, setActiveGanttPhase] = useState<string | null>(null);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(true);

  // Interactive Docs Tab in #docs section
  const [activeDocsTab, setActiveDocsTab] = useState<"cli" | "python" | "typescript">("cli");

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sparkline data points: [x, y, time, score]
  const graphPoints = [
    { x: 0, y: 65, time: "09:00", score: 78, label: "Recon baseline established" },
    { x: 50, y: 52, time: "10:00", score: 84, label: "Fingerprint & TLS evaluated" },
    { x: 100, y: 46, time: "11:00", score: 89, label: "CORS & Secret checks passed" },
    { x: 150, y: 28, time: "12:00", score: 92, label: "Active CVE verification confirmed" },
    { x: 200, y: 12, time: "13:00", score: autoFixOn ? 94 : 88, label: "Evidence sealed in ledger" },
  ];

  return (
    <div
      id="top"
      className="min-h-screen flex flex-col bg-transparent text-white font-sans selection:bg-[#C6F432] selection:text-[#0B0B0C] relative antialiased"
    >
      {/* Background Fluted Grid Lines (Vertical pinstripes) */}
      <div className="fixed inset-0 bg-fluted-grid pointer-events-none opacity-35 z-0" aria-hidden="true" />

      {/* Ambient Breathing Lime Beam (Constant living subtle column of light behind hero) */}
      <div
        className="fixed top-16 left-1/2 -translate-x-1/2 w-[950px] h-[580px] bg-lime-beam pointer-events-none blur-3xl opacity-40 z-0 animate-beam-breath"
        aria-hidden="true"
      />

      {/* 1. Northline Top Navigation Bar - Truly Sticky Header */}
      <header className="sticky top-0 z-50 w-full py-3 px-4 sm:px-6 lg:px-8 bg-[#0B0B0C]/80 backdrop-blur-md transition-all duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between glass-pill px-4 py-2.5 rounded-full shadow-2xl border border-white/10 bg-[#121214]/90 backdrop-blur-lg">
          {/* Brand Logo */}
          <a
            href="#top"
            onClick={scrollToTop}
            className="flex items-center space-x-2.5 text-white hover:text-zinc-200 transition-colors group cursor-pointer"
            title="Scroll to top"
          >
            <div className="w-7 h-7 rounded-lg bg-[#18181B] border border-white/15 flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:border-[#C6F432]/60 group-hover:scale-105 transition-all">
              R
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              Recon<span className="text-[#C6F432]">X</span>
            </span>
          </a>

          {/* Center Navigation Links (Smooth-scrolling to live anchor sections) */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-mono text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors flex items-center space-x-1.5 group">
              <span className="text-[#C6F432] group-hover:scale-125 transition-transform">●</span>
              <span>Features</span>
            </a>
            <a href="#engine" className="hover:text-white transition-colors">
              AI Engine
            </a>
            <a href="#pipeline" className="hover:text-white transition-colors">
              Audit Ledger
            </a>
            <a href="#docs" className="hover:text-white transition-colors">
              Docs
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            <ThemeToggleButton3 className="size-8 p-1.5 text-zinc-300 hover:text-[#C6F432] transition-colors" />
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-300 hover:text-white transition-colors px-2 py-1"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 rounded-full border border-[#C6F432]/50 bg-[#C6F432] hover:bg-[#B5E327] text-[#0B0B0C] text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_16px_rgba(198,244,50,0.3)]"
            >
              Start free
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 max-w-6xl mx-auto glass-pill rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-2 text-xs font-mono text-zinc-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors flex items-center space-x-2"
              >
                <span className="text-[#C6F432]">●</span>
                <span>Features</span>
              </a>
              <a
                href="#engine"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                AI Engine
              </a>
              <a
                href="#pipeline"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                Audit Ledger
              </a>
              <a
                href="#docs"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                Docs
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                FAQ
              </a>
            </nav>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-zinc-300 hover:text-white px-2 py-1"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-1.5 rounded-full bg-[#C6F432] text-[#0B0B0C] text-xs font-bold"
              >
                Start free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1">
        <section className="pt-20 pb-16 sm:pt-24 sm:pb-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-6xl mx-auto relative">
            {/* Left Flanking Metric Callouts with Gentle Float Animation */}
            <div className="hidden xl:flex absolute left-0 top-10 flex-col text-left space-y-8 select-none animate-float-slow">
              <div className="group cursor-default">
                <div className="text-4xl font-serif text-white tracking-tight group-hover:text-[#C6F432] transition-colors">
                  3x
                </div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase mt-0.5">
                  FASTER AUDITING
                </div>
              </div>
              <div className="group cursor-default">
                <div className="text-4xl font-serif text-white tracking-tight group-hover:text-[#C6F432] transition-colors">
                  87%
                </div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase mt-0.5">
                  BUGS CAUGHT PRE-MERGE
                </div>
              </div>
            </div>

            {/* Right Flanking Metric Callouts with Gentle Float Animation */}
            <div className="hidden xl:flex absolute right-0 top-10 flex-col text-right space-y-8 select-none animate-float-slow">
              <div className="group cursor-default">
                <div className="text-4xl font-serif text-white tracking-tight group-hover:text-[#C6F432] transition-colors">
                  120K+
                </div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase mt-0.5">
                  TARGETS CONNECTED
                </div>
              </div>
              <div className="group cursor-default">
                <div className="text-4xl font-serif text-white tracking-tight group-hover:text-[#C6F432] transition-colors">
                  2.4M
                </div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 font-semibold uppercase mt-0.5">
                  PROBES SEALED
                </div>
              </div>
            </div>

            {/* Center Content */}
            <div className="max-w-2xl mx-auto text-center space-y-6">
              {/* Northline Headline: Serif with Lime Green italic accent word */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif tracking-tight text-white leading-[1.08] text-balance">
                Audit <span className="italic text-[#C6F432] font-normal hover:underline transition-all">faster</span> than
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
                  href="/register"
                  className="px-6 py-2.5 rounded-full bg-[#C6F432] hover:bg-[#B5E327] text-[#0B0B0C] font-semibold text-xs sm:text-sm shadow-[0_0_24px_rgba(198,244,50,0.35)] transition-all hover:scale-105 active:scale-95"
                >
                  Try it free
                </Link>
                <a
                  href="#pipeline"
                  className="px-6 py-2.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs sm:text-sm transition-all hover:border-white/30"
                >
                  Book a demo
                </a>
              </div>
            </div>

            {/* 3. The 3 Signature Northline Dark Cards Trio */}
            <div className="pt-16 sm:pt-20 grid grid-cols-1 lg:grid-cols-3 gap-5 text-left max-w-5xl mx-auto">
              {/* Card 1: Pull requests / Active Target Probes */}
              <div className="dark-card rounded-2xl p-5 space-y-3.5 flex flex-col justify-between min-h-[320px] transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                      <span className="text-[#C6F432] animate-pulse">●</span>
                      <span className="font-semibold text-zinc-300">
                        {activeTab === "prs" ? "Pull requests" : "Active probes"}
                      </span>
                    </div>

                    {/* Interactive Tab Switcher */}
                    <div className="flex items-center space-x-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                      <button
                        onClick={() => setActiveTab("prs")}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                          activeTab === "prs" ? "bg-[#18181B] text-[#C6F432] font-bold" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        PRs
                      </button>
                      <button
                        onClick={() => setActiveTab("probes")}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                          activeTab === "probes" ? "bg-[#18181B] text-[#C6F432] font-bold" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Probes
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3">
                    {(activeTab === "prs"
                      ? [
                          {
                            avatar: "AK",
                            title: "auth: rotate session tokens",
                            badge: "Merged",
                            badgeStyle: "bg-[#C6F432] text-[#0B0B0C] font-bold shadow-[0_0_8px_rgba(198,244,50,0.4)]",
                          },
                          {
                            avatar: "MS",
                            title: "billing: retry webhooks",
                            badge: "Ready",
                            badgeStyle: "border border-[#C6F432]/60 text-[#C6F432] bg-[#C6F432]/10 font-semibold",
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
                        ]
                      : [
                          {
                            avatar: "P1",
                            title: "vuln.cors: origin reflection",
                            badge: "Passed",
                            badgeStyle: "bg-[#C6F432] text-[#0B0B0C] font-bold",
                          },
                          {
                            avatar: "P2",
                            title: "tls: modern cipher negotiation",
                            badge: "A+",
                            badgeStyle: "border border-[#C6F432]/60 text-[#C6F432] bg-[#C6F432]/10 font-semibold",
                          },
                          {
                            avatar: "P3",
                            title: "vuln.nuclei: cve verification",
                            badge: "Active",
                            badgeStyle: "border border-white/10 text-zinc-400 bg-white/5",
                          },
                          {
                            avatar: "P4",
                            title: "secrets: credential leak check",
                            badge: "Clean",
                            badgeStyle: "border border-white/10 text-zinc-500",
                          },
                        ]
                    ).map((row, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] hover:translate-x-1 transition-all cursor-pointer"
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
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6F432] animate-ping" />
                    Target scope verified
                  </span>
                  <span className="text-[#C6F432]">4 active workers</span>
                </div>
              </div>

              {/* Card 2: Review Score with Interactive SVG Graph & Interactive Toggle */}
              <div className="dark-card rounded-2xl p-6 space-y-4 flex flex-col justify-between min-h-[320px] transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                      <span className="text-[#C6F432]">●</span>
                      <span className="font-semibold text-zinc-300">Review score</span>
                    </div>

                    {/* Interactive Auto-Fix Toggle */}
                    <button
                      type="button"
                      onClick={() => setAutoFixOn(!autoFixOn)}
                      className={`flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border transition-all ${
                        autoFixOn
                          ? "border-[#C6F432]/60 bg-[#C6F432]/10 text-[#C6F432] shadow-[0_0_12px_rgba(198,244,50,0.2)]"
                          : "border-zinc-700 bg-zinc-800/60 text-zinc-400"
                      }`}
                      title="Click to toggle autonomous auto-fix"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          autoFixOn ? "bg-[#C6F432] animate-pulse" : "bg-zinc-500"
                        }`}
                      />
                      <span>{autoFixOn ? "Auto-fix on" : "Manual gate"}</span>
                    </button>
                  </div>

                  <div className="pt-3 flex items-baseline space-x-2">
                    <span className="text-5xl font-serif font-bold text-white tracking-tight leading-none transition-all">
                      {hoverIndex !== null ? graphPoints[hoverIndex].score : autoFixOn ? 94 : 88}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">/ 100 repo health</span>
                  </div>

                  {hoverIndex !== null && (
                    <div className="text-[11px] font-mono text-[#C6F432] pt-0.5 truncate">
                      {graphPoints[hoverIndex].time}: {graphPoints[hoverIndex].label}
                    </div>
                  )}

                  {/* Interactive SVG Sparkline Chart with Mouse Hover Scrubber */}
                  <div className="w-full h-28 relative mt-3 select-none">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 200 80" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C6F432" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#C6F432" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Main Sparkline Path */}
                      <path
                        d="M 0 65 Q 25 60 50 52 T 100 46 T 150 28 T 200 12"
                        fill="none"
                        stroke="#C6F432"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="animate-draw-line"
                      />
                      <path
                        d="M 0 65 Q 25 60 50 52 T 100 46 T 150 28 T 200 12 L 200 80 L 0 80 Z"
                        fill="url(#limeGradient)"
                      />

                      {/* Interactive Scrubber Vert Line on Hover */}
                      {hoverIndex !== null && (
                        <line
                          x1={graphPoints[hoverIndex].x}
                          y1={0}
                          x2={graphPoints[hoverIndex].x}
                          y2={80}
                          stroke="#C6F432"
                          strokeWidth="1.5"
                          strokeDasharray="2,2"
                        />
                      )}

                      {/* Interactive Dot Markers */}
                      {graphPoints.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r={hoverIndex === i ? 5 : 3.5}
                          fill="#C6F432"
                          stroke="#0B0B0C"
                          strokeWidth="1.5"
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoverIndex(i)}
                          onMouseLeave={() => setHoverIndex(null)}
                        />
                      ))}
                    </svg>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/5">
                  {graphPoints.map((pt, i) => (
                    <span
                      key={i}
                      onMouseEnter={() => setHoverIndex(i)}
                      onMouseLeave={() => setHoverIndex(null)}
                      className={`cursor-pointer transition-colors ${
                        hoverIndex === i ? "text-[#C6F432] font-bold" : "hover:text-zinc-300"
                      }`}
                    >
                      {pt.time}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 3: Merge Timeline with Animated Gantt Playhead Needle */}
              <div className="dark-card rounded-2xl p-5 space-y-4 flex flex-col justify-between min-h-[320px] transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                      <span className="text-[#C6F432]">●</span>
                      <span className="font-semibold text-zinc-300">Merge timeline</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
                      className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                      title="Toggle live playhead scanner"
                    >
                      <Activity className={`w-3 h-3 ${isTimelinePlaying ? "text-[#C6F432]" : "text-zinc-500"}`} />
                      <span>{isTimelinePlaying ? "Live scanner" : "Paused"}</span>
                    </button>
                  </div>

                  {/* Time Markers */}
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-2 pb-3">
                    <span>09:30</span>
                    <span>10:00</span>
                    <span className="text-[#C6F432] font-semibold">11:00</span>
                    <span>12:00</span>
                    <span>13:00</span>
                  </div>

                  {/* Gantt Timeline Tracks with Animated Luminous Lime Playhead Needle */}
                  <div className="relative space-y-2.5 py-1">
                    {/* Glowing Playhead Needle */}
                    <div
                      className={`absolute top-0 bottom-0 w-[2px] bg-[#C6F432] shadow-[0_0_10px_#C6F432] z-10 pointer-events-none transition-all ${
                        isTimelinePlaying ? "animate-needle-pulse left-[52%]" : "left-[52%]"
                      }`}
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -top-1 left-[52%] -translate-x-1/2 w-2 h-2 rounded-full bg-[#C6F432] shadow-[0_0_6px_#C6F432] z-20 pointer-events-none"
                      aria-hidden="true"
                    />

                    {/* Track 1: Scope & Recon */}
                    <div
                      className="flex items-center gap-1.5 h-4 cursor-pointer group"
                      onMouseEnter={() => setActiveGanttPhase("Reconnaissance & Baseline (100% complete)")}
                      onMouseLeave={() => setActiveGanttPhase(null)}
                    >
                      <div className="w-[18%] bg-zinc-800/80 rounded-md h-3.5 group-hover:bg-zinc-700 transition-colors" />
                      <div className="w-[42%] bg-[#C6F432] rounded-md h-3.5 shadow-[0_0_10px_rgba(198,244,50,0.3)] hover:scale-y-110 transition-transform" />
                      <div className="w-[22%] bg-zinc-800/80 rounded-md h-3.5" />
                    </div>

                    {/* Track 2: Fingerprint & Tech Stack */}
                    <div
                      className="flex items-center gap-1.5 h-4 cursor-pointer group"
                      onMouseEnter={() => setActiveGanttPhase("Fingerprint & Protocol Scan (100% complete)")}
                      onMouseLeave={() => setActiveGanttPhase(null)}
                    >
                      <div className="w-[10%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[50%] bg-[#C6F432] rounded-md h-3.5 shadow-[0_0_10px_rgba(198,244,50,0.3)] hover:scale-y-110 transition-transform" />
                      <div className="w-[25%] bg-zinc-800/80 rounded-md h-3.5" />
                    </div>

                    {/* Track 3: Active CVE & Nuclei */}
                    <div
                      className="flex items-center gap-1.5 h-4 cursor-pointer group"
                      onMouseEnter={() => setActiveGanttPhase("Active CVE & Probe Verification (In Progress)")}
                      onMouseLeave={() => setActiveGanttPhase(null)}
                    >
                      <div className="w-[28%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[15%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[35%] bg-[#C6F432] rounded-md h-3.5 shadow-[0_0_10px_rgba(198,244,50,0.3)] hover:scale-y-110 transition-transform" />
                    </div>

                    {/* Track 4: Evidence Sealing */}
                    <div
                      className="flex items-center gap-1.5 h-4 cursor-pointer group"
                      onMouseEnter={() => setActiveGanttPhase("Evidence Sealing & SHA-256 Digest (Pending)")}
                      onMouseLeave={() => setActiveGanttPhase(null)}
                    >
                      <div className="w-[38%] bg-zinc-800/80 rounded-md h-3.5" />
                      <div className="w-[28%] bg-[#C6F432] rounded-md h-3.5 shadow-[0_0_10px_rgba(198,244,50,0.3)] hover:scale-y-110 transition-transform" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] font-mono text-zinc-500 flex justify-between border-t border-white/5 truncate">
                  <span className="truncate text-zinc-400">
                    {activeGanttPhase ? activeGanttPhase : "Phase: Active verification"}
                  </span>
                  <span className="text-[#C6F432] ml-2 shrink-0">11:00 playhead</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mandatory B11: Tagline Word-by-Word Scroll Reveal Section */}
        <TaglineReveal />

        {/* 4. Problem to Solution Section (#features) */}
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
                <div
                  key={i}
                  className="dark-card p-6 rounded-2xl border border-white/10 hover:border-[#C6F432]/40 transition-all duration-300 space-y-2.5 group"
                >
                  <h3 className="text-sm font-semibold text-white font-mono group-hover:text-[#C6F432] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. How It Works Section (#engine) */}
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
                <div
                  key={idx}
                  className="dark-card p-6 rounded-2xl border border-white/10 hover:border-[#C6F432]/40 transition-all duration-300 space-y-3 group"
                >
                  <span className="text-xs font-mono text-[#C6F432] font-bold group-hover:scale-110 inline-block transition-transform">
                    {step.step}
                  </span>
                  <h3 className="text-base font-semibold text-white font-serif">{step.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Evidence & Audit Ledger Section (#pipeline) */}
        <section id="pipeline" className="py-20 border-t border-white/10 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-center">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C6F432] font-semibold">
                Audit Trail & Traceability
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white text-balance">
                Every probe sealed in an immutable cryptographic ledger
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto text-pretty">
                Zero black box results or ambiguous severity labels. Each finding carries raw request response evidence,
                request timings, and a verifiable SHA 256 hash.
              </p>
            </div>

            <div className="dark-card p-6 sm:p-8 rounded-2xl border border-white/10 text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono text-zinc-400">
                <span className="text-[#C6F432] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Evidence Ledger Entry #RX 80421
                </span>
                <span>SHA 256 Sealed</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] block">CHECK ID</span>
                  <span className="text-zinc-200">vuln.cors.origin_reflection</span>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] block">CONFIDENCE</span>
                  <span className="text-[#C6F432] font-bold">100% Confirmed Proof</span>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] block">EVIDENCE HASH</span>
                  <span className="text-zinc-300 truncate block">a7f208c994b1...</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Developer & API Documentation Section (#docs) */}
        <section id="docs" className="py-20 border-t border-white/10 bg-[#070708]/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C6F432] font-semibold">
                Developer API & Automation
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white">Integrate into your CI/CD pipeline</h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto">
                Trigger autonomous assessments and pull verified evidence programmatically via REST API or CLI.
              </p>
            </div>

            <div className="dark-card rounded-2xl border border-white/10 overflow-hidden">
              {/* Docs Tabs */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-[#C6F432]" />
                  <span className="text-xs font-mono font-semibold text-zinc-300">ReconX Telemetry Client</span>
                </div>
                <div className="flex items-center space-x-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                  <button
                    onClick={() => setActiveDocsTab("cli")}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
                      activeDocsTab === "cli" ? "bg-[#18181B] text-[#C6F432] font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setActiveDocsTab("python")}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
                      activeDocsTab === "python" ? "bg-[#18181B] text-[#C6F432] font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setActiveDocsTab("typescript")}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded transition-colors ${
                      activeDocsTab === "typescript" ? "bg-[#18181B] text-[#C6F432] font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    TypeScript
                  </button>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="p-5 font-mono text-xs overflow-x-auto text-zinc-300 leading-relaxed bg-[#0B0B0C]/80">
                {activeDocsTab === "cli" && (
                  <pre className="text-zinc-300">
                    <span className="text-zinc-500"># Trigger autonomous assessment probe on authorized target</span>
                    {"\n"}
                    <span className="text-[#C6F432]">curl</span> -X POST https://reconx-backend-ljsn.onrender.com/api/v1/scans \{"\n"}
                    {"  "}-H <span className="text-amber-300">&quot;Content-Type: application/json&quot;</span> \{"\n"}
                    {"  "}-d <span className="text-amber-300">&apos;{`{"target_url": "https://api.yourdomain.com", "preset": "ultimate"}`}&apos;</span>
                  </pre>
                )}
                {activeDocsTab === "python" && (
                  <pre className="text-zinc-300">
                    <span className="text-zinc-500"># Pull verified findings with cryptographic hashes</span>
                    {"\n"}
                    <span className="text-purple-400">import</span> httpx{"\n"}
                    client = httpx.Client(base_url=<span className="text-amber-300">&quot;https://reconx-backend-ljsn.onrender.com/api/v1&quot;</span>){"\n"}
                    response = client.get(<span className="text-amber-300">&quot;/scans/latest/findings&quot;</span>){"\n"}
                    <span className="text-purple-400">for</span> finding <span className="text-purple-400">in</span> response.json():{"\n"}
                    {"    "}print(f<span className="text-amber-300">&quot;Verified: {`{finding['title']}`} | SHA-256: {`{finding['evidence_hash']}`}&quot;</span>)
                  </pre>
                )}
                {activeDocsTab === "typescript" && (
                  <pre className="text-zinc-300">
                    <span className="text-zinc-500">// Fetch live assessment telemetry in real-time</span>
                    {"\n"}
                    <span className="text-purple-400">import</span> &#123; apiRequest &#125; <span className="text-purple-400">from</span> <span className="text-amber-300">&quot;@/lib/api-client&quot;</span>;{"\n"}
                    <span className="text-purple-400">const</span> telemetry = <span className="text-purple-400">await</span> apiRequest&lt;TelemetryReport&gt;(<span className="text-amber-300">&quot;/scans/metrics/summary&quot;</span>);{"\n"}
                    console.log(<span className="text-amber-300">`Autonomous health score: ${`{telemetry.health_score}`}/100`</span>);
                  </pre>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 8. FAQ Section (#faq) with Skiper 103 Bouncy Accordion */}
        <section id="faq" className="py-20 border-t border-white/10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C6F432] font-semibold">
                Frequently asked questions
              </span>
              <h2 className="text-3xl font-serif text-white">Got questions? We have answers.</h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                Everything you need to know about autonomous authorization, proof engines, and cryptographic verification.
              </p>
            </div>

            <div className="pt-4">
              <Skiper103
                items={[
                  {
                    id: 1,
                    question: "How does ReconX prevent testing out-of-scope targets?",
                    answer:
                      "Every scan requires an authorized domain scope with human moderator approval or DNS ownership verification. Probes resolve target IP addresses before each request and drop any traffic directed at shared provider edge infrastructure.",
                    category: "Authorization",
                  },
                  {
                    id: 2,
                    question: "Does the AI scanner execute destructive exploits?",
                    answer:
                      "No. ReconX uses safe proof payloads designed to verify misconfigurations, exposed secrets, or vulnerable dependencies without modifying databases or altering server state.",
                    category: "Safety Guardrails",
                  },
                  {
                    id: 3,
                    question: "What tools are bundled with the autonomous worker?",
                    answer:
                      "Workers include pure Python network checkers, TLS protocol evaluators, HTTP security analyzers, and automatic fallbacks. If optional external tools like Nuclei are installed, the engine escalates to active CVE verification.",
                    category: "Worker Stack",
                  },
                  {
                    id: 4,
                    question: "How does the cold start pre-warming work?",
                    answer:
                      "The frontend sends a lightweight health beacon immediately upon page arrival, waking cloud backend instances in parallel while the user navigates.",
                    category: "Performance",
                  },
                  {
                    id: 5,
                    question: "Can I export reports for external compliance auditors?",
                    answer:
                      "Yes. Executive summaries and technical findings can be downloaded in PDF and JSON formats with full SHA-256 evidence hashes.",
                    category: "Compliance",
                  },
                  {
                    id: 6,
                    question: "Is there a free trial or demo account?",
                    answer:
                      "Yes. You can explore complete live dashboards immediately using the one-click demo accounts on the sign in page without entering credit card details.",
                    category: "Demo Access",
                  },
                ]}
              />
            </div>
          </div>
        </section>

        {/* 9. Final CTA Section */}
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
                href="/register"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#C6F432] hover:bg-[#B5E327] text-[#0B0B0C] font-semibold text-xs sm:text-sm shadow-[0_0_24px_rgba(198,244,50,0.35)] transition-all hover:scale-105 active:scale-95"
              >
                <span>Try it free</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Footer */}
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
