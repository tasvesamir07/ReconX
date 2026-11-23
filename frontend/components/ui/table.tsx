import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  children,
  variant = "default",
  ...props
}: React.TableHTMLAttributes<HTMLTableElement> & {
  variant?: "default" | "glass";
}) {
  return (
    <div className={cn(
      "w-full overflow-x-auto scrollbar-thin",
      variant === "glass" && "rounded-2xl border border-border bg-surface/60 backdrop-blur-lg shadow-glass-md",
      variant === "default" && ""
    )}>
      <table
        className={cn("w-full border-collapse text-left text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-border/50 bg-surface/50", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border/30", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors duration-150 hover:bg-surface/30", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-subtle font-mono",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3.5 align-middle text-sm text-text", className)} {...props} />;
}

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn("sr-only", className)} {...props} />;
}