"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Building,
  Phone,
  Scan,
  Users,
  CheckCircle2,
} from "lucide-react";
import { apiRequest, ReconXApiError } from "@/lib/api-client";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"analyst" | "moderator">("analyst");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (accountType === "moderator" && (!organizationName.trim() || organizationName.trim().length < 2)) {
      setError("Please specify your Organization or Company name.");
      return;
    }

    if (CAPTCHA_SITE_KEY && !captchaToken) {
      setError("Please complete the human verification challenge.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          display_name: displayName.trim(),
          phone_number: phoneNumber.trim() || null,
          account_type: accountType,
          organization_name: accountType === "moderator" ? organizationName.trim() : null,
          captcha_token: captchaToken || undefined,
        }),
      });
      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      if (err instanceof ReconXApiError) {
        setError(err.message);
      } else {
        setError(err?.message || "Registration failed. Please check network connectivity.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#C6F432] selection:text-[#0B0B0C]">
      {/* Background Fluted Lines & Ambient Lime Beam */}
      <div className="absolute inset-0 bg-fluted-grid pointer-events-none opacity-40 -z-10" aria-hidden="true" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[500px] bg-lime-beam pointer-events-none blur-3xl opacity-60 -z-10"
        aria-hidden="true"
      />
      <div className="w-full max-w-xl dark-card rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative border border-white/10 text-white">
        {/* Navigation to Landing Page */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          <span className="text-xs font-mono font-medium text-zinc-500">ReconX Identity</span>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 rounded-xl bg-[#18181B] border border-white/15 text-[#C6F432] flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Create ReconX Account</h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans">
            Select your account tier to begin authorized web security auditing
          </p>
        </div>

        {/* 1. Account Tier Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType("analyst")}
            className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
              accountType === "analyst"
                ? "border-[#C6F432] bg-[#18181B] ring-1 ring-[#C6F432]/60 shadow-sm"
                : "border-white/10 bg-[#121214] hover:border-white/20 hover:bg-[#18181B]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#C6F432]/10 text-[#C6F432] flex items-center justify-center">
                <Scan className="w-4 h-4" />
              </div>
              {accountType === "analyst" && (
                <CheckCircle2 className="w-4 h-4 text-[#C6F432]" />
              )}
            </div>
            <div className="mt-3">
              <div className="font-bold text-xs sm:text-sm text-white">Security Analyst (Freelancer / Team)</div>
              <div className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Work independently in Freelancer mode or join an organization. Run assessments and view verified audit reports.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("moderator")}
            className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
              accountType === "moderator"
                ? "border-[#C6F432] bg-[#18181B] ring-1 ring-[#C6F432]/60 shadow-sm"
                : "border-white/10 bg-[#121214] hover:border-white/20 hover:bg-[#18181B]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#C6F432]/10 text-[#C6F432] flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              {accountType === "moderator" && (
                <CheckCircle2 className="w-4 h-4 text-[#C6F432]" />
              )}
            </div>
            <div className="mt-3">
              <div className="font-bold text-xs sm:text-sm text-white">Organization Moderator (Team Lead)</div>
              <div className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Establish corporate tenant, invite & govern multiple analysts, and review & approve domain testing scopes.
              </div>
            </div>
          </button>
        </div>

        {error && (
          <div
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-red-700 text-xs animate-in"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name (If Moderator) */}
          {accountType === "moderator" && (
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-2 animate-in">
              <label htmlFor="orgName" className="block text-xs font-bold text-purple-900">
                Organization / Company Name *
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="orgName"
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Meridian Security Corp"
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-purple-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-700 transition"
                />
              </div>
              <p className="text-[10px] text-purple-700 leading-snug">
                Your organization workspace will be created with you as the Lead Moderator / Owner. You can invite your security analysts afterwards.
              </p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="displayName" className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name / Operator Identity *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@domain.com"
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
              Password (Min 8 characters) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <TurnstileWidget onToken={setCaptchaToken} />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition shadow-sm disabled:opacity-50 mt-2"
          >
            {loading
              ? "Creating Account..."
              : accountType === "moderator"
              ? "Create Organization & Moderator Account"
              : "Create Security Analyst Account"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-1">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-slate-900 hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
