"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export function Tabs({
  items,
  value,
  onValueChange,
  className,
  ariaLabel = "Sections",
  variant = "glass",
}: {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  variant?: "default" | "glass" | "pill";
}) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = items.findIndex((item) => item.value === value);
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    const next = items[nextIndex];
    if (!next) return;
    onValueChange(next.value);
    refs.current[next.value]?.focus();
  }

  const variants = {
    default: "flex gap-1 overflow-x-auto border-b border-line scrollbar-thin",
    glass: "flex gap-1 overflow-x-auto border-b border-border/30 scrollbar-thin",
    pill: "flex gap-2 overflow-x-auto scrollbar-thin",
  };

  const tabVariants = {
    default: "relative inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
    glass: "relative inline-flex shrink-0 items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-200 ease-smooth glass-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
    pill: "relative inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 ease-smooth glass-pill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
  };

  const activeVariants = {
    default: "border-accent text-ink",
    glass: "bg-surface/60 text-text border-border/30",
    pill: "bg-accent/20 text-accent border-accent/30 shadow-glass-sm",
  };

  const inactiveVariants = {
    default: "border-transparent text-muted hover:border-line-strong hover:text-ink",
    glass: "text-text-muted hover:bg-surface/40 hover:text-text hover:border-border/50",
    pill: "text-text-muted hover:bg-surface/50 hover:text-text",
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(variants[variant], className)}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[item.value] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            className={cn(
              tabVariants[variant],
              active ? activeVariants[variant] : inactiveVariants[variant]
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums font-mono",
                  active
                    ? variant === "default"
                      ? "bg-accent/15 text-accent border border-accent/25"
                      : "bg-accent/20 text-accent border-accent/30"
                    : "bg-surface/50 text-text-muted border border-border/30"
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}