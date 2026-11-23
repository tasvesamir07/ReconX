import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  invalid?: boolean;
  variant?: "default" | "glass";
  size?: "sm" | "md" | "lg";
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, variant = "default", size = "md", children, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 px-2.5 pr-8 text-body-xs",
      md: "h-10 px-3 pr-9 text-body-sm",
      lg: "h-11 px-4 pr-10 text-body-md",
    };

    const variantClasses = {
      default: "bg-background border-border",
      glass: "bg-surface/50 backdrop-blur-md border-border/50 hover:border-border/60 hover:bg-surface/60 focus-visible:border-accent focus-visible:ring-accent/30",
    };

    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            "w-full appearance-none rounded-lg",
            "placeholder:text-text-subtle",
            "transition-all duration-200 ease-smooth",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-destructive focus-visible:ring-destructive",
            sizeClasses[size],
            variantClasses[variant],
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = "Select";