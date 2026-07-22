"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { PhotoUploadSection, PhotoItem } from "./photo-upload";
import toast from "react-hot-toast";
import EXCEL_TASKS from "./excel-tasks.json";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Camera,
  DollarSign,
  Edit3,
  Save,
  X,
  FileText,
  MessageSquare,
  Send,
  XCircle,
  AlertTriangle,
  Sparkles,
  Search,
  Download,
} from "lucide-react";
import { downloadSingleBid, downloadSingleTask } from "@/lib/download-helper";
import { printTasksReport, printBidsReport } from "@/lib/print-reports";

// ─── Unit Options ────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  { value: "sqft", label: "sqft" },
  { value: "LF", label: "LF" },
  { value: "EA", label: "EA" },
  { value: "CYD", label: "CYD" },
  { value: "UI", label: "UI" },
  { value: "SY", label: "SY" },
  { value: "SF", label: "SF" },
  { value: "CF", label: "CF" },
  { value: "GAL", label: "GAL" },
  { value: "LB", label: "LB" },
  { value: "TON", label: "TON" },
  { value: "HR", label: "HR" },
  { value: "DAY", label: "DAY" },
  { value: "LS", label: "LS" },
  { value: "LOT", label: "LOT" },
  { value: "EACH", label: "EACH" },
];

function UnitSelector({
  value,
  onChange,
  placeholder = "Unit",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = UNIT_OPTIONS.filter((u) =>
    u.value.toLowerCase().includes(search.toLowerCase()) || u.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-cyan-500/50 placeholder:text-text-dim"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/40 max-h-40 overflow-y-auto">
          {filtered.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => { onChange(u.value); setSearch(u.value); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors border-b border-border-subtle last:border-0",
                value === u.value ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-text-secondary"
              )}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskNameSelector({
  value,
  onChange,
  placeholder = "Select or type task name...",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    return EXCEL_TASKS.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 1000);
  }, [search]);

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/40 max-h-80 overflow-y-auto">
          {filtered.length > 0 ? filtered.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              type="button"
              onClick={() => { onChange(item.name); setSearch(item.name); setOpen(false); }}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors border-b border-border-subtle last:border-0 flex flex-col gap-1",
                value === item.name ? "bg-cyan-500/10" : ""
              )}
            >
              <div className={cn(
                "text-xs font-bold transition-colors",
                value === item.name ? "text-cyan-400 font-black" : "text-text-primary"
              )}>
                {item.name}
              </div>
              {item.description ? (
                <div className="text-[10px] text-text-dim line-clamp-2 leading-relaxed">
                  {item.description}
                </div>
              ) : (
                <div className="text-[9px] text-text-muted italic">No default description</div>
              )}
            </button>
          )) : (
            <div className="px-4 py-3 text-xs text-text-dim">No matches. Type to enter custom task.</div>
          )}
          <button
            type="button"
            onClick={() => { setSearch(""); onChange(""); inputRef.current?.focus(); }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/10 transition-colors border-t border-border-medium flex items-center gap-2"
          >
            <Plus className="h-3 w-3" /> Custom Task Name
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Task Entry ──────────────────────────────────────────────────────────────

export interface TaskEntry {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  assignee?: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "NOT_NEEDED";
  statusNote?: string;
  messages?: TaskMessage[];
  photos: PhotoItem[];
  expanded: boolean;
  chatOpen?: boolean;
  unit?: string;
  quantity?: number;
  price?: number;
}

export interface TaskMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  content: string;
  createdAt: string;
}

// ─── Service-Type Task Templates ─────────────────────────────────────────────

export interface TaskTemplate {
  title: string;
  description: string;
}

export const SERVICE_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  GRASS_CUT: [
    {
      title: "Front yard grass cut",
      description:
        "Mow front yard completely. Trim edges along walkways, driveway, and flower beds. Remove all clippings from hard surfaces.",
    },
    {
      title: "Back yard grass cut",
      description:
        "Mow back yard completely. Trim edges along fence line, shed, and play areas. Remove all clippings from hard surfaces.",
    },
    {
      title: "Left side yard",
      description:
        "Mow left side of property between fence and house. Trim around AC unit, utility meters, and any obstacles.",
    },
    {
      title: "Right side yard",
      description:
        "Mow right side of property between fence and house. Trim around AC unit, utility meters, and any obstacles.",
    },
    {
      title: "Property front photo",
      description:
        "Take a clear front-facing photo of the property from the street showing the full front yard and house exterior.",
    },
    {
      title: "Left side photo",
      description:
        "Take a photo of the left side of the property showing yard condition and any visible issues.",
    },
    {
      title: "Back yard photo",
      description:
        "Take a photo of the back yard showing the full area, fence line, and any structures.",
    },
    {
      title: "Right side photo",
      description:
        "Take a photo of the right side of the property showing yard condition and any visible issues.",
    },
  ],
  DEBRIS_REMOVAL: [
    {
      title: "Front yard debris removal",
      description:
        "Remove all debris from front yard including branches, trash, leaves, and any abandoned items. Bag and dispose properly.",
    },
    {
      title: "Back yard debris removal",
      description:
        "Remove all debris from back yard including branches, trash, leaves, and any abandoned items. Bag and dispose properly.",
    },
    {
      title: "Interior debris removal",
      description:
        "Remove any abandoned furniture, trash, or debris from inside the property. Document items removed with photos.",
    },
    {
      title: "Before photos - all areas",
      description:
        "Take before photos of front, back, left side, right side, and interior showing debris condition before starting work.",
    },
    {
      title: "After photos - all areas",
      description:
        "Take after photos of front, back, left side, right side, and interior showing clean condition after debris removal.",
    },
  ],
  WINTERIZATION: [
    {
      title: "Shut off water supply",
      description:
        "Locate and shut off the main water supply valve. Drain all pipes, water heater, and fixtures to prevent freezing.",
    },
    {
      title: "Blow out water lines",
      description:
        "Use air compressor to blow out all remaining water from supply lines, toilets, and appliances.",
    },
    {
      title: "Add antifreeze to traps",
      description:
        "Pour non-toxic antifreeze into all sink drains, toilet bowls, bathtub/shower drains, and washing machine drain.",
    },
    {
      title: "Lock change",
      description:
        "Install new lock set on front door. Place key inside lockbox and document lockbox combination.",
    },
    {
      title: "Before/during/after photos",
      description:
        "Take photos before starting, during each step, and after completion. Document water meter, valves, and lock installation.",
    },
  ],
  BOARD_UP: [
    {
      title: "Measure and cut boards",
      description:
        "Measure all open windows and doorways. Cut plywood to size for each opening. Document measurements.",
    },
    {
      title: "Board windows",
      description:
        "Secure plywood over all open/broken windows using appropriate screws. Ensure tight fit with no gaps.",
    },
    {
      title: "Board doors",
      description:
        "Secure plywood over any open/broken doorways. Ensure entry point is sealed but accessible for future work.",
    },
    {
      title: "Before/during/after photos",
      description:
        "Take photos of each opening before boarding, during installation, and after completion. Document all entry points.",
    },
  ],
  INSPECTION: [
    {
      title: "Exterior inspection",
      description:
        "Walk the entire exterior. Check roof, gutters, siding, foundation, windows, doors. Document any damage or issues with photos.",
    },
    {
      title: "Interior inspection",
      description:
        "Check all rooms for damage, water stains, mold, broken fixtures, missing appliances. Document with photos.",
    },
    {
      title: "Utility check",
      description:
        "Check water, electric, gas meters. Look for leaks, standing water, or signs of vandalism.",
    },
    {
      title: "Yard and grounds",
      description:
        "Check lawn condition, overgrown vegetation, fallen trees, fencing, mailbox, and any HOA violations.",
    },
    {
      title: "Property photos - all sides",
      description:
        "Take photos from front, left side, back, right side. Include close-ups of any damage or concerns found.",
    },
  ],
  MOLD_REMEDIATION: [
    {
      title: "Mold assessment",
      description:
        "Identify all mold-affected areas. Document extent of growth with photos and measurements. Note moisture sources.",
    },
    {
      title: "Containment setup",
      description:
        "Set up containment barriers with plastic sheeting. Establish negative air pressure if needed.",
    },
    {
      title: "Mold removal",
      description:
        "Remove all mold-contaminated materials. Clean affected surfaces with appropriate antimicrobial solutions.",
    },
    {
      title: "Air quality test",
      description:
        "Perform post-remediation air quality test to verify mold spore levels are within acceptable range.",
    },
    {
      title: "Before/during/after photos",
      description:
        "Take photos of all affected areas before, during remediation, and after completion. Document containment setup.",
    },
  ],
};

export function getTemplatesForService(serviceType?: string): TaskTemplate[] {
  if (!serviceType) return [];
  return SERVICE_TASK_TEMPLATES[serviceType] || [];
}

