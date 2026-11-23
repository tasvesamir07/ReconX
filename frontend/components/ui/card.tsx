import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "glass" | "glass-strong" | "elevated";
}) {
  const variants = {
    default: "rounded-xl border border-border bg-surface",
    glass: "rounded-2xl glass-card",
    "glass-strong": "rounded-2xl glass-card-strong",
    elevated: "rounded-xl border border-border bg-surface-elevated shadow-elevation-2",
  };

  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 px-5 pt-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-heading-sm font-semibold text-text", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body-xs leading-relaxed text-text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 border-t border-border/50 px-5 py-3", className)}
      {...props}
    />
  );
}