"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LoginFormProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  error?: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange?: () => void;
  onClearAutofill?: () => void;
}

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
  onInputChange,
  onClearAutofill,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleFieldChange = (callback: () => void) => {
    callback();
    if (onInputChange) onInputChange();
    if (onClearAutofill) onClearAutofill();
  };

  return (
    <div className="space-y-4">
      {/* Error Alert Box */}
      {error && (
        <div
          className="p-3.5 rounded-xl bg-destructive-soft border border-destructive/30 flex items-start space-x-2.5 text-destructive text-body-xs animate-in"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <span className="font-semibold block">Authentication Error</span>
            <span className="text-destructive/90">{error}</span>
          </div>
        </div>
      )}

      {/* Manual Credentials Form */}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label label-md">
            Email address
          </label>
          <div className="relative">
            <Mail className="input-icon w-4 h-4" aria-hidden="true" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => handleFieldChange(() => setEmail(e.target.value))}
              placeholder="analyst@reconx.local"
              className="input input-md input-with-icon"
              aria-describedby={error ? "email-error" : undefined}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="label label-md">
            Password
          </label>
          <div className="relative">
            <Lock className="input-icon w-4 h-4" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              spellCheck={false}
              required
              value={password}
              onChange={(e) => handleFieldChange(() => setPassword(e.target.value))}
              placeholder="••••••••••••"
              className="input input-md input-with-icon pr-12"
              aria-describedby={error ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full justify-center mt-1"
          loading={loading}
        >
          Sign In to ReconX
        </Button>
      </form>
    </div>
  );
}