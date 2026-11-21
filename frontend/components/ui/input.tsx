import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 px-2.5 text-body-xs",
      md: "h-10 px-3 text-body-sm",
      lg: "h-11 px-4 text-body-md",
    };

    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-lg border border-border bg-background",
          "placeholder:text-text-subtle hover:border-border-strong",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-150",
          invalid && "border-destructive focus-visible:ring-destructive",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";