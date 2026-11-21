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

  const performLogin = async (loginEmail: string, loginPass: string, roleName?: string) => {
    setError(null);
    setLoading(true);
    if (roleName) setLoggingInRole(roleName);

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 relative">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Navigation to Landing Page */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-body-xs text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          <span className="text-label-xs font-mono text-text-subtle">ReconX Identity</span>
        </div>

        {/* Brand Header */}
        <Link href="/" className="block text-center space-y-2 group">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent mx-auto shadow-sm group-hover:border-accent/50 transition-colors">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-display-sm font-bold text-text tracking-tight group-hover:text-accent transition-colors">Sign in to ReconX</h2>
          <p className="text-body-xs text-text-muted">Evidence-backed security assessment platform</p>
        </Link>

        {/* 1. 1-Click Demo Accounts */}
        <DemoAccountCards
          autoFilledRole={autoFilledRole}
          loggingInRole={loggingInRole}
          loading={loading}
          onAutofillOnly={handleAutofillOnly}
          onOneClickLogin={handleOneClickLogin}
        />

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
        <div className="pt-3 border-t border-border text-center text-body-xs text-text-muted space-y-2">
          <div>
            Need a fresh account?{" "}
            <Link href="/register" className="text-accent hover:underline font-semibold ml-1">
              Register new organization
            </Link>
          </div>
          <div>
            <Link href="/" className="text-text-subtle hover:text-text-muted transition-colors text-label-xs">
              ← Return to Product Overview & Features
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}