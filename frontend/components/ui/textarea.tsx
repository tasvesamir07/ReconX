import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  variant?: "default" | "glass";
  size?: "sm" | "md" | "lg";
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, variant = "default", size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-20 px-2.5 py-1.5 text-body-xs",
      md: "min-h-[96px] px-3 py-2.5 text-body-sm",
      lg: "min-h-[120px] px-4 py-3 text-body-md",
    };

    const variantClasses = {
      default: "bg-background border-border",
      glass: "bg-surface/50 backdrop-blur-md border-border/50 hover:border-border/60 hover:bg-surface/60 focus-visible:border-accent focus-visible:ring-accent/30",
    };

    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full resize-y rounded-lg",
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
      />
    );
  }
);

Textarea.displayName = "Textarea";