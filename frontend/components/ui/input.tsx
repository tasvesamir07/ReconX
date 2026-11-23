import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, size = "md", variant = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 px-2.5 text-body-xs",
      md: "h-10 px-3 text-body-sm",
      lg: "h-11 px-4 text-body-md",
    };

    const variantClasses = {
      default: "bg-background border-border",
      glass: "bg-surface/50 backdrop-blur-md border-border/50 hover:border-border/60 hover:bg-surface/60 focus-visible:border-accent focus-visible:ring-accent/30",
    };

    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-lg",
          "placeholder:text-text-subtle",
          "transition-all duration-200 ease-smooth",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          invalid && "border-destructive focus-visible:ring-destructive",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";