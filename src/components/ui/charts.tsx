"use client";

import { cn } from "@/lib/utils";

// ─── Donut Chart ─────────────────────────────────────────────────────────────

export function DonutChart({
  data,
  size = 140,
  thickness = 20,
  className,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className={cn("flex items-center justify-center gap-8", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow background */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500/5 to-purple-500/5 blur-xl" />
        <svg width={size} height={size} className="flex-shrink-0 -rotate-90 relative z-10">
          {/* Background track */}
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={thickness} />
          {data.map((item, i) => {
            const pct = item.value / total;
            const offset = circumference * accumulated;
            const length = circumference * pct;
            accumulated += pct;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 6px ${item.color}40)` }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <span className="text-xl font-black text-text-primary">{total}</span>
          <span className="text-[9px] font-bold text-text-dim uppercase tracking-[0.15em]">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((item, i) => {
          const pct = ((item.value / total) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center gap-3 group cursor-default">
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-[0_0_10px_currentColor] transition-transform group-hover:scale-125"
                style={{ backgroundColor: item.color, color: item.color }}
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-text-secondary group-hover:text-text-primary transition-colors uppercase tracking-wider">
                  {item.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-black text-text-primary">{item.value}</span>
                  <span className="text-[9px] font-medium text-text-dim">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

export function BarChart({
  data,
  height = 120,
  className,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const colors = [
    "from-cyan-400 via-blue-500 to-indigo-500",
    "from-violet-400 via-purple-500 to-pink-500",
    "from-emerald-400 via-teal-500 to-cyan-500",
    "from-amber-400 via-orange-500 to-rose-500",
    "from-rose-400 via-pink-500 to-purple-500",
    "from-blue-400 via-indigo-500 to-violet-500",
  ];

  return (
    <div className={cn("flex items-end gap-3", className)} style={{ height: height + 40 }}>
      {data.map((item, i) => {
        const barH = (item.value / max) * height;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full flex flex-col items-center">
              <span className="text-[10px] font-black text-text-secondary group-hover:text-cyan-400 transition-colors mb-1.5">
                {item.value}
              </span>
              <div
                className={cn(
                  "w-full rounded-xl bg-gradient-to-t transition-all duration-700 ease-out shadow-lg relative overflow-hidden",
                  item.color || colors[i % colors.length]
                )}
                style={{ height: barH || 4 }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Top highlight */}
                <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
              </div>
            </div>
            <span className="text-[9px] font-bold text-text-dim text-center uppercase tracking-tighter leading-tight h-8 flex items-center">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#22d3ee",
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height} ${points} ${width - padding},${height}`;

  return (
    <svg width={width} height={height} className={cn("flex-shrink-0 overflow-visible", className)}>
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${areaPoints.replace(/,/g, " ").split(" ").map((v, i) => i % 2 === 0 ? v : v).join(" ")}`}
        fill={`url(#spark-${color.replace("#", "")})`}
        className="opacity-60"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]"
        style={{ filter: `drop-shadow(0 0 3px ${color}60)` }}
      />
      {/* End dot */}
      {(() => {
        const lastX = padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2);
        const lastY = height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2);
        return <circle cx={lastX} cy={lastY} r="2.5" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />;
      })()}
    </svg>
  );
}

// ─── Progress Ring ───────────────────────────────────────────────────────────

export function ProgressRing({
  value,
  size = 64,
  thickness = 6,
  color = "#22d3ee",
  bgColor = "rgba(255,255,255,0.04)",
  className,
  children,
}: {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  bgColor?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        {/* Glow layer */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness + 4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          opacity="0.1"
          className="transition-all duration-1000 ease-out"
        />
        {/* Background track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={thickness} />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

// ─── Horizontal Bar ──────────────────────────────────────────────────────────

export function HorizontalBar({
  label,
  value,
  maxValue,
  color = "from-cyan-400 to-blue-500",
  suffix = "",
  className,
}: {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  suffix?: string;
  className?: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em]">{label}</span>
        <span className="text-xs font-black text-text-primary tabular-nums">
          {value}{suffix}
        </span>
      </div>
      <div className="h-2 bg-surface-hover rounded-full overflow-hidden border border-border-subtle shadow-inner relative">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out relative overflow-hidden", color)}
          style={{ width: `${pct}%` }}
        >
          {/* Shine effect on bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card with Sparkline ────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
  sparkData,
  href,
}: {
  label: string;
  value: string | number;
  change?: number;
  icon: any;
  color: string;
  sparkData?: number[];
  href?: string;
}) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className={cn(
      "glass-card p-5 group transition-premium relative overflow-hidden",
      href && "cursor-pointer"
    )}>
      {/* Gradient accent at top */}
      <div className={cn(
        "absolute top-0 inset-x-0 h-[3px] rounded-t-[20px] opacity-30 group-hover:opacity-60 transition-opacity",
        color.includes("cyan") ? "bg-gradient-to-r from-cyan-500 to-blue-500" :
        color.includes("violet") ? "bg-gradient-to-r from-violet-500 to-purple-500" :
        color.includes("emerald") ? "bg-gradient-to-r from-emerald-500 to-teal-500" :
        color.includes("rose") ? "bg-gradient-to-r from-rose-500 to-pink-500" :
        "bg-gradient-to-r from-blue-500 to-indigo-500"
      )} />

      <div className="flex items-start justify-between relative z-10">
        <div className={cn("p-2.5 rounded-xl border shadow-sm group-hover:scale-110 transition-transform duration-300", color)}>
          <Icon className="h-5 w-5" />
        </div>
        {sparkData && (
          <Sparkline 
            data={sparkData} 
            width={70} 
            height={24} 
            color={color.includes("cyan") ? "#22d3ee" : color.includes("violet") ? "#a78bfa" : color.includes("emerald") ? "#34d399" : color.includes("rose") ? "#fb7185" : "#60a5fa"} 
          />
        )}
      </div>
      
      <div className="mt-4 relative z-10">
        <p className="text-3xl font-black text-text-primary tracking-tight tabular-nums group-hover:text-cyan-400 transition-colors duration-300">{value}</p>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1">{label}</p>
      </div>

      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2 relative z-10">
          <div className={cn(
            "flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tighter",
            isPositive 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.1)]" 
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(251,113,133,0.1)]"
          )}>
            {isPositive ? "↑" : "↓"} {Math.abs(change)}%
          </div>
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-[0.15em]">vs last period</span>
        </div>
      )}

      {/* Decorative corner glow */}
      <div className={cn(
        "absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
        color.includes("cyan") ? "bg-cyan-500/10" :
        color.includes("violet") ? "bg-violet-500/10" :
        color.includes("emerald") ? "bg-emerald-500/10" :
        color.includes("rose") ? "bg-rose-500/10" :
        "bg-blue-500/10"
      )} />
    </div>
  );
}
