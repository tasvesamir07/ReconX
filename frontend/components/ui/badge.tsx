import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "glass" | "primary" | "success" | "warning" | "danger" | "info" | "outline" | "neutral";
  size?: "sm" | "md" | "lg";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const variants = {
      default: "bg-surface-elevated text-text-muted border border-border",
      glass: "glass-pill text-text-muted",
      primary: "bg-accent-soft text-accent",
      "primary-glass": "glass-pill text-accent bg-accent/10 border-accent/20",
      success: "bg-success-soft text-success",
      "success-glass": "glass-pill text-success bg-success/10 border-success/20",
      warning: "bg-accentWarm-soft text-accentWarm",
      "warning-glass": "glass-pill text-accentWarm bg-accentWarm/10 border-accentWarm/20",
      danger: "bg-destructive-soft text-destructive",
      "danger-glass": "glass-pill text-destructive bg-destructive/10 border-destructive/20",
      info: "bg-accentCool-soft text-accentCool",
      "info-glass": "glass-pill text-accentCool bg-accentCool/10 border-accentCool/20",
      outline: "border border-border bg-transparent text-text-muted hover:bg-surface/50",
      "outline-glass": "glass-pill border border-border/50 text-text-muted hover:bg-surface/50",
      neutral: "bg-slate-800 text-text-muted",
    };

    const sizes = {
      sm: "px-1.5 py-0.5 text-[10px] gap-1",
      md: "px-2 py-0.5 text-label-xs gap-1.5",
      lg: "px-3 py-1 text-label-sm gap-2",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium rounded-full transition-all duration-200 ease-smooth",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";