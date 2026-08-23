"use client";

import { useState, useRef, useMemo } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Upload,
  FileText,
  ShieldAlert,
  ArrowRight,
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
        severity: "ERROR",
        title: "No Property Condition / Front Photos Uploaded",
        description: "Must upload property front/address verification photos, or provide a property access & condition note.",
      });
    } else {
      passedCount++;
    }

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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full max-w-3xl max-h-[92vh] bg-surface border border-border-medium rounded-3xl shadow-2xl flex flex-col overflow-hidden text-text-primary">
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="relative px-6 py-5 border-b border-border-subtle bg-surface-hover/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
              validation.isReady
                ? "bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 shadow-amber-500/10 border border-amber-500/30"
            )}>
              {validation.isReady ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Work Order Pre-Submission Review</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  WO-{workOrder?.id?.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Verifying all photo requirements, task completions, and quality compliance before client submission.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5" />
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {validation.issues.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="h-16 w-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <Check className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-text-primary">100% Quality Verified</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                All tasks have verified Before & After photos, property condition photos are attached, and no pending issues remain.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Action Items & Quality Validation Notices
              </p>

              {validation.issues.map((issue) => {
                const isUploading = uploadingForIssueId === issue.id;
                const isWritingReason = inlineReasonTaskId === issue.targetId;

                return (
                  <div
                    key={issue.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all space-y-3",
                      issue.severity === "ERROR"
                        ? "bg-rose-500/[0.04] border-rose-500/30 hover:border-rose-500/50"
                        : "bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/50"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider border",
                            issue.severity === "ERROR"
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          )}>
                            {issue.severity === "ERROR" ? "Required" : "Notice"}
                          </span>
                          <h4 className="text-xs font-bold text-text-primary">{issue.title}</h4>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {issue.description}
                        </p>
                      </div>

                      {/* Action Buttons for this issue */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {/* 1. Upload Photo Action */}
                        {(issue.type === "MISSING_BEFORE_PHOTO" || issue.type === "MISSING_AFTER_PHOTO" || issue.type === "MISSING_PROPERTY_CONDITION") && (
                          <>
                            <Button
                              size="sm"
                              disabled={isUploading}
                              onClick={() => handlePickFileForIssue(issue)}
                              className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center gap-1 shadow-sm"
                            >
                              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                              Upload {issue.category || "Photo"}
                            </Button>

                            {onOpenCamera && (
                              <button
                                type="button"
                                onClick={() => onOpenCamera(issue.type === "MISSING_PROPERTY_CONDITION" ? "global" : "task", issue.category || "BEFORE", issue.targetId)}
                                className="p-1.5 rounded-lg bg-surface-hover text-text-secondary hover:text-cyan-400 border border-border-subtle"
                                title="Open GPS Camera"
                              >
                                <Camera className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        )}

                        {/* 2. Mark Not Needed / Reject with Reason */}
                        {issue.targetId && (issue.type === "MISSING_BEFORE_PHOTO" || issue.type === "MISSING_AFTER_PHOTO" || issue.type === "TASK_NOT_COMPLETED" || issue.type === "MISSING_REJECTION_REASON") && (
                          <button
                            type="button"
                            onClick={() => {
                              setInlineReasonTaskId(issue.targetId || null);
                              setInlineReasonText(tasks.find((t) => t.id === issue.targetId)?.statusNote || "");
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-hover text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
                          >
                            Cannot Complete / Reject
                          </button>
                        )}

                        {/* 3. Mark Task Complete */}
                        {issue.type === "TASK_NOT_COMPLETED" && issue.targetId && (
                          <button
                            type="button"
                            onClick={() => handleMarkTaskComplete(issue.targetId!)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" /> Mark Done
                          </button>
                        )}

                        {/* 4. Add Property Condition Note */}
                        {issue.type === "MISSING_PROPERTY_CONDITION" && (
                          <button
                            type="button"
                            onClick={() => setShowPropertyNoteInput(true)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-hover text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
                          >
                            Add Access/Condition Note
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Task Reason Input */}
                    {isWritingReason && (
                      <div className="pt-2 border-t border-border-subtle space-y-2 animate-in fade-in">
                        <label className="block text-[11px] font-bold text-text-secondary">
                          Reason why "{issue.targetName}" was not completed:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inlineReasonText}
                            onChange={(e) => setInlineReasonText(e.target.value)}
                            placeholder="e.g. Locked gate, power disconnected, customer cancelled..."
                            className="flex-1 px-3 py-1.5 bg-surface border border-border-medium rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveTaskReason(issue.targetId!)}
                            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
                          >
                            Save Exemption
                          </Button>
                          <button
                            type="button"
                            onClick={() => setInlineReasonTaskId(null)}
                            className="px-2 text-xs text-text-dim hover:text-text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline Property Note Input if opened */}
          {showPropertyNoteInput && (
            <div className="p-4 rounded-2xl bg-surface-hover border border-border-medium space-y-2">
              <label className="block text-xs font-bold text-text-primary">
                Property Access & Condition Note:
              </label>
              <textarea
                rows={2}
                value={propertyConditionNote}
                onChange={(e) => setPropertyConditionNote(e.target.value)}
                placeholder="Explain why photos could not be taken or describe overall property condition (e.g. Vacant, secure, utilities off)..."
                className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPropertyNoteInput(false)}
                  className="px-3 py-1 text-xs text-text-muted hover:text-text-primary"
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

        {/* ── Modal Footer ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border-subtle bg-surface-hover/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-text-muted flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-text-dim" />
            <span>Submitting will update status to <strong>Field Complete</strong> and notify the processor.</span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting} className="text-xs">
              Cancel
            </Button>

            <Button
              onClick={handleFinalSubmit}
              disabled={!validation.isReady || isSubmitting}
              className={cn(
                "text-xs px-5 py-2 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2",
                validation.isReady
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-95 shadow-emerald-500/20"
                  : "bg-surface-hover text-text-dim border border-border-subtle cursor-not-allowed opacity-60"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting Field Complete...
                </>
              ) : validation.isReady ? (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Confirm & Submit Work Order
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
    </div>
  );
}
