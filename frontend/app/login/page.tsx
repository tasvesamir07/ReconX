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
    <div className="min-h-screen flex items-center justify-center bg-forest-darker bg-dot-matrix p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-electric selection:text-white">
      {/* Ambient Purple Bloom */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-purple-bloom pointer-events-none blur-3xl opacity-75 -z-10"
        aria-hidden="true"
      />
      <div className="w-full max-w-md bg-sand text-forest rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-sand/40 relative">
        {/* Navigation to Landing Page */}
        <div className="flex items-center justify-between pb-3 border-b border-forest/15">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-body-xs text-forest/70 hover:text-forest transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          <span className="text-label-xs font-mono text-forest/60">ReconX Identity</span>
        </div>

        {/* Brand Header */}
        <Link href="/" className="block text-center space-y-2 group">
          <div className="w-12 h-12 rounded-2xl bg-forest text-sand flex items-center justify-center mx-auto shadow-md group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-electric-light" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-forest tracking-tight group-hover:text-electric transition-colors">
            Sign in to ReconX
          </h2>
          <p className="text-xs text-forest/75 font-sans">
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
          <div className="flex items-center justify-center gap-2 text-xs text-purple-900 bg-purple-100/90 border border-purple-300 rounded-xl p-3 animate-pulse shadow-sm">
            <span className="w-2 h-2 rounded-full bg-electric animate-ping" />
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
        <div className="pt-3 border-t border-forest/15 text-center text-body-xs text-forest/70 space-y-2">
          <div>
            Need a fresh account?{" "}
            <Link href="/register" className="text-electric hover:underline font-semibold ml-1">
              Register new organization
            </Link>
          </div>
          <div>
            <Link href="/" className="text-forest/60 hover:text-forest transition-colors text-label-xs">
              ← Return to Product Overview & Features
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}