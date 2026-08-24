"use client";

import { createPortal } from "react-dom";
import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useWorkOrders, useUsers, usePropertyHistory } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button, Badge, Card, Avatar } from "@/components/ui";
import { WorkOrderImportModal } from "@/components/work-orders/import-modal";
import {
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Check,
  RefreshCw,
  Filter,
  CheckSquare,
  Square,
  Building2,
  X,
  Camera,
  History,
  Bookmark,
  Save,
  Trash2,
  Star,
  GripVertical,
  Calendar,
  UserPlus,
  MoreHorizontal,
  Upload,
  FileSpreadsheet,
  Trash,
  Users,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  Activity,
  DollarSign,
  Wrench,
  MessageSquare,
  File,
  Printer,
  Route,
  Image,
  FilePlus,
  ListTodo,
  ClipboardEdit,
  Tag,
  UserCog,
  CalendarClock,
  CalendarDays,
  MessageCircle,
  Building,
  Repeat,
  Shield,
  Receipt,
  CreditCard,
  Send,
  Phone,
} from "lucide-react";
import Link from "next/link";
import {
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  formatDateTime,
  cn,
} from "@/lib/utils";
import toast from "react-hot-toast";
import { OverdueCountdown } from "@/components/work-orders/overdue-countdown";

// ─── Status color pills ──────────────────────────────────────────────────────

const STATUS_PILL_COLORS: Record<string, string> = {
  NEW: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  ASSIGNED: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  FIELD_COMPLETE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  QC_REVIEW: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  PENDING_REVIEW: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  REVISIONS_NEEDED: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  OFFICE_COMPLETE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CLOSED: "bg-slate-500/10 text-text-secondary border-slate-500/20",
  CANCELLED: "bg-slate-700/10 text-text-muted border-border-medium/20",
};

// ─── Work Order Number Generator ─────────────────────────────────────────────

function getWorkOrderNumber(id: string, metadata?: any): string {
  try {
    if (metadata) {
      const meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
      if (meta?.externalWorkOrderId) return String(meta.externalWorkOrderId);
    }
  } catch (e) {}
  const short = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `WO-${short}`;
}

// ─── Column definitions ──────────────────────────────────────────────────────

interface ColumnDef {
  id: string;
  label: string;
  className?: string;
  headerClassName?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "checkbox", label: "", className: "w-10", headerClassName: "w-10 px-3" },
  { id: "action", label: "Action", className: "w-16", headerClassName: "w-16 px-3" },
  { id: "property", label: "Address", className: "", headerClassName: "text-left px-3" },
  { id: "wo", label: "Work Order #", className: "", headerClassName: "text-left px-3" },
  { id: "city", label: "City", className: "", headerClassName: "text-left px-3 hidden lg:table-cell" },
  { id: "client", label: "Client", className: "", headerClassName: "text-left px-3 hidden xl:table-cell" },
  { id: "contractor", label: "Contractor", className: "", headerClassName: "text-left px-3 hidden lg:table-cell" },
  { id: "due", label: "Due Date", className: "", headerClassName: "text-left px-3 hidden md:table-cell" },
  { id: "history", label: "History", className: "", headerClassName: "text-center px-3 hidden sm:table-cell" },
  { id: "photos", label: "Photos", className: "", headerClassName: "text-center px-3 hidden sm:table-cell" },
  { id: "state", label: "State", className: "", headerClassName: "text-left px-3 hidden xl:table-cell" },
  { id: "status", label: "Status", className: "", headerClassName: "text-left px-3" },
  { id: "zip", label: "Zip", className: "", headerClassName: "text-left px-3 hidden xl:table-cell" },
  { id: "ipl", label: "IPL #", className: "", headerClassName: "text-left px-3 hidden xl:table-cell" },
  { id: "workOrderType", label: "Work Type", className: "", headerClassName: "text-left px-3 hidden lg:table-cell" },
];

// ─── Multi-Select Status Dropdown ────────────────────────────────────────────

function MultiStatusSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (statuses: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(status: string) {
    onChange(selected.includes(status) ? selected.filter((s) => s !== status) : [...selected, status]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all min-w-[180px]",
          open ? "border-cyan-500/50 ring-1 ring-cyan-500/20" : "border-border-subtle hover:border-border-subtle",
          selected.length > 0 ? "bg-cyan-500/[0.06]" : "bg-surface-hover"
        )}
      >
        <Filter className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
        {selected.length === 0 ? (
          <span className="flex-1 text-left text-text-secondary">All Statuses</span>
        ) : selected.length <= 2 ? (
          <span className="flex-1 text-left text-text-primary truncate">{selected.map((s) => STATUS_LABELS[s]).join(", ")}</span>
        ) : (
          <span className="flex-1 text-left text-cyan-600 font-bold">{selected.length} selected</span>
        )}
        {selected.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onChange([]); }} className="p-0.5 rounded hover:bg-surface-hover text-text-muted">
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
            <button onClick={() => onChange(Object.keys(STATUS_LABELS))} className="text-[11px] text-cyan-600 hover:text-cyan-700 font-bold">Select all</button>
            <button onClick={() => onChange([])} className="text-[11px] text-text-muted hover:text-text-secondary font-medium">Clear</button>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggle(value)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  selected.includes(value) ? "bg-cyan-500/[0.06] text-text-primary" : "text-text-secondary hover:bg-surface-hover"
                )}
              >
                <div className={cn("h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-all", selected.includes(value) ? "bg-cyan-500 border-cyan-500" : "border-border-subtle")}>
                  {selected.includes(value) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={cn("h-2 w-2 rounded-full flex-shrink-0", STATUS_PILL_COLORS[value]?.split(" ")[0] || "bg-gray-500")} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Actions Dropdown ───────────────────────────────────────────────────

function BulkActionsDropdown({
  selectedCount,
  selectedIds,
  onRefresh,
  workOrders,
  onExport,
  onPrintSelected,
}: {
  selectedCount: number;
  selectedIds: string[];
  onRefresh: () => void;
  workOrders: any[];
  onExport: (ids: string[]) => void;
  onPrintSelected: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Modal states
  const [modal, setModal] = useState<string | null>(null);
  const [modalValue, setModalValue] = useState("");
  const [bulkContractorId, setBulkContractorId] = useState("");
  const [bulkCoordinatorId, setBulkCoordinatorId] = useState("");
  const [bulkProcessorId, setBulkProcessorId] = useState("");

  const { data: usersData } = useUsers();
  const contractors = (usersData || []).filter((u: any) => u.role === "CONTRACTOR");
  const coordinators = (usersData || []).filter((u: any) => u.role === "COORDINATOR");
  const processors = (usersData || []).filter((u: any) => u.role === "PROCESSOR");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSubmenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function closeAll() {
    setOpen(false);
    setSubmenu(null);
  }

  async function apiBulkUpdate(action: string, data?: any) {
    try {
      const res = await fetch("/api/work-orders/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selectedIds, action, data }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || `Server error: ${res.status}`);
      }
      toast.success(`Updated ${result.updated} work order${result.updated !== 1 ? "s" : ""}`);
      onRefresh();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Action failed");
      return false;
    }
  }

  async function apiBulkAssign(assigneeId: string, field: string) {
    try {
      const res = await fetch("/api/work-orders/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selectedIds, contractorId: assigneeId }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(`Assigned ${data.updated} work orders`);
      onRefresh();
      return true;
    } catch {
      toast.error("Assignment failed");
      return false;
    }
  }

  async function apiBulkDelete() {
    try {
      const res = await fetch("/api/work-orders/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selectedIds }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} work orders`);
      onRefresh();
      return true;
    } catch {
      toast.error("Delete failed");
      return false;
    }
  }

  async function apiBulkInvoice(action: string) {
    try {
      const res = await fetch("/api/work-orders/bulk-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selectedIds, action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      const result = await res.json();
      toast.success(`Updated ${result.updated} invoice(s)`);
      onRefresh();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Invoice action failed");
      return false;
    }
  }

  async function apiBulkMessage(message: string) {
    try {
      const res = await fetch("/api/work-orders/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selectedIds, action: "send-message", data: { message } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      const result = await res.json();
      toast.success(`Message sent for ${result.updated} work order(s)`);
      onRefresh();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Message send failed");
      return false;
    }
  }

  function handleExport() {
    onExport(selectedIds);
    closeAll();
  }

  function handlePrint() {
    onPrintSelected(selectedIds);
    closeAll();
  }

  // Submenu item component
  function SubItem({ icon: Icon, iconColor, label, desc, onClick }: any) {
    return (
      <button
        onClick={() => { onClick(); closeAll(); }}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors"
      >
        <Icon className={cn("h-4 w-4", iconColor || "text-text-muted")} />
        <div className="text-left">
          <p className="font-medium text-xs">{label}</p>
          {desc && <p className="text-[10px] text-text-muted">{desc}</p>}
        </div>
      </button>
    );
  }

  // Section label
  function SectionLabel({ children }: { children: React.ReactNode }) {
    return <div className="px-3 pt-2 pb-1 text-[9px] font-bold text-text-dim uppercase tracking-widest">{children}</div>;
  }

  // Divider
  function Divider() {
    return <div className="border-t border-border-subtle my-1" />;
  }

  return (
    <>
      <div ref={ref} className="relative">
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          <MoreHorizontal className="h-3.5 w-3.5" />
          Bulk Actions
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </Button>
        {open && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-50 max-h-[70vh] overflow-y-auto">
            <div className="px-3 py-2 border-b border-border-subtle rounded-t-xl sticky top-0 bg-surface z-10">
              <p className="text-xs font-medium text-text-secondary">{selectedCount} work orders selected</p>
            </div>

            {/* ── Assignments ── */}
            <SectionLabel>Assignments</SectionLabel>
            <SubItem icon={UserPlus} iconColor="text-cyan-600" label="Assign Contractor" desc="Bulk assign to contractor" onClick={() => { setModal("assign-contractor"); setBulkContractorId(""); }} />
            <SubItem icon={Users} iconColor="text-blue-500" label="Assign Coordinator" desc="Set coordinator for selected" onClick={() => { setModal("assign-coordinator"); setBulkCoordinatorId(""); }} />
            <SubItem icon={UserCog} iconColor="text-indigo-500" label="Assign Processor" desc="Set processor for selected" onClick={() => { setModal("assign-processor"); setBulkProcessorId(""); }} />

            <Divider />

            {/* ── Changes ── */}
            <SectionLabel>Changes</SectionLabel>
            {/* Status submenu */}
            <div className="relative">
              <button onClick={() => setSubmenu(submenu === "status" ? null : "status")} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                <ArrowUpDown className="h-4 w-4 text-violet-500" />
                <div className="text-left flex-1"><p className="font-medium text-xs">Change Status</p></div>
                <ChevronRight className="h-3 w-3 text-text-muted" />
              </button>
              {submenu === "status" && (
                <div className="absolute left-full top-0 ml-1 w-52 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-[60] py-1 max-h-64 overflow-y-auto">
                  {Object.entries(STATUS_LABELS).filter(([val]) => val !== "ASSETS").map(([val, label]) => (
                    <button key={val} onClick={async () => { const ok = await apiBulkUpdate("change-status", { status: val }); if (ok) closeAll(); }}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-hover transition-colors", STATUS_PILL_COLORS[val] || "text-text-secondary")}>
                      <span className={cn("h-2 w-2 rounded-full", STATUS_PILL_COLORS[val]?.split(" ")[0] || "bg-gray-500")} />
                      <span className="text-text-primary">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Work Type submenu */}
            <div className="relative">
              <button onClick={() => setSubmenu(submenu === "type" ? null : "type")} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors">
                <Wrench className="h-4 w-4 text-amber-500" />
                <div className="text-left flex-1"><p className="font-medium text-xs">Change Work Type</p></div>
                <ChevronRight className="h-3 w-3 text-text-muted" />
              </button>
              {submenu === "type" && (
                <div className="absolute left-full top-0 ml-1 w-52 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-[60] py-1 max-h-64 overflow-y-auto">
                  {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                    <button key={val} onClick={async () => { const ok = await apiBulkUpdate("change-service-type", { serviceType: val }); if (ok) closeAll(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-hover transition-colors text-text-primary">
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <SubItem icon={Calendar} iconColor="text-amber-500" label="Change Due Date" desc="Set due date for selected" onClick={() => { setModal("due-date"); setModalValue(""); }} />
            <SubItem icon={CalendarDays} iconColor="text-emerald-500" label="Change Start Date" desc="Set start date" onClick={() => { setModal("start-date"); setModalValue(""); }} />
            <SubItem icon={CalendarClock} iconColor="text-teal-500" label="Change Estimated Date" desc="Set estimated completion" onClick={() => { setModal("estimated-date"); setModalValue(""); }} />
            <SubItem icon={ClipboardEdit} iconColor="text-blue-400" label="Modify Comments" desc="Update description" onClick={() => { setModal("comments"); setModalValue(""); }} />
            <SubItem icon={Tag} iconColor="text-orange-500" label="Set Category" desc="Change service category" onClick={() => { setModal("category"); setModalValue(""); }} />
            <SubItem icon={Star} iconColor="text-yellow-500" label="Change Priority" desc="Set priority level" onClick={() => { setModal("priority"); setModalValue("0"); }} />

            <Divider />

            {/* ── Cancel / Delete ── */}
            <SectionLabel>Danger Zone</SectionLabel>
            <SubItem icon={X} iconColor="text-orange-500" label="Cancel Work Order" desc="Mark as cancelled" onClick={() => setModal("cancel")} />
            <SubItem icon={Trash} iconColor="text-rose-500" label="Delete Work Order" desc="Permanently remove" onClick={() => setModal("delete")} />

            <Divider />

            {/* ── Invoice ── */}
            <SectionLabel>Invoice</SectionLabel>
            <SubItem icon={Receipt} iconColor="text-emerald-500" label="Mark Client Invoice Paid" desc="Record client payment" onClick={async () => { await apiBulkInvoice("mark-client-invoice-paid"); }} />
            <SubItem icon={CreditCard} iconColor="text-blue-500" label="Mark Contractor Invoice Paid" desc="Record contractor payment" onClick={async () => { await apiBulkInvoice("mark-contractor-invoice-paid"); }} />
            <SubItem icon={FileText} iconColor="text-amber-500" label="Write off Invoice" desc="Write off outstanding balance" onClick={async () => { await apiBulkInvoice("write-off-invoice"); }} />

            <Divider />

            {/* ── Message ── */}
            <SectionLabel>Message</SectionLabel>
            <SubItem icon={Send} iconColor="text-cyan-500" label="Send Message" desc="Bulk message to assigned users" onClick={() => { setModal("message"); setModalValue(""); }} />

            <Divider />

            {/* ── Print ── */}
            <SectionLabel>Print</SectionLabel>
            <SubItem icon={Printer} iconColor="text-text-muted" label="Print" desc="Print selected work orders" onClick={handlePrint} />
            <SubItem icon={Printer} iconColor="text-blue-400" label="Print WO Instructions" desc="Print instructions sheet" onClick={() => { onPrintSelected(selectedIds); closeAll(); }} />
            <SubItem icon={Printer} iconColor="text-emerald-400" label="Print Client Invoice" desc="Print client invoices" onClick={() => { onPrintSelected(selectedIds); closeAll(); }} />

            <Divider />

            {/* ── Other ── */}
            <SectionLabel>Other</SectionLabel>
            <SubItem icon={FileSpreadsheet} iconColor="text-emerald-400" label="Export to Excel" desc="Download as CSV/Excel" onClick={handleExport} />
            <SubItem icon={Image} iconColor="text-purple-500" label="Download Photos" desc="Download all photos as ZIP" onClick={async () => {
              try {
                const res = await fetch("/api/work-orders/bulk-update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workOrderIds: selectedIds, action: "download-photos" }),
                });
                if (!res.ok) throw new Error("Failed");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `work-order-photos-${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Photos downloaded");
              } catch {
                toast.error("Photo download failed");
              }
              closeAll();
            }} />
            <SubItem icon={FilePlus} iconColor="text-blue-400" label="Attach Document" desc="Add document to selected" onClick={() => { setModal("attach-document"); }} />
            <SubItem icon={Route} iconColor="text-cyan-500" label="Route" desc="Optimize route for selected" onClick={() => {
              // Build Google Maps directions URL from selected work orders' addresses
              const addresses = selectedIds
                .map((id) => workOrders.find((wo: any) => wo.id === id))
                .filter(Boolean)
                .map((wo: any) => wo.address || wo.property?.address)
                .filter(Boolean);
              if (addresses.length < 2) {
                toast.error("Need at least 2 addresses for routing");
              } else {
                const origin = encodeURIComponent(addresses[0]);
                const destination = encodeURIComponent(addresses[addresses.length - 1]);
                const waypoints = addresses.slice(1, -1).map((a: string) => encodeURIComponent(a)).join("|");
                let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
                if (waypoints) url += `&waypoints=${waypoints}`;
                window.open(url, "_blank");
                toast.success("Route opened in Google Maps");
              }
              closeAll();
            }} />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {/* Assign Contractor */}
      {modal === "assign-contractor" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Assign Contractor</h3>
            <p className="text-sm text-text-muted mb-4">Assign {selectedCount} work orders</p>
            <select value={bulkContractorId} onChange={(e) => setBulkContractorId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4">
              <option value="">Select contractor...</option>
              {contractors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" disabled={!bulkContractorId} onClick={async () => { await apiBulkUpdate("assign-contractor", { contractorId: bulkContractorId }); setModal(null); }}>
                <UserPlus className="h-3.5 w-3.5" /> Assign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Coordinator */}
      {modal === "assign-coordinator" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Assign Coordinator</h3>
            <p className="text-sm text-text-muted mb-4">Set coordinator for {selectedCount} work orders</p>
            <select value={bulkCoordinatorId} onChange={(e) => setBulkCoordinatorId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4">
              <option value="">Select coordinator...</option>
              {coordinators.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" disabled={!bulkCoordinatorId} onClick={async () => { await apiBulkUpdate("assign-coordinator", { coordinatorId: bulkCoordinatorId }); setModal(null); }}>
                <Users className="h-3.5 w-3.5" /> Assign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Processor */}
      {modal === "assign-processor" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Assign Processor</h3>
            <p className="text-sm text-text-muted mb-4">Set processor for {selectedCount} work orders</p>
            <select value={bulkProcessorId} onChange={(e) => setBulkProcessorId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4">
              <option value="">Select processor...</option>
              {processors.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" disabled={!bulkProcessorId} onClick={async () => { await apiBulkUpdate("assign-processor", { processorId: bulkProcessorId }); setModal(null); }}>
                <UserCog className="h-3.5 w-3.5" /> Assign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Date modals */}
      {(modal === "due-date" || modal === "start-date" || modal === "estimated-date") && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              {modal === "due-date" ? "Change Due Date" : modal === "start-date" ? "Change Start Date" : "Change Estimated Date"}
            </h3>
            <p className="text-sm text-text-muted mb-4">Set for {selectedCount} work orders</p>
            <input type="date" value={modalValue} onChange={(e) => setModalValue(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" disabled={!modalValue} onClick={async () => {
                const action = modal === "due-date" ? "change-due-date" : modal === "start-date" ? "change-start-date" : "change-estimated-date";
                const field = modal === "due-date" ? "dueDate" : modal === "start-date" ? "startDate" : "estimatedDate";
                await apiBulkUpdate(action, { [field]: modalValue });
                setModal(null);
              }}>
                <Calendar className="h-3.5 w-3.5" /> Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments modal */}
      {modal === "comments" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Modify Comments</h3>
            <p className="text-sm text-text-muted mb-4">Update description for {selectedCount} work orders</p>
            <textarea value={modalValue} onChange={(e) => setModalValue(e.target.value)} rows={4} placeholder="Enter comments..."
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4 resize-none" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" onClick={async () => { await apiBulkUpdate("modify-comments", { description: modalValue }); setModal(null); }}>
                <ClipboardEdit className="h-3.5 w-3.5" /> Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category modal */}
      {modal === "category" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Set Category</h3>
            <p className="text-sm text-text-muted mb-4">Change category for {selectedCount} work orders</p>
            <select value={modalValue} onChange={(e) => setModalValue(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4">
              <option value="">Select category...</option>
              {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" disabled={!modalValue} onClick={async () => { await apiBulkUpdate("set-category", { serviceType: modalValue }); setModal(null); }}>
                <Tag className="h-3.5 w-3.5" /> Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Priority modal */}
      {modal === "priority" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Change Priority</h3>
            <p className="text-sm text-text-muted mb-4">Set priority for {selectedCount} work orders</p>
            <select value={modalValue} onChange={(e) => setModalValue(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4">
              <option value="0">Low (0)</option>
              <option value="1">Medium (1)</option>
              <option value="2">High (2)</option>
              <option value="3">Urgent (3)</option>
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" onClick={async () => { await apiBulkUpdate("change-priority", { priority: parseInt(modalValue) }); setModal(null); }}>
                <Star className="h-3.5 w-3.5" /> Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {modal === "cancel" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-orange-500/20 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-orange-400 mb-1">Cancel Work Orders</h3>
            <p className="text-sm text-text-secondary mb-4">Are you sure you want to cancel {selectedCount} work order{selectedCount !== 1 ? "s" : ""}?</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>No, Keep</Button>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={async () => { await apiBulkUpdate("cancel"); setModal(null); }}>
                <X className="h-3.5 w-3.5" /> Cancel {selectedCount} Order{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {modal === "delete" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-red-500/20 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-red-400 mb-1">Delete Work Orders</h3>
            <p className="text-sm text-text-secondary mb-4">Are you sure you want to delete {selectedCount} work order{selectedCount !== 1 ? "s" : ""}? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={async () => { await apiBulkDelete(); setModal(null); }}>
                <Trash className="h-3.5 w-3.5" /> Delete {selectedCount} Order{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Message modal */}
      {modal === "message" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Send Message</h3>
            <p className="text-sm text-text-muted mb-4">Send to all assigned users for {selectedCount} work orders</p>
            <textarea value={modalValue} onChange={(e) => setModalValue(e.target.value)} rows={4} placeholder="Type your message..."
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4 resize-none" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" disabled={!modalValue.trim()} onClick={async () => { await apiBulkMessage(modalValue); setModal(null); }}>
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Attach Document modal */}
      {modal === "attach-document" && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Attach Document</h3>
            <p className="text-sm text-text-muted mb-4">Attach a document to {selectedCount} work orders</p>
            <input
              type="file"
              id="bulk-attach-file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append("file", file);
                formData.append("workOrderIds", JSON.stringify(selectedIds));
                try {
                  const res = await fetch("/api/upload", { method: "POST", body: formData });
                  if (!res.ok) throw new Error("Upload failed");
                  toast.success(`Document attached to ${selectedCount} work orders`);
                } catch {
                  toast.error("Document attach failed");
                }
                setModal(null);
              }}
            />
            <label htmlFor="bulk-attach-file"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-subtle rounded-xl cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/[0.03] transition-all">
              <FilePlus className="h-8 w-8 text-text-dim mb-2" />
              <span className="text-sm text-text-secondary">Click to select a file</span>
              <span className="text-[11px] text-text-muted mt-1">PDF, images, documents</span>
            </label>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Draggable Column Header ─────────────────────────────────────────────────

function DraggableColumnHeader({
  column,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  children,
}: {
  column: ColumnDef;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  children: React.ReactNode;
}) {
  return (
    <th
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, index);
      }}
      onDrop={() => onDrop(index)}
      className={cn(
        "text-[11px] font-semibold text-text-muted uppercase tracking-wider py-3 cursor-grab active:cursor-grabbing select-none group",
        column.headerClassName
      )}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        {children}
      </div>
    </th>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function WorkOrdersContent() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const role = ((session?.user as any)?.role || "").toUpperCase();
  const canCreateWorkOrders = [
    "ADMIN",
    "COORDINATOR",
    "INCHARGE_COORDINATOR",
    "PROCESSOR",
    "PROCESSOR_INCHARGE",
    "CLIENT",
    "CLIENT_MANAGER",
    "INCHARGE_CLIENT_MANAGER",
  ].includes(role);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    // Initialize from URL search params (e.g. ?status=IN_PROGRESS or ?status=NEW,ASSIGNED)
    const urlStatus = searchParams.get("status");
    if (urlStatus) {
      return urlStatus.split(",").filter((s) => s in STATUS_LABELS);
    }
    return [];
  });
  const [serviceFilter, setServiceFilter] = useState(() => {
    return searchParams.get("serviceType") || "";
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [showSavedMenu, setShowSavedMenu] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);

  // Filter columns for contractors (remove checkbox)
  const visibleColumns = role === "CONTRACTOR"
    ? columns.filter((col) => col.id !== "checkbox")
    : columns;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, serviceFilter]);

  // History popup state
  const [historyPopup, setHistoryPopup] = useState<{ open: boolean; workOrder: any }>({ open: false, workOrder: null });

  const { data, isLoading, isError, error, refetch } = useWorkOrders(
    {
      search: search || undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      serviceType: serviceFilter || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
    },
    { enabled: sessionStatus === "authenticated" }
  );
  const { data: usersData } = useUsers();
  const contractors = (usersData || []).filter((u: any) => u.role === "CONTRACTOR");

  const workOrders = data?.workOrders || [];
  const isInitialLoading = sessionStatus === "loading" || isLoading;

  useEffect(() => {
    if (data?.totalPages && currentPage > data.totalPages) {
      setCurrentPage(data.totalPages);
    }
  }, [currentPage, data?.totalPages]);

  // Compute work order count per property (by propertyId or address)
  const propertyWOCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const wo of workOrders) {
      const key = wo.propertyId || wo.address || "";
      if (key) map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [workOrders]);

  function getPropertyWOCount(wo: any): number {
    const key = wo.propertyId || wo.address || "";
    return key ? (propertyWOCountMap[key] || 1) : 1;
  }

  // Column drag handlers
  const handleColumnDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
  }, []);

  const handleColumnDrop = useCallback((dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    setColumns((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    setDragIndex(null);
  }, [dragIndex]);

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selected.length === workOrders.length) {
      setSelected([]);
    } else {
      setSelected(workOrders.map((wo: any) => wo.id));
    }
  }

  const activeFilterCount = statusFilter.length + (serviceFilter ? 1 : 0) + (search ? 1 : 0);

  // Render cell content by column id
  function renderCell(columnId: string, wo: any) {
    const propertyImage = wo.files?.find((f: any) => f.mimeType?.startsWith("image/"))?.path;

    switch (columnId) {
      case "action": return (
    <div className="flex gap-1">
      <Link href={`/dashboard/work-orders/${wo.id}`} className="text-blue-500 hover:bg-blue-500/10 p-1 rounded transition-colors"><Eye className="h-4 w-4" /></Link>
      <button className="text-green-500 hover:bg-green-500/10 p-1 rounded transition-colors"><FileText className="h-4 w-4" /></button>
    </div>
  );
      case "city": return <span className="text-xs text-text-secondary">{wo.city || wo.property?.city || "—"}</span>;
      case "state": return <span className="text-xs text-text-secondary">{wo.state || wo.property?.state || "—"}</span>;
      case "zip": return <span className="text-xs text-text-secondary">{wo.zipCode || wo.property?.zipCode || "—"}</span>;
      case "ipl": return <span className="text-xs text-text-secondary">{wo.id.slice(0, 8)}</span>;
      case "checkbox":
        return (
          <button onClick={() => toggleSelect(wo.id)}>
            {selected.includes(wo.id) ? (
              <CheckSquare className="h-4 w-4 text-cyan-600" />
            ) : (
              <Square className="h-4 w-4 text-text-dim" />
            )}
          </button>
        );
      case "wo":
        return (
          <Link href={`/dashboard/work-orders/${wo.id}`} className="group">
            <span className="text-xs font-mono font-bold text-cyan-600 group-hover:text-cyan-700 transition-colors">
              {getWorkOrderNumber(wo.id, wo.metadata)}
            </span>
          </Link>
        );
      case "property":
        return (
          <Link href={`/dashboard/work-orders/${wo.id}`} className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-lg overflow-hidden bg-surface-hover border border-border-subtle flex-shrink-0">
              {propertyImage ? (
                <img src={propertyImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-text-dim" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate group-hover:text-cyan-600 transition-colors max-w-[200px]">
                {wo.title}
              </p>
              <p className="text-[11px] text-text-muted truncate max-w-[200px]">
                {wo.address || wo.property?.address}
              </p>
            </div>
          </Link>
        );
      case "workOrderType":
        return (
          <span className="text-xs text-text-secondary">
            {SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType?.replace(/_/g, " ") || "—"}
          </span>
        );
      case "location":
        return (
          <div className="text-xs text-text-secondary">
            {wo.city || wo.property?.city ? <span>{wo.city || wo.property?.city}</span> : null}
            {(wo.city || wo.property?.city) && (wo.state || wo.property?.state) ? <span>, </span> : null}
            {wo.state || wo.property?.state ? <span>{wo.state || wo.property?.state}</span> : null}
            {wo.zipCode || wo.property?.zipCode ? <span className="ml-1 text-text-muted">{wo.zipCode || wo.property?.zipCode}</span> : null}
            {!wo.city && !wo.state && !wo.zipCode && !wo.property?.city && !wo.property?.state && !wo.property?.zipCode && <span className="text-text-dim">—</span>}
          </div>
        );
      case "status": {
        const canEditStatus = ["ADMIN", "SUPER_ADMIN", "COORDINATOR", "INCHARGE_COORDINATOR", "PROCESSOR", "PROCESSOR_INCHARGE"].includes(role);
        return canEditStatus ? (
          <select
            value={wo.status}
            onClick={(e) => e.stopPropagation()}
            onChange={async (e) => {
              const nextStatus = e.target.value;
              try {
                const res = await fetch(`/api/work-orders/${wo.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: nextStatus }),
                });
                if (res.ok) {
                  toast.success(`Status updated to ${STATUS_LABELS[nextStatus] || nextStatus}`);
                  refetch();
                } else {
                  toast.error("Failed to update status");
                }
              } catch {
                toast.error("Failed to update status");
              }
            }}
            className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-md border cursor-pointer focus:outline-none", STATUS_PILL_COLORS[wo.status] || "bg-gray-500/10 text-text-secondary border-gray-500/20")}
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val} className="bg-slate-900 text-white text-xs">
                {label}
              </option>
            ))}
          </select>
        ) : (
          <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md border", STATUS_PILL_COLORS[wo.status] || "bg-gray-500/10 text-text-secondary border-gray-500/20")}>
            {STATUS_LABELS[wo.status] || wo.status}
          </span>
        );
      }
      case "contractor": {
        // Count messages/threads for this work order
        const messageCount = wo._count?.threads || 0;
        return wo.contractor ? (
          <div className="flex items-center gap-1.5 relative">
            <div className="relative">
              <Avatar src={wo.contractor.image} name={wo.contractor.name} size="xs" />
              {messageCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center text-[9px] font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-full border border-border-subtle shadow-sm">
                  {messageCount > 9 ? "9+" : messageCount}
                </span>
              )}
            </div>
            <span className="text-xs text-text-secondary truncate max-w-[120px]">
              {wo.contractor.name}
            </span>
            {messageCount > 0 && (
              <Link
                href={`/dashboard/work-orders/${wo.id}`}
                className="ml-1 p-0.5 rounded hover:bg-surface-hover text-text-muted hover:text-cyan-600 transition-colors"
                title={`${messageCount} message${messageCount !== 1 ? "s" : ""} — click to view`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          <span className="text-xs text-text-dim italic">Unassigned</span>
        );
      }
      case "client":
        return wo.createdBy ? (
          <span className="text-xs text-text-secondary truncate max-w-[100px] block">{wo.createdBy.name}</span>
        ) : (
          <span className="text-xs text-text-dim">—</span>
        );
      case "due":
        return wo.dueDate ? (
          <div className="flex flex-col gap-1">
            <span className={cn("text-xs", new Date(wo.dueDate) < new Date() && wo.status !== "CLOSED" && wo.status !== "OFFICE_COMPLETE" ? "text-rose-500 font-bold" : "text-text-secondary")}>
              {formatDate(wo.dueDate)}
            </span>
            <OverdueCountdown dueDate={wo.dueDate} status={wo.status} size="sm" />
          </div>
        ) : (
          <span className="text-xs text-text-dim">—</span>
        );
      case "photos":
        return (
          <span className={cn("inline-flex items-center gap-1 text-xs", (wo._count?.files || 0) > 0 ? "text-text-secondary" : "text-text-dim")}>
            <Camera className="h-3 w-3" />
            {wo._count?.files || 0}
          </span>
        );
      case "history":
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setHistoryPopup({ open: true, workOrder: wo });
            }}
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-cyan-600 cursor-pointer"
            title="View property history"
          >
            <History className="h-3 w-3" />
            {getPropertyWOCount(wo)}
          </button>
        );
      case "arrow":
        return (
          <Link href={`/dashboard/work-orders/${wo.id}`}>
            <ChevronRight className="h-4 w-4 text-text-dim hover:text-text-secondary transition-colors" />
          </Link>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Work Orders</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-surface-hover rounded-md text-[10px] font-bold text-text-muted uppercase tracking-widest border border-border-subtle">Inventory Management</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <p className="text-text-secondary text-sm font-medium">{data?.total || 0} active records</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/work-orders/finder">
            <Button variant="outline" size="sm" className="hover:bg-surface-hover">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Finders
            </Button>
          </Link>
          <Link href="/dashboard/work-orders/by-property">
            <Button variant="outline" size="sm" className="hover:bg-surface-hover">
              <Building2 className="h-4 w-4 mr-2" />
              Property Groups
            </Button>
          </Link>
          {canCreateWorkOrders && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Link href="/dashboard/work-orders/new">
                <Button size="sm" variant="primary" className="shadow-cyan-500/20">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  New Work Order
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card variant="glass" padding={false} className="overflow-visible">
        <div className="p-4 flex flex-col xl:flex-row items-center gap-4">
          <div className="w-full xl:flex-1">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-cyan-500 transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Search by ID, address, client, or contractor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <MultiStatusSelect selected={statusFilter} onChange={setStatusFilter} />
            
            <div className="relative min-w-[160px]">
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-secondary focus:border-cyan-500/50 focus:outline-none transition-all appearance-none cursor-pointer hover:bg-surface-hover"
              >
                <option value="" className="bg-surface-hover">All Service Types</option>
                {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val} className="bg-surface-hover">{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            </div>

            {/* Saved Filters dropdown */}
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowSavedMenu(!showSavedMenu)}>
                <Bookmark className="h-3.5 w-3.5" />
                Saved
              </Button>
              {showSavedMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSavedMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-72 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-20 overflow-hidden">
                    <div className="p-3 border-b border-border-subtle">
                      {showSaveFilter ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={saveFilterName}
                            onChange={(e) => setSaveFilterName(e.target.value)}
                            placeholder="Filter name..."
                            className="flex-1 px-2.5 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && saveFilterName.trim()) {
                                const newFilter = { id: `filter-${Date.now()}`, name: saveFilterName.trim(), search, statuses: [...statusFilter], serviceType: serviceFilter, createdAt: new Date().toISOString() };
                                setSavedFilters((prev) => [...prev, newFilter]);
                                setSaveFilterName("");
                                setShowSaveFilter(false);
                                toast.success(`Filter "${newFilter.name}" saved`);
                              }
                              if (e.key === "Escape") setShowSaveFilter(false);
                            }}
                          />
                          <button onClick={() => setShowSaveFilter(false)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowSaveFilter(true)}
                          disabled={activeFilterCount === 0}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/[0.06] transition-colors disabled:opacity-40 disabled:cursor-default"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save current filters
                        </button>
                      )}
                    </div>
                    {savedFilters.length === 0 ? (
                      <div className="p-4 text-center">
                        <Bookmark className="h-8 w-8 text-text-dim mx-auto mb-2" />
                        <p className="text-xs text-text-muted">No saved filters</p>
                      </div>
                    ) : (
                      <div className="py-1 max-h-64 overflow-y-auto">
                        {savedFilters.map((filter) => (
                          <div key={filter.id} className="flex items-center gap-2 px-3 py-2 hover:bg-surface-hover group transition-colors">
                            <button
                              onClick={() => { setSearch(filter.search); setStatusFilter(filter.statuses); setServiceFilter(filter.serviceType); setShowSavedMenu(false); toast.success(`Loaded "${filter.name}"`); }}
                              className="flex-1 text-left min-w-0"
                            >
                              <p className="text-sm text-text-primary font-medium truncate">{filter.name}</p>
                            </button>
                            <button
                              onClick={() => { const updated = savedFilters.filter((f) => f.id !== filter.id); setSavedFilters(updated); toast.success(`Deleted "${filter.name}"`); }}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[11px] text-text-muted">Filters:</span>
              {statusFilter.map((s) => (
                <span key={s} className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg border", STATUS_PILL_COLORS[s] || "bg-gray-500/10 text-text-secondary border-gray-500/20")}>
                  {STATUS_LABELS[s]}
                  <button onClick={() => setStatusFilter((prev) => prev.filter((x) => x !== s))} className="hover:text-white ml-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {serviceFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg border bg-violet-500/10 text-violet-400 border-violet-500/20">
                  {SERVICE_TYPE_LABELS[serviceFilter]}
                  <button onClick={() => setServiceFilter("")} className="hover:text-white ml-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg border bg-surface-hover text-text-secondary border-border-medium">
                  &quot;{search}&quot;
                  <button onClick={() => setSearch("")} className="hover:text-white ml-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              <button onClick={() => { setStatusFilter([]); setServiceFilter(""); setSearch(""); }} className="text-[11px] text-text-muted hover:text-text-secondary underline">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Bulk actions bar — hidden from contractors */}
        {selected.length > 0 && role !== "CONTRACTOR" && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-cyan-500/[0.06] border-b border-cyan-500/10">
            <span className="text-sm font-medium text-cyan-400">{selected.length} selected</span>
            <div className="flex-1" />
            <BulkActionsDropdown
              selectedCount={selected.length}
              selectedIds={selected}
              onRefresh={() => { setSelected([]); refetch(); }}
              workOrders={workOrders}
              onExport={(ids) => {
                const selectedWOs = ids.map((id) => workOrders.find((wo: any) => wo.id === id)).filter(Boolean);
                if (selectedWOs.length === 0) { toast.error("No work orders to export"); return; }
                const headers = ["WO #", "Title", "Address", "City", "State", "Status", "Service Type", "Contractor", "Due Date", "Priority", "Created"];
                const rows = selectedWOs.map((wo: any) => {
                  const woNum = getWorkOrderNumber(wo.id, wo.metadata);
                  return [
                    woNum,
                    `"${(wo.title || "").replace(/"/g, '""')}"`,
                    `"${(wo.address || "").replace(/"/g, '""')}"`,
                    wo.city || "",
                    wo.state || "",
                    STATUS_LABELS[wo.status] || wo.status,
                    SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType,
                    wo.contractor?.name || "Unassigned",
                    wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "",
                    String(wo.priority ?? 0),
                    new Date(wo.createdAt).toLocaleDateString(),
                  ].join(",");
                });
                const csv = [headers.join(","), ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `work-orders-export-${new Date().toISOString().split("T")[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success(`Exported ${selectedWOs.length} work orders`);
              }}
              onPrintSelected={(ids) => {
                const selectedWOs = ids.map((id) => workOrders.find((wo: any) => wo.id === id)).filter(Boolean);
                if (selectedWOs.length === 0) { toast.error("No work orders to print"); return; }
                const printWindow = window.open("", "_blank");
                if (!printWindow) { toast.error("Pop-up blocked — allow pop-ups to print"); return; }
                const html = `<!DOCTYPE html><html><head><title>Work Orders Print</title><style>
                  body{font-family:system-ui,-apple-system,sans-serif;padding:24px;color:#1a1a1a}
                  h1{font-size:20px;margin-bottom:4px}
                  .subtitle{color:#666;font-size:12px;margin-bottom:20px}
                  table{width:100%;border-collapse:collapse;font-size:11px}
                  th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
                  th{background:#f5f5f5;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:0.5px}
                  tr:nth-child(even){background:#fafafa}
                  .status{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
                  .priority-0{color:#6b7280}.priority-1{color:#d97706}.priority-2{color:#ea580c}.priority-3{color:#dc2626;font-weight:700}
                  @media print{body{padding:12px}}
                </style></head><body>
                  <h1>Work Orders — Print Report</h1>
                  <p class="subtitle">${selectedWOs.length} work order(s) • Printed ${new Date().toLocaleString()}</p>
                  <table><thead><tr><th>WO #</th><th>Title</th><th>Address</th><th>Status</th><th>Type</th><th>Contractor</th><th>Due Date</th><th>Priority</th></tr></thead><tbody>
                  ${selectedWOs.map((wo: any) => {
                    const woNum = getWorkOrderNumber(wo.id, wo.metadata);
                    return `<tr><td>${woNum}</td><td>${wo.title || ""}</td><td>${wo.address || ""}</td><td>${STATUS_LABELS[wo.status] || wo.status}</td><td>${SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType || "—"}</td><td>${wo.contractor?.name || "Unassigned"}</td><td>${wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "—"}</td><td class="priority-${wo.priority ?? 0}">${["Low","Medium","High","Urgent"][wo.priority ?? 0]}</td></tr>`;
                  }).join("")}
                  </tbody></table>
                  <script>setTimeout(()=>{window.print();},300);<\/script>
                </body></html>`;
                printWindow.document.write(html);
                printWindow.document.close();
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        )}

        {/* ─── Data Table ─────────────────────────────────────────────────── */}
        {isInitialLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-5 w-5 text-text-muted animate-spin mx-auto mb-2" />
            <p className="text-sm text-text-muted">Loading work orders...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-rose-500/60" />
            <p className="font-medium text-text-primary">Could not load work orders</p>
            <p className="text-sm text-text-muted mt-1">
              {error instanceof Error ? error.message : "Please refresh and try again."}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : workOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium text-text-primary">No work orders found</p>
            <p className="text-sm text-text-muted mt-1">
              {activeFilterCount > 0 ? "Try adjusting your filters" : "Create your first work order to get started."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {visibleColumns.map((col) => {
                      const columnIndex = columns.findIndex((column) => column.id === col.id);
                      return (
                        <DraggableColumnHeader
                          key={col.id}
                          column={col}
                          index={columnIndex}
                          onDragStart={handleColumnDragStart}
                          onDragOver={handleColumnDragOver}
                          onDrop={handleColumnDrop}
                        >
                          {col.id === "checkbox" ? (
                            <button onClick={toggleSelectAll}>
                              {selected.length === workOrders.length && workOrders.length > 0 ? (
                                <CheckSquare className="h-4 w-4 text-cyan-400" />
                              ) : (
                                <Square className="h-4 w-4 text-text-dim" />
                              )}
                            </button>
                          ) : (
                            col.label
                          )}
                        </DraggableColumnHeader>
                      );
                    })}
                  </tr>
                  <tr className="bg-surface-hover/30 border-b border-border-subtle">
                    {visibleColumns.map((col) => (
                      <th key={col.id + "-filter"} className="px-1 py-1.5 align-middle">
                        {col.id !== "checkbox" && col.id !== "arrow" && col.id !== "photos" && col.id !== "history" ? (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                              <Filter className="h-3 w-3 text-text-dim" />
                            </div>
                            <input type="text" placeholder={`${col.label}...`} className="w-full text-[10px] bg-surface border border-border-subtle rounded pl-5 pr-1.5 py-1 outline-none focus:border-cyan-500/50 text-text-primary placeholder:text-text-dim" />
                          </div>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {workOrders.map((wo: any) => (
                    <tr key={wo.id} className={cn("hover:bg-surface-hover transition-colors", selected.includes(wo.id) && "bg-cyan-500/[0.04]")}>
                      {visibleColumns.map((col) => (
                        <td key={col.id} className={cn("px-3 py-3", col.className, col.headerClassName?.includes("hidden") ? col.headerClassName.match(/hidden [a-z0-9:-]+/g)?.join(" ") : "", col.id === "checkbox" && "px-3")}>
                          {renderCell(col.id, wo)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden space-y-3">
              {workOrders.map((wo: any) => {
                const woNum = getWorkOrderNumber(wo.id, wo.metadata);
                const statusClass = STATUS_PILL_COLORS[wo.status] || "bg-gray-500/10 text-text-secondary border-gray-500/20";
                const priorityLabel = ["Low", "Medium", "High", "Urgent"][wo.priority ?? 0];
                const priorityColor = [
                  "text-green-400 bg-green-500/10 border-green-500/20",
                  "text-blue-400 bg-blue-500/10 border-blue-500/20",
                  "text-amber-400 bg-amber-500/10 border-amber-500/20",
                  "text-rose-400 bg-rose-500/10 border-rose-500/20"
                ][wo.priority ?? 0];
                
                return (
                  <Link
                    href={`/dashboard/work-orders/${wo.id}`}
                    key={wo.id}
                    className="block bg-surface-hover/40 border border-border-subtle hover:border-cyan-500/30 rounded-2xl p-4 transition-all duration-200 active:scale-[0.98] relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-cyan-400 font-mono tracking-tight">{woNum}</span>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", statusClass)}>
                        {STATUS_LABELS[wo.status] || wo.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-text-primary text-[14px] leading-snug line-clamp-1 mb-1.5">{wo.title}</h3>
                    <p className="text-[11px] text-text-muted mb-3 flex items-center gap-1.5">
                      <Building className="h-3 w-3 text-text-dim flex-shrink-0" />
                      <span className="truncate">{wo.address}</span>
                    </p>
                    <div className="flex items-center justify-between border-t border-border-subtle/50 pt-2.5 mt-2 text-xs">
                      <span className="text-[11px] text-text-muted">
                        Due: <span className="text-text-primary font-medium">{wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "—"}</span>
                      </span>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider", priorityColor)}>
                        {priorityLabel}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
                    {/* Footer with Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-surface-hover">
              <span className="text-xs text-text-muted">
                {data?.total || 0} work order{(data?.total || 0) !== 1 ? "s" : ""}
                {activeFilterCount > 0 && ` (filtered)`}
              </span>
              {data?.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="First page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <ChevronLeft className="h-3.5 w-3.5 -ml-2" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {(() => {
                    const totalPages = data.totalPages;
                    const pages: number[] = [];
                    const start = Math.max(1, currentPage - 2);
                    const end = Math.min(totalPages, currentPage + 2);
                    for (let i = start; i <= end; i++) pages.push(i);
                    return pages.map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all",
                          p === currentPage
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                            : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                        )}
                      >
                        {p}
                      </button>
                    ));
                  })()}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={currentPage === data.totalPages}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(data.totalPages)}
                    disabled={currentPage === data.totalPages}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Last page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <ChevronRight className="h-3.5 w-3.5 -ml-2" />
                  </button>
                  <span className="text-[10px] text-text-dim ml-2">
                    Page {currentPage} of {data.totalPages}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}

      {/* Property History Popup */}
      {historyPopup.open && historyPopup.workOrder && (
        <PropertyHistoryPopup
          workOrder={historyPopup.workOrder}
          onClose={() => setHistoryPopup({ open: false, workOrder: null })}
        />
      )}

      {/* Import Modal */}
      <WorkOrderImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => {
          setShowImport(false);
          refetch();
        }}
      />
    </div>
  );
}


// ─── Property History Popup (Excel-like View) ──────────────────────────────────

function PropertyHistoryPopup({
  workOrder,
  onClose,
}: {
  workOrder: any;
  onClose: () => void;
}) {
  const { data, isLoading } = usePropertyHistory(
    workOrder?.propertyId || undefined,
    workOrder?.address || undefined
  );
  
  // Navigation
  const [activeTab, setActiveTab] = useState("Past WOs");

  // Filter states for Past WOs
  const [pastFilterWO, setPastFilterWO] = useState("");
  const [pastFilterStatus, setPastFilterStatus] = useState("");
  const [pastFilterWorkType, setPastFilterWorkType] = useState("");
  const [pastFilterPics, setPastFilterPics] = useState("");
  const [pastFilterContractor, setPastFilterContractor] = useState("");
  const [pastFilterDueDate, setPastFilterDueDate] = useState("");
  const [pastFilterAddress, setPastFilterAddress] = useState("");

  // Filter states for Bid History
  const [bidFilterStatus, setBidFilterStatus] = useState("");
  const [bidFilterWO, setBidFilterWO] = useState("");
  const [bidFilterPics, setBidFilterPics] = useState("");
  const [bidFilterWorkType, setBidFilterWorkType] = useState("");
  const [bidFilterContractor, setBidFilterContractor] = useState("");
  const [bidFilterDate, setBidFilterDate] = useState("");
  const [bidFilterTask, setBidFilterTask] = useState("");
  const [bidFilterQty, setBidFilterQty] = useState("");
  const [bidFilterContractorPrice, setBidFilterContractorPrice] = useState("");
  const [bidFilterClientPrice, setBidFilterClientPrice] = useState("");
  const [bidFilterComments, setBidFilterComments] = useState("");

  // Pagination & selection for Bid History
  const [bidPage, setBidPage] = useState(1);
  const [bidPageSize, setBidPageSize] = useState(15);
  const [selectedBids, setSelectedBids] = useState<string[]>([]);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Local bid status overrides for interactive approve/reject
  const [bidStatusOverrides, setBidStatusOverrides] = useState<Record<string, string>>({});

  const [photoPopup, setPhotoPopup] = useState<{ open: boolean; photos: any[]; title: string }>({ open: false, photos: [], title: "" });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const historyWorkOrders = useMemo(() => {
    return (data?.workOrders || []).map((wo: any) => {
      let parsedMeta = wo.metadata;
      if (typeof parsedMeta === "string") {
        try { parsedMeta = JSON.parse(parsedMeta); } catch (e) { parsedMeta = {}; }
      }
      let parsedTasks = wo.tasks;
      if (typeof parsedTasks === "string") {
        try { parsedTasks = JSON.parse(parsedTasks); } catch (e) { parsedTasks = []; }
      }
      return {
        ...wo,
        metadata: parsedMeta || {},
        tasks: parsedTasks || [],
      };
    });
  }, [data]);

  // Extract all individual bids across all work orders
  const allBids = useMemo(() => {
    const list: any[] = [];
    historyWorkOrders.forEach((wo: any) => {
      const woBids = (wo.metadata?.bids as any[]) || [];
      const woNum = getWorkOrderNumber(wo.id, wo.metadata);
      const contractorName = wo.contractor?.name || wo.metadata?.contractorName || "Unassigned";
      const workType = SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType?.replace(/_/g, " ") || "—";
      const woDate = wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : (wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "—");
      const picsCount = wo.files?.length || 0;

      woBids.forEach((bid: any, index: number) => {
        const uniqueId = `${wo.id}-bid-${bid.id || index}`;
        const qty = bid.quantity || bid.qty || 1;
        const unit = bid.unit || "";
        const clientTotal = bid.amount || ((bid.price || 0) * qty) || 0;
        const clientPrice = bid.price || (clientTotal / qty) || 0;
        
        // Contractor pricing (custom or 70% standard)
        const contractorPrice = bid.contractorPrice ?? (clientPrice > 0 ? clientPrice * 0.7 : 0);
        const contractorTotal = bid.contractorTotal ?? (clientTotal > 0 ? clientTotal * 0.7 : 0);

        list.push({
          uniqueId,
          rawBid: bid,
          woId: wo.id,
          woNum,
          status: bidStatusOverrides[uniqueId] || bid.status || wo.status || "PENDING",
          picsCount: bid.photos?.length || picsCount,
          photos: (bid.photos && bid.photos.length > 0) ? bid.photos : (wo.files || []),
          workType,
          contractorName,
          date: woDate,
          task: bid.title || "Custom Item",
          qty,
          unit,
          contractorPrice,
          contractorTotal,
          clientPrice,
          clientTotal,
          comments: bid.description || bid.comments || bid.title || "—",
        });
      });
    });
    return list;
  }, [historyWorkOrders, bidStatusOverrides]);

  // Filter Past WOs
  const filteredPastWOs = useMemo(() => {
    return historyWorkOrders.filter((wo: any) => {
      const woNum = getWorkOrderNumber(wo.id, wo.metadata);
      const statusLabel = STATUS_LABELS[wo.status] || wo.status || "";
      const workType = SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType || "";
      const contractorName = wo.contractor?.name || wo.metadata?.contractorName || "Unassigned";
      const dueDate = wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : (wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : "—");
      const addr = [wo.address || "", wo.city || "", wo.state || "", wo.zipCode || ""].filter(Boolean).join(" ");
      const picsCount = String(wo.files?.length || 0);

      if (pastFilterWO && !woNum.toLowerCase().includes(pastFilterWO.toLowerCase()) && !wo.id.toLowerCase().includes(pastFilterWO.toLowerCase())) return false;
      if (pastFilterStatus && !statusLabel.toLowerCase().includes(pastFilterStatus.toLowerCase())) return false;
      if (pastFilterWorkType && !workType.toLowerCase().includes(pastFilterWorkType.toLowerCase())) return false;
      if (pastFilterPics && !picsCount.includes(pastFilterPics)) return false;
      if (pastFilterContractor && !contractorName.toLowerCase().includes(pastFilterContractor.toLowerCase())) return false;
      if (pastFilterDueDate && !dueDate.toLowerCase().includes(pastFilterDueDate.toLowerCase())) return false;
      if (pastFilterAddress && !addr.toLowerCase().includes(pastFilterAddress.toLowerCase())) return false;
      return true;
    });
  }, [historyWorkOrders, pastFilterWO, pastFilterStatus, pastFilterWorkType, pastFilterPics, pastFilterContractor, pastFilterDueDate, pastFilterAddress]);

  // Filter Bids
  const filteredBids = useMemo(() => {
    return allBids.filter((b) => {
      if (bidFilterStatus && !b.status.toLowerCase().includes(bidFilterStatus.toLowerCase())) return false;
      if (bidFilterWO && !b.woNum.toLowerCase().includes(bidFilterWO.toLowerCase())) return false;
      if (bidFilterPics && !String(b.picsCount).includes(bidFilterPics)) return false;
      if (bidFilterWorkType && !b.workType.toLowerCase().includes(bidFilterWorkType.toLowerCase())) return false;
      if (bidFilterContractor && !b.contractorName.toLowerCase().includes(bidFilterContractor.toLowerCase())) return false;
      if (bidFilterDate && !b.date.toLowerCase().includes(bidFilterDate.toLowerCase())) return false;
      if (bidFilterTask && !b.task.toLowerCase().includes(bidFilterTask.toLowerCase())) return false;
      if (bidFilterQty && !String(b.qty).includes(bidFilterQty)) return false;
      if (bidFilterContractorPrice && !b.contractorTotal.toString().includes(bidFilterContractorPrice)) return false;
      if (bidFilterClientPrice && !b.clientTotal.toString().includes(bidFilterClientPrice)) return false;
      if (bidFilterComments && !b.comments.toLowerCase().includes(bidFilterComments.toLowerCase())) return false;
      return true;
    });
  }, [
    allBids,
    bidFilterStatus,
    bidFilterWO,
    bidFilterPics,
    bidFilterWorkType,
    bidFilterContractor,
    bidFilterDate,
    bidFilterTask,
    bidFilterQty,
    bidFilterContractorPrice,
    bidFilterClientPrice,
    bidFilterComments,
  ]);

  // Paginated Bids
  const paginatedBids = useMemo(() => {
    const start = (bidPage - 1) * bidPageSize;
    return filteredBids.slice(start, start + bidPageSize);
  }, [filteredBids, bidPage, bidPageSize]);

  const totalBidPages = Math.ceil(filteredBids.length / bidPageSize) || 1;

  // Actions
  const handleCopyBid = (bid: any) => {
    const text = `${bid.task} | Qty: ${bid.qty}${bid.unit ? " " + bid.unit : ""} | Price: $${bid.clientPrice.toFixed(2)} | Total: $${bid.clientTotal.toFixed(2)} | Comments: ${bid.comments}`;
    navigator.clipboard.writeText(text);
    toast.success("Bid details copied to clipboard!");
  };

  const handleApproveBid = (uniqueId: string) => {
    setBidStatusOverrides((prev) => ({ ...prev, [uniqueId]: "APPROVED" }));
    toast.success("Bid approved successfully!");
  };

  const handleRejectBid = (uniqueId: string) => {
    setBidStatusOverrides((prev) => ({ ...prev, [uniqueId]: "REJECTED" }));
    toast.error("Bid rejected");
  };

  const toggleSelectBid = (id: string) => {
    setSelectedBids((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllBids = () => {
    if (selectedBids.length === paginatedBids.length) {
      setSelectedBids([]);
    } else {
      setSelectedBids(paginatedBids.map((b) => b.uniqueId));
    }
  };

  if (!mounted) return null;

  const TABS = [
    { id: "Past WOs", label: "Past WO's", count: historyWorkOrders.length },
    { id: "Bid History", label: "Bid History", count: allBids.length },
    { id: "Completion History", label: "Completion History" },
    { id: "Damage History", label: "Damage History" },
    { id: "Appliance History", label: "Appliance History" },
    { id: "Violation History", label: "Violation History" },
    { id: "Hazard History", label: "Hazard History" },
    { id: "Contractor Invoice History", label: "Contractor Invoice History" },
    { id: "Client Invoice History", label: "Client Invoice History" },
  ];

  return createPortal(
    <>
      <div className="fixed inset-0 z-[2147483646] flex items-start justify-center pt-[2vh]">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-[96vw] max-h-[96vh] mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-subtle flex-shrink-0 bg-surface">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <History className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  Property History
                  <span className="text-xs font-normal text-text-muted">({workOrder?.address || "Address"})</span>
                </h2>
                <p className="text-[11px] text-text-muted">
                  {historyWorkOrders.length} work order{historyWorkOrders.length !== 1 ? "s" : ""} recorded &bull; {allBids.length} total bids
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-4 bg-surface-hover/30 border-b border-border-subtle overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5",
                  activeTab === tab.id
                    ? "border-cyan-500 text-cyan-400 bg-cyan-500/[0.04]"
                    : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-hover/50"
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    activeTab === tab.id ? "bg-cyan-500/20 text-cyan-300" : "bg-surface-hover text-text-dim"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-auto bg-background/50">
            {isLoading ? (
              <div className="text-center py-20">
                <div className="h-7 w-7 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-text-muted">Loading property records...</p>
              </div>
            ) : (
              <>
                {/* ── TAB 1: PAST WORK ORDERS (MATCHING DESIGN) ── */}
                {activeTab === "Past WOs" && (
                  filteredPastWOs.length === 0 ? (
                    <div className="text-center py-16">
                      <History className="h-12 w-12 text-text-dim mx-auto mb-3" />
                      <p className="text-text-secondary font-medium">No past work orders found</p>
                    </div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-10 bg-surface">
                        {/* Filter Input Row */}
                        <tr className="border-b border-border-subtle bg-surface-hover/20">
                          <th className="p-1.5 w-16 text-center"></th>
                          <th className="p-1.5 min-w-[130px]">
                            <input
                              type="text"
                              value={pastFilterWO}
                              onChange={(e) => setPastFilterWO(e.target.value)}
                              placeholder="Work Order #..."
                              className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                            />
                          </th>
                          <th className="p-1.5 min-w-[110px]">
                            <input
                              type="text"
                              value={pastFilterStatus}
                              onChange={(e) => setPastFilterStatus(e.target.value)}
                              placeholder="Status..."
                              className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                            />
                          </th>
                          <th className="p-1.5 min-w-[140px]">
                            <input
                              type="text"
                              value={pastFilterWorkType}
                              onChange={(e) => setPastFilterWorkType(e.target.value)}
                              placeholder="Work Type..."
                              className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                            />
                          </th>
                          <th className="p-1.5 min-w-[70px]">
                            <input
                              type="text"
                              value={pastFilterPics}
                              onChange={(e) => setPastFilterPics(e.target.value)}
                              placeholder="Pics..."
                              className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                            />
                          </th>
                          <th className="p-1.5 min-w-[120px]">
                            <input
                              type="text"
                              value={pastFilterContractor}
                              onChange={(e) => setPastFilterContractor(e.target.value)}
                              placeholder="Contractor..."
                              className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                            />
                          </th>
                          <th className="p-1.5 min-w-[100px]">
                            <input
                              type="text"
                              value={pastFilterDueDate}
                              onChange={(e) => setPastFilterDueDate(e.target.value)}
                              placeholder="Due Date..."
                              className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                            />
                          </th>
                          <th className="p-1.5 min-w-[220px]">
                            <input
                              type="text"
                              value={pastFilterAddress}
                              onChange={(e) => setPastFilterAddress(e.target.value)}
                              placeholder="Address..."
                              className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                            />
                          </th>
                        </tr>

                        {/* Column Titles */}
                        <tr className="bg-surface-hover/60 border-b border-border-medium">
                          <th className="px-3 py-2.5 w-16 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Action</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Work Order</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Work Type</th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Pics</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Contractor</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Due Date</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle text-xs">
                        {filteredPastWOs.map((wo: any) => {
                          const woNum = getWorkOrderNumber(wo.id, wo.metadata);
                          const fullAddress = [wo.address || "", wo.city || "", wo.state || "", wo.zipCode || ""].filter(Boolean).join(" ");
                          const files = wo.files || [];
                          const contractorName = wo.contractor?.name || wo.metadata?.contractorName || "Unassigned";
                          const isCurrent = wo.id === workOrder?.id;
                          const dueDateStr = wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : (wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : "—");

                          return (
                            <tr key={wo.id} className={cn("hover:bg-surface-hover transition-colors", isCurrent && "bg-cyan-500/[0.04] border-l-2 border-l-cyan-500")}>
                              {/* Action */}
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Link
                                    href={`/dashboard/work-orders/${wo.id}`}
                                    onClick={onClose}
                                    className="p-1 rounded text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                    title="View Work Order"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Link>
                                  <Link
                                    href={`/dashboard/work-orders/${wo.id}`}
                                    onClick={onClose}
                                    className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                    title="Work Order Documents / Details"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </Link>
                                </div>
                              </td>

                              {/* Work Order */}
                              <td className="px-3 py-2.5">
                                <Link href={`/dashboard/work-orders/${wo.id}`} onClick={onClose} className="font-mono font-bold text-cyan-400 hover:underline">
                                  {woNum}
                                </Link>
                                {isCurrent && <span className="ml-1.5 text-[8px] px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">CURRENT</span>}
                              </td>

                              {/* Status */}
                              <td className="px-3 py-2.5">
                                <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md border", STATUS_PILL_COLORS[wo.status] || "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                                  {STATUS_LABELS[wo.status] || wo.status}
                                </span>
                              </td>

                              {/* Work Type */}
                              <td className="px-3 py-2.5 text-text-secondary">
                                {SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType?.replace(/_/g, " ") || "—"}
                              </td>

                              {/* Pics */}
                              <td className="px-3 py-2.5 text-center">
                                {files.length > 0 ? (
                                  <button onClick={() => setPhotoPopup({ open: true, photos: files, title: `${woNum} Photos` })} className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                                    <Camera className="h-3.5 w-3.5" /> {files.length}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-text-dim">0</span>
                                )}
                              </td>

                              {/* Contractor */}
                              <td className="px-3 py-2.5">
                                <span className="inline-block bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded px-2 py-0.5 text-[10px] font-medium truncate max-w-[130px]">
                                  {contractorName}
                                </span>
                              </td>

                              {/* Due Date */}
                              <td className="px-3 py-2.5 text-text-muted text-[11px] whitespace-nowrap">
                                {dueDateStr}
                              </td>

                              {/* Address */}
                              <td className="px-3 py-2.5 text-text-secondary truncate max-w-[260px]" title={fullAddress}>
                                {fullAddress || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                )}

                {/* ── TAB 2: BID HISTORY (EXACT DESIGN MATCH) ── */}
                {activeTab === "Bid History" && (
                  allBids.length === 0 ? (
                    <div className="text-center py-16">
                      <DollarSign className="h-12 w-12 text-text-dim mx-auto mb-3" />
                      <p className="text-text-secondary font-medium">No bid history found for this property</p>
                      <p className="text-xs text-text-muted mt-1">Bids created on work orders at this address will show up here.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-surface">
                          {/* Search Inputs Row */}
                          <tr className="border-b border-border-subtle bg-surface-hover/20">
                            <th className="p-2 w-8 text-center">
                              <input
                                type="checkbox"
                                checked={paginatedBids.length > 0 && selectedBids.length === paginatedBids.length}
                                onChange={toggleSelectAllBids}
                                className="rounded border-border-subtle text-cyan-500 focus:ring-0 cursor-pointer"
                              />
                            </th>
                            <th className="p-1.5 min-w-[130px]"></th>
                            <th className="p-1.5 min-w-[90px]">
                              <input
                                type="text"
                                value={bidFilterStatus}
                                onChange={(e) => setBidFilterStatus(e.target.value)}
                                placeholder="Status..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[110px]">
                              <input
                                type="text"
                                value={bidFilterWO}
                                onChange={(e) => setBidFilterWO(e.target.value)}
                                placeholder="WO #..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[65px]">
                              <input
                                type="text"
                                value={bidFilterPics}
                                onChange={(e) => setBidFilterPics(e.target.value)}
                                placeholder="Pics..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[110px]">
                              <input
                                type="text"
                                value={bidFilterWorkType}
                                onChange={(e) => setBidFilterWorkType(e.target.value)}
                                placeholder="Type..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[110px]">
                              <input
                                type="text"
                                value={bidFilterContractor}
                                onChange={(e) => setBidFilterContractor(e.target.value)}
                                placeholder="Contractor..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[90px]">
                              <input
                                type="text"
                                value={bidFilterDate}
                                onChange={(e) => setBidFilterDate(e.target.value)}
                                placeholder="Date..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[180px]">
                              <input
                                type="text"
                                value={bidFilterTask}
                                onChange={(e) => setBidFilterTask(e.target.value)}
                                placeholder="Task / Title..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[50px]">
                              <input
                                type="text"
                                value={bidFilterQty}
                                onChange={(e) => setBidFilterQty(e.target.value)}
                                placeholder="Qty..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[110px]">
                              <input
                                type="text"
                                value={bidFilterContractorPrice}
                                onChange={(e) => setBidFilterContractorPrice(e.target.value)}
                                placeholder="Cost..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[110px]">
                              <input
                                type="text"
                                value={bidFilterClientPrice}
                                onChange={(e) => setBidFilterClientPrice(e.target.value)}
                                placeholder="Price..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                            <th className="p-1.5 min-w-[200px]">
                              <input
                                type="text"
                                value={bidFilterComments}
                                onChange={(e) => setBidFilterComments(e.target.value)}
                                placeholder="Comments..."
                                className="w-full px-2 py-1 bg-surface border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
                              />
                            </th>
                          </tr>

                          {/* Column Title Row */}
                          <tr className="bg-surface-hover/60 border-b border-border-medium">
                            <th className="px-2 py-2.5 w-8 text-center text-[10px] font-bold text-text-muted">#</th>
                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Action</th>
                            <th className="px-2 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Status</th>
                            <th className="px-2 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Work Order #</th>
                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Pics</th>
                            <th className="px-2 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Work Type</th>
                            <th className="px-2 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Contractor</th>
                            <th className="px-2 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Date</th>
                            <th className="px-2 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Task</th>
                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Qty</th>
                            <th className="px-2 py-2.5 text-right text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/[0.04]">Contractor</th>
                            <th className="px-2 py-2.5 text-right text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/[0.04]">Client</th>
                            <th className="px-2 py-2.5 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Comments</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {paginatedBids.map((b) => {
                            const isExpanded = !!expandedComments[b.uniqueId];
                            const isSelected = selectedBids.includes(b.uniqueId);

                            // Status badge colors
                            const statusColor =
                              b.status === "APPROVED"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : b.status === "REJECTED"
                                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30";

                            return (
                              <tr
                                key={b.uniqueId}
                                className={cn(
                                  "hover:bg-surface-hover/40 transition-colors text-xs",
                                  isSelected && "bg-cyan-500/[0.04]"
                                )}
                              >
                                {/* Checkbox */}
                                <td className="px-2 py-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectBid(b.uniqueId)}
                                    className="rounded border-border-subtle text-cyan-500 focus:ring-0 cursor-pointer"
                                  />
                                </td>

                                {/* Actions */}
                                <td className="px-2 py-2.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleCopyBid(b)}
                                      className="bg-[#2E6B8D] hover:bg-[#255670] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-sm transition-all"
                                      title="Copy bid details"
                                    >
                                      Copy
                                    </button>
                                    <button
                                      onClick={() => handleApproveBid(b.uniqueId)}
                                      className="bg-[#4CAF50] hover:bg-[#439c47] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-sm transition-all"
                                      title="Approve bid"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectBid(b.uniqueId)}
                                      className="bg-[#F44336] hover:bg-[#d6382c] text-white text-[9px] font-semibold px-2 py-1 rounded shadow-sm transition-all"
                                      title="Reject bid"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="px-2 py-2.5">
                                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", statusColor)}>
                                    {b.status}
                                  </span>
                                </td>

                                {/* Work Order # */}
                                <td className="px-2 py-2.5 font-mono text-cyan-400 font-medium">
                                  <Link href={`/dashboard/work-orders/${b.woId}`} onClick={onClose} className="hover:underline">
                                    {b.woNum}
                                  </Link>
                                </td>

                                {/* Photos */}
                                <td className="px-2 py-2.5 text-center">
                                  {b.picsCount > 0 ? (
                                    <button
                                      onClick={() => setPhotoPopup({ open: true, photos: b.photos, title: `${b.woNum} - ${b.task}` })}
                                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                      <span>{b.picsCount}</span>
                                    </button>
                                  ) : (
                                    <span className="text-text-dim text-[11px]">0</span>
                                  )}
                                </td>

                                {/* Work Type */}
                                <td className="px-2 py-2.5 text-text-secondary truncate max-w-[110px]">
                                  {b.workType}
                                </td>

                                {/* Contractor */}
                                <td className="px-2 py-2.5">
                                  <span className="inline-block bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded px-2 py-0.5 text-[10px] font-medium truncate max-w-[120px]">
                                    {b.contractorName}
                                  </span>
                                </td>

                                {/* Date */}
                                <td className="px-2 py-2.5 text-text-muted text-[11px] whitespace-nowrap">
                                  {b.date}
                                </td>

                                {/* Task Name */}
                                <td className="px-2 py-2.5 font-medium text-text-primary max-w-[200px]">
                                  <span className="truncate block" title={b.task}>{b.task}</span>
                                </td>

                                {/* Qty */}
                                <td className="px-2 py-2.5 text-center text-text-primary font-medium">
                                  {b.qty} {b.unit}
                                </td>

                                {/* Contractor Pricing */}
                                <td className="px-2 py-2.5 text-right font-mono bg-blue-500/[0.02]">
                                  <div className="text-[10px] text-text-muted">Price: ${b.contractorPrice.toFixed(2)}</div>
                                  <div className="font-bold text-text-primary text-[11px]">Total: ${b.contractorTotal.toFixed(2)}</div>
                                </td>

                                {/* Client Pricing */}
                                <td className="px-2 py-2.5 text-right font-mono bg-emerald-500/[0.02]">
                                  <div className="text-[10px] text-text-muted">Price: ${b.clientPrice.toFixed(2)}</div>
                                  <div className="font-bold text-emerald-400 text-[11px]">Total: ${b.clientTotal.toFixed(2)}</div>
                                </td>

                                {/* Comments */}
                                <td className="px-2 py-2.5 text-text-muted max-w-[240px]">
                                  <div className="leading-tight">
                                    <span className={cn(!isExpanded && "line-clamp-2")}>
                                      {b.comments}
                                    </span>
                                    {b.comments.length > 60 && (
                                      <button
                                        onClick={() => setExpandedComments(prev => ({ ...prev, [b.uniqueId]: !prev[b.uniqueId] }))}
                                        className="text-cyan-400 hover:text-cyan-300 font-semibold text-[10px] ml-1 inline-block"
                                      >
                                        {isExpanded ? "See less" : "See more"}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Pagination Bar */}
                      <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle bg-surface-hover/30 mt-auto">
                        <span className="text-xs text-text-muted">
                          Showing {filteredBids.length > 0 ? (bidPage - 1) * bidPageSize + 1 : 0}-
                          {Math.min(bidPage * bidPageSize, filteredBids.length)} of {filteredBids.length} Bids
                        </span>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <span>Items per page:</span>
                            <select
                              value={bidPageSize}
                              onChange={(e) => { setBidPageSize(Number(e.target.value)); setBidPage(1); }}
                              className="bg-surface border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none"
                            >
                              <option value={10}>10</option>
                              <option value={15}>15</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              disabled={bidPage <= 1}
                              onClick={() => setBidPage(p => Math.max(1, p - 1))}
                              className="px-2.5 py-1 text-xs bg-surface border border-border-subtle rounded hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none text-text-secondary"
                            >
                              Previous
                            </button>
                            <span className="px-2 text-xs text-text-muted">
                              Page {bidPage} of {totalBidPages}
                            </span>
                            <button
                              disabled={bidPage >= totalBidPages}
                              onClick={() => setBidPage(p => Math.min(totalBidPages, p + 1))}
                              className="px-2.5 py-1 text-xs bg-surface border border-border-subtle rounded hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none text-text-secondary"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* ── TAB 3: COMPLETION HISTORY / TASKS ── */}
                {activeTab === "Completion History" && (
                  <div className="p-6">
                    <h3 className="text-sm font-bold text-text-primary mb-4">Completed Work Orders & Tasks</h3>
                    <div className="space-y-4">
                      {historyWorkOrders.map((wo: any) => {
                        const tasks = (wo.tasks as any[]) || [];
                        const woNum = getWorkOrderNumber(wo.id, wo.metadata);
                        return (
                          <div key={wo.id} className="p-4 rounded-xl bg-surface border border-border-subtle">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-cyan-400 font-bold">{woNum} - {wo.title}</span>
                              <span className="text-xs text-text-muted">{wo.completedAt ? formatDate(wo.completedAt) : formatDate(wo.createdAt)}</span>
                            </div>
                            <div className="space-y-1.5 mt-2">
                              {tasks.length > 0 ? (
                                tasks.map((t: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs text-text-secondary">
                                    <CheckCircle2 className={cn("h-3.5 w-3.5", t.completed ? "text-emerald-400" : "text-text-dim")} />
                                    <span>{t.title || t.description}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-text-dim italic">No task records available.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── GENERIC FALLBACK FOR OTHER CATEGORY TABS ── */}
                {!["Past WOs", "Bid History", "Completion History"].includes(activeTab) && (
                  <div className="text-center py-20">
                    <History className="h-12 w-12 text-text-dim mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-text-primary mb-1">{activeTab}</h3>
                    <p className="text-xs text-text-muted max-w-sm mx-auto">
                      No historical {activeTab.toLowerCase()} incidents or records have been flagged for this property address yet.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-2.5 border-t border-border-subtle bg-surface-hover flex-shrink-0">
            <span className="text-xs text-text-muted">
              {activeTab === "Bid History" ? `${filteredBids.length} Bids Total` : `${filteredPastWOs.length} of ${historyWorkOrders.length} work orders`}
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>

      {/* Photo Popup */}
      {photoPopup.open && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setPhotoPopup({ open: false, photos: [], title: "" })}>
          <div className="relative max-w-5xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <p className="text-sm font-medium text-white bg-black/60 px-3 py-1.5 rounded-lg">{photoPopup.title}</p>
              <button onClick={() => setPhotoPopup({ open: false, photos: [], title: "" })} className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[90vh] overflow-y-auto pt-16 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 px-2">
              {photoPopup.photos.map((photo: any, i: number) => (
                <div key={photo.id || i} className="aspect-square rounded-xl overflow-hidden bg-surface-hover border border-border-subtle">
                  <img src={photo.path || photo.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}


export default function WorkOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
      <WorkOrdersContent />
    </Suspense>
  );
}
