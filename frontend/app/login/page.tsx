"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import { apiRequest, ReconXApiError } from "@/lib/api-client";
import { DemoAccountCards, DemoPreset } from "@/components/auth/demo-account-cards";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoFilledRole, setAutoFilledRole] = useState<string | null>(null);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string, roleName?: string) => {
    setError(null);
    setLoading(true);
    setIsWarmingUp(false);
    if (roleName) setLoggingInRole(roleName);

    const warmTimer = setTimeout(() => setIsWarmingUp(true), 2500);

    try {
      await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof ReconXApiError) {
        if (err.code === "EMAIL_NOT_VERIFIED") {
          router.push(`/verify-email?email=${encodeURIComponent(loginEmail)}`);
          return;
        }
        setError(err.message || "Invalid authentication credentials.");
      } else {
        setError("Failed to connect to authentication server. Please verify backend status.");
      }
    } finally {
      clearTimeout(warmTimer);
      setIsWarmingUp(false);
      setLoading(false);
      setLoggingInRole(null);
    }
  };


  const handleAutofillOnly = (demo: DemoPreset) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setAutoFilledRole(demo.role);
    setError(null);
  };

  const handleOneClickLogin = (demo: DemoPreset) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setAutoFilledRole(demo.role);
    performLogin(demo.email, demo.password, demo.role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#C6F432] selection:text-[#0B0B0C]">
      {/* Background Fluted Lines & Ambient Lime Beam */}
      <div className="absolute inset-0 bg-fluted-grid pointer-events-none opacity-40 -z-10" aria-hidden="true" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-lime-beam pointer-events-none blur-3xl opacity-60 -z-10"
        aria-hidden="true"
      />
      <div className="w-full max-w-md dark-card rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative border border-white/10 text-white">
        {/* Navigation to Landing Page */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          <span className="text-xs font-mono text-zinc-500">ReconX Identity</span>
        </div>

        {/* Brand Header */}
        <Link href="/" className="block text-center space-y-2 group">
          <div className="w-11 h-11 rounded-xl bg-[#18181B] border border-white/15 text-[#C6F432] flex items-center justify-center mx-auto shadow-md group-hover:border-[#C6F432]/50 transition-colors">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight group-hover:text-[#C6F432] transition-colors">
            Sign in to ReconX
          </h2>
          <p className="text-xs text-zinc-400 font-sans">
            Evidence-backed security assessment platform
          </p>
        </Link>

        {/* 1. 1-Click Demo Accounts */}
        <DemoAccountCards
          autoFilledRole={autoFilledRole}
          loggingInRole={loggingInRole}
          loading={loading}
          onAutofillOnly={handleAutofillOnly}
          onOneClickLogin={handleOneClickLogin}
        />

        {/* Cold Start Indicator */}
        {isWarmingUp && (
          <div className="flex items-center justify-center gap-2 text-xs text-[#C6F432] bg-[#C6F432]/10 border border-[#C6F432]/30 rounded-xl p-3 animate-pulse shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#C6F432] animate-ping" />
            <span>Connecting to backend instance (Render free tier spin-up can take ~20s)...</span>
          </div>
        )}

        {/* 2. Manual Form */}
        <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          error={error}
          loading={loading && !loggingInRole}
          onSubmit={handleSubmit}
          onClearAutofill={() => setAutoFilledRole(null)}
        />

        {/* Links */}
        <div className="pt-3 border-t border-white/10 text-center text-xs text-zinc-400 space-y-2">
          <div>
            Need a fresh account?{" "}
            <Link href="/register" className="text-[#C6F432] hover:underline font-semibold ml-1">
              Register new organization
            </Link>
          </div>
          <div>
            <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs">
              ← Return to Product Overview & Features
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}