export function TaskEntryList({
  tasks,
  onTasksChange,
  serviceType,
  onUpload,
  onOpenCamera,
  className,
}: {
  tasks: TaskEntry[];
  onTasksChange: (tasks: TaskEntry[]) => void;
  serviceType?: string;
  onUpload?: (file: File, category: string) => Promise<{ url: string; rawUrl?: string; id: string }>;
  onOpenCamera?: (category: string, taskId: string) => void;
  className?: string;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskUnit, setNewTaskUnit] = useState("");
  const [newTaskQty, setNewTaskQty] = useState("");
  const [newTaskPrice, setNewTaskPrice] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const templates = getTemplatesForService(serviceType);

  // Auto-calculate total for new task (qty × unit price)
  const autoNewTaskTotal = useMemo(() => {
    const qty = parseFloat(newTaskQty);
    const price = parseFloat(newTaskPrice);
    if (qty > 0 && price > 0) return qty * price;
    return null;
  }, [newTaskQty, newTaskPrice]);

  // Auto-calculate total for edit task (qty × unit price)
  const autoEditTaskTotal = useMemo(() => {
    const qty = parseFloat(editQty);
    const price = parseFloat(editPrice);
    if (qty > 0 && price > 0) return qty * price;
    return null;
  }, [editQty, editPrice]);

  function addTask() {
    if (!newTaskTitle.trim()) return;
    const newTask: TaskEntry = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      completed: false,
      photos: [],
      expanded: false,
      unit: newTaskUnit.trim() || undefined,
      quantity: newTaskQty ? parseFloat(newTaskQty) : undefined,
      price: newTaskPrice ? parseFloat(newTaskPrice) : undefined,
    };
    onTasksChange([...tasks, newTask]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskUnit("");
    setNewTaskQty("");
    setNewTaskPrice("");
    setShowAddForm(false);
  }

  function loadTemplates() {
    const newTasks: TaskEntry[] = templates.map((t, i) => ({
      id: `task-tpl-${Date.now()}-${i}`,
      title: t.title,
      description: t.description,
      completed: false,
      photos: [],
      expanded: false,
    }));
    onTasksChange([...tasks, ...newTasks]);
    setShowTemplates(false);
  }

  function toggleComplete(id: string) {
    onTasksChange(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  }

  function toggleExpand(id: string) {
    onTasksChange(
      tasks.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t))
    );
  }

  function removeTask(id: string) {
    onTasksChange(tasks.filter((t) => t.id !== id));
  }

  function updateTaskPhotos(id: string, photos: PhotoItem[]) {
    onTasksChange(
      tasks.map((t) => (t.id === id ? { ...t, photos } : t))
    );
  }

  function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    onTasksChange(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              title: editTitle.trim(),
              description: editDesc.trim() || undefined,
              unit: editUnit.trim() || undefined,
              quantity: editQty ? parseFloat(editQty) : undefined,
              price: editPrice ? parseFloat(editPrice) : undefined,
            }
          : t
      )
    );
    setEditingId(null);
  }

  function startEdit(task: TaskEntry) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditUnit(task.unit || "");
    setEditQty(task.quantity != null ? String(task.quantity) : "");
    setEditPrice(task.price != null ? String(task.price) : "");
  }

  function updateTaskStatus(id: string, status: TaskEntry["status"], note?: string) {
    onTasksChange(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              statusNote: note || t.statusNote,
              completed: status === "COMPLETED",
              completedAt: status === "COMPLETED" ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  }

  function addTaskMessage(taskId: string, content: string, authorName: string, authorId: string, authorImage?: string) {
    onTasksChange(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              messages: [
                ...(t.messages || []),
                {
                  id: `msg-${Date.now()}`,
                  authorId,
                  authorName,
                  authorImage,
                  content,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : t
      )
    );
  }

  function toggleChat(id: string) {
    onTasksChange(
      tasks.map((t) => (t.id === id ? { ...t, chatOpen: !t.chatOpen } : t))
    );
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with progress */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Project Tasks</h3>
              <p className="text-[10px] font-bold text-text-muted">{completedCount} of {totalCount} requirements met</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.promise(printTasksReport(tasks), { loading: "Preparing PDF...", success: "PDF Ready", error: "Failed to generate PDF" })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Print / PDF Task Report"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print Tasks Report</span>
              <span className="sm:hidden">Print</span>
            </button>

            {totalCount > 0 && (
              <div className="text-right">
                <span className="text-lg font-black text-cyan-400 leading-none">{Math.round(progressPct)}%</span>
                <p className="text-[9px] font-black text-text-dim uppercase tracking-tighter">Completion</p>
              </div>
            )}
          </div>
        </div>
        
        {totalCount > 0 && (
          <div className="relative h-2 w-full bg-surface-hover rounded-full overflow-hidden border border-border-subtle">
            <div
              className={cn(
                "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out",
                progressPct === 100
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Task list — default/template tasks pinned at top */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-border-subtle rounded-3xl text-center">
            <FileText className="h-10 w-10 text-slate-800 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-text-dim font-medium">No tasks assigned to this work order.</p>
          </div>
        ) : (
          [...tasks]
            .sort((a, b) => {
              const aDefault = a.id.startsWith("task-default-") || a.id.startsWith("task-tpl-") ? 0 : 1;
              const bDefault = b.id.startsWith("task-default-") || b.id.startsWith("task-tpl-") ? 0 : 1;
              return aDefault - bDefault;
            })
            .map((task, idx) => {
              const isDefault = task.id.startsWith("task-default-") || task.id.startsWith("task-tpl-");
              return (
            <div
              key={task.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                isDefault && !task.completed
                  ? "bg-cyan-500/[0.03] border-cyan-500/20 shadow-[0_4px_20px_-10px_rgba(6,182,212,0.1)]"
                  : task.completed
                  ? "bg-emerald-500/[0.04] border-emerald-500/20 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.1)]"
                  : "bg-surface/60 backdrop-blur-md border-border-subtle hover:border-border-subtle hover:bg-surface-hover"
              )}
            >
              {/* Mobile-Friendly Responsive Task Row */}
              <div className="p-4 md:px-5 md:py-4 flex flex-col gap-3">
                {/* Header Line (Number, Checkbox, Title, Badges, Expand Arrow) */}
                <div className="flex items-center gap-3">
                  <div className="text-[10px] font-black text-text-dim w-4 flex-shrink-0">
                    {(idx + 1).toString().padStart(2, "0")}
                  </div>

                  <button
                    onClick={() => toggleComplete(task.id)}
                    className="relative flex-shrink-0 group/check"
                  >
                    {task.completed ? (
                      <div className="h-6 w-6 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform group-active/check:scale-90">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-lg border-2 border-border-medium group-hover/check:border-cyan-500/50 flex items-center justify-center transition-all group-active/check:scale-90">
                        <div className="h-2 w-2 rounded-sm bg-surface-hover opacity-0 group-hover/check:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </button>

                  {/* Title & Badges Header */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => toggleExpand(task.id)}
                  >
                    {editingId === task.id ? (
                      <div className="space-y-3 py-1" onClick={(e) => e.stopPropagation()}>
                        <TaskNameSelector
                          value={editTitle}
                          onChange={(val) => {
                            setEditTitle(val);
                            const matched = EXCEL_TASKS.find((t) => t.name === val);
                            if (matched && matched.description) {
                              setEditDesc(matched.description);
                            }
                          }}
                          placeholder="Search task names..."
                        />
                        <textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Add directions or description..."
                          rows={2}
                          className="w-full px-3 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-secondary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Unit</label>
                            <UnitSelector value={editUnit} onChange={setEditUnit} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Quantity</label>
                            <input
                              type="number"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              min={0}
                              step={0.01}
                              placeholder="0"
                              className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-text-primary text-right outline-none focus:border-cyan-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Unit Price ($)</label>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-emerald-400 text-right outline-none focus:border-emerald-500/50"
                            />
                          </div>
                        </div>
                        {autoEditTaskTotal !== null && (
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider">Total:</span>
                            <span className="text-xs font-black text-emerald-400">${autoEditTaskTotal.toFixed(2)}</span>
                            <span className="text-[8px] text-emerald-400/50">({editQty} × ${parseFloat(editPrice).toFixed(2)})</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveEdit(task.id)}
                            className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={cn(
                            "text-sm font-bold transition-colors",
                            task.completed || task.status === "COMPLETED"
                              ? "text-text-muted"
                              : task.status === "REJECTED" || task.status === "NOT_NEEDED"
                              ? "text-rose-400/60"
                              : "text-text-primary"
                          )}
                        >
                          {task.title}
                        </h4>
                        {isDefault && (
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                            Default
                          </span>
                        )}
                        {task.status && task.status !== "PENDING" && (
                          <span
                            className={cn(
                              "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                              task.status === "COMPLETED" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                              task.status === "IN_PROGRESS" && "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
                              task.status === "REJECTED" && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                              task.status === "NOT_NEEDED" && "bg-slate-500/10 text-text-secondary border border-slate-500/20"
                            )}
                          >
                            {task.status === "NOT_NEEDED" ? "NOT NEEDED" : task.status.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expand Chevron Button (Always Prominent & Easy to Click on Mobile!) */}
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all border border-cyan-500/30 shrink-0 ml-auto flex items-center justify-center"
                    title="Toggle Task Photos & Details"
                  >
                    {task.expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Task Details & Description (Un-squashed, full width!) */}
                {editingId !== task.id && (
                  <div className="pl-7 md:pl-9 space-y-1">
                    {task.description && (
                      <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    {(task.unit || task.quantity != null || task.price != null) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {task.unit && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                            {task.unit}
                          </span>
                        )}
                        {task.quantity != null && (
                          <span className="text-[9px] font-bold text-text-muted">
                            Qty: {task.quantity}
                          </span>
                        )}
                        {task.price != null && (
                          <span className="text-[9px] font-bold text-emerald-400">
                            ${task.price.toFixed(2)}/{task.unit || "ea"}
                          </span>
                        )}
                        {task.quantity != null && task.price != null && (
                          <span className="text-[9px] font-black text-amber-400">
                            ({task.quantity} × ${task.price.toFixed(2)} = ${(task.quantity * task.price).toFixed(2)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Row: Photo Thumbnails & Action Icons Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle/50 pl-7 md:pl-9">
                  {/* Photo Thumbnails Preview */}
                  {task.photos && task.photos.length > 0 ? (
                    <div 
                      className="flex items-center -space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleExpand(task.id)}
                    >
                      {task.photos.slice(0, 3).map((p) => (
                        <div key={p.id} className="h-8 w-8 rounded-lg border-2 border-border-subtle overflow-hidden bg-surface shadow-md">
                          <img src={p.url} className="h-full w-full object-cover" />
                        </div>
                      ))}
                      {task.photos.length > 3 && (
                        <div className="h-8 w-8 rounded-lg border-2 border-border-subtle bg-surface-hover flex items-center justify-center text-[9px] font-black text-cyan-400 shadow-md">
                          +{task.photos.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-dim flex items-center gap-1">
                      <Camera className="h-3 w-3" /> No photos attached
                    </span>
                  )}

                  {/* Task Actions Toolbar */}
                  <div className="flex items-center bg-surface-hover border border-border-subtle rounded-xl p-1 gap-1 ml-auto">
                    <button
                      onClick={() => downloadSingleTask(task)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                      title="Download Task Details"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => toggleExpand(task.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        task.expanded ? "bg-cyan-500 text-white shadow-lg" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                      )}
                      title="Documentation / Photos"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => toggleChat(task.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all relative",
                        task.chatOpen ? "bg-violet-500 text-white shadow-lg" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                      )}
                      title="Task Communication"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {task.messages && task.messages.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-500 text-[8px] font-black text-white rounded-full flex items-center justify-center border-2 border-border-subtle">
                          {task.messages.length}
                        </span>
                      )}
                    </button>

                    <div className="w-px h-4 bg-surface-hover mx-0.5" />

                    <button
                      onClick={() => startEdit(task)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-all"
                      title="Edit Protocol"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {!task.completed && task.status !== "REJECTED" && task.status !== "NOT_NEEDED" && (
                      <button
                        onClick={() => {
                          const note = prompt("Reason for rejection (optional):");
                          if (note !== null) {
                            updateTaskStatus(task.id, "REJECTED", note || "Not needed");
                          }
                        }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Mark Unnecessary"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => removeTask(task.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded: Photo upload */}
              {task.expanded && (
                <div className="px-5 pb-5 pt-2 border-t border-border-subtle bg-surface-hover">
                  <PhotoUploadSection
                    photos={task.photos}
                    onPhotosChange={(photos) =>
                      updateTaskPhotos(task.id, photos)
                    }
                    onUpload={onUpload}
                    onOpenCamera={onOpenCamera ? (cat) => onOpenCamera(cat, task.id) : undefined}
                    title={`${task.title} Assets`}
                  />
                </div>
              )}

              {/* Task chat / messages */}
              {task.chatOpen && (
                <div className="border-t border-border-subtle">
                  <TaskChatInline
                    task={task}
                    onAddMessage={(content, authorName, authorId, authorImage) =>
                      addTaskMessage(task.id, content, authorName, authorId, authorImage)
                    }
                    onUpdateStatus={(status, note) => updateTaskStatus(task.id, status, note)}
                  />
                </div>
              )}
            </div>
              );
            })
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-subtle">
        {showAddForm ? (
          <div className="w-full p-6 rounded-3xl border border-border-medium bg-surface/60 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-cyan-400" />
              </div>
              <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">Add Task Items</h4>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Task Title</label>
                <TaskNameSelector
                  value={newTaskTitle}
                  onChange={(val) => {
                    setNewTaskTitle(val);
                    const matched = EXCEL_TASKS.find((t) => t.name === val);
                    if (matched && matched.description) {
                      setNewTaskDesc(matched.description);
                    }
                  }}
                  placeholder="Search 900+ task names or type custom..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Execution Details</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Provide specific instructions for field technicians..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-xs text-text-secondary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all shadow-inner"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Unit of Measure</label>
                  <UnitSelector value={newTaskUnit} onChange={setNewTaskUnit} placeholder="Select unit..." />
                </div>
                <div>
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Quantity</label>
                  <input
                    type="number"
                    value={newTaskQty}
                    onChange={(e) => setNewTaskQty(e.target.value)}
                    min={0}
                    step={0.01}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary text-right focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Unit Price ($)</label>
                  <input
                    type="number"
                    value={newTaskPrice}
                    onChange={(e) => setNewTaskPrice(e.target.value)}
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-emerald-400 font-black text-right focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner"
                  />
                </div>
              </div>
              {autoNewTaskTotal !== null && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2" />
                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">
                      Total Price ($)
                      <span className="ml-2 text-emerald-400/70 normal-case tracking-normal">auto-calculated</span>
                    </label>
                    <input
                      type="number"
                      value={autoNewTaskTotal.toFixed(2)}
                      readOnly
                      tabIndex={-1}
                      className="w-full px-4 py-3 bg-surface-hover border border-emerald-500/30 rounded-2xl text-sm text-emerald-400 font-black text-right outline-none cursor-default"
                    />
                    <p className="text-[9px] font-bold text-emerald-400/60 mt-1 px-1">
                      {newTaskQty} × ${parseFloat(newTaskPrice).toFixed(2)} = ${autoNewTaskTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addTask}
                disabled={!newTaskTitle.trim()}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
              >
                Save Task Item
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTaskTitle("");
                  setNewTaskDesc("");
                }}
                className="px-6 py-3 rounded-2xl bg-surface-hover text-white text-xs font-black uppercase tracking-widest hover:bg-surface-hover transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-hover text-text-muted hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/[0.02] transition-all group"
            >
              <div className="h-8 w-8 rounded-xl bg-surface-hover group-hover:bg-cyan-500/10 flex items-center justify-center transition-all">
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest">Manual Requirement</span>
            </button>
            
            {templates.length > 0 && (
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-cyan-500/10 bg-cyan-500/[0.01] text-cyan-500/60 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] transition-all group"
              >
                <div className="h-8 w-8 rounded-xl bg-cyan-500/5 group-hover:bg-cyan-500/10 flex items-center justify-center transition-all">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Project Templates</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Templates Dropdown */}
      {showTemplates && templates.length > 0 && (
        <div className="p-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.02] backdrop-blur-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </div>
              <h4 className="text-sm font-black text-cyan-100 uppercase tracking-widest">Smart Protocol Generator</h4>
            </div>
            <button
              onClick={loadTemplates}
              className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-all"
            >
              Add All Templates
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates
              .filter((t) => !tasks.some((et) => et.title === t.title))
              .map((t, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const newTask: TaskEntry = {
                      id: `task-tpl-${Date.now()}-${i}`,
                      title: t.title,
                      description: t.description,
                      completed: false,
                      photos: [],
                      expanded: false,
                    };
                    onTasksChange([...tasks, newTask]);
                  }}
                  className="group flex items-start gap-4 p-4 rounded-2xl bg-surface-hover border border-border-subtle hover:bg-surface-hover hover:border-cyan-500/30 transition-all text-left"
                >
                  <div className="h-6 w-6 rounded-lg bg-surface-hover group-hover:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 transition-all">
                    <Plus className="h-3 w-3 text-text-muted group-hover:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary group-hover:text-white transition-colors">{t.title}</p>
                    <p className="text-[10px] text-text-muted mt-1 line-clamp-1 italic group-hover:text-text-secondary">
                      {t.description}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default Property Preservation Bid Items ─────────────────────────────────

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const DEFAULT_BID_ITEMS_LEGACY = [
  // ── Debris Removal ──
  "Exterior Debris Removal - Front Yard",
  "Exterior Debris Removal - Back Yard",
  "Exterior Debris Removal - Side Yards",
  "Exterior Debris Removal - Full Property",
  "Interior Debris Removal - Single Room",
  "Interior Debris Removal - Whole House",
  "Basement Debris Removal",
  "Attic Debris Removal",
  "Garage Debris Removal",
  "Shed Debris Removal",
  "Porch/Deck Debris Removal",
  "Bulk Trash Removal",
  "Appliance Removal & Disposal",
  "Furniture Removal & Disposal",
  "Mattress Disposal",
  "Electronics Disposal (E-Waste)",
  "Tire Removal & Disposal",
  "Carpet Removal & Disposal",
  "Construction Debris Hauling",
  "Yard Waste Hauling",
  "Fallen Tree Debris Removal",
  "Abandoned Vehicle Removal",
  "Hot Tub/Spa Removal",
  "Above Ground Pool Removal",
  "Playset Removal",
  "Shed Demolition & Removal",
  "Fence Debris Removal",
  "Storm Debris Cleanup",
  "Biohazard Cleanup",
  "Sharps/Needle Cleanup",

  // ── Lawn & Grounds ──
  "Initial Grass Cut - Standard Lot",
  "Initial Grass Cut - Large Lot (1/2 acre+)",
  "Initial Grass Cut - Oversized (1 acre+)",
  "Recurring Weekly Grass Cut",
  "Recurring Bi-Weekly Grass Cut",
  "Lot Mowing - Vacant Land",
  "Trim Shrubs - Foundation",
  "Trim Shrubs - Perimeter",
  "Trim Hedges - Under 6ft",
  "Trim Hedges - Over 6ft",
  "Small Tree Trimming (under 15ft)",
  "Large Tree Trimming (15-30ft)",
  "Tree Removal - Small (under 20ft)",
  "Tree Removal - Medium (20-40ft)",
  "Tree Removal - Large (40ft+)",
  "Stump Grinding - Small",
  "Stump Grinding - Large",
  "Stump Removal",
  "Remove Vines on House",
  "Remove Vines on Fence",
  "Remove Vines on Trees",
  "Mulching - Flower Beds",
  "Mulching - Full Property",
  "Weed Pulling - Flower Beds",
  "Weed Pulling - Full Property",
  "Weed Whacking / String Trimming",
  "Edging - Walkways & Driveway",
  "Leaf Raking & Removal",
  "Bush Hogging / Field Mowing",
  "Overgrowth Clearing",
  "Brush Removal",
  "Garden Bed Cleanup",
  "Sod Installation",
  "Seed & Straw - Bare Spots",
  "Seed & Straw - Full Yard",
  "Lawn Aeration",
  "Lawn Fertilization",
  "Insecticide Treatment",
  "Herbicide Application",
  "French Drain Installation",
  "Grading & Leveling",
  "Retaining Wall Repair",
  "Landscape Timbers Replacement",
  "Rock/Gravel Placement",
  "Sprinkler System Repair",

  // ── Winterization ──
  "Full Winterization (Heat System)",
  "Full Winterization (Drain Down)",
  "Dry Winterization",
  "Wet Winterization",
  "Winterization - Swimming Pool",
  "Winterization - Hot Tub",
  "Winterization - Irrigation System",
  "De-Winterization",
  "Anti-Freeze Application - Traps",
  "Blow Out Water Lines",
  "Shut Off Water Supply",
  "Shut Off Gas Supply",
  "Shut Off Electric Supply",
  "Water Heater Drain & Disconnect",
  "Toilet Winterization",
  "Washing Machine Winterization",
  "Dishwasher Winterization",
  "Pipe Insulation Installation",
  "Heat Tape Installation",
  "Faucet Cover Installation",
  "Window Insulation Kit Installation",
  "Door Draft Stopper Installation",
  "Chimney Cap Installation",
  "Chimney Blockage Check",

  // ── Securing / Lock & Key ──
  "Initial Secure - Standard",
  "Initial Secure - Emergency",
  "Re-Key All Exterior Doors",
  "Re-Key Front Door Only",
  "Lock Change - Front Door",
  "Lock Change - All Exterior Doors",
  "Lock Change - Interior Doors",
  "Deadbolt Installation",
  "Keyed Knob Installation",
  "Smart Lock Installation",
  "Lock Box Installation",
  "Lock Box Combination Change",
  "Padlock Installation - Gate",
  "Padlock Installation - Shed",
  "Chain Lock Installation",
  "Sliding Door Lock Installation",
  "Window Lock Installation",
  "Window Latch Repair",
  "Garage Door Lock Installation",
  "Garage Door Remote Programming",
  "Eviction Lock Change",
  "Eviction Secure - Full Property",
  "Locksmith Service Call",

  // ── Boarding & Securing Openings ──
  "Board Up - Single Window",
  "Board Up - Multiple Windows",
  "Board Up - All Windows",
  "Board Up - Front Door",
  "Board Up - Back Door",
  "Board Up - Sliding Glass Door",
  "Board Up - Garage Door",
  "Board Up - All Openings",
  "Plywood Board-Up (1/2 inch)",
  "Plywood Board-Up (3/4 inch)",
  "Polycarbonate Clear Board-Up",
  "Steel Security Screen Installation",
  "Screen Door Repair",
  "Screen Door Replacement",
  "Window Screen Repair",
  "Window Screen Replacement",
  "Plexiglass Window Replacement",
  "Glass Window Replacement - Standard",
  "Glass Window Replacement - Tempered",
  "Bay Window Board-Up",
  "Skylight Board-Up",
  "Basement Window Board-Up",
  "Egress Window Cover",

  // ── Doors ──
  "Repair Front Door",
  "Replace Front Door",
  "Replace Front Door & Frame",
  "Repair Back Door",
  "Replace Back Door",
  "Replace Sliding Glass Door",
  "Repair Screen Door",
  "Replace Screen Door",
  "Repair Storm Door",
  "Replace Storm Door",
  "Replace Interior Door - Hollow",
  "Replace Interior Door - Solid",
  "Door Frame Repair",
  "Door Frame Replacement",
  "Door Threshold Replacement",
  "Door Hinge Replacement",
  "Door Closer Installation",
  "Door Peephole Installation",
  "Door Kick Plate Installation",
  "Door Weatherstripping",
  "French Door Repair",
  "French Door Replacement",
  "Pocket Door Repair",
  "Pocket Door Replacement",
  "Bi-Fold Door Repair",
  "Bi-Fold Door Replacement",

  // ── Garage Doors ──
  "Repair Garage Door - Single",
  "Repair Garage Door - Double",
  "Replace Garage Door - Single",
  "Replace Garage Door - Double",
  "Replace Garage Door - Carriage Style",
  "Garage Door Spring Replacement",
  "Garage Door Opener Installation",
  "Garage Door Opener Repair",
  "Garage Door Track Repair",
  "Garage Door Panel Replacement",
  "Garage Door Weather Seal",
  "Garage Door Sensor Alignment",
  "Garage Door Keypad Installation",
  "Garage Floor Coating",
  "Garage Floor Epoxy",
  "Garage Interior Cleanup",

  // ── Roofing ──
  "Roof Inspection",
  "Roof Repair - Minor (patching)",
  "Roof Repair - Moderate (section)",
  "Roof Repair - Major",
  "Roof Replacement - Asphalt Shingles",
  "Roof Replacement - Metal",
  "Roof Replacement - Flat/TPO",
  "Roof Tarping - Emergency",
  "Roof Tarping - Standard",
  "Roof Tarp Replacement",
  "Shingle Replacement - Damaged",
  "Ridge Cap Repair",
  "Flashing Repair",
  "Roof Valley Repair",
  "Chimney Flashing Repair",
  "Skylight Replacement",
  "Skylight Leak Repair",
  "Roof Vent Repair",
  "Roof Vent Installation",
  "Soffit Repair",
  "Soffit Replacement",
  "Fascia Board Repair",
  "Fascia Board Replacement",
  "Gutter Repair",
  "Gutter Replacement",
  "Gutter Cleaning",
  "Gutter Guard Installation",
  "Downspout Repair",
  "Downspout Replacement",
  "Downspout Extension Installation",
  "Ice Dam Removal",
  "Roof Snow Removal",
  "Attic Ventilation Improvement",
  "Attic Insulation - Blow-In",
  "Attic Insulation - Batt",

  // ── Siding & Exterior ──
  "Siding Repair - Vinyl",
  "Siding Replacement - Vinyl",
  "Siding Repair - Wood",
  "Siding Replacement - Wood",
  "Siding Repair - Aluminum",
  "Siding Replacement - Aluminum",
  "Siding Repair - Fiber Cement",
  "Siding Replacement - Fiber Cement",
  "Siding Repair - Brick",
  "Tuckpointing / Brick Mortar Repair",
  "Stucco Repair",
  "Stucco Replacement",
  "Exterior Painting - Whole House",
  "Exterior Painting - Touch Up",
  "Exterior Painting - Trim Only",
  "Exterior Painting - Front Facade",
  "Power Washing - House Exterior",
  "Power Washing - Driveway",
  "Power Washing - Sidewalk",
  "Power Washing - Patio",
  "Power Washing - Deck",
  "Power Washing - Fence",
  "Power Washing - Full Property",
  "Caulking - Windows & Doors",
  "Caulking - Foundation",
  "House Number Installation",
  "Mailbox Installation - Standard",
  "Mailbox Installation - Post Mount",
  "Address Sign Installation",
  "Exterior Light Fixture Replacement",
  "Motion Sensor Light Installation",
  "Exterior Electrical Outlet Installation",

  // ── Foundation & Structural ──
  "Foundation Inspection",
  "Foundation Crack Repair - Minor",
  "Foundation Crack Repair - Major",
  "Foundation Waterproofing",
  "Basement Waterproofing",
  "Crawl Space Encapsulation",
  "Crawl Space Vapor Barrier",
  "Crawl Space Cleanup",
  "Crawl Space Dehumidifier",
  "Pier & Beam Repair",
  "Concrete Slab Repair",
  "Concrete Crack Filling",
  "Concrete Leveling / Mudjacking",
  "Basement Wall Repair",
  "Basement Floor Repair",
  "Sump Pump Installation",
  "Sump Pump Repair",
  "Sump Pump Replacement",
  "Drainage System Installation",
  "Retaining Wall Replacement",
  "Steps Repair - Concrete",
  "Steps Repair - Wood",
  "Steps Replacement - Concrete",
  "Steps Replacement - Wood",
  "Handrail Repair",
  "Handrail Installation",
  "Porch Repair",
  "Porch Replacement",
  "Deck Repair - Minor",
  "Deck Repair - Major",
  "Deck Replacement",
  "Deck Staining/Sealing",
  "Patio Repair",
  "Patio Replacement",
  "Walkway Repair",
  "Walkway Replacement",
  "Driveway Repair",
  "Driveway Sealcoating",
  "Driveway Replacement",
  "Sidewalk Repair",
  "Sidewalk Replacement",

  // ── Plumbing ──
  "Plumbing Inspection",
  "Leak Detection",
  "Pipe Repair - Minor",
  "Pipe Repair - Major",
  "Pipe Replacement - Section",
  "Pipe Replacement - Whole House",
  "Faucet Repair",
  "Faucet Replacement - Kitchen",
  "Faucet Replacement - Bathroom",
  "Faucet Replacement - Outdoor",
  "Toilet Repair",
  "Toilet Replacement",
  "Toilet Flange Repair",
  "Shower Head Replacement",
  "Shower Valve Repair",
  "Bathtub Drain Repair",
  "Sink Drain Repair",
  "Garbage Disposal Installation",
  "Garbage Disposal Replacement",
  "Water Heater Repair",
  "Water Heater Replacement - Standard",
  "Water Heater Replacement - Tankless",
  "Water Heater Element Replacement",
  "Water Heater Anode Rod",
  "Sewer Line Camera Inspection",
  "Sewer Line Cleaning",
  "Sewer Line Repair",
  "Main Water Line Repair",
  "Main Water Line Replacement",
  "Hose Bibb Replacement",
  "Shut Off Valve Replacement",
  "Pressure Reducing Valve",
  "Backflow Preventer Installation",
  "Septic Tank Pumping",
  "Septic System Inspection",
  "Septic System Repair",
  "Well Pump Repair",
  "Well Pump Replacement",
  "Well Pressure Tank Replacement",
  "Well Water Testing",
  "Frozen Pipe Thawing",
  "Pipe Insulation",

  // ── Electrical ──
  "Electrical Inspection",
  "Panel Upgrade - 100 Amp",
  "Panel Upgrade - 200 Amp",
  "Electrical Panel Repair",
  "Circuit Breaker Replacement",
  "GFCI Outlet Installation",
  "GFCI Outlet Replacement",
  "Standard Outlet Installation",
  "Standard Outlet Replacement",
  "Switch Installation",
  "Switch Replacement",
  "Dimmer Switch Installation",
  "Ceiling Fan Installation",
  "Ceiling Fan Repair",
  "Light Fixture Installation",
  "Light Fixture Replacement",
  "Recessed Light Installation",
  "Exterior Light Installation",
  "Smoke Detector Installation",
  "Smoke Detector Replacement",
  "CO Detector Installation",
  "CO Detector Replacement",
  "Doorbell Installation",
  "Doorbell Repair",
  "Exhaust Fan Installation",
  "Exhaust Fan Repair",
  "Outlet Cover Replacement",
  "Light Switch Cover Replacement",
  "Whole House Rewiring",
  "Aluminum Wiring Remediation",
  "Knob & Tube Remediation",
  "Surge Protector Installation",
  "Generator Outlet Installation",
  "EV Charger Installation",
  "Landscape Lighting Installation",
  "Security Light Installation",

  // ── HVAC ──
  "HVAC Inspection",
  "HVAC Tune-Up / Service",
  "Furnace Repair",
  "Furnace Replacement",
  "Furnace Filter Replacement",
  "AC Unit Repair",
  "AC Unit Replacement",
  "AC Compressor Replacement",
  "AC Coil Cleaning",
  "Ductwork Inspection",
  "Ductwork Repair",
  "Ductwork Replacement",
  "Ductwork Sealing",
  "Ductwork Cleaning",
  "Thermostat Installation",
  "Thermostat Replacement - Standard",
  "Thermostat Replacement - Smart",
  "Humidifier Installation",
  "Dehumidifier Installation",
  "Vent Hood Installation",
  "Bathroom Exhaust Fan Installation",
  "Attic Fan Installation",
  "Whole House Fan Installation",
  "Mini-Split Installation",
  "Mini-Split Repair",
  "Boiler Repair",
  "Boiler Replacement",
  "Radiator Repair",
  "Radiator Replacement",
  "Baseboard Heater Installation",
  "Baseboard Heater Repair",
  "Heat Pump Repair",
  "Heat Pump Replacement",
  "Refrigerant Recharge",
  "UV Light Air Purifier Installation",
  "Air Filtration System Installation",

  // ── Interior Repairs ──
  "Drywall Repair - Small Hole",
  "Drywall Repair - Large Hole",
  "Drywall Repair - Water Damage",
  "Drywall Replacement - Single Wall",
  "Drywall Replacement - Room",
  "Drywall Replacement - Ceiling",
  "Drywall Installation - New",
  "Drywall Taping & Mudding",
  "Ceiling Repair - Water Stain",
  "Ceiling Repair - Crack",
  "Ceiling Repair - Collapse",
  "Popcorn Ceiling Removal",
  "Ceiling Texture Matching",
  "Crown Molding Installation",
  "Crown Molding Repair",
  "Baseboard Installation",
  "Baseboard Repair",
  "Baseboard Replacement",
  "Chair Rail Installation",
  "Wainscoting Installation",
  "Trim Repair - Door/Window",
  "Trim Replacement - Door/Window",
  "Corner Bead Repair",
  "Plaster Repair",
  "Plaster Replacement",
  "Wall Texturing",
  "Wallpaper Removal",
  "Wallpaper Installation",

  // ── Painting (Interior) ──
  "Interior Painting - Single Room",
  "Interior Painting - Multiple Rooms",
  "Interior Painting - Whole House",
  "Interior Painting - Ceiling Only",
  "Interior Painting - Trim Only",
  "Interior Painting - Closets",
  "Primer Application",
  "Paint Touch-Up",
  "Accent Wall Painting",
  "Closet Painting",
  "Basement Painting",
  "Garage Interior Painting",
  "Stairway Painting",
  "Door Painting - Interior",
  "Door Painting - Exterior",
  "Cabinet Painting",
  "Cabinet Refinishing",
  "Cabinet Replacement",

  // ── Flooring ──
  "Carpet Installation - Single Room",
  "Carpet Installation - Whole House",
  "Carpet Cleaning - Standard",
  "Carpet Cleaning - Deep Clean",
  "Carpet Patching",
  "Carpet Stretching",
  "Hardwood Floor Installation",
  "Hardwood Floor Refinishing",
  "Hardwood Floor Repair",
  "Laminate Floor Installation",
  "Laminate Floor Repair",
  "Vinyl Plank Installation",
  "Vinyl Sheet Installation",
  "Vinyl Tile Installation",
  "Tile Floor Installation",
  "Tile Floor Repair",
  "Tile Grout Repair",
  "Tile Grout Cleaning",
  "Linoleum Installation",
  "Linoleum Repair",
  "Subfloor Repair",
  "Subfloor Replacement",
  "Floor Leveling",
  "Transition Strip Installation",
  "Floor Vent Replacement",

  // ── Kitchen ──
  "Kitchen Deep Clean",
  "Kitchen Demo/Cleanup",
  "Counter Top Replacement - Laminate",
  "Counter Top Replacement - Granite",
  "Counter Top Replacement - Quartz",
  "Counter Top Repair",
  "Backsplash Installation - Tile",
  "Backsplash Installation - Peel & Stick",
  "Kitchen Sink Replacement",
  "Kitchen Faucet Replacement",
  "Dishwasher Installation",
  "Dishwasher Replacement",
  "Range/Oven Installation",
  "Range/Oven Replacement",
  "Refrigerator Installation",
  "Refrigerator Removal",
  "Microwave Installation",
  "Range Hood Installation",
  "Kitchen Exhaust Fan",
  "Cabinet Hardware Replacement",
  "Cabinet Shelf Repair",
  "Cabinet Door Replacement",
  "Pantry Shelving Installation",
  "Kitchen Floor Repair",

  // ── Bathroom ──
  "Bathroom Deep Clean",
  "Bathroom Demo/Cleanup",
  "Toilet Installation",
  "Toilet Repair - Running",
  "Toilet Repair - Leaking",
  "Vanity Installation",
  "Vanity Replacement",
  "Bathroom Sink Replacement",
  "Bathroom Faucet Replacement",
  "Mirror Installation - Bathroom",
  "Mirror Replacement - Bathroom",
  "Medicine Cabinet Installation",
  "Shower Door Installation",
  "Shower Door Replacement",
  "Shower Tile Repair",
  "Shower Tile Replacement",
  "Shower Pan Repair",
  "Shower Pan Replacement",
  "Bathtub Replacement",
  "Bathtub Refinishing",
  "Bathroom Exhaust Fan Repair",
  "Towel Bar Installation",
  "Toilet Paper Holder Installation",
  "Grab Bar Installation",
  "Bathroom Floor Repair",

  // ── Windows ──
  "Window Replacement - Standard",
  "Window Replacement - Bay",
  "Window Replacement - Bow",
  "Window Replacement - Sliding",
  "Window Replacement - Casement",
  "Window Replacement - Double Hung",
  "Window Replacement - Picture",
  "Window Repair - Glass Only",
  "Window Repair - Frame",
  "Window Repair - Sash",
  "Window Repair - Seal/Weatherstrip",
  "Window Glazing Repair",
  "Window Capping/Cladding",
  "Storm Window Installation",
  "Window Well Cover Installation",
  "Window Lintel Repair",
  "Window Sill Repair",
  "Window Sill Replacement",
  "Skylight Installation",
  "Skylight Repair",

  // ── Fencing ──
  "Fence Inspection",
  "Fence Repair - Wood Privacy",
  "Fence Replacement - Wood Privacy",
  "Fence Repair - Chain Link",
  "Fence Replacement - Chain Link",
  "Fence Repair - Vinyl",
  "Fence Replacement - Vinyl",
  "Fence Repair - Split Rail",
  "Fence Replacement - Split Rail",
  "Fence Repair - Wrought Iron",
  "Fence Replacement - Wrought Iron",
  "Fence Post Replacement",
  "Fence Gate Repair",
  "Fence Gate Replacement",
  "Fence Staining/Sealing",
  "Fence Painting",
  "Privacy Fence Extension",
  "Temporary Fence Installation",
  "Pool Fence Installation",
  "Invisible Fence Installation",
  "Fence Removal",
  "Fence Line Clearing",
  "Fence Topper Installation",

  // ── Pool & Spa ──
  "Pool Inspection",
  "Pool Cleaning - Standard",
  "Pool Cleaning - Green/Cleanup",
  "Pool Draining",
  "Pool Refilling",
  "Pool Cover Installation",
  "Pool Cover Replacement",
  "Pool Pump Repair",
  "Pool Pump Replacement",
  "Pool Filter Replacement",
  "Pool Heater Repair",
  "Pool Heater Replacement",
  "Pool Liner Replacement",
  "Pool Tile Repair",
  "Pool Deck Repair",
  "Pool Deck Power Washing",
  "Pool Fence Repair",
  "Pool Equipment Winterization",
  "Pool Equipment De-Winterization",
  "Hot Tub Drain & Clean",
  "Hot Tub Cover Replacement",
  "Hot Tub Repair",
  "Hot Tub Removal",

  // ── Mold & Environmental ──
  "Mold Inspection",
  "Mold Testing",
  "Mold Remediation - Small Area",
  "Mold Remediation - Large Area",
  "Mold Remediation - Whole House",
  "Mold Prevention Treatment",
  "Air Quality Testing",
  "Asbestos Testing",
  "Asbestos Abatement",
  "Lead Paint Testing",
  "Lead Paint Abatement",
  "Radon Testing",
  "Radon Mitigation System",
  "Water Damage Assessment",
  "Water Damage Restoration",
  "Flood Damage Cleanup",
  "Fire Damage Assessment",
  "Fire Damage Cleanup",
  "Smoke Damage Cleanup",
  "Odor Removal - Smoke",
  "Odor Removal - Pet",
  "Odor Removal - Mold",
  "Odor Removal - General",
  "Air Scrubber Installation",
  "Dehumidification Service",
  "Moisture Barrier Installation",
  "Crawlspace Encapsulation",
  "Vapor Barrier Installation",

  // ── Pest Control ──
  "Pest Inspection",
  "General Pest Treatment",
  "Termite Inspection",
  "Termite Treatment",
  "Termite Bond",
  "Rodent Exclusion",
  "Rodent Trapping & Removal",
  "Bat Removal",
  "Bird Removal & Deterrent",
  "Wasp/Hornet Nest Removal",
  "Bee Removal & Relocation",
  "Flea Treatment",
  "Bed Bug Treatment",
  "Cockroach Treatment",
  "Ant Treatment",
  "Spider Treatment",
  "Mosquito Treatment",
  "Tick Treatment",
  "Wildlife Exclusion",
  "Snake Removal",
  "Squirrel Removal",
  "Raccoon Removal",
  "Opossum Removal",
  "Dead Animal Removal",
  "Attic Decontamination",
  "Crawlspace Decontamination",

  // ── Cleaning ──
  "Initial Clean - Standard",
  "Initial Clean - Deep Clean",
  "Initial Clean - Trash Out",
  "Maid Service - Standard",
  "Maid Service - Deep Clean",
  "Move-In Clean",
  "Move-Out Clean",
  "Post-Construction Clean",
  "Post-Renovation Clean",
  "Carpet Steam Cleaning",
  "Upholstery Cleaning",
  "Window Cleaning - Interior",
  "Window Cleaning - Exterior",
  "Window Cleaning - Full",
  "Chimney Cleaning",
  "Dryer Vent Cleaning",
  "Air Duct Cleaning",
  "Pressure Washing - Concrete",
  "Pressure Washing - Wood",
  "Pressure Washing - Vinyl",
  "Oven/Stove Cleaning",
  "Refrigerator Cleaning",
  "Basement Cleaning",
  "Attic Cleaning",
  "Garage Cleaning",
  "Patio/Deck Cleaning",
  "Graffiti Removal",
  "Stain Removal - Carpet",
  "Stain Removal - Hard Surface",
  "Sanitization Service",
  "Disinfection Service",
  "Hoarding Cleanup",
  "Estate Cleanout",
  "Foreclosure Cleanout",

  // ── Appliance Installation ──
  "Washer Installation",
  "Dryer Installation",
  "Water Heater Installation",
  "Water Softener Installation",
  "Water Filtration System",
  "Ice Maker Line Installation",
  "Gas Line Installation",
  "Gas Appliance Hookup",
  "Dryer Vent Installation",
  "Dryer Vent Repair",

  // ── Insulation ──
  "Attic Insulation - Batt/Roll",
  "Attic Insulation - Spray Foam",
  "Wall Insulation - Blow-In",
  "Crawlspace Insulation",
  "Basement Insulation",
  "Duct Insulation",
  "Insulation Removal",
  "Radiant Barrier Installation",
  "Weatherstripping - Doors",
  "Weatherstripping - Windows",
  "Caulking - Interior",
  "Caulking - Exterior",
  "Door Sweep Installation",
  "Outlet Gasket Installation",
  "Attic Stair Insulation Cover",

  // ── Safety & Code Compliance ──
  "Smoke Detector Battery Replacement",
  "CO Detector Battery Replacement",
  "Fire Extinguisher Installation",
  "Fire Extinguisher Inspection",
  "Fire Escape Inspection",
  "Fire Escape Repair",
  "Emergency Exit Light Installation",
  "Guard Rail Installation",
  "Stair Tread Repair",
  "Stair Nosing Installation",
  "ADA Compliance Modifications",
  "Wheelchair Ramp Installation",
  "Anti-Slip Treatment",
  "Security Camera Installation",
  "Security System Installation",
  "Doorbell Camera Installation",
  "Intercom System Installation",
  "Peephole Installation",
  "Emergency Shutoff Labels",

  // ── Miscellaneous ──
  "Property Inspection - Standard",
  "Property Inspection - Detailed",
  "Property Preservation - Monthly Service",
  "Property Preservation - Bi-Weekly",
  "Property Preservation - Weekly",
  "Utility Activation Coordination",
  "Utility Deactivation Coordination",
  "HOA Violation Remediation",
  "Code Violation Remediation",
  "Permit Pulling",
  "Dumpster Rental",
  "Portable Toilet Rental",
  "Temporary Power Installation",
  "Temporary Heat Installation",
  "Generator Installation",
  "Generator Rental",
  "Temporary Fencing",
  "Construction Barricade",
  "Signage Installation",
  "Real Estate Sign Installation",
  "Lockbox Installation",
  "Key Management",
  "Property Monitoring - Weekly Check",
  "Property Monitoring - Monthly Check",
  "Photo Documentation - Standard",
  "Photo Documentation - Detailed",
  "Drone Photography",
  "360° Photography",
  "Property Video Walkthrough",
  "Insurance Documentation",
  "Notarized Affidavit of Completion",
  "Contractor Coordination",
  "Material Procurement",
  "Permit Fees",
  "Disposal Fees",
  "Equipment Rental",
  "Emergency Service Call",
  "After Hours Service",
  "Weekend/Holiday Service",
  "Travel Surcharge",
  "Mileage Reimbursement",
];

function BidItemSelector({
  value,
  onChange,
  placeholder = "Select or type bid item...",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    return EXCEL_TASKS.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 1000);
  }, [search]);

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-emerald-500/50 focus:outline-none"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/40 max-h-80 overflow-y-auto">
          {filtered.length > 0 ? filtered.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              type="button"
              onClick={() => { onChange(item.name); setSearch(item.name); setOpen(false); }}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors border-b border-border-subtle last:border-0 flex flex-col gap-1",
                value === item.name ? "bg-emerald-500/10" : ""
              )}
            >
              <div className={cn(
                "text-xs font-bold transition-colors",
                value === item.name ? "text-emerald-400 font-black" : "text-text-primary"
              )}>
                {item.name}
              </div>
              {item.description ? (
                <div className="text-[10px] text-text-dim line-clamp-2 leading-relaxed">
                  {item.description}
                </div>
              ) : (
                <div className="text-[9px] text-text-muted italic">No default description</div>
              )}
            </button>
          )) : (
            <div className="px-4 py-3 text-xs text-text-dim">No matches. Type to enter custom item.</div>
          )}
          <button
            type="button"
            onClick={() => { setSearch(""); onChange(""); inputRef.current?.focus(); }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors border-t border-border-medium flex items-center gap-2"
          >
            <Plus className="h-3 w-3" /> Custom Bid Item
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Ready-Made Bid Templates ─────────────────────────────────────────────────

export interface BidTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  items: { title: string; description: string; unit?: string; defaultPrice?: number }[];
}

export const BID_TEMPLATES: BidTemplate[] = [
  {
    id: "initial-secure-standard",
    name: "Initial Secure — Standard",
    category: "Securing",
    description: "Standard initial secure package including lock change, lockbox, and property securing.",
    items: [
      { title: "Lock Change - Front Door", description: "Install new deadbolt and keyed knob on front entry door.", unit: "EA", defaultPrice: 85 },
      { title: "Lock Box Installation", description: "Mount combination lockbox on front railing or door frame.", unit: "EA", defaultPrice: 45 },
      { title: "Re-Key All Exterior Doors", description: "Re-key all exterior doors to match new lock set.", unit: "EA", defaultPrice: 65 },
      { title: "Window Lock Repair", description: "Repair or replace broken window locks on all accessible windows.", unit: "EA", defaultPrice: 25 },
      { title: "Exterior Debris Removal - Full Property", description: "Remove all debris from front, back, and side yards.", unit: "LS", defaultPrice: 150 },
    ],
  },
  {
    id: "grass-cut-standard",
    name: "Grass Cut — Standard Lot",
    category: "Lawn",
    description: "Complete lawn service for standard residential lot including mow, edge, and trim.",
    items: [
      { title: "Initial Grass Cut - Standard Lot", description: "Mow all grass areas to 3 inches. Edge walkways, driveway, and curb.", unit: "LS", defaultPrice: 65 },
      { title: "Trim Shrubs - Foundation", description: "Trim foundation shrubs to maintain shape and clearance.", unit: "LS", defaultPrice: 45 },
      { title: "Weed Whacking / String Trimming", description: "String trim around fence line, trees, AC unit, and obstacles.", unit: "LS", defaultPrice: 35 },
      { title: "Edging - Walkways & Driveway", description: "Edge all walkways, driveway edges, and curb line.", unit: "LF", defaultPrice: 0.50 },
      { title: "Yard Waste Hauling", description: "Bag and haul away all yard waste and clippings.", unit: "LS", defaultPrice: 40 },
    ],
  },
  {
    id: "winterization-full",
    name: "Winterization — Full Package",
    category: "Winterization",
    description: "Complete winterization including drain-down, antifreeze, and documentation.",
    items: [
      { title: "Full Winterization (Drain Down)", description: "Shut off water supply, drain all lines, water heater, and fixtures.", unit: "LS", defaultPrice: 275 },
      { title: "Anti-Freeze Application - Traps", description: "Pour non-toxic antifreeze into all sink, tub, and shower traps.", unit: "EA", defaultPrice: 15 },
      { title: "Blow Out Water Lines", description: "Use air compressor to clear remaining water from supply lines.", unit: "LS", defaultPrice: 85 },
      { title: "Toilet Winterization", description: "Drain, add antifreeze, and wrap all toilets.", unit: "EA", defaultPrice: 25 },
      { title: "Water Heater Drain & Disconnect", description: "Drain water heater and disconnect supply lines.", unit: "EA", defaultPrice: 65 },
    ],
  },
  {
    id: "board-up-full",
    name: "Board-Up — Full Property",
    category: "Boarding",
    description: "Board up all open or broken windows and doors with plywood.",
    items: [
      { title: "Board Up - All Windows", description: "Measure, cut, and install plywood over all open/broken windows.", unit: "EA", defaultPrice: 75 },
      { title: "Board Up - Front Door", description: "Secure front door opening with plywood if compromised.", unit: "EA", defaultPrice: 95 },
      { title: "Board Up - Back Door", description: "Secure back door opening with plywood if compromised.", unit: "EA", defaultPrice: 95 },
      { title: "Board Up - Sliding Glass Door", description: "Board up sliding glass door if broken or unsecured.", unit: "EA", defaultPrice: 125 },
      { title: "Plywood Board-Up (3/4 inch)", description: "Material cost for 3/4 inch plywood sheets.", unit: "EA", defaultPrice: 45 },
    ],
  },
  {
    id: "debris-removal-interior",
    name: "Debris Removal — Interior",
    category: "Debris",
    description: "Complete interior debris removal and trash-out service.",
    items: [
      { title: "Interior Debris Removal - Whole House", description: "Remove all abandoned furniture, trash, and debris from interior.", unit: "LS", defaultPrice: 450 },
      { title: "Appliance Removal & Disposal", description: "Remove and dispose of abandoned appliances (fridge, stove, etc.).", unit: "EA", defaultPrice: 85 },
      { title: "Furniture Removal & Disposal", description: "Remove and dispose of all remaining furniture.", unit: "LS", defaultPrice: 200 },
      { title: "Carpet Removal & Disposal", description: "Remove damaged carpet and padding. Dispose properly.", unit: "SF", defaultPrice: 1.25 },
      { title: "Initial Clean - Trash Out", description: "Basic clean after debris removal. Sweep, bag, and tidy.", unit: "LS", defaultPrice: 175 },
    ],
  },
  {
    id: "mold-remediation",
    name: "Mold Remediation — Standard",
    category: "Environmental",
    description: "Mold assessment, containment, removal, and post-testing.",
    items: [
      { title: "Mold Inspection", description: "Visual inspection and moisture mapping of affected areas.", unit: "LS", defaultPrice: 175 },
      { title: "Mold Testing", description: "Air and surface sample collection for lab analysis.", unit: "EA", defaultPrice: 125 },
      { title: "Mold Remediation - Large Area", description: "Containment, removal, and antimicrobial treatment of affected area.", unit: "SF", defaultPrice: 8.50 },
      { title: "Air Quality Testing", description: "Post-remediation clearance air quality test.", unit: "EA", defaultPrice: 150 },
      { title: "Dehumidification Service", description: "Industrial dehumidifier deployment and monitoring.", unit: "DAY", defaultPrice: 75 },
    ],
  },
  {
    id: "roof-repair-standard",
    name: "Roof Repair — Standard",
    category: "Roofing",
    description: "Common roof repairs including tarping, shingle replacement, and gutter service.",
    items: [
      { title: "Roof Tarping - Standard", description: "Install protective tarp over damaged roof area.", unit: "SQ", defaultPrice: 185 },
      { title: "Shingle Replacement - Damaged", description: "Replace damaged or missing shingles.", unit: "EA", defaultPrice: 15 },
      { title: "Roof Repair - Minor (patching)", description: "Patch small leaks or damaged areas.", unit: "LS", defaultPrice: 275 },
      { title: "Gutter Cleaning", description: "Clean all gutters and downspouts.", unit: "LF", defaultPrice: 1.50 },
      { title: "Flashing Repair", description: "Repair or replace damaged flashing around vents and chimneys.", unit: "EA", defaultPrice: 125 },
    ],
  },
  {
    id: "interior-paint-standard",
    name: "Interior Paint — Standard Rooms",
    category: "Painting",
    description: "Interior painting package for standard room refresh.",
    items: [
      { title: "Interior Painting - Single Room", description: "Prep, prime, and paint walls and ceiling of one room.", unit: "ROOM", defaultPrice: 350 },
      { title: "Interior Painting - Trim Only", description: "Paint all trim, baseboards, and door casings.", unit: "ROOM", defaultPrice: 125 },
      { title: "Drywall Repair - Small Hole", description: "Patch and smooth small holes and dents in drywall.", unit: "EA", defaultPrice: 45 },
      { title: "Primer Application", description: "Apply primer coat to stained or repaired areas.", unit: "SF", defaultPrice: 0.75 },
      { title: "Ceiling Repair - Water Stain", description: "Repair and repaint water-stained ceiling area.", unit: "EA", defaultPrice: 125 },
    ],
  },
  {
    id: "plumbing-emergency",
    name: "Plumbing — Emergency Repairs",
    category: "Plumbing",
    description: "Common emergency plumbing repairs for property preservation.",
    items: [
      { title: "Pipe Repair - Minor", description: "Repair minor pipe leak or joint failure.", unit: "EA", defaultPrice: 125 },
      { title: "Faucet Replacement - Outdoor", description: "Replace outdoor hose bibb or faucet.", unit: "EA", defaultPrice: 95 },
      { title: "Toilet Repair", description: "Repair running or leaking toilet.", unit: "EA", defaultPrice: 85 },
      { title: "Shut Off Valve Replacement", description: "Replace faulty shut-off valve.", unit: "EA", defaultPrice: 115 },
      { title: "Frozen Pipe Thawing", description: "Safely thaw frozen pipes and check for damage.", unit: "LS", defaultPrice: 150 },
    ],
  },
  {
    id: "electrical-safety",
    name: "Electrical — Safety Package",
    category: "Electrical",
    description: "Essential electrical safety items for property compliance.",
    items: [
      { title: "Smoke Detector Installation", description: "Install battery-operated smoke detectors in required locations.", unit: "EA", defaultPrice: 35 },
      { title: "CO Detector Installation", description: "Install carbon monoxide detector near sleeping areas.", unit: "EA", defaultPrice: 45 },
      { title: "GFCI Outlet Installation", description: "Install GFCI outlet in kitchen, bathroom, or outdoor location.", unit: "EA", defaultPrice: 85 },
      { title: "Exterior Light Fixture Replacement", description: "Replace broken or missing exterior light fixture.", unit: "EA", defaultPrice: 75 },
      { title: "Electrical Panel Repair", description: "Inspect and repair electrical panel issues.", unit: "LS", defaultPrice: 225 },
    ],
  },
  {
    id: "fence-repair-standard",
    name: "Fence Repair — Standard",
    category: "Fencing",
    description: "Common fence repairs for property perimeter.",
    items: [
      { title: "Fence Post Replacement", description: "Replace broken or leaning fence post with concrete footing.", unit: "EA", defaultPrice: 125 },
      { title: "Fence Repair - Wood Privacy", description: "Replace broken pickets and reinforce sections.", unit: "LF", defaultPrice: 12 },
      { title: "Fence Gate Repair", description: "Repair sagging or broken fence gate.", unit: "EA", defaultPrice: 95 },
      { title: "Fence Staining/Sealing", description: "Apply stain or sealant to protect wood fence.", unit: "SF", defaultPrice: 0.85 },
      { title: "Fence Line Clearing", description: "Clear vegetation and debris along fence line.", unit: "LF", defaultPrice: 1.50 },
    ],
  },
  {
    id: "pool-maintenance",
    name: "Pool — Maintenance Package",
    category: "Pool",
    description: "Standard pool maintenance and cleanup service.",
    items: [
      { title: "Pool Cleaning - Green/Cleanup", description: "Drain, acid wash, and refill green/algae pool.", unit: "LS", defaultPrice: 450 },
      { title: "Pool Cover Installation", description: "Install safety cover over pool.", unit: "EA", defaultPrice: 175 },
      { title: "Pool Pump Repair", description: "Diagnose and repair pool pump issues.", unit: "EA", defaultPrice: 225 },
      { title: "Pool Deck Power Washing", description: "Pressure wash pool deck and surrounding area.", unit: "SF", defaultPrice: 0.45 },
      { title: "Pool Equipment Winterization", description: "Winterize pool pump, filter, and plumbing.", unit: "LS", defaultPrice: 150 },
    ],
  },
];

function BidTemplateSelector({
  onSelect,
  onClose,
}: {
  onSelect: (items: { title: string; description: string; unit?: string; defaultPrice?: number }[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(BID_TEMPLATES.map((t) => t.category));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    return BID_TEMPLATES.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.items.some((i) => i.title.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = !selectedCategory || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  return (
    <div className="p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-black text-emerald-100 uppercase tracking-widest">Bid Template Library</h4>
            <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-tighter mt-0.5">{BID_TEMPLATES.length} Ready-Made Templates • {filtered.length} Shown</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-rose-400 transition-all">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bid templates (e.g., winterization, mold, grass cut)..."
          className="w-full pl-11 pr-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all shadow-inner"
          autoFocus
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border uppercase tracking-wider",
            !selectedCategory
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-surface-hover border-border-subtle text-text-muted hover:text-text-secondary"
          )}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border uppercase tracking-wider",
              selectedCategory === cat
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-surface-hover border-border-subtle text-text-muted hover:text-text-secondary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filtered.length > 0 ? (
          filtered.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                onSelect(template.items);
                onClose();
              }}
              className="group flex flex-col p-4 rounded-2xl bg-surface-hover border border-border-subtle hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-text-primary truncate group-hover:text-emerald-400 transition-colors">{template.name}</h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-hover text-text-muted border border-border-subtle uppercase tracking-wider">{template.category}</span>
                </div>
              </div>
              <p className="text-[10px] text-text-muted line-clamp-2 mb-3 italic">{template.description}</p>
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-subtle">
                <span className="text-[9px] font-bold text-text-dim">{template.items.length} items</span>
                <span className="text-[9px] font-black text-emerald-400">
                  ~${template.items.reduce((s, i) => s + (i.defaultPrice || 0), 0).toLocaleString()}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-2 py-12 text-center">
            <Search className="h-8 w-8 text-text-dim mx-auto mb-3" />
            <p className="text-sm font-bold text-text-secondary">No matching templates</p>
            <p className="text-xs text-text-dim mt-1">Try adjusting your search or category filter.</p>
            <button
              onClick={() => { setSearch(""); setSelectedCategory(null); }}
              className="mt-3 px-4 py-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl transition-all uppercase tracking-widest border border-emerald-500/20"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bid Entry ───────────────────────────────────────────────────────────────

export interface BidEntry {
  id: string;
  title: string;
  amount: number;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  photos: PhotoItem[];
  expanded: boolean;
  unit?: string;
  quantity?: number;
  price?: number;
}

export function BidEntryList({
  bids,
  onBidsChange,
  onUpload,
  onOpenCamera,
  className,
}: {
  bids: BidEntry[];
  onBidsChange: (bids: BidEntry[]) => void;
  onUpload?: (file: File, category: string) => Promise<{ url: string; rawUrl?: string; id: string }>;
  onOpenCamera?: (category: string, bidId: string) => void;
  className?: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showAIBid, setShowAIBid] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBidUnit, setEditBidUnit] = useState("");
  const [editBidQty, setEditBidQty] = useState("");
  const [editBidPrice, setEditBidPrice] = useState("");
  const [showBidTemplates, setShowBidTemplates] = useState(false);

  // Auto-calculate amount from qty × price (new bid)
  const autoNewAmount = useMemo(() => {
    const qty = parseFloat(newQty);
    const price = parseFloat(newPrice);
    if (qty > 0 && price > 0) return qty * price;
    return null;
  }, [newQty, newPrice]);

  // Auto-calculate amount from qty × price (edit bid)
  const autoEditAmount = useMemo(() => {
    const qty = parseFloat(editBidQty);
    const price = parseFloat(editBidPrice);
    if (qty > 0 && price > 0) return qty * price;
    return null;
  }, [editBidQty, editBidPrice]);

  // Sync auto-calculated amount to newAmount field
  useEffect(() => {
    if (autoNewAmount !== null) {
      setNewAmount(autoNewAmount.toFixed(2));
    }
  }, [autoNewAmount]);

  // Sync auto-calculated amount to editAmount field
  useEffect(() => {
    if (autoEditAmount !== null) {
      setEditAmount(autoEditAmount.toFixed(2));
    }
  }, [autoEditAmount]);

  function addBid() {
    if (!newTitle.trim() || !newAmount) return;
    const newBid: BidEntry = {
      id: `bid-${Date.now()}`,
      title: newTitle.trim(),
      amount: parseFloat(newAmount),
      description: newDesc.trim() || undefined,
      status: "PENDING",
      photos: [],
      expanded: false,
      unit: newUnit.trim() || undefined,
      quantity: newQty ? parseFloat(newQty) : undefined,
      price: newPrice ? parseFloat(newPrice) : undefined,
    };
    onBidsChange([...bids, newBid]);
    setNewTitle("");
    setNewAmount("");
    setNewDesc("");
    setNewUnit("");
    setNewQty("");
    setNewPrice("");
    setShowAdd(false);
  }

  function removeBid(id: string) {
    onBidsChange(bids.filter((b) => b.id !== id));
  }

  function toggleExpand(id: string) {
    onBidsChange(
      bids.map((b) => (b.id === id ? { ...b, expanded: !b.expanded } : b))
    );
  }

  function updateBidPhotos(id: string, photos: PhotoItem[]) {
    onBidsChange(
      bids.map((b) => (b.id === id ? { ...b, photos } : b))
    );
  }

  function updateStatus(id: string, status: BidEntry["status"]) {
    onBidsChange(
      bids.map((b) => (b.id === id ? { ...b, status } : b))
    );
  }

  function startEdit(bid: BidEntry) {
    setEditingId(bid.id);
    setEditTitle(bid.title);
    setEditAmount(String(bid.amount));
    setEditDesc(bid.description || "");
    setEditBidUnit(bid.unit || "");
    setEditBidQty(bid.quantity != null ? String(bid.quantity) : "");
    setEditBidPrice(bid.price != null ? String(bid.price) : "");
  }

  function saveEdit(id: string) {
    if (!editTitle.trim() || !editAmount) return;
    onBidsChange(
      bids.map((b) =>
        b.id === id
          ? {
              ...b,
              title: editTitle.trim(),
              amount: parseFloat(editAmount),
              description: editDesc.trim() || undefined,
              unit: editBidUnit.trim() || undefined,
              quantity: editBidQty ? parseFloat(editBidQty) : undefined,
              price: editBidPrice ? parseFloat(editBidPrice) : undefined,
            }
          : b
      )
    );
    setEditingId(null);
  }

  async function handleAIBidGenerate() {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/bid-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json();
      
      const parsedData = Array.isArray(data) ? data : [data];
      
      const newBids: BidEntry[] = parsedData.map((item: any, index: number) => ({
        id: `bid-ai-${Date.now()}-${index}`,
        title: item.title || "AI Generated Bid",
        amount: parseFloat(item.amount) || 0,
        description: item.description || aiPrompt,
        status: "PENDING",
        photos: [],
        expanded: true,
        unit: item.unit,
        quantity: item.quantity ? parseFloat(item.quantity) : undefined,
        price: item.price ? parseFloat(item.price) : undefined,
      }));
      
      onBidsChange([...bids, ...newBids]);
      setAiPrompt("");
      setShowAIBid(false);
      toast.success(`Generated ${newBids.length} bid items`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate bid via AI");
    } finally {
      setIsGenerating(false);
    }
  }

  const totalAmount = bids.reduce((s, b) => s + b.amount, 0);
  const approvedAmount = bids
    .filter((b) => b.status === "APPROVED")
    .reduce((s, b) => s + b.amount, 0);

  function loadBidTemplates(items: { title: string; description: string; unit?: string; defaultPrice?: number }[]) {
    const newBids: BidEntry[] = items.map((item, i) => ({
      id: `bid-tpl-${Date.now()}-${i}`,
      title: item.title,
      amount: (item.defaultPrice || 0) * 1, // qty defaults to 1
      description: item.description,
      status: "PENDING",
      photos: [],
      expanded: false,
      unit: item.unit,
      quantity: 1,
      price: item.defaultPrice,
    }));
    onBidsChange([...bids, ...newBids]);
    setShowBidTemplates(false);
  }

  const statusColors = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Financial Estimates</h3>
            <p className="text-[10px] font-bold text-text-muted">{bids.length} proposed bid{bids.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.promise(printBidsReport(bids), { loading: "Preparing PDF...", success: "PDF Ready", error: "Failed to generate PDF" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Print / PDF Bid Proposal"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print Bids Proposal</span>
            <span className="sm:hidden">Print</span>
          </button>

          <div className="text-right">
            <span className="text-lg font-black text-emerald-400 leading-none">
              ${totalAmount.toLocaleString()}
            </span>
            <p className="text-[9px] font-black text-text-dim uppercase tracking-tighter">Projected Value</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {bids.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-border-subtle rounded-3xl text-center">
            <DollarSign className="h-10 w-10 text-slate-800 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-text-dim font-medium">No financial bids have been created yet.</p>
          </div>
        ) : (
          bids.map((bid) => (
            <div
              key={bid.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                bid.status === "APPROVED"
                  ? "bg-emerald-500/[0.04] border-emerald-500/20 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.1)]"
                  : "bg-surface/60 backdrop-blur-md border-border-subtle hover:border-border-subtle hover:bg-surface-hover"
              )}
            >
              {/* Mobile-Friendly Responsive Bid Row */}
              <div className="p-4 md:px-5 md:py-4 flex flex-col gap-3">
                {/* Top Row: Dollar Icon, Title, Status, Amount & Expand Chevron Arrow */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-surface-hover flex items-center justify-center border border-border-subtle shrink-0">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                  </div>

                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => toggleExpand(bid.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-text-primary">{bid.title}</h4>
                      <span className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                        statusColors[bid.status]
                      )}>
                        {bid.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-black text-emerald-400">${bid.amount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Expand Chevron Button (Always Prominent & Easy to Click on Mobile!) */}
                  <button
                    onClick={() => toggleExpand(bid.id)}
                    className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/30 shrink-0 ml-auto flex items-center justify-center"
                    title="Toggle Bid Details & Documentation"
                  >
                    {bid.expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Edit Form or Un-squashed Description */}
                {editingId === bid.id ? (
                  <div className="space-y-3 py-1">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <BidItemSelector
                          value={editTitle}
                          onChange={(val) => {
                            setEditTitle(val);
                            const matched = EXCEL_TASKS.find((t) => t.name === val);
                            if (matched && matched.description) {
                              setEditDesc(matched.description);
                            }
                          }}
                          placeholder="Search bid items..."
                        />
                      </div>
                      <div>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
                          <input
                            type="number"
                            value={editAmount}
                            readOnly
                            tabIndex={-1}
                            className={cn(
                              "w-full pl-8 pr-4 py-2 bg-surface-hover border rounded-xl text-sm font-black outline-none cursor-default",
                              autoEditAmount !== null
                                ? "border-emerald-500/30 text-emerald-400"
                                : "border-border-medium text-emerald-400"
                            )}
                          />
                        </div>
                        {autoEditAmount !== null && (
                          <p className="text-[8px] font-bold text-emerald-400/60 mt-0.5 px-1">
                            {editBidQty} × ${parseFloat(editBidPrice).toFixed(2)} = ${autoEditAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Provide justification..."
                      className="w-full px-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-secondary focus:border-emerald-500/50 focus:outline-none resize-none"
                      rows={2}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Unit</label>
                        <UnitSelector value={editBidUnit} onChange={setEditBidUnit} />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Quantity</label>
                        <input
                          type="number"
                          value={editBidQty}
                          onChange={(e) => setEditBidQty(e.target.value)}
                          min={0}
                          step={0.01}
                          placeholder="0"
                          className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-text-primary text-right outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Unit Price ($)</label>
                        <input
                          type="number"
                          value={editBidPrice}
                          onChange={(e) => setEditBidPrice(e.target.value)}
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-emerald-400 text-right outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(bid.id)} className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors">Update Bid</button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {bid.description && (
                      <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                        {bid.description}
                      </p>
                    )}
                    {(bid.unit || bid.quantity != null || bid.price != null) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {bid.unit && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                            {bid.unit}
                          </span>
                        )}
                        {bid.quantity != null && (
                          <span className="text-[9px] font-bold text-text-muted">
                            Qty: {bid.quantity}
                          </span>
                        )}
                        {bid.price != null && (
                          <span className="text-[9px] font-bold text-emerald-400">
                            ${bid.price.toFixed(2)}/{bid.unit || "ea"}
                          </span>
                        )}
                        {bid.quantity != null && bid.price != null && (
                          <span className="text-[9px] font-black text-amber-400">
                            ({bid.quantity} × ${bid.price.toFixed(2)} = ${(bid.quantity * bid.price).toFixed(2)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Row: Photo Thumbnails & Action Icons Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle/50">
                  {/* Photo Thumbnails Preview */}
                  {bid.photos && bid.photos.length > 0 ? (
                    <div 
                      className="flex items-center -space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleExpand(bid.id)}
                    >
                      {bid.photos.slice(0, 3).map((p) => (
                        <div key={p.id} className="h-8 w-8 rounded-lg border-2 border-border-subtle overflow-hidden bg-surface shadow-md">
                          <img src={p.url} className="h-full w-full object-cover" />
                        </div>
                      ))}
                      {bid.photos.length > 3 && (
                        <div className="h-8 w-8 rounded-lg border-2 border-border-subtle bg-surface-hover flex items-center justify-center text-[9px] font-black text-emerald-400 shadow-md">
                          +{bid.photos.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-dim flex items-center gap-1">
                      <Camera className="h-3 w-3" /> No photos attached
                    </span>
                  )}

                  {/* Bid Action Toolbar */}
                  <div className="flex items-center bg-surface-hover border border-border-subtle rounded-xl p-1 gap-1 ml-auto">
                    <button
                      onClick={() => downloadSingleBid(bid)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                      title="Download Bid Proposal"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleExpand(bid.id)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        bid.expanded ? "bg-emerald-500 text-white shadow-lg" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                      )}
                      title="Documentation / Photos"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-4 bg-surface-hover mx-0.5" />
                    <button
                      onClick={() => {
                        setEditingId(bid.id);
                        setEditTitle(bid.title);
                        setEditAmount(String(bid.amount));
                        setEditDesc(bid.description || "");
                      }}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-all"
                      title="Edit Bid"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {bid.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => updateStatus(bid.id, "APPROVED")}
                          className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          title="Approve Bid"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => updateStatus(bid.id, "REJECTED")}
                          className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Reject Bid"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => removeBid(bid.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete Bid"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {bid.expanded && (
                <div className="px-5 pb-5 pt-2 border-t border-border-subtle bg-surface-hover">
                  <PhotoUploadSection
                    photos={bid.photos}
                    onPhotosChange={(photos) => updateBidPhotos(bid.id, photos)}
                    onUpload={onUpload}
                    onOpenCamera={onOpenCamera ? (cat) => onOpenCamera(cat, bid.id) : undefined}
                    title={`${bid.title} Documentation`}
                    singleBucket
                    singleBucketCategory="BID"
                    showCategories={["BID"]}
                    compact
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Bid Form */}
      {showAdd ? (
        <div className="p-6 rounded-3xl border border-border-medium bg-surface/60 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-emerald-400" />
            </div>
            <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">New Estimate Proposal</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Proposal Title</label>
              <BidItemSelector
                value={newTitle}
                onChange={(val) => {
                  setNewTitle(val);
                  const matched = EXCEL_TASKS.find((t) => t.name === val);
                  if (matched && matched.description) {
                    setNewDesc(matched.description);
                  }
                }}
                placeholder="Search 900+ bid items or type custom..."
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">
                Estimated Cost ($)
                {autoNewAmount !== null && (
                  <span className="ml-2 text-emerald-400/70 normal-case tracking-normal">auto-calculated</span>
                )}
              </label>
              <input
                type="number"
                value={newAmount}
                readOnly
                tabIndex={-1}
                placeholder="0.00"
                className={cn(
                  "w-full px-4 py-3 bg-surface-hover border rounded-2xl text-sm font-black outline-none cursor-default",
                  autoNewAmount !== null
                    ? "border-emerald-500/30 text-emerald-400"
                    : "border-border-subtle text-emerald-400"
                )}
              />
              {autoNewAmount !== null && (
                <p className="text-[9px] font-bold text-emerald-400/60 mt-1 px-1">
                  {newQty} × ${parseFloat(newPrice).toFixed(2)} = ${autoNewAmount.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Unit of Measure</label>
              <UnitSelector value={newUnit} onChange={setNewUnit} placeholder="Select unit..." />
            </div>
            <div>
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Quantity</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                min={0}
                step={0.01}
                placeholder="0"
                className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary text-right focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Unit Price ($)</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                min={0}
                step={0.01}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-emerald-400 font-black text-right focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Detailed Justification</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Explain the scope of work and financial reasoning..."
              rows={3}
              className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-xs text-text-secondary focus:border-emerald-500/50 focus:outline-none resize-none shadow-inner"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addBid}
              disabled={!newTitle.trim() || !newAmount}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
            >
              Save Bid Items
            </button>
            <button onClick={() => setShowAdd(false)} className="px-6 py-3 rounded-2xl bg-surface-hover text-white text-xs font-black uppercase tracking-widest hover:bg-surface-hover">Dismiss</button>
          </div>
        </div>
      ) : (
        <div className="flex w-full gap-3">
          <button
            onClick={() => setShowAdd(true)}
            className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-hover text-text-muted hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all group shadow-inner"
          >
            <div className="h-8 w-8 rounded-xl bg-surface-hover group-hover:bg-emerald-500/10 flex items-center justify-center transition-all">
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest hidden md:inline">Create New Bid</span>
            <span className="text-sm font-black uppercase tracking-widest md:hidden">Create</span>
          </button>
          <button
            onClick={() => setShowAIBid(true)}
            className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-violet-500/20 bg-violet-500/[0.02] text-violet-500/80 hover:text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/[0.05] transition-all group shadow-inner"
          >
            <div className="h-8 w-8 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 flex items-center justify-center transition-all">
              <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest hidden md:inline">Generate via AI</span>
            <span className="text-sm font-black uppercase tracking-widest md:hidden">AI Auto-Bid</span>
          </button>
          <button
            onClick={() => setShowBidTemplates(!showBidTemplates)}
            className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-emerald-500/10 bg-emerald-500/[0.01] text-emerald-500/60 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all group"
          >
            <div className="h-8 w-8 rounded-xl bg-emerald-500/5 group-hover:bg-emerald-500/10 flex items-center justify-center transition-all">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest hidden md:inline">Bid Templates</span>
            <span className="text-sm font-black uppercase tracking-widest md:hidden">Templates</span>
          </button>
        </div>
      )}

      {/* AI Bid Prompt Form */}
      {showAIBid && (
        <div className="p-6 rounded-3xl border border-violet-500/30 bg-violet-500/[0.02] backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <h4 className="text-sm font-black text-violet-400 uppercase tracking-widest">AI Auto-Bidding</h4>
          </div>
          <div>
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Describe the work to be done</label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder='e.g. "replace 900sqft asphalt roof" or "install 2 ceiling fans"'
              rows={3}
              className="w-full px-4 py-3 bg-surface-hover border border-violet-500/30 rounded-2xl text-xs text-text-primary focus:border-violet-500/60 focus:outline-none resize-none shadow-inner"
              disabled={isGenerating}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAIBidGenerate}
              disabled={!aiPrompt.trim() || isGenerating}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate Bid Item</>
              )}
            </button>
            <button 
              onClick={() => { setShowAIBid(false); setAiPrompt(""); }} 
              disabled={isGenerating}
              className="px-6 py-3 rounded-2xl bg-surface-hover text-white text-xs font-black uppercase tracking-widest hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bid Templates Dropdown */}
      {showBidTemplates && (
        <BidTemplateSelector
          onSelect={(items) => loadBidTemplates(items)}
          onClose={() => setShowBidTemplates(false)}
        />
      )}
    </div>
  );
}

// ─── Task Inline Chat ────────────────────────────────────────────────────────

function TaskChatInline({
  task,
  onAddMessage,
  onUpdateStatus,
}: {
  task: TaskEntry;
  onAddMessage: (content: string, authorName: string, authorId: string, authorImage?: string) => void;
  onUpdateStatus: (status: TaskEntry["status"], note?: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = task.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    // Use session info if available, otherwise generic
    onAddMessage(msg.trim(), "You", "current-user");
    setMsg("");
  }

  const statusActions = [
    { label: "Accept", status: "IN_PROGRESS" as const, color: "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" },
    { label: "Complete", status: "COMPLETED" as const, color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" },
    { label: "Not Needed", status: "NOT_NEEDED" as const, color: "bg-gray-500/10 text-text-secondary hover:bg-gray-500/20" },
  ];

  return (
    <div className="border-t border-border-subtle bg-surface">
      {/* Quick status actions */}
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-border-subtle">
        <span className="text-[10px] text-text-muted mr-1">Quick:</span>
        {statusActions.map((action) => (
          <button
            key={action.status}
            onClick={() => {
              if (action.status === "NOT_NEEDED") {
                const note = prompt("Reason (optional):");
                if (note !== null) onUpdateStatus(action.status, note || "Not needed");
              } else {
                onUpdateStatus(action.status);
              }
            }}
            className={cn(
              "text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
              action.color
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 ? (
          <p className="text-[11px] text-text-dim text-center py-4">
            No messages yet. Add a note or reply about this task.
          </p>
        ) : (
          messages.map((m, idx) => {
            const isOwn = m.authorId === "current-user";
            const prevMsg = messages[idx - 1];
            const nextMsg = messages[idx + 1];
            const isFirstInGroup = !prevMsg || prevMsg.authorId !== m.authorId;
            const isLastInGroup = !nextMsg || nextMsg.authorId !== m.authorId;

            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2.5",
                  isOwn && "flex-row-reverse",
                  isFirstInGroup ? "mt-4" : "mt-0.5"
                )}
              >
                <div className="w-7 flex-shrink-0">
                  {isFirstInGroup && !isOwn && (
                    <Avatar
                      name={m.authorName}
                      src={m.authorImage}
                      size="sm"
                      className="ring-1 ring-white/10"
                    />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] flex flex-col",
                    isOwn ? "items-end" : "items-start"
                  )}
                >
                  {isFirstInGroup && (
                    <div className={cn(
                      "flex items-center gap-2 mb-0.5 px-1",
                      isOwn && "flex-row-reverse"
                    )}>
                      <span className="text-[10px] font-bold text-text-secondary">
                        {isOwn ? "You" : m.authorName}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "px-3 py-1.5 text-[12px] leading-relaxed shadow-sm transition-all",
                      isOwn
                        ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                        : "bg-surface-hover text-text-primary border border-border-subtle",
                      // Grouped corners
                      isOwn 
                        ? cn(
                            "rounded-2xl rounded-tr-md",
                            !isFirstInGroup && "rounded-tr-2xl",
                            !isLastInGroup && "rounded-br-md"
                          )
                        : cn(
                            "rounded-2xl rounded-tl-md",
                            !isFirstInGroup && "rounded-tl-2xl",
                            !isLastInGroup && "rounded-bl-md"
                          )
                    )}
                  >
                    <p>{m.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-3 py-2 border-t border-border-subtle"
      >
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Reply about this task..."
          className="flex-1 px-2.5 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!msg.trim()}
          className="p-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg disabled:opacity-40"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}
