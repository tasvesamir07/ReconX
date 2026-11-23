import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  size?: "sm" | "md" | "lg";
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, size = "md", required, children, ...props }, ref) => {
    const sizeClasses = {
      sm: "text-label-xs",
      md: "text-label-sm",
      lg: "text-label-md",
    };

    return (
      <label
        ref={ref}
        className={cn(
          "block font-medium text-text-muted mb-1.5",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </label>
    );
  }
);

Label.displayName = "Label";