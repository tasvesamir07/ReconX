import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border border-line bg-canvas/80 px-3 pr-9 text-sm text-ink transition-colors",
            "hover:border-line-strong focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-danger/60 focus:border-danger/70 focus:ring-danger/15",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = "Select";
