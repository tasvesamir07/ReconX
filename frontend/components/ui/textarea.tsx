import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-h-[96px] w-full resize-y rounded-lg border border-line bg-canvas/80 px-3 py-2.5 text-sm leading-relaxed text-ink transition-colors",
          "placeholder:text-subtle hover:border-line-strong",
          "focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/15",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-danger/60 focus:border-danger/70 focus:ring-danger/15",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
