"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  MapPin,
  Briefcase,
  Star,
  Check,
  DollarSign,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Modal, Button, Avatar, Badge } from "@/components/ui";
import { ComplianceBadge } from "@/components/contractors/compliance-badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface SmartVendorAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string;
  workOrderTitle?: string;
  currentContractorId?: string | null;
  onAssigned?: (contractorId: string, contractorName: string) => void;
}

export function SmartVendorAssignModal({
  isOpen,
  onClose,
  workOrderId,
  workOrderTitle,
  currentContractorId,
  onAssigned,
}: SmartVendorAssignModalProps) {
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<any[]>([]);
  const [topRecommendation, setTopRecommendation] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && workOrderId) {
      loadRecommendations();
    }
  }, [isOpen, workOrderId]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ai/contractor-finder?workOrderId=${workOrderId}`);
      if (res.ok) {
        const data = await res.json();
        setContractors(data.contractors || []);
        setTopRecommendation(data.topRecommendation || null);
        setContext(data.context || null);
      } else {
        toast.error("Failed to load vendor recommendations");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading smart recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (contractor: any) => {
    try {
      setAssigningId(contractor.id);
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId: contractor.id }),
      });

      if (res.ok) {
        toast.success(`Assigned to ${contractor.name} (${contractor.matchScore}% Match Score)!`);
        if (onAssigned) onAssigned(contractor.id, contractor.name);
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to assign contractor");
      }
    } catch (err) {
      toast.error("Failed to assign contractor");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Smart Vendor Recommendation Engine"
      size="xl"
    >
      <div className="space-y-5">
        {/* Context Header */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Multi-Factor AI Matching Active
              </span>
            </div>
            <p className="text-xs font-bold text-text-primary">
              {workOrderTitle || "Work Order Assignment"}
            </p>
            {context && (
              <p className="text-[11px] text-text-muted">
                {context.serviceType} • {context.location}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-text-dim block">Criteria Evaluated:</span>
            <span className="text-[10px] font-semibold text-cyan-300">
              Distance • Skills • Capacity • Rating • COI
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto" />
            <p className="text-xs text-text-muted">
              Analyzing contractor proximity, compliance, and turnaround metrics...
            </p>
          </div>
        ) : contractors.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            No contractors registered in the system.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Recommended Highlight Card */}
            {topRecommendation && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-surface to-surface border-2 border-cyan-500/40 relative overflow-hidden shadow-lg shadow-cyan-500/5">
                <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-md flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" />
                  Top Match: {topRecommendation.matchScore}%
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 sm:mt-0">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <Avatar
                        name={topRecommendation.name}
                        src={topRecommendation.image}
                        size="lg"
                        className="ring-2 ring-cyan-500/40"
                      />
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-surface flex items-center justify-center text-[10px] text-slate-950 font-black">
                        ✓
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-text-primary">
                          {topRecommendation.company || topRecommendation.name}
                        </h4>
                        <ComplianceBadge
                          score={topRecommendation.compliance.score}
                          isFullyCompliant={topRecommendation.isFullyCompliant}
                          coiStatus={topRecommendation.compliance.isCoiExpired ? "EXPIRED" : "ACTIVE"}
                        />
                      </div>
                      <p className="text-xs font-semibold text-cyan-300">
                        {topRecommendation.recommendationReason}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted pt-0.5">
                        {topRecommendation.distanceMiles !== null && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-text-dim" /> {topRecommendation.distanceMiles} mi
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {topRecommendation.stats.avgRating} ({topRecommendation.stats.completedJobs} completed)
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-text-dim" /> {topRecommendation.stats.activeJobs} active jobs
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-text-dim" /> ~{topRecommendation.stats.avgTurnaroundDays}d turnaround
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleAssign(topRecommendation)}
                    disabled={assigningId === topRecommendation.id || currentContractorId === topRecommendation.id}
                    className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20 whitespace-nowrap self-stretch sm:self-center"
                  >
                    <Check className="h-4 w-4" />
                    {currentContractorId === topRecommendation.id ? "Already Assigned" : "Assign Top Recommendation"}
                  </Button>
                </div>
              </div>
            )}

            {/* Ranked List */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-muted px-1">
                All Ranked Contractor Matches ({contractors.length})
              </h4>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {contractors.map((c, idx) => {
                  const isCurrent = currentContractorId === c.id;

                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "p-3.5 rounded-xl bg-surface border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/30",
                        idx === 0 ? "border-cyan-500/30 bg-cyan-500/[0.02]" : "border-border-subtle"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-text-dim w-5">
                          #{idx + 1}
                        </span>
                        <Avatar name={c.name} src={c.image} size="md" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">
                              {c.company || c.name}
                            </span>
                            <ComplianceBadge
                              score={c.compliance.score}
                              isFullyCompliant={c.isFullyCompliant}
                              coiStatus={c.compliance.isCoiExpired ? "EXPIRED" : "ACTIVE"}
                            />
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-muted">
                            {c.distanceMiles !== null && (
                              <span>{c.distanceMiles} miles away</span>
                            )}
                            <span>•</span>
                            <span>{c.stats.avgRating}★ ({c.stats.completedJobs} jobs)</span>
                            <span>•</span>
                            <span>{c.stats.activeJobs} active</span>
                            <span>•</span>
                            <span>~{c.stats.avgTurnaroundDays}d turnaround</span>
                          </div>
                        </div>
                      </div>

                      {/* Match Score & Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-sm font-black text-cyan-400">
                              {c.matchScore}%
                            </span>
                            <span className="text-[10px] text-text-dim">Match</span>
                          </div>
                          <div className="w-20 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                              style={{ width: `${c.matchScore}%` }}
                            />
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={idx === 0 ? "primary" : "outline"}
                          disabled={assigningId === c.id || isCurrent}
                          onClick={() => handleAssign(c)}
                          className={cn(
                            "text-xs font-bold",
                            idx === 0 && "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                          )}
                        >
                          {isCurrent ? "Assigned" : "Assign"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
