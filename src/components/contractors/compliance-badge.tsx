"use client";

import { ShieldCheck, AlertTriangle, XCircle, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceBadgeProps {
  score?: number;
  isFullyCompliant?: boolean;
  coiStatus?: string;
  coiDaysLeft?: number | null;
  className?: string;
}

export function ComplianceBadge({
  score = 0,
  isFullyCompliant,
  coiStatus,
  coiDaysLeft,
  className,
}: ComplianceBadgeProps) {
  if (isFullyCompliant || score === 100) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
          className
        )}
        title="Fully Compliant: Active Insurance COI, Trade License & W-9 on file"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        Compliant {score > 0 && `(${score}%)`}
      </span>
    );
  }

  if (coiStatus === "EXPIRED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/40 animate-pulse",
          className
        )}
        title="Insurance COI is Expired! Contractor cannot be assigned until renewed."
      >
        <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
        COI Expired
      </span>
    );
  }

  if (coiStatus === "EXPIRING_SOON") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30",
          className
        )}
        title={`Insurance COI expires in ${coiDaysLeft} days`}
      >
        <Clock className="h-3.5 w-3.5 text-amber-400" />
        COI Expiring ({coiDaysLeft}d)
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-text-muted border border-border-subtle",
        className
      )}
      title="Missing required compliance documents (COI, License, or W-9)"
    >
      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
      Partial ({score}%)
    </span>
  );
}
