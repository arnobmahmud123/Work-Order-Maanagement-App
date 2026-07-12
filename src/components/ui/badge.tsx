import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "cyan" | "emerald" | "amber" | "rose" | "purple" | "outline" | "pink" | "blue";
  className?: string;
  size?: "sm" | "md";
}

export function Badge({ children, variant = "default", className, size = "md" }: BadgeProps) {
  const variants = {
    default: "bg-surface-hover text-text-secondary border-border-subtle",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.08)]",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.08)]",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.08)]",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(251,113,133,0.08)]",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(167,139,250,0.08)]",
    pink: "bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-[0_0_10px_rgba(244,114,182,0.08)]",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(96,165,250,0.08)]",
    outline: "bg-transparent text-text-secondary border-border-subtle",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg font-bold border tracking-tight uppercase",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
