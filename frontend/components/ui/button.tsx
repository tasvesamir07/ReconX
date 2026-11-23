import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "destructive" | "outline" | "subtle" | "primary-glass" | "secondary-glass" | "ghost-glass";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "btn-sheen bg-[#C6F432] text-[#0B0B0C] font-bold hover:bg-[#B5E327] active:bg-[#A4D21C] shadow-[0_0_16px_rgba(198,244,50,0.3)]",
  "primary-glass":
    "btn bg-[#C6F432]/90 backdrop-blur-md text-[#0B0B0C] font-bold hover:bg-[#C6F432] hover:shadow-[0_0_20px_rgba(198,244,50,0.4)] border border-[#C6F432]/30",
  secondary:
    "bg-surface-elevated text-text border border-border hover:bg-surface-pressed hover:border-border-strong",
  "secondary-glass":
    "btn glass-card text-text hover:bg-surface/70 hover:border-border/60",
  ghost: "text-text-muted hover:text-text hover:bg-surface/50",
  "ghost-glass":
    "btn glass-pill text-text-muted hover:text-text hover:bg-surface/70",
  danger:
    "bg-destructive text-white hover:bg-destructive-hover active:bg-destructive-pressed shadow-[0_0_16px_-4px_rgba(239,68,68,0.3)]",
  destructive:
    "bg-destructive text-white hover:bg-destructive-hover active:bg-destructive-pressed shadow-[0_0_16px_-4px_rgba(239,68,68,0.3)]",
  outline: "border-2 border-border text-text hover:bg-surface hover:border-border-strong",
  subtle: "bg-surface-elevated text-text-muted hover:text-text hover:bg-surface-pressed",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-label-sm gap-1.5",
  md: "h-10 px-4 text-label-md gap-2",
  lg: "h-11 px-5 text-label-lg gap-2",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading = false, disabled, asChild = false, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: cn(buttonVariants({ variant, size, className }), (children.props as any).className),
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export function buttonVariants({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 ease-smooth",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    "active:scale-[0.98]",
    variants[variant],
    sizes[size],
    className
  );
}