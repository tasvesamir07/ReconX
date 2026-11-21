import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "outline";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700 font-medium",
  primary: "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium",
  warning: "border-amber-300 bg-amber-50 text-amber-800 font-medium",
  danger: "border-rose-300 bg-rose-50 text-rose-800 font-medium",
  info: "border-sky-300 bg-sky-50 text-sky-800 font-medium",
  outline: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  dot = false,
  size = "sm",
  children,
  ...props
}: BadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-label-xs",
    md: "px-2.5 py-1 text-label-sm",
  };

  const dotColors: Record<BadgeVariant, string> = {
    neutral: "bg-text-subtle",
    primary: "bg-accent",
    success: "bg-success",
    warning: "bg-accentWarm",
    danger: "bg-destructive",
    info: "bg-accentCool",
    outline: "bg-text-subtle",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        sizeClasses[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {dot ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}