"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { apiRequest, ReconXApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiRequest("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      setSuccessMsg("Email successfully verified! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      if (err instanceof ReconXApiError) {
        setError(err.message);
      } else {
        setError("Verification failed. Please check the code and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    setResending(true);

    try {
      await apiRequest("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setCooldown(60);
      setSuccessMsg("A new verification code has been dispatched to your email.");
    } catch (err: any) {
      if (err instanceof ReconXApiError) {
        setError(err.message);
      } else {
        setError("Could not resend code. Please try again later.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-elevation-2">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent mx-auto mb-4">
          <Mail className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-display-sm font-bold text-text tracking-tight">Verify Your Email</h2>
        <p className="text-body-xs text-text-muted mt-1">Enter the 6-digit verification code sent to your email</p>
      </div>

      {error && (
        <div
          className="mb-6 p-3.5 rounded-xl bg-destructive-soft border border-destructive/30 flex items-start space-x-2.5 text-destructive text-body-xs animate-in"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="mb-6 p-3.5 rounded-xl bg-success-soft border border-success/30 flex items-start space-x-2.5 text-success text-body-xs animate-in"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4" noValidate>
        <div>
          <label htmlFor="verify-email" className="label label-md">
            Email Address
          </label>
          <input
            id="verify-email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input input-md"
          />
        </div>

        <div>
          <label htmlFor="verify-otp" className="label label-md">
            6-Digit One-Time Code
          </label>
          <input
            id="verify-otp"
            type="text"
            autoComplete="one-time-code"
            spellCheck={false}
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="input input-md text-center tracking-widest font-mono text-display-sm text-accent"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-1"
          disabled={loading || otp.length !== 6}
          loading={loading}
        >
          Confirm Verification
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-body-xs text-text-muted pt-6 border-t border-border">
        <span>Didn't receive the email?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="text-accent hover:underline disabled:text-text-subtle font-medium inline-flex items-center space-x-1 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin-slow" : ""}`} aria-hidden="true" />
          <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}</span>
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#C6F432] selection:text-[#0B0B0C]">
      <div className="absolute inset-0 bg-fluted-grid pointer-events-none opacity-40 -z-10" aria-hidden="true" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-lime-beam pointer-events-none blur-3xl opacity-60 -z-10"
        aria-hidden="true"
      />
      <Suspense fallback={<div className="text-zinc-400 text-sm">Loading verification...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}