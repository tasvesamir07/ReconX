"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "text-success" },
  error: { icon: XCircle, className: "text-destructive" },
  warning: { icon: AlertTriangle, className: "text-accentWarm" },
  info: { icon: Info, className: "text-accentCool" },
};

const variantBorders: Record<ToastVariant, string> = {
  success: "border-l-4 border-success",
  error: "border-l-4 border-destructive",
  warning: "border-l-4 border-accentWarm",
  info: "border-l-4 border-accentCool",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback((options: ToastOptions) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [
      ...current.slice(-3),
      { ...options, id, variant: options.variant ?? "info" },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[700] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 safe-bottom"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, className } = variantStyles[item.variant];
  const borderClass = variantBorders[item.variant];

  React.useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration ?? 5000);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      role={item.variant === "error" || item.variant === "warning" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl glass-card-strong p-4 shadow-glass-lg animate-slide-up",
        borderClass
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", className)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-label-md font-medium text-text">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-body-xs leading-relaxed text-text-muted">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="rounded p-1 text-text-subtle transition-colors hover:bg-surface/50 hover:text-text"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}