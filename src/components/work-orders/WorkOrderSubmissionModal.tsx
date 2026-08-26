"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Upload,
  FileText,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  ChevronRight,
  Clock,
  Send,
  Loader2,
  XCircle,
  HelpCircle,
  Building2,
  MapPin,
  Flame,
  ListChecks,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TaskEntry, BidEntry } from "./task-bid-entries";
import { PhotoItem, PhotoCategory } from "./photo-upload";
import toast from "react-hot-toast";

export interface WorkOrderSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
  tasks: TaskEntry[];
  onTasksChange: (tasks: TaskEntry[]) => void;
  bids: BidEntry[];
  customInspectionItems: any[];
  onCustomInspectionItemsChange: (items: any[]) => void;
  allPhotos: PhotoItem[];
  propertyFrontPhotos: any[];
  onUploadPhoto: (file: File, category: string) => Promise<{ url: string; rawUrl?: string; id: string }>;
  onOpenCamera?: (target: "task" | "inspection" | "global", category: PhotoCategory, taskId?: string) => void;
  onSubmitWorkOrder: (notes: string) => Promise<void>;
  isSubmitting?: boolean;
}

export type IssueType =
  | "MISSING_BEFORE_PHOTO"
  | "MISSING_AFTER_PHOTO"
  | "MISSING_REJECTION_REASON"
  | "TASK_NOT_COMPLETED"
  | "MISSING_PROPERTY_CONDITION"
  | "MISSING_BID_PHOTO";

export interface ValidationIssue {
  id: string;
  type: IssueType;
  severity: "ERROR" | "WARNING";
  title: string;
  description: string;
  targetId?: string; // taskId or inspectionId
  targetName?: string;
  category?: PhotoCategory;
}

