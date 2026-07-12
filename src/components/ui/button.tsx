import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "emerald" | "amber";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, isLoading, children, disabled, ...props }, ref) => {
    const activeLoading = loading || isLoading;
    const base =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none relative overflow-hidden";

    const variants = {
      primary: "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] border border-cyan-400/25 hover:border-cyan-400/40 bg-[length:200%_200%] hover:bg-right transition-all duration-500",
      secondary: "bg-surface-hover text-text-primary hover:bg-surface-active border border-border-subtle hover:border-border-medium",
      outline: "border border-border-subtle bg-transparent text-text-secondary hover:bg-surface-hover hover:border-border-medium hover:text-text-primary",
      ghost: "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
      danger: "bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 text-white hover:shadow-[0_0_24px_rgba(251,113,133,0.35)] border border-rose-400/25",
      emerald: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:shadow-[0_0_24px_rgba(52,211,153,0.35)] border border-emerald-400/25 bg-[length:200%_200%] hover:bg-right transition-all duration-500",
      amber: "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:shadow-[0_0_24px_rgba(251,191,36,0.35)] border border-amber-400/25 bg-[length:200%_200%] hover:bg-right transition-all duration-500",
    };

    const sizes = {
      xs: "text-[11px] px-2.5 py-1 gap-1",
      sm: "text-xs px-3.5 py-2 gap-1.5",
      md: "text-sm px-5 py-2.5 gap-2",
      lg: "text-base px-7 py-3.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || activeLoading}
        {...props}
      >
        {/* Subtle shine overlay on hover */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {activeLoading ? (
          <div className="mr-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : null}
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps };
