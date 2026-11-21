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
  FileSpreadsheet,
  ShieldAlert,
  Network,
  Eye,
  Zap,
  Activity,
} from "lucide-react";

export default function LandingPage() {
  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div id="top" className="route-enter min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-emerald-500/20 antialiased scroll-smooth">
      {/* 1. Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          {/* Brand Logo - Smooth Scroll to Top */}
          <a
            href="#top"
            onClick={scrollToTop}
            className="flex items-center space-x-3 shrink-0 group cursor-pointer"
            aria-label="ReconX Home - Scroll to top"
            title="Scroll to top"
          >
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
              Recon<span className="text-emerald-600">X</span>
            </span>
          </a>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center space-x-10 text-sm font-medium text-slate-600">
            <a href="#pipeline" className="hover:text-slate-900 transition-colors">
              Traceability
            </a>
            <a href="#safety" className="hover:text-slate-900 transition-colors">
              Safety & Scope
            </a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">
              Architecture
            </a>
          </nav>

          {/* Right Action: Sign In & Register */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto w-full border-b border-slate-200/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Headlines & CTA */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>Authorization-First Web Security Assessments</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-slate-950 tracking-tight leading-[1.08]">
              AI Security Audits <br />
              Anchored in <br />
              Cryptographic <br />
              Evidence.
            </h1>

            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
              ReconX executes strictly non-destructive vulnerability probes inside isolated Kali Linux sandboxes—only after a human Compliance Moderator signs off on your Letter of Authorization.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-black text-white text-sm sm:text-base font-semibold hover:bg-slate-800 transition shadow-sm"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm sm:text-base font-semibold hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <span>Sign In</span>
              </Link>
              <a
                href="#pipeline"
                className="inline-flex items-center px-4 py-3 rounded-xl text-slate-600 hover:text-slate-900 text-sm sm:text-base font-medium transition"
              >
                Explore Traceability →
              </a>
            </div>

            {/* Checkmark Guarantees */}
            <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs sm:text-sm font-medium text-slate-700">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero Shell Injection</span>
              </span>
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>RFC 1918 Private IP Blocklists</span>
              </span>
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Safe Non-Destructive Probes</span>
              </span>
            </div>
          </div>

          {/* Right Column: Dark Kali Telemetry Window Mockup */}
          <div className="lg:col-span-6 w-full">
            <div className="rounded-2xl bg-[#090D14] border border-slate-800 text-slate-200 shadow-2xl p-6 sm:p-7 font-mono text-xs overflow-hidden w-full">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center space-x-2.5">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span>LIVE</span>
                  </span>
                  <span className="text-slate-200 font-semibold text-xs sm:text-sm truncate">https://api.meridian-sec.io</span>
                </div>
                <span className="text-slate-400 text-xs font-medium tracking-wide shrink-0">LOA-8841</span>
              </div>

              {/* Stepper Pipeline */}
              <div className="py-4 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <span className="text-[10px]">✓</span>
                  <span>Queued</span>
                </div>
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <span className="text-[10px]">✓</span>
                  <span>Policy</span>
                </div>
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <span className="text-[10px]">✓</span>
                  <span>AI Plan</span>
                </div>
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <span className="text-[10px]">⚡</span>
                  <span className="underline decoration-emerald-400 underline-offset-4">Worker</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <span className="text-[10px]">○</span>
                  <span>Hash</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <span className="text-[10px]">○</span>
                  <span>Report</span>
                </div>
              </div>

              {/* Console Log Output */}
              <div className="py-4 space-y-2 text-xs leading-relaxed whitespace-nowrap overflow-x-hidden">
                <div className="flex items-center space-x-2.5">
                  <span className="text-slate-500 shrink-0">01:20:04</span>
                  <span className="text-emerald-400 shrink-0 font-semibold">[POLICY_VERIFIED]</span>
                  <span className="text-slate-300 truncate">Resolved 198.51.100.42 · Matches LOA-8841 · Public IPv4</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-cyan-400 shrink-0 font-semibold">[AI_DECISION]</span>
                  <span className="text-slate-300 truncate">Groq planner queued TLS 1.3 cipher & CORS policy probes</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-amber-400 shrink-0 font-semibold">[CHECK_START]</span>
                  <span className="text-slate-300 truncate">kali.worker.curl inspecting HSTS & CSP response headers</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-emerald-400 shrink-0 font-semibold">[SHA256_SEAL]</span>
                  <span className="text-slate-400 truncate font-mono">a3b0c44208fc1c149afbfc0096fb91627ea41a4649b034c</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-amber-400 shrink-0 font-semibold">[FINDING_CONFIRMED]</span>
                  <span className="text-slate-200 truncate">Missing HSTS includeSubDomains · CVSS 5.3 (Medium)</span>
                </div>
              </div>

              {/* Telemetry Footer */}
              <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>SANDBOX: KALI-ROLLING-WSL2</span>
                <span className="text-slate-300 font-semibold">BUDGET: 142s / 300s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Seven-Step Evidence Traceability */}
      <section id="pipeline" className="reveal-on-scroll py-20 px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto w-full border-b border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
          <div>
            <span className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
              FORENSIC CHAIN OF CUSTODY
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-1">
              Seven-Step Evidence Traceability
            </h2>
          </div>
          <p className="text-slate-600 text-sm sm:text-base max-w-lg leading-relaxed">
            Every vulnerability finding links backward through an unbroken, tamper-evident ledger—from socket output to signed human approval.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400">STEP 01 - 02</span>
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Written LOA & Sign-Off</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Authorization letters are parsed for domain boundaries and approved by a Compliance Moderator before any scan queues.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="inline-block text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
                Artifact: LOA-8841.pdf
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400">STEP 03 - 04</span>
                <Compass className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Policy Guard & AI Plan</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Pre-execution DNS checks block private IPs while dual-AI planners select only permitted probe categories.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="inline-block text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
                Planner: Groq / Gemini
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400">STEP 05 - 06</span>
                <Terminal className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Sandbox & SHA-256</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Kali Linux workers capture raw HTTP, TLS, and nmap outputs and immediately seal each artifact with a SHA-256 digest.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="inline-block text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
                Digest: SHA-256 Verified
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 hover:shadow-md transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400">STEP 07</span>
                <FileSpreadsheet className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Auditor-Ready Synthesis</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Findings, CVSS scores, remediation steps, and cryptographic hashes compile into a formal ReportLab PDF deliverable.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="inline-block text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
                Export: ReportLab A4 PDF
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Safety & Scope Controls */}
      <section id="safety" className="reveal-on-scroll py-20 px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto w-full border-b border-slate-200/80">
        <div className="mb-10">
          <span className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
            HARD TECHNICAL GUARDRAILS
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-1">
            Safety & Scope Controls
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
            Legal boundaries are enforced at DNS resolution, socket egress, and parameterized tool execution—never by prompt instructions alone.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Egress Policy Table Card */}
          <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold text-slate-700 tracking-wide uppercase">
                EGRESS POLICY ENGINE
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-red-50 text-red-600 border border-red-200">
                STRICT DENY
              </span>
            </div>

            <div className="font-mono text-sm space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-900 font-semibold">10.0.0.0/8</span>
                <span className="text-red-600 font-semibold">RFC 1918 Private</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-900 font-semibold">172.16.0.0/12</span>
                <span className="text-red-600 font-semibold">RFC 1918 Private</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-900 font-semibold">192.168.0.0/16</span>
                <span className="text-red-600 font-semibold">RFC 1918 Private</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-900 font-semibold">169.254.169.254/32</span>
                <span className="text-red-600 font-semibold">Cloud Metadata</span>
              </div>
            </div>
          </div>

          {/* Right 2x2 Feature Cards Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2 hover:border-slate-300 hover:shadow-md transition">
              <div className="flex items-center space-x-2.5 text-slate-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-base">Written Authorization</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">
                No target host can be scanned without an active, moderator-approved LOA matching the exact domain and validity window.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2 hover:border-slate-300 hover:shadow-md transition">
              <div className="flex items-center space-x-2.5 text-slate-900">
                <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-base">Anti-SSRF IP Filtering</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">
                Private ranges, loopback interfaces, and cloud metadata endpoints are blocked at the socket layer prior to connection.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2 hover:border-slate-300 hover:shadow-md transition">
              <div className="flex items-center space-x-2.5 text-slate-900">
                <Network className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-base">Pre-Execution DNS</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">
                Every hostname is resolved and re-validated immediately before worker dispatch to prevent DNS rebinding attacks.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2 hover:border-slate-300 hover:shadow-md transition">
              <div className="flex items-center space-x-2.5 text-slate-900">
                <Eye className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-base">Read-Only Audits</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">
                Probes are strictly non-destructive—zero exploit payloads, zero state-mutating requests, and strict path exclusions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Platform Architecture (High-Contrast Dark Section) */}
      <section id="architecture" className="reveal-on-scroll bg-[#090D14] text-white py-20 px-6 sm:px-8 lg:px-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <span className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-wider">
                DETERMINISTIC EXECUTION ENGINE
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1">
                Platform Architecture
              </h2>
            </div>
            <p className="text-slate-400 text-sm sm:text-base max-w-md leading-relaxed">
              Built for isolated sandbox execution, dual-provider AI failover, and real-time IPC telemetry streaming.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Arch 1 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0E1522] space-y-3 flex flex-col justify-between hover:border-slate-700 hover:shadow-xl transition">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Kali WSL2 Sandboxes</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Isolated Debian/Kali-Rolling x86_64 workers with parameterized, injection-proof tool wrappers.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-xs font-mono text-emerald-400">Debian / Kali-Rolling</span>
              </div>
            </div>

            {/* Arch 2 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0E1522] space-y-3 flex flex-col justify-between hover:border-slate-700 hover:shadow-xl transition">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Dual-AI Failover</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Primary Groq inference automatically fails over to Google Gemini models when quotas tighten.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-xs font-mono text-emerald-400">Groq + Gemini</span>
              </div>
            </div>

            {/* Arch 3 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0E1522] space-y-3 flex flex-col justify-between hover:border-slate-700 hover:shadow-xl transition">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">SHA-256 Hashing</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Immutable cryptographic digests guarantee collected tool outputs cannot be altered before PDF synthesis.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-xs font-mono text-emerald-400">Tamper-Evident</span>
              </div>
            </div>

            {/* Arch 4 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0E1522] space-y-3 flex flex-col justify-between hover:border-slate-700 hover:shadow-xl transition">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">IPC Telemetry</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Structured worker events stream live to the analyst console with exact timestamps and severity tags.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-xs font-mono text-emerald-400">Sub-second Stream</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="py-8 px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
        <a
          href="#top"
          onClick={scrollToTop}
          className="flex items-center space-x-2.5 hover:text-slate-800 transition cursor-pointer group"
          title="Back to top"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="font-medium">© 2026 ReconX Security Governance Platform</span>
        </a>
        <div className="flex flex-wrap items-center gap-6">
          <a href="#pipeline" className="hover:text-slate-800 transition">Documentation</a>
          <a href="#safety" className="hover:text-slate-800 transition">Terms of Authorized Testing</a>
          <Link href="/login" className="hover:text-slate-800 transition font-medium">Sign In (Login)</Link>
          <Link href="/register" className="hover:text-slate-800 transition font-medium">Register Organization (Register)</Link>
        </div>
      </footer>
    </div>
  );
}