export function WorkOrderSubmissionModal({
  isOpen,
  onClose,
  workOrder,
  tasks,
  onTasksChange,
  bids,
  customInspectionItems,
  onCustomInspectionItemsChange,
  allPhotos,
  propertyFrontPhotos,
  onUploadPhoto,
  onOpenCamera,
  onSubmitWorkOrder,
  isSubmitting = false,
}: WorkOrderSubmissionModalProps) {
  const [contractorNotes, setContractorNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"checklist" | "summary">("checklist");
  const [uploadingForIssueId, setUploadingForIssueId] = useState<string | null>(null);
  const [inlineReasonTaskId, setInlineReasonTaskId] = useState<string | null>(null);
  const [inlineReasonText, setInlineReasonText] = useState("");
  const [propertyConditionNote, setPropertyConditionNote] = useState(workOrder?.metadata?.propertyConditionNote || "");
  const [showPropertyNoteInput, setShowPropertyNoteInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadIssue, setPendingUploadIssue] = useState<ValidationIssue | null>(null);

  // ── Run Complete Validation Check ──────────────────────────────────────────
  const validation = useMemo(() => {
    const issues: ValidationIssue[] = [];
    let passedCount = 0;
    let totalChecks = 0;

    // 1. Check Tasks
    tasks.forEach((task) => {
      totalChecks++;
      const isRejectedOrNotNeeded = task.status === "REJECTED" || task.status === "NOT_NEEDED";

      // If rejected / not needed -> require a reason note
      if (isRejectedOrNotNeeded) {
        if (!task.statusNote || !task.statusNote.trim()) {
          issues.push({
            id: `task-reason-${task.id}`,
            type: "MISSING_REJECTION_REASON",
            severity: "ERROR",
            title: `Missing Reason for Skipped Task`,
            description: `Task "${task.title}" is marked as ${task.status === "REJECTED" ? "Rejected" : "Not Needed"}. A brief explanation is required.`,
            targetId: task.id,
            targetName: task.title,
          });
        } else {
          passedCount++;
        }
        return;
      }

      // Check Task Completion
      if (!task.completed) {
        issues.push({
          id: `task-incomplete-${task.id}`,
          type: "TASK_NOT_COMPLETED",
          severity: "ERROR",
          title: `Incomplete Task`,
          description: `Task "${task.title}" is not marked as completed. Mark it complete or set to Not Needed with a reason.`,
          targetId: task.id,
          targetName: task.title,
        });
        return;
      }

      // Check Task Photos
      const taskPhotos = task.photos || [];
      const beforePhotos = taskPhotos.filter((p) => (p.category || "").toUpperCase() === "BEFORE");
      const afterPhotos = taskPhotos.filter((p) => (p.category || "").toUpperCase() === "AFTER");

      let taskHasError = false;

      // Minimum 1 Before Photo required
      if (beforePhotos.length === 0) {
        taskHasError = true;
        issues.push({
          id: `task-before-${task.id}`,
          type: "MISSING_BEFORE_PHOTO",
          severity: "ERROR",
          title: `No BEFORE Photos in "${task.title}"`,
          description: `Drywall, repairs, and trash outs require at least 1 BEFORE photo to verify pre-existing condition.`,
          targetId: task.id,
          targetName: task.title,
          category: "BEFORE",
        });
      }

      // Minimum 1 After Photo required for completed tasks
      if (afterPhotos.length === 0) {
        taskHasError = true;
        issues.push({
          id: `task-after-${task.id}`,
          type: "MISSING_AFTER_PHOTO",
          severity: "ERROR",
          title: `No AFTER Photos in "${task.title}"`,
          description: `Completed task requires at least 1 AFTER photo to verify completion for the client.`,
          targetId: task.id,
          targetName: task.title,
          category: "AFTER",
        });
      }

      if (!taskHasError) {
        passedCount++;
      }
    });

    // 2. Check Property Condition & Front Photos
    totalChecks++;
    const hasFrontPhoto = (propertyFrontPhotos && propertyFrontPhotos.length > 0) || Boolean(workOrder?.property?.imageUrl);
    const hasInspectionPhotos = (customInspectionItems && customInspectionItems.some((item) => (item.photos || []).length > 0)) ||
      allPhotos.some((p) => (p.category || "").toUpperCase() === "INSPECTION" || (p.category || "").toUpperCase() === "GENERAL");
    const hasConditionNote = Boolean(propertyConditionNote.trim());

    if (!hasFrontPhoto && !hasInspectionPhotos && !hasConditionNote) {
      issues.push({
        id: "property-condition-missing",
        type: "MISSING_PROPERTY_CONDITION",
        severity: "WARNING",
        title: "No Property Condition / Front Photos Uploaded (Optional)",
        description: "Recommended: Upload property front/address verification photos or add a condition note.",
      });
    }
    passedCount++;

    // 3. Check Bids (if any)
    bids.forEach((bid) => {
      if (bid.amount > 0 && (!bid.photos || bid.photos.length === 0)) {
        issues.push({
          id: `bid-photo-${bid.id}`,
          type: "MISSING_BID_PHOTO",
          severity: "WARNING",
          title: `Bid "${bid.title}" has no photos`,
          description: `Bids are more likely to be approved when supporting estimate photos are attached.`,
          targetId: bid.id,
          targetName: bid.title,
          category: "BID",
        });
      }
    });

    const errorCount = issues.filter((i) => i.severity === "ERROR").length;
    const warningCount = issues.filter((i) => i.severity === "WARNING").length;
    const isReady = errorCount === 0;

    return {
      issues,
      errorCount,
      warningCount,
      isReady,
      passedCount,
      totalChecks,
      progressPercent: totalChecks > 0 ? Math.round((passedCount / totalChecks) * 100) : 100,
    };
  }, [tasks, propertyFrontPhotos, workOrder, customInspectionItems, allPhotos, bids, propertyConditionNote]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handlePickFileForIssue = (issue: ValidationIssue) => {
    setPendingUploadIssue(issue);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadIssue) return;

    const issue = pendingUploadIssue;
    setUploadingForIssueId(issue.id);

    try {
      const category = issue.category || "BEFORE";
      const uploaded = await onUploadPhoto(file, category);

      const newPhotoItem: PhotoItem = {
        id: uploaded.id,
        url: uploaded.url,
        rawUrl: uploaded.rawUrl,
        name: file.name,
        size: file.size,
        category: category as PhotoCategory,
        timestamp: new Date().toISOString(),
        persisted: true,
      };

      if (issue.targetId && (issue.type === "MISSING_BEFORE_PHOTO" || issue.type === "MISSING_AFTER_PHOTO")) {
        // Attach to task
        const updatedTasks = tasks.map((t) => {
          if (t.id === issue.targetId) {
            return { ...t, photos: [...(t.photos || []), newPhotoItem] };
          }
          return t;
        });
        onTasksChange(updatedTasks);
        toast.success(`Attached ${category} photo to "${issue.targetName}"`);
      } else if (issue.type === "MISSING_PROPERTY_CONDITION") {
        // Add to first inspection item or trigger refresh
        if (customInspectionItems.length > 0) {
          const updatedItems = customInspectionItems.map((item, idx) =>
            idx === 0 ? { ...item, photos: [...(item.photos || []), newPhotoItem] } : item
          );
          onCustomInspectionItemsChange(updatedItems);
        }
        toast.success("Uploaded Property Condition photo");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload photo");
    } finally {
      setUploadingForIssueId(null);
      setPendingUploadIssue(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveTaskReason = (taskId: string) => {
    if (!inlineReasonText.trim()) {
      toast.error("Please enter a reason");
      return;
    }

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: "NOT_NEEDED" as const,
          completed: false,
          statusNote: inlineReasonText.trim(),
        };
      }
      return t;
    });

    onTasksChange(updatedTasks);
    toast.success("Updated task reason. Photo requirement exempted.");
    setInlineReasonTaskId(null);
    setInlineReasonText("");
  };

  const handleMarkTaskComplete = (taskId: string) => {
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, completed: true, status: "COMPLETED" as const };
      }
      return t;
    });
    onTasksChange(updatedTasks);
    toast.success("Task marked as completed");
  };

  const handleSavePropertyNote = () => {
    if (!propertyConditionNote.trim()) {
      toast.error("Please enter a note");
      return;
    }
    setShowPropertyNoteInput(false);
    toast.success("Property condition note added");
  };

  const handleFinalSubmit = async () => {
    if (!validation.isReady) {
    toast.error(`Please resolve the ${validation.errorCount} required issue(s) before submitting.`);
      return;
    }

    try {
      await onSubmitWorkOrder(contractorNotes);
      toast.success("🎉 Work Order successfully submitted as Field Complete!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit work order");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex flex-col md:items-center md:justify-center bg-black/85 backdrop-blur-md p-0 md:p-4 overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full h-full md:h-auto md:max-w-3xl md:max-h-[92vh] bg-surface md:border md:border-border-medium md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden text-text-primary">
        {/* ── Modal Sticky Header ─────────────────────────────────────────── */}
        <div className="sticky top-0 z-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-border-subtle bg-surface/98 backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Dedicated prominent Back button */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow-md active:scale-95 transition-all shrink-0"
              title="Return to Work Order"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <div className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shadow-md transition-colors shrink-0",
              validation.isReady
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            )}>
              {validation.isReady ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-black tracking-tight truncate">Pre-Submission Review</h2>
                <span className="text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono shrink-0">
                  WO-{workOrder?.id?.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-text-muted truncate hidden sm:block">
                Verifying all photo requirements, task completions, and quality compliance.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-hover hover:bg-surface text-text-primary text-xs font-bold border border-border-subtle shadow-sm active:scale-95 transition-all shrink-0"
            title="Close"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        </div>

        {/* ── Readiness Progress Banner ────────────────────────────────────── */}
        <div className={cn(
          "px-6 py-3.5 border-b text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
          validation.isReady
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-amber-500/10 border-amber-500/20 text-amber-300"
        )}>
          <div className="flex items-center gap-2">
            {validation.isReady ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-bold">
                  All Quality Checks Passed! Ready to Submit as Field Complete.
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                <span className="font-bold">
                  {validation.errorCount} Required Issue{validation.errorCount !== 1 ? "s" : ""} Must Be Resolved Before Submitting.
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-text-secondary shrink-0">
            <span>{validation.passedCount} of {validation.totalChecks} Checks Verified</span>
            <div className="w-20 h-2 bg-surface-hover rounded-full overflow-hidden border border-border-subtle">
              <div
                className={cn("h-full transition-all duration-500", validation.isReady ? "bg-emerald-500" : "bg-amber-500")}
                style={{ width: `${validation.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Modal Body / Issues List ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Quick Filter / Tabs */}
          <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Action Items & Quality Validation Notices
              </span>
            </div>

            <Badge variant={validation.isReady ? "emerald" : "amber"} size="sm">
              {validation.isReady ? "All Verified" : `${validation.errorCount} Blocking`}
            </Badge>
          </div>

          {/* Validation Issues List */}
          {validation.issues.length === 0 ? (
            <div className="p-8 text-center bg-surface-hover/30 border border-dashed border-border-medium rounded-2xl space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-400">Zero Blocking Issues Found</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                All tasks are marked completed with verified Before and After photos. You are ready to complete this work order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {validation.issues.map((issue) => {
                const isUploading = uploadingForIssueId === issue.id;
                const isEditingReason = inlineReasonTaskId === issue.targetId;

                return (
                  <div
                    key={issue.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all space-y-3",
                      issue.severity === "ERROR"
                        ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
                        : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                            issue.severity === "ERROR"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          )}>
                            {issue.severity === "ERROR" ? "Required" : "Recommended"}
                          </span>
                          <h4 className="text-sm font-bold text-text-primary">
                            {issue.title}
                          </h4>
                        </div>
                        <p className="text-xs text-text-muted">
                          {issue.description}
                        </p>
                      </div>
                    </div>

                    {/* Action Bar for this specific Issue */}
                    <div className="pt-2 border-t border-border-subtle/50 flex flex-wrap items-center gap-2">
                      {/* Photo Upload Issue Actions */}
                      {(issue.type === "MISSING_BEFORE_PHOTO" || issue.type === "MISSING_AFTER_PHOTO") && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePickFileForIssue(issue)}
                            disabled={isUploading}
                            className="text-xs bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center gap-1.5 shadow-sm"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5" />
                                Upload {issue.category}
                              </>
                            )}
                          </Button>

                          {onOpenCamera && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onOpenCamera(
                                  issue.targetId?.startsWith("insp-") ? "inspection" : "task",
                                  issue.category || "BEFORE",
                                  issue.targetId
                                );
                              }}
                              className="text-xs flex items-center gap-1.5 border-border-subtle"
                            >
                              <Camera className="h-3.5 w-3.5 text-cyan-400" />
                              GPS Camera
                            </Button>
                          )}

                          {/* Quick Bypass: Cannot Complete / Reject Task */}
                          {issue.targetId && !isEditingReason && (
                            <button
                              onClick={() => {
                                setInlineReasonTaskId(issue.targetId!);
                                setInlineReasonText("");
                              }}
                              className="text-[11px] font-semibold text-text-muted hover:text-amber-400 px-2.5 py-1.5 rounded-lg border border-border-subtle hover:bg-surface-hover transition-colors"
                            >
                              Cannot Complete / Reject
                            </button>
                          )}
                        </>
                      )}

                      {/* Incomplete Task Action */}
                      {issue.type === "TASK_NOT_COMPLETED" && issue.targetId && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleMarkTaskComplete(issue.targetId!)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Mark as Completed
                          </Button>

                          {!isEditingReason && (
                            <button
                              onClick={() => {
                                setInlineReasonTaskId(issue.targetId!);
                                setInlineReasonText("");
                              }}
                              className="text-[11px] font-semibold text-text-muted hover:text-amber-400 px-2.5 py-1.5 rounded-lg border border-border-subtle hover:bg-surface-hover transition-colors"
                            >
                              Mark as Not Needed (Reason)
                            </button>
                          )}
                        </>
                      )}

                      {/* Missing Rejection Reason Action */}
                      {issue.type === "MISSING_REJECTION_REASON" && issue.targetId && !isEditingReason && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setInlineReasonTaskId(issue.targetId!);
                            setInlineReasonText("");
                          }}
                          className="text-xs bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Add Required Reason
                        </Button>
                      )}

                      {/* Missing Property Condition Note */}
                      {issue.type === "MISSING_PROPERTY_CONDITION" && !showPropertyNoteInput && (
                        <Button
                          size="sm"
                          onClick={() => setShowPropertyNoteInput(true)}
                          className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          Add Condition Note
                        </Button>
                      )}
                    </div>

                    {/* Inline Reason Form when user clicks Cannot Complete / Add Reason */}
                    {isEditingReason && (
                      <div className="mt-3 p-3 bg-surface border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in">
                        <label className="block text-[11px] font-bold text-amber-300">
                          Why cannot complete this task? (Required for client record):
                        </label>
                        <textarea
                          rows={2}
                          value={inlineReasonText}
                          onChange={(e) => setInlineReasonText(e.target.value)}
                          placeholder="E.g., Property occupied, gate locked, utility turned off, not needed per client..."
                          className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-amber-500/50"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setInlineReasonTaskId(null);
                              setInlineReasonText("");
                            }}
                            className="text-xs px-3 py-1 rounded-lg text-text-muted hover:text-text-primary"
                          >
                            Cancel
                          </button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveTaskReason(issue.targetId!)}
                            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                          >
                            Confirm Reason & Bypass
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Property Condition Note Input Form */}
          {showPropertyNoteInput && (
            <div className="p-4 bg-surface border border-cyan-500/30 rounded-2xl space-y-2 animate-in fade-in">
              <label className="block text-xs font-bold text-cyan-300">
                Property Overall Condition Summary (Occupied/Vacant, Damages, Utilities):
              </label>
              <textarea
                rows={3}
                value={propertyConditionNote}
                onChange={(e) => setPropertyConditionNote(e.target.value)}
                placeholder="E.g. Property is vacant and secured. Electric on, water off. Roof is intact..."
                className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowPropertyNoteInput(false)}
                  className="text-xs px-3 py-1 rounded-lg text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
                <Button size="sm" onClick={handleSavePropertyNote} className="text-xs bg-cyan-600 text-white">
                  Save Condition Note
                </Button>
              </div>
            </div>
          )}

          {/* ── Optional Submission Notes ──────────────────────────────────── */}
          <div className="pt-2 space-y-1.5">
            <label className="block text-xs font-bold text-text-primary">
              Contractor Completion Notes / Field Summary (Optional):
            </label>
            <textarea
              rows={3}
              value={contractorNotes}
              onChange={(e) => setContractorNotes(e.target.value)}
              placeholder="Add any extra notes for the processor or QA reviewer regarding the completed work..."
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* ── Modal Sticky Footer ─────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-border-subtle bg-surface/98 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-2xl">
          <div className="text-xs text-text-muted flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-text-dim shrink-0" />
            <span className="text-[11px] sm:text-xs">Submitting updates status to <strong>Field Complete</strong>.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs flex items-center gap-1.5 px-4 py-2.5 font-bold bg-surface-hover/80 hover:bg-surface-hover border-border-medium shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Back to Order
            </Button>

            <Button
              onClick={handleFinalSubmit}
              disabled={!validation.isReady || isSubmitting}
              className={cn(
                "text-xs px-4 sm:px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center",
                validation.isReady
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-95 shadow-emerald-500/20"
                  : "bg-surface-hover text-text-dim border border-border-subtle cursor-not-allowed opacity-60"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting...
                </>
              ) : validation.isReady ? (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Confirm & Submit
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  Fix {validation.errorCount} Issue{validation.errorCount !== 1 ? "s" : ""} to Submit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
