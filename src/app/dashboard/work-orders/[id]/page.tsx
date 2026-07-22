"use client";

import { use, useState, useRef, useEffect, Fragment, lazy, Suspense, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWorkOrder,
  useUpdateWorkOrder,
  useCreateWorkOrder,
  useTaskMessages,
  useSendTaskMessage,
  usePropertyHistory,
  useLogActivity,
  useChatMessages,
  useChatChannels,
  useCreateChatChannel,
  useUsers,
} from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Select,
  Avatar,
} from "@/components/ui";
import {
  MapPin,
  Calendar,
  User,
  Lock,
  Key,
  FileText,
  MessageSquare,
  Receipt,
  Edit,
  Edit3,
  Send,
  CheckCircle2,
  Camera,
  Shield,
  Phone,
  Mail,
  X,
  Sparkles,
  DollarSign,
  Activity,
  Printer,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  ZoomIn,
  Info,
  Download,
  Clock,
  Loader2,
  Pencil,
  Wrench,
  Users,
  Building2,
  Upload,
  AlertCircle,
  Trash2,
  Package,
  Truck,
  AlertTriangle,
} from "lucide-react";
import {
  cn,
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatCurrency,
  INVOICE_STATUS_LABELS,
} from "@/lib/utils";
import Link from "next/link";
import { AIChat } from "@/components/ai-chat";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { MentionDropdown } from "@/components/chat/mention-dropdown";
import {
  PhotoUploadSection,
  PhotoItem,
  PhotoCategory,
  fileUploadsToPhotos,
} from "@/components/work-orders/photo-upload";
import { GPSCamera, type CapturedPhoto } from "@/components/gps-camera";
import { addPhotoToQueue } from "@/lib/offline-queue";
import {
  TaskEntryList,
  TaskEntry,
  BidEntryList,
  BidEntry,
} from "@/components/work-orders/task-bid-entries";
import { printWorkOrder } from "@/components/work-orders/print-report";

import { OverdueCountdown } from "@/components/work-orders/overdue-countdown";
// Spreadsheet removed — invoice uses a regular table now
import toast from "react-hot-toast";

type ZipFileInput = { name: string; blob: Blob };

function getSanitizedFileName(type: string, label: string, photo: any, index: number) {
  const cleanLabel = label.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase().trim();
  const cleanLabelSpaced = cleanLabel.replace(/\s+/g, " ");
  
  if (type.toLowerCase() === "task") {
    const category = (photo.category || "").toLowerCase();
    if (category === "before" || category === "during" || category === "after") {
      return `task ${cleanLabelSpaced} - ${cleanLabelSpaced} ${category} ${index}`;
    } else {
      return `task ${cleanLabelSpaced} - ${cleanLabelSpaced} ${index}`;
    }
  } else if (type.toLowerCase() === "bid") {
    return `bid ${cleanLabelSpaced} ${index}`;
  } else if (type.toLowerCase() === "inspection") {
    return `${cleanLabelSpaced} ${index}`;
  } else {
    return `${type.toLowerCase()} ${cleanLabelSpaced} ${index}`;
  }
}

function zipCrc32(bytes: Uint8Array) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function zipDateTime(date = new Date()) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

async function createStoredZip(files: ZipFileInput[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = zipDateTime();

  function record(size: number, write: (view: DataView) => void) {
    const bytes = new Uint8Array(size);
    write(new DataView(bytes.buffer));
    return bytes;
  }

  for (const file of files) {
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const nameBytes = encoder.encode(file.name);
    const crc = zipCrc32(data);
    const local = record(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(10, now.time, true);
      view.setUint16(12, now.dosDate, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, nameBytes.length, true);
    });
    chunks.push(local, nameBytes, data);
    const centralRecord = record(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(12, now.time, true);
      view.setUint16(14, now.dosDate, true);
      view.setUint32(16, crc, true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, data.length, true);
      view.setUint16(28, nameBytes.length, true);
      view.setUint32(42, offset, true);
    });
    central.push(centralRecord, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = record(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
  });

  const blobParts = [...chunks, ...central, end].map((chunk) => {
    const copy = new Uint8Array(chunk.byteLength);
    copy.set(chunk);
    return copy.buffer;
  });
  return new Blob(blobParts, { type: "application/zip" });
}

// Lazy load the image editor
const PhotoEditor = lazy(() =>
  import("@/components/photo-editor").then((m) => ({ default: m.PhotoEditor }))
);

import { CallOptionModal } from "@/components/calls/call-options-modal";

// ─── Default Property Preservation Task Names ────────────────────────────────

// ─── Unit Selector ────────────────────────────────────────────────────────────

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
                "w-full text-left px-3 py-1.5 text-xs hover:bg-cyan-500/10 hover:text-cyan-700 dark:text-cyan-400 transition-colors border-b border-border-subtle last:border-0",
                value === u.value ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold" : "text-text-secondary"
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

const DEFAULT_TASK_NAMES = [
  "Exterior Debris Removal",
  "Interior Debris Removal",
  "Winterization",
  "Grass Cut",
  "Lawn Mowing",
  "Repair Door",
  "Replace Door",
  "Replace Garage Door",
  "Repair Garage Door",
  "Trim Shrubs",
  "Trim Tree",
  "Remove Vines on House",
  "Remove Vines on Fence",
  "Pressure Washing",
  "Gutter Cleaning",
  "Roof Repair",
  "Roof Tarping",
  "Lock Change",
  "Lock Box Installation",
  "Boarding (Windows)",
  "Boarding (Doors)",
  "Boarding (Other)",
  "Pool Draining",
  "Pool Covering",
  "Pool Maintenance",
  "Snow Removal",
  "Salting / Ice Treatment",
  "Painting (Exterior)",
  "Painting (Interior)",
  "Drywall Repair",
  "Flooring Repair",
  "Carpet Cleaning",
  "Carpet Removal",
  "Appliance Removal",
  "Furniture Removal",
  "Trash Out",
  "Deep Clean",
  "Standard Clean",
  "Maid Service",
  "Plumbing Repair",
  "Electrical Repair",
  "HVAC Service",
  "Water Heater Repair",
  "Window Board-Up",
  "Window Replacement",
  "Screen Repair",
  "Fence Repair",
  "Fence Removal",
  "Deck Repair",
  "Patio Cleaning",
  "Sidewalk Repair",
  "Foundation Inspection",
  "Pest Control",
  "Mold Remediation",
  "Asbestos Testing",
  "Radon Testing",
  "Smoke Detector Install",
  "CO Detector Install",
  "Fire Extinguisher",
  "Yard Maintenance",
  "Mulching",
  "Tree Removal",
  "Stump Grinding",
  "Lot Mowing",
  "Vacant Property Check",
  "Occupancy Verification",
  "Initial Secure",
  "Re-Key",
  "Eviction Lock Change",
  "Debris Hauling",
  "Junk Removal",
  "Hot Tub Removal",
  "Shed Demolition",
  "Septic Service",
  "Well Inspection",
];

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
  const [custom, setCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCustom(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = custom
    ? []
    : DEFAULT_TASK_NAMES.filter((t) =>
        t.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 12);

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
          setCustom(false);
        }}
        onFocus={() => { setOpen(true); setCustom(false); }}
        placeholder={placeholder}
        className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-sm text-text-primary font-black outline-none focus:border-cyan-500/50 placeholder:text-text-dim"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/40 max-h-56 overflow-y-auto">
          {filtered.length > 0 && filtered.map((task) => (
            <button
              key={task}
              type="button"
              onClick={() => {
                onChange(task);
                setSearch(task);
                setOpen(false);
                setCustom(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs hover:bg-cyan-500/10 hover:text-cyan-700 dark:text-cyan-400 transition-colors border-b border-border-subtle last:border-0",
                value === task ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold" : "text-text-secondary"
              )}
            >
              {task}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCustom(true);
              setSearch("");
              onChange("");
              inputRef.current?.focus();
            }}
            className="w-full text-left px-3 py-2 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors border-t border-border-medium flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Custom Task Name
          </button>
        </div>
      )}
    </div>
  );
}

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const {
    data: workOrder,
    isLoading,
    isError: workOrderLoadFailed,
    error: workOrderLoadError,
    refetch: refetchWorkOrder,
  } = useWorkOrder(id);
  const updateMutation = useUpdateWorkOrder(id);
  // Always pass address to get ALL work orders at the same property
  const { data: propertyHistoryData } = usePropertyHistory(
    workOrder?.propertyId || undefined,
    workOrder?.address || undefined
  );
  const logActivity = useLogActivity(id);
  const role = (session?.user as any)?.role;

  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [activeTaskChat, setActiveTaskChat] = useState<string | null>(null);
  const [expandedProjectScope, setExpandedProjectScope] = useState(false);

  // Local state for tasks, bids, and photos
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [bidPhotos, setBidPhotos] = useState<PhotoItem[]>([]);
  const [inspectionPhotos, setInspectionPhotos] = useState<PhotoItem[]>([]);
  const [customInspectionItems, setCustomInspectionItems] = useState<
    { label: string; description?: string; required: boolean; completed: boolean; photos: PhotoItem[]; expanded: boolean }[]
  >([]);
  const [showAddInspection, setShowAddInspection] = useState(false);
  const [newInspectionLabel, setNewInspectionLabel] = useState("");
  const [newInspectionDesc, setNewInspectionDesc] = useState("");
  const [editingInspectionIdx, setEditingInspectionIdx] = useState<number | null>(null);
  const [editInspectionLabel, setEditInspectionLabel] = useState("");
  const [editInspectionDesc, setEditInspectionDesc] = useState("");
  const [photoPopupPhotos, setPhotoPopupPhotos] = useState<any[]>([]);
  const [photoPopupTitle, setPhotoPopupTitle] = useState("");
  const [photoPopupOpen, setPhotoPopupOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [allPhotosModal, setAllPhotosModal] = useState<{ open: boolean; source: "tasks" | "bids" | "inspection" | "all" }>({ open: false, source: "tasks" });
  const tasksInitialized = useRef(false);
  const bidsInitialized = useRef(false);
  const inspectionInitialized = useRef(false);
  const isFirstSaveSkipped = useRef(false);
  const initialLoadDone = useRef(false);
  const viewLogged = useRef(false);
  const [globalPhotos, setGlobalPhotos] = useState<PhotoItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [photoTabDownloadMode, setPhotoTabDownloadMode] = useState<"none" | "date" | "datetime" | "datetimeExif" | "custom">("datetime");
  const [photoTabCustomDateTime, setPhotoTabCustomDateTime] = useState("");
  const [photoTabDownloading, setPhotoTabDownloading] = useState(false);

  // Property front photo state
  const [propertyFrontPhotos, setPropertyFrontPhotos] = useState<any[]>([]);
  const [propertyFrontViewerOpen, setPropertyFrontViewerOpen] = useState(false);
  const [uploadingFrontPhoto, setUploadingFrontPhoto] = useState(false);
  const frontPhotoInputRef = useRef<HTMLInputElement>(null);
  const documentUploadRef = useRef<HTMLInputElement>(null);

  // GPS Camera state
  const [gpsCameraOpen, setGpsCameraOpen] = useState(false);
  const [gpsCameraCategory, setGpsCameraCategory] = useState<PhotoCategory>("BEFORE");
  const [gpsCameraTarget, setGpsCameraTarget] = useState<"global" | "task" | "bid" | "inspection">("global");
  const [gpsCameraTaskId, setGpsCameraTaskId] = useState<string | null>(null);
  const [gpsCameraBidId, setGpsCameraBidId] = useState<string | null>(null);
  const [gpsCameraInspectionId, setGpsCameraInspectionId] = useState<string | null>(null);
  const [gpsCameraMultiCapture, setGpsCameraMultiCapture] = useState(true);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editorPhoto, setEditorPhoto] = useState<{ url: string; name: string; category?: PhotoCategory; source?: "global" | "task" | "bid" | "inspection"; sourceId?: string } | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Invoice line items state — separate for client and contractor
  interface InvoiceItem {
    id: string;
    taskName: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    total: number;
    isDefault?: boolean;
  }
  const [clientInvoiceItems, setClientInvoiceItems] = useState<InvoiceItem[]>([]);
  const [contractorInvoiceItems, setContractorInvoiceItems] = useState<InvoiceItem[]>([]);
  const [clientInvoiceNotes, setClientInvoiceNotes] = useState("");
  const [contractorInvoiceNotes, setContractorInvoiceNotes] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [clientEditingInvoiceId, setClientEditingInvoiceId] = useState<string | null>(null);
  const [contractorEditingInvoiceId, setContractorEditingInvoiceId] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<"client" | "contractor">("client");
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false);
  const [completionDate, setCompletionDate] = useState("");
  const [sentToClientDate, setSentToClientDate] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");

  // Inline editing state — tracks edited items per invoice ID
  const [inlineEditItems, setInlineEditItems] = useState<Record<string, InvoiceItem[]>>({});
  const [savingInline, setSavingInline] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

  // Start inline editing for an invoice — load its items into local edit state
  const startInlineEdit = (inv: any) => {
    if (inlineEditItems[inv.id]) return; // already editing
    const items: InvoiceItem[] = (inv.items || []).map((item: any) => ({
      id: item.id,
      taskName: item.taskName || "",
      description: item.description || "",
      unit: item.unit || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      discountPercent: item.discountPercent || 0,
      total: item.amount || (item.quantity * item.unitPrice) * (1 - (item.discountPercent || 0) / 100),
    }));
    setInlineEditItems((prev) => ({ ...prev, [inv.id]: items }));
  };

  // Cancel inline editing
  const cancelInlineEdit = (invoiceId: string) => {
    setInlineEditItems((prev) => {
      const next = { ...prev };
      delete next[invoiceId];
      return next;
    });
  };

  // Update an inline-editing item
  const updateInlineItem = (invoiceId: string, itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setInlineEditItems((prev) => {
      const items = prev[invoiceId];
      if (!items) return prev;
      const updated = items.map((item) => {
        if (item.id !== itemId) return item;
        const next = { ...item, [field]: value };
        const qty = Number(next.quantity) || 0;
        const price = Number(next.unitPrice) || 0;
        const disc = Number(next.discountPercent) || 0;
        next.total = qty * price * (1 - disc / 100);
        return next;
      });
      return { ...prev, [invoiceId]: updated };
    });
  };

  // Delete a single invoice item
  const deleteInlineItem = async (invoiceId: string, itemId: string) => {
    if (!confirm("Delete this line item?")) return;
    if (itemId.startsWith("new-")) {
      setInlineEditItems((prev) => {
        const items = prev[invoiceId];
        if (!items) return prev;
        const filtered = items.filter((i) => i.id !== itemId);
        return { ...prev, [invoiceId]: filtered };
      });
      toast.success("Item deleted");
      return;
    }
    setDeletingItem(itemId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      // Remove from inline edit state
      setInlineEditItems((prev) => {
        const items = prev[invoiceId];
        if (!items) return prev;
        const filtered = items.filter((i) => i.id !== itemId);
        return { ...prev, [invoiceId]: filtered };
      });
      refetchWorkOrder();
      toast.success("Item deleted");
    } catch {
      toast.error("Failed to delete item");
    }
    setDeletingItem(null);
  };

  // Save inline edits for an invoice
  const saveInlineEdit = async (invoiceId: string) => {
    const items = inlineEditItems[invoiceId];
    if (!items || items.length === 0) {
      toast.error("No items to save");
      return;
    }
    setSavingInline(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            taskName: item.taskName,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      cancelInlineEdit(invoiceId);
      refetchWorkOrder();
      toast.success("Invoice items updated");
    } catch {
      toast.error("Failed to save invoice items");
    }
    setSavingInline(null);
  };

  // Add a new empty item to an inline-editing invoice
  const addInlineItem = (invoiceId: string) => {
    setInlineEditItems((prev) => {
      const items = prev[invoiceId] || [];
      return {
        ...prev,
        [invoiceId]: [
          ...items,
          {
            id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            taskName: "",
            description: "",
            unit: "",
            quantity: 1,
            unitPrice: 0,
            discountPercent: 0,
            total: 0,
          },
        ],
      };
    });
  };

  // Helpers to get/set active invoice type's state
  const activeInvoiceItems = invoiceType === "client" ? clientInvoiceItems : contractorInvoiceItems;
  const setActiveInvoiceItems = invoiceType === "client" ? setClientInvoiceItems : setContractorInvoiceItems;
  const activeInvoiceNotes = invoiceType === "client" ? clientInvoiceNotes : contractorInvoiceNotes;
  const setActiveInvoiceNotes = invoiceType === "client" ? setClientInvoiceNotes : setContractorInvoiceNotes;
  const activeEditingInvoiceId = invoiceType === "client" ? clientEditingInvoiceId : contractorEditingInvoiceId;
  const setActiveEditingInvoiceId = invoiceType === "client" ? setClientEditingInvoiceId : setContractorEditingInvoiceId;

  // ── Invoice items managed directly via activeInvoiceItems state ─────────────────

  const handleEditInvoice = (inv: any) => {
    const invType = inv.type === "CONTRACTOR" ? "contractor" : "client";
    setInvoiceType(invType);
    const items = (inv.items || []).map((item: any) => ({
      id: item.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskName: item.taskName || "",
      description: item.description || "",
      unit: item.unit || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      discountPercent: item.discountPercent || 0,
      total: item.amount || (item.quantity * item.unitPrice) * (1 - (item.discountPercent || 0) / 100),
    }));
    if (invType === "client") {
      setClientInvoiceItems(items);
      setClientInvoiceNotes(inv.notes || "");
      setClientEditingInvoiceId(inv.id);
    } else {
      setContractorInvoiceItems(items);
      setContractorInvoiceNotes(inv.notes || "");
      setContractorEditingInvoiceId(inv.id);
    }
    toast.success(`${invType === "client" ? "Client" : "Contractor"} invoice loaded for editing`);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete invoice");
      toast.success("Invoice deleted successfully");
      refetchWorkOrder();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePrintInvoice = (inv: any) => {
    const user = session?.user as any;
    const fromCompany = user?.company || "PreservationPro";
    const fromName = user?.name || "";
    const fromEmail = user?.email || "";
    const fromPhone = user?.phone || "";

    const clientName = inv.client?.name || workOrder.createdBy?.name || "Client";
    const clientCompany = inv.client?.company || "";
    const clientEmail = inv.client?.email || workOrder.createdBy?.email || "";
    const clientPhone = inv.client?.phone || "";
    const clientAddress = workOrder.address || "";
    const clientCity = workOrder.city || "";
    const clientState = workOrder.state || "";
    const clientZip = workOrder.zipCode || "";
    const fullAddress = [clientAddress, [clientCity, clientState, clientZip].filter(Boolean).join(", ")].filter(Boolean).join("\n");

    const discountAmount = inv.subtotal - (inv.noCharge ? 0 : inv.total) + (inv.tax || 0);
    const hasDiscount = discountAmount > 0.01;

    const itemsHtml = (inv.items || []).map((item: any, idx: number) => {
      const amt = item.amount || (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discountPercent || 0) / 100);
      const unitDisplay = (item.unit && item.unit.trim()) ? item.unit : "—";
      return `
        <tr>
          <td>
            <div class="task-name">${item.taskName || "—"}</div>
            ${item.description ? `<div class="task-desc">${item.description}</div>` : ""}
          </td>
          <td>${unitDisplay}</td>
          <td>${item.quantity ?? "—"}</td>
          <td>${formatCurrency(item.unitPrice || 0)}</td>
          <td>${item.discountPercent > 0 ? item.discountPercent + "%" : "—"}</td>
          <td style="font-weight:700;color:#0f172a;">${formatCurrency(amt)}</td>
        </tr>`;
    }).join("");

    const statusLabel = INVOICE_STATUS_LABELS[inv.status] || inv.status;
    const statusColors: Record<string, string> = {
      DRAFT: "#64748b", SENT: "#3b82f6", PAID: "#10b981", OVERDUE: "#f43f5e", CANCELLED: "#94a3b8",
    };
    const statusColor = statusColors[inv.status] || "#64748b";

    const invTypeLabel = inv.type === "CONTRACTOR" ? "Contractor Invoice" : "Client Invoice";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Invoice ${inv.invoiceNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#0f172a; background:#ffffff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @media print { body { padding:0; } @page { margin:0.4in; size:letter; } }

  .page { max-width:816px; margin:0 auto; padding:0; background:#fff; }

  /* ── Accent Bar ── */
  .accent-bar { height:6px; background:linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6); }

  /* ── Header ── */
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding:40px 48px 28px; }
  .brand { display:flex; align-items:center; gap:14px; }
  .brand-icon { width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #06b6d4, #3b82f6); display:flex; align-items:center; justify-content:center; }
  .brand-icon svg { width:24px; height:24px; fill:#fff; }
  .brand h1 { font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-0.5px; line-height:1.1; }
  .brand .tagline { font-size:10px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:2.5px; margin-top:2px; }
  .invoice-meta { text-align:right; }
  .invoice-meta .inv-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:2.5px; margin-bottom:6px; }
  .invoice-meta .inv-number { font-size:24px; font-weight:900; background:linear-gradient(135deg, #06b6d4, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-0.5px; }
  .invoice-meta .status { display:inline-block; margin-top:8px; padding:4px 14px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#fff; background:${statusColor}; }

  /* ── Parties ── */
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:40px; padding:0 48px 32px; }
  .party-card { background:#f8fafc; border-radius:12px; padding:20px 24px; border:1px solid #f1f5f9; }
  .party-label { font-size:9px; font-weight:700; color:#06b6d4; text-transform:uppercase; letter-spacing:2.5px; margin-bottom:10px; }
  .party-name { font-size:15px; font-weight:700; color:#0f172a; margin-bottom:2px; }
  .party-company { font-size:12px; font-weight:500; color:#64748b; margin-bottom:6px; }
  .party-detail { font-size:11px; color:#64748b; line-height:1.8; }

  /* ── Meta Grid ── */
  .meta-grid { display:grid; grid-template-columns:repeat(1,1fr); } @media (min-width: 768px) { .meta-grid { grid-template-columns:repeat(2,1fr); } } @media (min-width: 1024px) { .meta-grid { grid-template-columns:repeat(4,1fr);; gap:0; margin:0 48px 32px; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; }
  .meta-cell { padding:16px 18px; border-right:1px solid #f1f5f9; }
  .meta-cell:last-child { border-right:none; }
  .meta-cell .label { font-size:8px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:2px; margin-bottom:6px; }
  .meta-cell .value { font-size:13px; font-weight:700; color:#0f172a; }
  .meta-cell .value.paid { color:#10b981; }
  .meta-cell .value.accent { background:linear-gradient(135deg, #06b6d4, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

  /* ── Table ── */
  .table-wrap { margin:0 48px 32px; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; }
  table.items { width:100%; border-collapse:collapse; }
  table.items thead { background:linear-gradient(135deg, #06b6d4, #3b82f6); }
  table.items thead th { padding:14px 16px; font-size:9px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:1.5px; }
  table.items thead th:first-child { text-align:left; }
  table.items thead th:not(:first-child) { text-align:right; }
  table.items tbody tr { border-bottom:1px solid #f1f5f9; }
  table.items tbody tr:nth-child(even) { background:#f8fafc; }
  table.items tbody tr:hover { background:#f0f9ff; }
  table.items tbody td { padding:14px 16px; font-size:12px; }
  table.items tbody td:first-child { color:#0f172a; }
  table.items tbody td:not(:first-child) { text-align:right; color:#475569; }
  table.items tbody td .task-name { font-weight:600; color:#0f172a; }
  table.items tbody td .task-desc { font-size:10px; color:#94a3b8; margin-top:2px; }

  /* ── Totals ── */
  .totals { display:flex; justify-content:flex-end; padding:0 48px 32px; }
  .totals-box { width:320px; background:#f8fafc; border-radius:12px; padding:20px 24px; border:1px solid #e2e8f0; }
  .totals-row { display:flex; justify-content:space-between; padding:6px 0; font-size:12px; color:#64748b; }
  .totals-row.discount { color:#f59e0b; font-weight:600; }
  .totals-row.tax { color:#64748b; }
  .totals-final { display:flex; justify-content:space-between; align-items:center; padding:16px 0 0; border-top:2px solid #e2e8f0; margin-top:10px; }
  .totals-final .label { font-size:12px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:1.5px; }
  .totals-final .amount { font-size:28px; font-weight:900; background:linear-gradient(135deg, #06b6d4, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-0.5px; }
  .totals-final .amount.no-charge { background:none; -webkit-text-fill-color:#10b981; color:#10b981; }

  /* ── Notes ── */
  .notes { margin:0 48px 32px; padding:20px 24px; background:linear-gradient(135deg, #f0f9ff, #f5f3ff); border-radius:12px; border:1px solid #e0e7ff; }
  .notes .notes-label { font-size:9px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; }
  .notes p { font-size:12px; color:#475569; line-height:1.7; }

  /* ── Footer ── */
  .footer { margin:0; padding:24px 48px; background:#f8fafc; border-top:1px solid #f1f5f9; text-align:center; }
  .footer-thank { font-size:14px; font-weight:700; color:#0f172a; margin-bottom:4px; }
  .footer p { font-size:10px; color:#94a3b8; line-height:1.8; }
  .footer .brand-footer { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:8px; }
  .footer .brand-footer .dot { width:6px; height:6px; border-radius:50%; background:linear-gradient(135deg, #06b6d4, #3b82f6); }
</style>
</head>
<body>
<div class="page">

  <!-- Accent Bar -->
  <div class="accent-bar"></div>

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
      </div>
      <div>
        <h1>${fromCompany}</h1>
        <div class="tagline">Professional Services</div>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="inv-label">${invTypeLabel}</div>
      <div class="inv-number">${inv.invoiceNumber}</div>
      <div class="status">${statusLabel}</div>
    </div>
  </div>

  <!-- From / To -->
  <div class="parties">
    <div class="party-card">
      <div class="party-label">From</div>
      <div class="party-name">${fromCompany}</div>
      ${fromName ? `<div class="party-detail">${fromName}</div>` : ""}
      <div class="party-detail">
        ${fromEmail ? `${fromEmail}<br/>` : ""}
        ${fromPhone ? `${fromPhone}` : ""}
      </div>
    </div>
    <div class="party-card">
      <div class="party-label">Bill To</div>
      <div class="party-name">${clientName}</div>
      ${clientCompany ? `<div class="party-company">${clientCompany}</div>` : ""}
      <div class="party-detail">
        ${fullAddress ? `${fullAddress.replace(/\n/g, "<br/>")}<br/>` : ""}
        ${clientEmail ? `${clientEmail}<br/>` : ""}
        ${clientPhone ? `${clientPhone}` : ""}
      </div>
    </div>
  </div>

  <!-- Dates -->
  <div class="meta-grid">
    <div class="meta-cell">
      <div class="label">Invoice Date</div>
      <div class="value">${formatDate(inv.createdAt)}</div>
    </div>
    <div class="meta-cell">
      <div class="label">Due Date</div>
      <div class="value">${inv.dueDate ? formatDate(inv.dueDate) : (workOrder.dueDate ? formatDate(workOrder.dueDate) : "")}</div>
    </div>
    ${inv.paidAt ? `
    <div class="meta-cell">
      <div class="label">Paid</div>
      <div class="value paid">${formatDate(inv.paidAt)}</div>
    </div>` : `
    <div class="meta-cell">
      <div class="label">Work Order</div>
      <div class="value">${workOrder.title?.slice(0, 24) || "—"}</div>
    </div>`}
    <div class="meta-cell">
      <div class="label">${inv.noCharge ? "Status" : "Amount Due"}</div>
      <div class="value${inv.noCharge ? " paid" : " accent"}">${inv.noCharge ? "No Charge" : formatCurrency(inv.total || 0)}</div>
    </div>
  </div>

  <!-- Items Table -->
  <div class="table-wrap">
    <table class="items">
      <thead>
        <tr>
          <th style="text-align:left;">Description</th>
          <th>Unit</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Disc</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(inv.subtotal || 0)}</span>
      </div>
      ${hasDiscount ? `
      <div class="totals-row discount">
        <span>Discount</span>
        <span>-${formatCurrency(discountAmount)}</span>
      </div>` : ""}
      ${(inv.tax || 0) > 0 ? `
      <div class="totals-row tax">
        <span>Tax</span>
        <span>${formatCurrency(inv.tax)}</span>
      </div>` : ""}
      <div class="totals-final">
        <span class="label">Total</span>
        <span class="amount${inv.noCharge ? " no-charge" : ""}">${inv.noCharge ? "No Charge" : formatCurrency(inv.total || 0)}</span>
      </div>
    </div>
  </div>

  ${inv.notes ? `
  <div class="notes">
    <div class="notes-label">Notes</div>
    <p>${inv.notes}</p>
  </div>` : ""}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-thank">Thank you for your business</div>
    <p>${fromCompany} ${fromEmail ? `· ${fromEmail}` : ""} ${fromPhone ? `· ${fromPhone}` : ""}</p>
    <div class="brand-footer">
      <div class="dot"></div>
      <span style="font-size:9px;color:#94a3b8;letter-spacing:1px;">${fromCompany}</span>
      <div class="dot"></div>
    </div>
  </div>

</div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 600);
    }
  };

  const cancelEditInvoice = () => {
    if (invoiceType === "client") {
      setClientEditingInvoiceId(null);
      setClientInvoiceItems([]);
      setClientInvoiceNotes("");
    } else {
      setContractorEditingInvoiceId(null);
      setContractorInvoiceItems([]);
      setContractorInvoiceNotes("");
    }
    setShowNewInvoiceForm(false);
  };

  const addInvoiceItem = () => {
    setActiveInvoiceItems((prev: InvoiceItem[]) => [
      ...prev,
      {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        taskName: "",
        description: "",
        unit: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        total: 0,
      },
    ]);
  };

  // Auto-populate invoice items from saved tasks (default tasks pinned first)
  const populateInvoiceFromTasks = () => {
    const tasksWithPrice = tasks.filter((t) => t.title.trim());
    if (tasksWithPrice.length === 0) {
      toast.error("No tasks found to populate invoice");
      return;
    }
    const sorted = [...tasksWithPrice].sort((a, b) => {
      const aDefault = a.id.startsWith("task-default-") || a.id.startsWith("task-tpl-") ? 0 : 1;
      const bDefault = b.id.startsWith("task-default-") || b.id.startsWith("task-tpl-") ? 0 : 1;
      return aDefault - bDefault;
    });
    const newItems: InvoiceItem[] = sorted.map((t) => ({
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskName: t.title,
      description: t.description || "",
      unit: t.unit || "",
      quantity: t.quantity || 1,
      unitPrice: t.price || 0,
      discountPercent: 0,
      total: (t.quantity || 1) * (t.price || 0),
      isDefault: t.id.startsWith("task-default-") || t.id.startsWith("task-tpl-"),
    }));
    const existing = workOrder?.invoices?.find((i: any) => invoiceType === "client" ? i.type !== "CONTRACTOR" : i.type === "CONTRACTOR");
    if (existing) {
      setActiveInvoiceItems([...existing.items, ...newItems]);
      if (invoiceType === "client") setClientEditingInvoiceId(existing.id);
      else setContractorEditingInvoiceId(existing.id);
    } else {
      setActiveInvoiceItems(newItems);
    }
    setShowNewInvoiceForm(true);
    toast.success(`Populated ${newItems.length} items for ${invoiceType} invoice`);
  };

  const removeInvoiceItem = (id: string) => {
    setActiveInvoiceItems((prev: InvoiceItem[]) => prev.filter((item) => item.id !== id));
  };

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setActiveInvoiceItems((prev: InvoiceItem[]) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Recalculate total: qty * price * (1 - discount/100)
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.unitPrice) || 0;
        const disc = Number(updated.discountPercent) || 0;
        updated.total = qty * price * (1 - disc / 100);
        return updated;
      })
    );
  };

  // Invoice summary calculations — use active type's items
  const invoiceSubtotal = activeInvoiceItems.reduce((sum: number, item: InvoiceItem) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const invoiceTotalDiscount = activeInvoiceItems.reduce((sum: number, item: InvoiceItem) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discountPercent) || 0;
    return sum + (qty * price * disc) / 100;
  }, 0);
  const invoiceGrandTotal = invoiceSubtotal - invoiceTotalDiscount;

  async function handleSaveInvoice() {
    if (activeInvoiceItems.length === 0) {
      toast.error("Add at least one invoice item");
      return;
    }
    const hasEmpty = activeInvoiceItems.some((item: InvoiceItem) => !item.taskName.trim());
    if (hasEmpty) {
      toast.error("All items need a task name");
      return;
    }
    setSavingInvoice(true);
    try {
      const url = activeEditingInvoiceId ? `/api/invoices/${activeEditingInvoiceId}` : "/api/invoices";
      const method = activeEditingInvoiceId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: workOrder.id,
          clientId: invoiceType === "contractor"
            ? (workOrder.contractorId || workOrder.createdById || workOrder.coordinatorId || (session?.user as any)?.id)
            : (workOrder.createdById || workOrder.coordinatorId || (session?.user as any)?.id),
          type: invoiceType === "contractor" ? "CONTRACTOR" : "CLIENT",
          items: activeInvoiceItems.map((item: InvoiceItem) => ({
            taskName: item.taskName,
            description: item.description || undefined,
            unit: item.unit && item.unit.trim() ? item.unit.trim() : undefined,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            discountPercent: Number(item.discountPercent) || 0,
          })),
          notes: activeInvoiceNotes || undefined,
          dueDate: invoiceDueDate || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save invoice");
      }
      toast.success(activeEditingInvoiceId ? `${invoiceType === "client" ? "Client" : "Contractor"} invoice updated successfully` : `${invoiceType === "client" ? "Client" : "Contractor"} invoice saved successfully`);
      if (invoiceType === "client") {
        setClientInvoiceItems([]);
        setClientInvoiceNotes("");
        setClientEditingInvoiceId(null);
      } else {
        setContractorInvoiceItems([]);
        setContractorInvoiceNotes("");
        setContractorEditingInvoiceId(null);
      }
      setShowNewInvoiceForm(false);
      refetchWorkOrder(); // Refresh to see updated invoice
    } catch (err: any) {
      toast.error(err.message || "Failed to save invoice");
    } finally {
      setSavingInvoice(false);
    }
  }

  const router = useRouter();
  const createMutation = useCreateWorkOrder();

  // Initialize photos from existing work order files (exclude inspection photos)
  useEffect(() => {
    if (workOrder?.files && globalPhotos.length === 0) {
      const existing = fileUploadsToPhotos(workOrder.files).filter(
        (p) => !["BID", "INSPECTION", "PROPERTY_FRONT"].includes(p.category)
      );
      if (existing.length > 0) {
        setGlobalPhotos(existing);
      }
    }
  }, [workOrder]);

  // Initialize inspection photos from saved work order files.
  useEffect(() => {
    if (workOrder?.files && inspectionPhotos.length === 0) {
      const existing = fileUploadsToPhotos(workOrder.files).filter((p) => p.category === "INSPECTION");
      if (existing.length > 0) {
        setInspectionPhotos(existing);
      }
    }
  }, [workOrder]);

  // Fetch property front photos
  useEffect(() => {
    if (workOrder?.propertyFrontPhotos) {
      setPropertyFrontPhotos(workOrder.propertyFrontPhotos);
      return;
    }

    if (workOrder?.propertyId) {
      fetch(`/api/properties/${workOrder.propertyId}/front-photo`)
        .then((r) => r.json())
        .then((data) => {
          if (data.photos) setPropertyFrontPhotos(data.photos);
        })
        .catch(() => {});
    }
  }, [workOrder?.propertyId, workOrder?.propertyFrontPhotos]);

  // Upload property front photo handler
  async function handleFrontPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!workOrder?.propertyId) {
      toast.error("Property link is missing for this work order");
      return;
    }
    setUploadingFrontPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "FRONT");
      const res = await fetch(`/api/properties/${workOrder.propertyId}/front-photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPropertyFrontPhotos([data]);
      toast.success("Property front photo uploaded");
    } catch {
      toast.error("Failed to upload property front photo");
    }
    setUploadingFrontPhoto(false);
    // Reset input
    if (frontPhotoInputRef.current) frontPhotoInputRef.current.value = "";
  }

  // Delete property front photo
  async function handleDeleteFrontPhoto(photoId: string) {
    if (!workOrder?.propertyId) return;
    try {
      await fetch(`/api/properties/${workOrder.propertyId}/front-photo?photoId=${photoId}`, {
        method: "DELETE",
      });
      setPropertyFrontPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Property front photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  }

  async function resizeImage(file: File, maxWidth = 1000): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    // Skip resizing for small files (under 400KB) to preserve EXIF data and avoid unnecessary processing
    if (file.size < 400 * 1024) return file;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
          },
          "image/jpeg",
          0.6
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  // Upload handler — uploads a file directly to Cloudflare R2 via pre-signed URL and saves metadata to DB
  async function handlePhotoUpload(originalFile: File, category: string): Promise<{ url: string; rawUrl?: string; id: string }> {
    const file = await resizeImage(originalFile);
    
    // OFFLINE MODE CHECK
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast("Saved offline. Will sync when back online.", { icon: "📶", style: { background: "#10b981", color: "#fff" } });
      const tempId = `offline-${Date.now()}`;
      await addPhotoToQueue({
        id: tempId,
        workOrderId: id as string,
        category,
        file,
        photoName: file.name
      });
      return {
        url: URL.createObjectURL(file), // mock url for immediate rendering
        rawUrl: URL.createObjectURL(file),
        id: tempId
      };
    }

    try {
      // 1. Get pre-signed PUT upload URL from backend
      const ticketRes = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: id,
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!ticketRes.ok) {
        const err = await ticketRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate R2 upload ticket");
      }

      const { uploadUrl, publicUrl } = await ticketRes.json();

      // 2. PUT raw file directly to Cloudflare R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed to upload "${file.name}" to Cloudflare R2`);
      }

      // 3. Save R2 publicUrl and metadata in the database
      const dbRes = await fetch(`/api/work-orders/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicUrl,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          category,
        }),
      });

      if (!dbRes.ok) {
        const err = await dbRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save file info to database");
      }

      const data = await dbRes.json();
      // Use signed path returned from API for display; always keep publicUrl as the stable raw URL
      const displayUrl = data.path || publicUrl;
      return { url: displayUrl, rawUrl: publicUrl, id: data.id };
    } catch (r2Error: any) {
      console.warn("R2 upload failed or is not configured. Falling back to base64 database upload...", r2Error);
      
      // Fallback: Upload directly to the D1-backed work-order files route (supports multipart form upload)
      // Note: /api/upload/gps-photo uses Prisma which does NOT work on Cloudflare Workers — use D1 route instead
      if (!id) {
        throw new Error("Cannot upload photo: work order ID is missing");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const fallbackRes = await fetch(`/api/work-orders/${id}/files`, {
        method: "POST",
        body: formData,
      });

      if (!fallbackRes.ok) {
        const err = await fallbackRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload photo to database fallback storage");
      }

      const fallbackData = await fallbackRes.json();
      // The files route returns the base64 data in path field when no R2 URL is available
      const savedUrl = fallbackData.path || fallbackData.url || "";
      return { 
        url: savedUrl, 
        rawUrl: savedUrl, 
        id: fallbackData.id 
      };
    }
  }

  // Delete handler — removes a file from the server
  async function handlePhotoDelete(photoId: string) {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    // Only delete from server if it's a persisted file (not a blob)
    if (!photoId.startsWith("temp-") && !photoId.startsWith("gps-")) {
      try {
        await fetch(`/api/work-orders/${id}/files?fileId=${photoId}`, {
          method: "DELETE",
        });
      } catch {
        // Best effort
      }
    }
    // Remove from local state
    setGlobalPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setBidPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setInspectionPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setTasks((prev) => prev.map((t) => ({ ...t, photos: t.photos.filter((p) => p.id !== photoId) })));
    setBids((prev) => prev.map((b) => ({ ...b, photos: (b.photos || []).filter((p) => p.id !== photoId) })));
    setCustomInspectionItems((prev) => prev.map((item) => ({ ...item, photos: (item.photos || []).filter((p) => p.id !== photoId) })));
    toast.success("Photo deleted");
  }

  // GPS Camera capture handler
  function handleGPSCapture(photo: CapturedPhoto) {
    toast("📸 Capturing GPS photo...");
    const tempId = `gps-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const baseName = `gps-${gpsCameraCategory.toLowerCase()}-${Date.now()}.jpg`;
    const photoName =
      gpsCameraTarget === "inspection" && gpsCameraInspectionId?.startsWith("compliance-")
        ? `${gpsCameraInspectionId}-${baseName}`
        : baseName;
    const photoItem: PhotoItem = {
      id: tempId,
      url: photo.url,
      name: photoName,
      size: photo.blob.size,
      category: gpsCameraCategory,
      timestamp: photo.timestamp.toISOString(),
      persisted: false,
    };

    const addInspectionPhoto = (item: PhotoItem) => {
      const customMatch = gpsCameraInspectionId?.match(/^custom-(\d+)$/);
      if (customMatch) {
        const index = parseInt(customMatch[1], 10);
        setCustomInspectionItems((prev) =>
          prev.map((ci, ciIdx) =>
            ciIdx === index ? { ...ci, photos: [...(ci.photos || []), item] } : ci
          )
        );
        return;
      }

      setInspectionPhotos((prev) => [...prev, item]);
    };

    const replaceInspectionPhoto = (item: PhotoItem) => {
      const customMatch = gpsCameraInspectionId?.match(/^custom-(\d+)$/);
      if (customMatch) {
        const index = parseInt(customMatch[1], 10);
        setCustomInspectionItems((prev) =>
          prev.map((ci, ciIdx) =>
            ciIdx === index
              ? { ...ci, photos: (ci.photos || []).map((p) => (p.id === tempId ? item : p)) }
              : ci
          )
        );
        return;
      }

      setInspectionPhotos((prev) => prev.map((p) => (p.id === tempId ? item : p)));
    };

    // Upload in background
    const file = new File([photo.blob], photoName, { type: "image/jpeg" });
    toast("⬆️ Uploading GPS photo...");
    handlePhotoUpload(file, gpsCameraCategory).then((result) => {
      toast.success("GPS photo uploaded successfully");
      const persistedPhoto: PhotoItem = {
        ...photoItem,
        id: result.id,
        url: result.url,
        persisted: true,
      };

      if (gpsCameraTarget === "global") {
        setGlobalPhotos((prev) => prev.map((p) => (p.id === tempId ? persistedPhoto : p)));
      } else if (gpsCameraTarget === "task" && gpsCameraTaskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === gpsCameraTaskId
              ? { ...t, photos: t.photos.map((p) => (p.id === tempId ? persistedPhoto : p)) }
              : t
          )
        );
      } else if (gpsCameraTarget === "bid" && gpsCameraBidId) {
        setBids((prev) =>
          prev.map((b) =>
            b.id === gpsCameraBidId
              ? { ...b, photos: (b.photos || []).map((p) => (p.id === tempId ? persistedPhoto : p)) }
              : b
          )
        );
      } else if (gpsCameraTarget === "inspection") {
        replaceInspectionPhoto(persistedPhoto);
      }
    }).catch((err) => {
      console.error("GPS photo upload failed:", err);
      toast.error(`GPS photo upload failed: ${err.message || "Unknown error"}`);
    });

    // Add to appropriate photo list
    if (gpsCameraTarget === "global") {
      setGlobalPhotos((prev) => [...prev, photoItem]);
    } else if (gpsCameraTarget === "task" && gpsCameraTaskId) {
      setTasks((prev) => prev.map((t) => t.id === gpsCameraTaskId ? { ...t, photos: [...t.photos, photoItem] } : t));
    } else if (gpsCameraTarget === "bid" && gpsCameraBidId) {
      setBids((prev) => prev.map((b) => b.id === gpsCameraBidId ? { ...b, photos: [...(b.photos || []), photoItem] } : b));
    } else if (gpsCameraTarget === "inspection") {
      addInspectionPhoto(photoItem);
    }

    // In multi-capture mode, keep camera open; in single mode, close it
    if (!gpsCameraMultiCapture) {
      setGpsCameraOpen(false);
    }
    toast.success("Photo captured with GPS");
  }

  function openGPSCamera(
    target: "global" | "task" | "bid" | "inspection",
    category: PhotoCategory = "BEFORE",
    taskId?: string,
    bidId?: string,
    inspectionId?: string
  ) {
    setGpsCameraTarget(target);
    setGpsCameraCategory(category);
    setGpsCameraTaskId(taskId || null);
    setGpsCameraBidId(bidId || null);
    setGpsCameraInspectionId(inspectionId || null);
    setGpsCameraOpen(true);
  }

  // Initialize tasks from workOrder data exactly once
  useEffect(() => {
    if (workOrder && !tasksInitialized.current) {
      tasksInitialized.current = true;
      const rawTasks = Array.isArray(workOrder.tasks) ? workOrder.tasks : [];
      // Build a lookup map from file ID to path URL for resolving fileref: references
      const fileMap: Record<string, string> = {};
      if (Array.isArray(workOrder.files)) {
        for (const f of workOrder.files) {
          if (f.id) fileMap[f.id] = f.path || f.url || "";
        }
      }
      function resolvePhotoUrl(p: any): string {
        const raw = p.url || p.path || "";
        if (raw.startsWith("fileref:")) {
          const fileId = raw.slice(8);
          return fileMap[fileId] || "";
        }
        return raw;
      }
      setTasks(
        rawTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          completed: t.completed,
          completedAt: t.completedAt,
          unit: t.unit,
          quantity: t.quantity,
          price: t.price,
          photos: (Array.isArray(t.photos) ? t.photos : []).map((p: any) => ({
            id: p.id || `task-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: resolvePhotoUrl(p),
            rawUrl: p.rawUrl,
            name: p.name || p.originalName || "photo.jpg",
            size: p.size || 0,
            category: p.category || "DURING",
            timestamp: p.timestamp || p.createdAt || new Date().toISOString(),
            persisted: true,
          })).filter((p: any) => p.url),
          expanded: false,
        }))
      );
    }
  }, [workOrder]);

  // Initialize bids from workOrder metadata exactly once
  useEffect(() => {
    if (workOrder && !bidsInitialized.current) {
      bidsInitialized.current = true;
      const rawBids = Array.isArray(workOrder.metadata?.bids) ? workOrder.metadata.bids : [];
      const uniqueRawBidsMap = new Map<string, any>();
      rawBids.forEach((b: any, idx: number) => {
        const key = b.id ? String(b.id) : `${b.title}-${b.amount}-${idx}`;
        if (!uniqueRawBidsMap.has(key)) {
          uniqueRawBidsMap.set(key, b);
        }
      });
      const uniqueRawBids = Array.from(uniqueRawBidsMap.values());

      setBids(
        uniqueRawBids.map((b: any) => ({
          id: b.id,
          title: b.title,
          amount: b.amount,
          description: b.description,
          status: b.status || "PENDING",
          unit: b.unit,
          quantity: b.quantity,
          price: b.price,
          photos: (Array.isArray(b.photos) ? b.photos : []).map((p: any) => ({
            id: p.id || `bid-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: p.url || p.path,
            name: p.name || p.originalName || "photo.jpg",
            size: p.size || 0,
            category: p.category || "BID",
            timestamp: p.timestamp || p.createdAt || new Date().toISOString(),
            persisted: true,
          })),
          expanded: false,
        }))
      );
    }
  }, [workOrder]);

  // Initialize custom inspection items from workOrder metadata exactly once
  useEffect(() => {
    if (workOrder && !inspectionInitialized.current) {
      inspectionInitialized.current = true;
      const rawItems = Array.isArray(workOrder.metadata?.inspectionItems) ? workOrder.metadata.inspectionItems : [];
      setCustomInspectionItems(
        rawItems.map((item: any) => ({
          label: item.label,
          description: item.description,
          required: item.required ?? false,
          completed: item.completed ?? false,
          photos: (Array.isArray(item.photos) ? item.photos : []).map((p: any) => ({
            id: p.id || `inspection-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: p.url || p.path,
            name: p.name || p.originalName || "photo.jpg",
            size: p.size || 0,
            category: p.category || "INSPECTION",
            timestamp: p.timestamp || p.createdAt || new Date().toISOString(),
            persisted: true,
          })),
          expanded: false,
        }))
      );
    }
  }, [workOrder]);

  // Log "viewed" activity once
  useEffect(() => {
    if (workOrder && !viewLogged.current) {
      viewLogged.current = true;
      logActivity.mutate({ action: "WORK_ORDER_VIEWED", details: `Viewed work order "${workOrder.title}"` });
    }
  }, [workOrder]);

  // Auto-save tasks and bids to work order
  useEffect(() => {
    // Skip if state has not finished initializing from DB values
    if (!tasksInitialized.current || !bidsInitialized.current || !inspectionInitialized.current) {
      return;
    }
    // Skip the first run where state matches initial loaded DB values
    if (!isFirstSaveSkipped.current) {
      isFirstSaveSkipped.current = true;
      return;
    }
    if (!workOrder) return;

    // Helper: get a compact storable URL for a photo
    // Avoids embedding large base64 strings in the work order JSON — those are stored in work_order_files.
    function compactUrl(p: PhotoItem): string {
      if (p.rawUrl && !p.rawUrl.startsWith("data:")) return p.rawUrl;
      if (p.url && !p.url.startsWith("data:") && !p.url.startsWith("blob:")) return p.url;
      // Photo was saved via D1 files route — reference it by file ID
      return `fileref:${p.id}`;
    }

    const timeout = setTimeout(() => {
      updateMutation.mutate({
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          completed: t.completed,
          completedAt: t.completedAt,
          unit: t.unit,
          quantity: t.quantity,
          price: t.price,
          photos: t.photos
            .filter((p) => p.persisted && p.id && !p.id.startsWith("temp-") && !p.id.startsWith("gps-"))
            .map((p) => ({
              id: p.id,
              url: compactUrl(p),
              name: p.name,
              size: p.size,
              category: p.category,
              timestamp: p.timestamp,
            })),
        })),
        metadata: {
          ...(workOrder?.metadata || {}),
          bids: bids.map((b) => ({
            id: b.id,
            title: b.title,
            amount: b.amount,
            description: b.description,
            status: b.status,
            unit: b.unit,
            quantity: b.quantity,
            price: b.price,
            photos: (b.photos || [])
              .filter((p) => p.persisted && p.id && !p.id.startsWith("temp-") && !p.id.startsWith("gps-"))
              .map((p) => ({
                id: p.id,
                url: compactUrl(p),
                name: p.name,
                size: p.size,
                category: p.category,
                timestamp: p.timestamp,
              })),
          })),
          inspectionItems: customInspectionItems.map((item) => ({
            label: item.label,
            description: item.description,
            required: item.required,
            completed: item.completed,
            photos: (item.photos || [])
              .filter((p) => p.persisted && p.id && !p.id.startsWith("temp-") && !p.id.startsWith("gps-"))
              .map((p) => ({
                id: p.id,
                url: compactUrl(p),
                name: p.name,
                size: p.size,
                category: p.category,
                timestamp: p.timestamp,
              })),
          })),
        },
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [tasks, bids, customInspectionItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-6 w-6 text-cyan-500 animate-spin" />
          <p className="text-sm text-text-muted">Loading work order...</p>
        </div>
      </div>
    );
  }

  if (workOrderLoadFailed) {
    return (
      <div className="p-8">
        <Card className="mx-auto max-w-xl border-red-200 bg-red-50/60">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Work order could not load
            </h2>
            <p className="mt-2 text-sm text-text-dim">
              The order is still in the database, but the page could not read it right now.
            </p>
            <p className="mt-3 rounded-md bg-slate-950/60 border border-white/10 px-3 py-2 text-xs text-slate-100 break-words max-h-40 overflow-y-auto font-mono text-left">
              {workOrderLoadError instanceof Error
                ? workOrderLoadError.message
                : "Unknown load error"}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button type="button" onClick={() => refetchWorkOrder()}>
                Retry
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/work-orders")}
              >
                Back to Work Orders
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-8">
        <Card className="mx-auto max-w-xl">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-text-secondary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Work order not found
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              No work order was returned for ID {id}.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => router.push("/dashboard/work-orders")}
            >
              Back to Work Orders
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const invoiceStatusColors: Record<string, string> = {
    DRAFT: "bg-surface-hover text-text-muted",
    SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-surface-hover text-text-secondary",
  };

  const canEdit = ["ADMIN", "COORDINATOR", "PROCESSOR"].includes(role);
  const canAssign = ["ADMIN", "COORDINATOR"].includes(role);

  async function handleStatusChange() {
    if (!newStatus) return;
    try {
      await updateMutation.mutateAsync({ status: newStatus });
      toast.success("Status updated");
      setEditingStatus(false);
    } catch {
      toast.error("Failed to update status");
    }
  }

  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalBids = bids.reduce((s, b) => s + b.amount, 0);
  const approvedBids = bids
    .filter((b) => b.status === "APPROVED")
    .reduce((s, b) => s + b.amount, 0);

  const allPhotos = [
    ...globalPhotos,
    ...bidPhotos,
    ...inspectionPhotos,
    ...tasks.flatMap((t) => t.photos),
    ...bids.flatMap((b) => b.photos || []),
    ...customInspectionItems.flatMap((item) => item.photos || []),
  ];
  const beforePhotos = allPhotos.filter((p) => p.category === "BEFORE");
  const duringPhotos = allPhotos.filter((p) => p.category === "DURING");
  const afterPhotos = allPhotos.filter((p) => p.category === "AFTER");
  const bidPhotoItems = allPhotos.filter((p) => p.category === "BID");
  const inspectionPhotoItems = allPhotos.filter((p) => p.category === "INSPECTION");
  const taskPhotoCount = tasks.reduce((sum, task) => sum + (task.photos?.length || 0), 0);
  const bidItemPhotoCount = bids.reduce((sum, bid) => sum + (bid.photos?.length || 0), 0);
  const inspectionItemPhotoCount =
    customInspectionItems.reduce((sum, item) => sum + (item.photos?.length || 0), 0);
  const itemPhotoSections = [
    ...(beforePhotos.length > 0 ? [{ type: "Operational", label: "Before Photos", photos: beforePhotos }] : []),
    ...(duringPhotos.length > 0 ? [{ type: "Operational", label: "During Photos", photos: duringPhotos }] : []),
    ...(afterPhotos.length > 0 ? [{ type: "Operational", label: "After Photos", photos: afterPhotos }] : []),
    ...tasks
      .filter((task) => task.photos?.length > 0)
      .map((task) => ({ type: "Task", label: task.title, photos: task.photos || [] })),
    ...bids
      .filter((bid) => bid.photos?.length > 0)
      .map((bid) => ({ type: "Bid", label: bid.title, photos: bid.photos || [] })),
    ...customInspectionItems
      .filter((item) => item.photos?.length > 0)
      .map((item) => ({ type: "Inspection", label: item.label, photos: item.photos || [] })),
  ];
  const itemPhotoCount = allPhotos.length;

  const photoTabEntries = itemPhotoSections.flatMap((section) =>
    section.photos.map((photo: any) => ({ photo, section }))
  );

  function safePhotoFileName(value: string) {
    return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "photo";
  }

  function photoStampDate(photo: any, customValue?: string) {
    const raw = customValue || photo.timestamp || photo.createdAt || photo.updatedAt || photo.date;
    const parsed = raw ? new Date(raw) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function photoStampText(photo: any, mode: typeof photoTabDownloadMode, customValue?: string) {
    const date = photoStampDate(photo, mode === "custom" ? customValue : undefined);
    if (mode === "date") return date.toLocaleDateString();
    if (mode === "datetime" || mode === "custom") return date.toLocaleString();
    const exifParts = [
      photo.category ? `Category: ${photo.category}` : null,
      photo.latitude && photo.longitude ? `GPS: ${photo.latitude}, ${photo.longitude}` : null,
      photo.camera ? `Camera: ${photo.camera}` : null,
      photo.uploader?.name ? `Uploader: ${photo.uploader.name}` : null,
    ].filter(Boolean);
    return `${date.toLocaleString()}${exifParts.length ? ` | ${exifParts.join(" | ")}` : " | EXIF data unavailable"}`;
  }

  async function getPhotoTabDownloadFile(photo: any, customFileName: string): Promise<ZipFileInput | null> {
    const src = photo.url || photo.path;
    if (!src) return null;
    const getOriginal = async () => {
      const response = await fetch(src, { cache: "no-store" });
      if (!response.ok) throw new Error("Photo fetch failed");
      return { name: `${customFileName}.jpg`, blob: await response.blob() };
    };
    if (photoTabDownloadMode === "none") {
      return getOriginal();
    }
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(img, 0, 0);
      const fontSize = Math.max(18, Math.floor(canvas.width / 42));
      const pad = Math.max(14, Math.floor(fontSize * 0.75));
      const lineHeight = Math.floor(fontSize * 1.35);
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
      ctx.fillRect(0, canvas.height - lineHeight - pad, canvas.width, lineHeight + pad);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(photoStampText(photo, photoTabDownloadMode, photoTabCustomDateTime), pad, canvas.height - pad);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Photo export failed");
      return { name: `${customFileName}-${photoTabDownloadMode}.jpg`, blob };
    } catch {
      return getOriginal();
    }
  }

  async function downloadPhotoFromTab(photo: any, sectionType: string, sectionLabel: string) {
    const cleanLabel = sectionLabel.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
    const customName = `${sectionType.toLowerCase() === "task" ? "task " : ""}${cleanLabel}`;
    const file = await getPhotoTabDownloadFile(photo, customName);
    if (!file) return;
    const href = URL.createObjectURL(file.blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  async function downloadAllPhotoTabPhotos() {
    if (photoTabEntries.length === 0) return;
    setPhotoTabDownloading(true);
    try {
      const files: ZipFileInput[] = [];
      const counters: { [key: string]: number } = {};

      for (const entry of photoTabEntries) {
        try {
          const type = entry.section.type;
          const label = entry.section.label;
          const category = (entry.photo.category || "general").toLowerCase();
          const counterKey = `${type}-${label}-${category}`.toLowerCase();
          counters[counterKey] = (counters[counterKey] || 0) + 1;
          const index = counters[counterKey];

          const customName = getSanitizedFileName(type, label, entry.photo, index);
          const file = await getPhotoTabDownloadFile(entry.photo, customName);
          if (file) files.push(file);
        } catch (err) {
          console.error(`Failed to download photo ${entry.photo.name || "photo"}:`, err);
        }
      }
      if (files.length > 0) {
        const zip = await createStoredZip(files);
        const href = URL.createObjectURL(zip);
        const link = document.createElement("a");
        link.href = href;
        link.download = `work-order-photos-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(href);
        toast.success(`Successfully archived ${files.length} of ${photoTabEntries.length} photos`);
      } else {
        toast.error("Could not download any photos. Check CORS configuration or network.");
      }
    } catch (e: any) {
      toast.error("Archive download failed");
    } finally {
      setPhotoTabDownloading(false);
    }
  }

  const complianceItems = getComplianceItems(
    workOrder.serviceType,
    workOrder,
    tasks,
    allPhotos
  );

  const tabs: { id: string; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "tasks", label: "Tasks", icon: CheckCircle2, count: totalTasks },
    { id: "bids", label: "Bids", icon: DollarSign, count: bids.length },
    { id: "inspection", label: "Inspection", icon: Shield },
    { id: "photos", label: "Photos", icon: Camera, count: itemPhotoCount },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "history", label: "Property History", icon: Calendar, count: (propertyHistoryData?.workOrders?.length || 0) },
    { id: "messages", label: "Messages", icon: MessageSquare, count: workOrder._count?.threads || 0 },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-surface/60 border border-border-subtle backdrop-blur-xl p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                WO-{workOrder.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight leading-none">
                {workOrder.title}
              </h1>
              <Badge
                className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-lg", STATUS_COLORS[workOrder.status])}
              >
                {STATUS_LABELS[workOrder.status]}
              </Badge>
              <OverdueCountdown
                dueDate={workOrder.dueDate}
                status={workOrder.status}
                size="md"
                showIcon
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-text-secondary">
              <span className="flex items-center gap-2 group transition-colors hover:text-cyan-700 dark:text-cyan-400">
                <MapPin className="h-4 w-4 text-cyan-500/70" />
                <span className="truncate max-w-[250px]">
                  {workOrder.address}{workOrder.city && `, ${workOrder.city}`}{workOrder.state && `, ${workOrder.state}`}
                </span>
              </span>
              <span className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-hover text-[11px] font-bold uppercase tracking-wider text-text-muted border border-border-subtle">
                <Activity className="h-3.5 w-3.5 text-text-muted" />
                {SERVICE_TYPE_LABELS[workOrder.serviceType]}
              </span>
              <span className="flex items-center gap-2 group transition-colors hover:text-violet-700 dark:text-violet-400">
                <Calendar className="h-4 w-4 text-violet-500/70" />
                {workOrder.dueDate ? formatDate(workOrder.dueDate) : "No due date"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border-subtle pt-6">
              {workOrder.contractor && (
                <div className="flex items-center gap-2.5 bg-surface-hover px-3 py-1.5 rounded-2xl border border-border-subtle">
                  <Avatar name={workOrder.contractor.name} src={workOrder.contractor.image} size="xs" />
                  <div className="text-[10px]">
                    <p className="text-text-muted font-bold uppercase tracking-tighter leading-none mb-0.5">Contractor</p>
                    <p className="text-text-primary font-semibold">{workOrder.contractor.name}</p>
                  </div>
                </div>
              )}
              {workOrder.coordinator && (
                <div className="flex items-center gap-2.5 bg-surface-hover px-3 py-1.5 rounded-2xl border border-border-subtle">
                  <Avatar name={workOrder.coordinator.name} src={workOrder.coordinator.image} size="xs" />
                  <div className="text-[10px]">
                    <p className="text-text-muted font-bold uppercase tracking-tighter leading-none mb-0.5">Coordinator</p>
                    <p className="text-text-primary font-semibold">{workOrder.coordinator.name}</p>
                  </div>
                </div>
              )}
              {workOrder.createdBy && (
                <div className="flex items-center gap-2.5 bg-surface-hover px-3 py-1.5 rounded-2xl border border-border-subtle">
                  <Avatar name={workOrder.createdBy.name} src={workOrder.createdBy.image} size="xs" />
                  <div className="text-[10px]">
                    <p className="text-text-muted font-bold uppercase tracking-tighter leading-none mb-0.5">Client</p>
                    <p className="text-text-primary font-semibold">{workOrder.createdBy.name}</p>
                  </div>
                </div>
              )}
            </div>


          </div>

          <div className="flex flex-wrap items-center gap-2 self-start w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={() => setShowQuickView(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-hover text-text-primary hover:bg-surface-hover border border-border-medium transition-all text-xs font-bold uppercase tracking-wider"
            >
              <FileText className="h-3.5 w-3.5" />
              Quick View
            </button>
            <button
              onClick={() =>
                printWorkOrder({
                  workOrder,
                  tasks,
                  bids,
                  photos: allPhotos,
                  complianceItems,
                  invoices: workOrder.invoices || [],
                })
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-hover text-text-primary hover:bg-surface-hover border border-border-medium transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 border border-cyan-400/20 shadow-lg shadow-cyan-500/10 transition-all text-xs font-bold uppercase tracking-wider"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await createMutation.mutateAsync({
                        title: `${workOrder.title} (Copy)`,
                        description: workOrder.description || "",
                        address: workOrder.address || "",
                        city: workOrder.city || "",
                        state: workOrder.state || "",
                        zipCode: workOrder.zipCode || "",
                        serviceType: workOrder.serviceType || "OTHER",
                        dueDate: workOrder.dueDate || "",
                        priority: workOrder.priority ?? 0,
                        lockCode: workOrder.lockCode || "",
                        gateCode: workOrder.gateCode || "",
                        keyCode: workOrder.keyCode || "",
                        specialInstructions: workOrder.specialInstructions || "",
                      });
                      toast.success("Work order duplicated");
                      router.push(`/dashboard/work-orders/${res.id}`);
                    } catch {
                      toast.error("Failed to duplicate work order");
                    }
                  }}
                  className="p-2.5 rounded-xl bg-surface-hover text-text-primary hover:bg-surface-hover border border-border-medium transition-all shadow-lg"
                  title="Duplicate Work Order"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress Summary Bar ──────────────────────────────────────────── */}
      {/* ── Progress Summary Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-4 group hover:bg-surface-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Tasks</span>
            </div>
            <p className="text-lg font-black text-text-primary">
              {completedTasks}<span className="text-xs text-text-dim ml-1">/ {totalTasks}</span>
            </p>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>

        <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-4 group hover:bg-surface-hover transition-all">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Bids</span>
            </div>
            <p className="text-lg font-black text-text-primary">
              ${totalBids.toLocaleString()}
            </p>
          </div>
          {approvedBids > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">
                ${approvedBids.toLocaleString()} approved
              </p>
            </div>
          )}
        </div>

        <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-4 group hover:bg-surface-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Camera className="h-4 w-4 text-violet-700 dark:text-violet-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Gallery</span>
            </div>
            <p className="text-lg font-black text-text-primary">{allPhotos.length}</p>
          </div>
          <div className="flex gap-1 mt-2">
            {[
              { photos: beforePhotos, color: "bg-amber-500", label: "B" },
              { photos: duringPhotos, color: "bg-cyan-500", label: "D" },
              { photos: afterPhotos, color: "bg-emerald-500", label: "A" },
              { photos: bidPhotoItems, color: "bg-rose-500", label: "$" },
              { photos: inspectionPhotoItems, color: "bg-violet-500", label: "I" },
            ].map((s) => (
              <div
                key={s.label}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  s.photos.length > 0 ? s.color + " shadow-[0_0_8px_" + s.color.replace('bg-', 'rgba(') + ",0.4)]" : "bg-surface-hover"
                }`}
                title={`${s.photos.length} ${s.label} photos`}
              />
            ))}
          </div>
        </div>

        <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-4 group hover:bg-surface-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Compliance</span>
            </div>
            <p className="text-lg font-black text-text-primary">
              {complianceItems.filter((c) => c.completed).length}<span className="text-xs text-text-dim ml-1">/ {complianceItems.length}</span>
            </p>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
              style={{
                width: `${
                  complianceItems.length > 0
                    ? (complianceItems.filter((c) => c.completed).length /
                        complianceItems.length) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface/60 backdrop-blur-xl rounded-2xl border border-border-subtle overflow-x-auto hide-scrollbar sticky top-0 z-20 shadow-2xl md:flex-wrap flex-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 whitespace-nowrap group relative flex-1 md:min-w-max justify-center flex-shrink-0",
              activeTab === tab.id
                ? "text-cyan-700 dark:text-cyan-400"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 rounded-lg border border-cyan-500/30 shadow-[0_4px_15px_rgba(6,182,212,0.1)]" />
            )}
            <tab.icon className={cn(
              "h-3 w-3 relative z-10 transition-transform duration-300",
              activeTab === tab.id ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] relative z-10">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1 py-0.5 rounded text-[7px] font-black relative z-10 transition-all",
                  activeTab === tab.id
                    ? "bg-cyan-500/30 text-cyan-200 shadow-inner ring-1 ring-cyan-500/30"
                    : "bg-surface-hover text-text-dim group-hover:text-text-secondary group-hover:bg-surface-hover"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Current Status + Property Front Photo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative overflow-hidden flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border border-amber-500/20 bg-surface/60 backdrop-blur-xl shadow-xl">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Activity className="h-16 w-16 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="h-14 w-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <Activity className="h-7 w-7 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="text-center relative z-10">
                  <p className="text-sm font-black text-text-primary uppercase tracking-widest mb-2">Current Status</p>
                  {editingStatus ? (
                    <div className="space-y-2 min-w-[200px]">
                      <Select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        options={Object.entries(STATUS_LABELS).map(([val, label]) => ({ value: val, label }))}
                        className="bg-surface-hover border-border-medium text-text-primary text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleStatusChange}
                          disabled={updateMutation.isPending}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                        >
                          {updateMutation.isPending ? "Saving..." : "Apply"}
                        </button>
                        <button
                          onClick={() => setEditingStatus(false)}
                          className="px-3 py-1.5 rounded-lg bg-surface-hover text-white text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Badge
                        className={cn("text-xs px-5 py-1.5 uppercase tracking-[0.15em] shadow-lg shadow-black/40", STATUS_COLORS[workOrder.status])}
                      >
                        {STATUS_LABELS[workOrder.status]}
                      </Badge>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setNewStatus(workOrder.status);
                            setEditingStatus(true);
                          }}
                          className="mt-2 text-[10px] font-black text-cyan-700 dark:text-cyan-400 hover:text-cyan-700 dark:text-cyan-300 uppercase tracking-widest transition-all"
                        >
                          Update State
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => frontPhotoInputRef.current?.click()}
                disabled={uploadingFrontPhoto}
                className="relative overflow-hidden group flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border border-sky-500/20 bg-surface/60 backdrop-blur-xl hover:border-sky-500/40 hover:bg-sky-500/[0.08] transition-all shadow-xl disabled:opacity-50"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 className="h-16 w-16 text-sky-700 dark:text-sky-400" />
                </div>
                <div className="h-14 w-14 rounded-2xl bg-sky-500/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all">
                  {uploadingFrontPhoto ? (
                    <Loader2 className="h-7 w-7 text-sky-700 dark:text-sky-400 animate-spin" />
                  ) : (
                    <Building2 className="h-7 w-7 text-sky-700 dark:text-sky-400" />
                  )}
                </div>
                <div className="text-center relative z-10">
                  <p className="text-sm font-black text-text-primary uppercase tracking-widest">Property Front</p>
                  <p className="text-[10px] text-sky-500/70 font-bold mt-1">GLOBAL PROPERTY ASSET</p>
                </div>
              </button>
              <input
                ref={frontPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleFrontPhotoUpload}
                className="hidden"
              />
            </div>

            {/* Property Front Photos Display */}
            {propertyFrontPhotos.length > 0 && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-sky-700 dark:text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Main Property Photo</h3>
                      <p className="text-[9px] font-bold text-text-muted">GLOBAL ASSET • SHARED</p>
                    </div>
                  </div>
                  <button
                    onClick={() => frontPhotoInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-surface-hover text-[10px] font-bold text-sky-700 dark:text-sky-400 hover:bg-surface-hover border border-border-subtle transition-all uppercase tracking-tighter"
                  >
                    Replace Asset
                  </button>
                </div>
                <div className="p-4">
                  {propertyFrontPhotos.slice(0, 1).map((photo: any) => (
                    <div
                      key={photo.id}
                      onClick={() => setPropertyFrontViewerOpen(true)}
                      className="relative group rounded-2xl overflow-hidden aspect-[16/9] bg-surface-hover border border-border-subtle hover:border-sky-500/40 transition-all cursor-pointer shadow-inner"
                    >
                      <img
                        src={photo.url || photo.path}
                        alt={photo.originalName || "Property Front"}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-surface-hover backdrop-blur-md border border-border-medium flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
                          <ZoomIn className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-sky-500 text-white shadow-lg uppercase tracking-[0.1em]">
                          Verified Front
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFrontPhoto(photo.id);
                        }}
                        className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-rose-500/90 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-rose-500 shadow-lg scale-75 group-hover:scale-100"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {workOrder.description && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Project Scope</h3>
                  <button
                    onClick={() => setExpandedProjectScope(!expandedProjectScope)}
                    className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-700 dark:text-cyan-300 uppercase tracking-tighter transition-all"
                  >
                    {expandedProjectScope ? "Collapse" : "Expand"}
                  </button>
                </div>
                <div className={`p-4 rounded-xl bg-surface-hover border border-border-subtle overflow-y-auto scrollbar-none transition-all duration-300 ${expandedProjectScope ? "max-h-none" : "h-[240px]"}`}>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed italic">
                    {workOrder.description}
                  </p>
                </div>
              </div>
            )}

            {/* Recent Tasks Preview */}
            {tasks.length > 0 && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-xl group">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-hover">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Task Snapshot</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-700 dark:text-cyan-300 uppercase tracking-tighter"
                  >
                    Manage Tasks →
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-hover border border-border-subtle hover:border-border-medium hover:bg-surface-hover transition-all group/item"
                    >
                      <div className="relative flex-shrink-0">
                        {task.completed ? (
                          <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-border-medium group-hover/item:border-cyan-500/50 transition-colors" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium transition-colors",
                          task.completed
                            ? "line-through text-text-muted"
                            : "text-text-primary group-hover/item:text-white"
                        )}
                      >
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="text-[10px] text-text-muted italic line-clamp-1 group-hover/item:line-clamp-none transition-all ml-1">
                          — {task.description}
                        </span>
                      )}
                      {task.photos.length > 0 && (
                        <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-hover border border-border-subtle">
                          <Camera className="h-3 w-3 text-text-muted" />
                          <span className="text-[9px] font-black text-text-secondary">{task.photos.length}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <div className="pt-2 text-center">
                      <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                        +{tasks.length - 5} Supplemental Tasks
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity history */}
            <div className="bg-surface/40 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">History & Activity</h3>
                {workOrder.history?.length > 5 && (
                  <button
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-700 dark:text-cyan-300 uppercase tracking-tighter"
                  >
                    {showAllHistory ? "Show less" : `View all (${workOrder.history.length})`}
                  </button>
                )}
              </div>
              <div className="p-5">
                {workOrder.history?.length > 0 ? (
                  <div className="space-y-4">
                    {(showAllHistory ? workOrder.history : workOrder.history.slice(0, 5))
                      .filter((entry: any) => {
                        const d = (entry.details || "").toLowerCase();
                        if (d.startsWith("updated task") && d.includes("metadata")) return false;
                        if (d === "viewed work order" || d.startsWith("work order viewed")) return false;
                        if (d.startsWith("auto-saved") || d === "updated work order") return false;
                        return true;
                      })
                      .map((entry: any) => (
                        <div key={entry.id} className="flex gap-4 group relative">
                          <div className="absolute left-[7px] top-6 bottom-0 w-px bg-surface-hover group-last:hidden" />
                          <div className="h-4 w-4 rounded-full bg-surface border-2 border-border-medium flex-shrink-0 mt-1 flex items-center justify-center z-10">
                            <div className="h-1 w-1 rounded-full bg-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0 pb-2">
                            <p className="text-sm text-text-secondary leading-snug">{entry.details}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-text-muted uppercase">{entry.user?.name}</span>
                              <span className="text-[10px] text-text-dim">•</span>
                              <span className="text-[10px] text-text-dim">{formatDateTime(entry.createdAt)}</span>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/work-orders/${id}/activity?entryId=${entry.id}`, { method: "DELETE" });
                                toast.success("Activity removed");
                              } catch { toast.error("Failed to remove"); }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 text-text-dim hover:text-rose-700 dark:text-rose-400 transition-all flex-shrink-0 self-start"
                            title="Remove this entry"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="h-8 w-8 text-slate-800 mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-text-dim italic">No significant activity recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Coordinator */}
            {workOrder.coordinator && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield className="h-12 w-12 text-cyan-700 dark:text-cyan-400" />
                </div>
                <div className="flex items-center gap-4 mb-5 relative z-10">
                  <div className="relative">
                    <Avatar
                      name={workOrder.coordinator.name}
                      src={workOrder.coordinator.image}
                      size="lg"
                      className="ring-2 ring-cyan-500/20"
                    />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-border-subtle rounded-full shadow-lg shadow-emerald-500/20" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-text-primary tracking-tight">
                      {workOrder.coordinator.name}
                    </h4>
                    <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Lead Coordinator</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  {workOrder.coordinator.phone && (
                    <CallOptionModal phoneNumber={workOrder.coordinator.phone}>
                      <button className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-hover border border-border-subtle hover:bg-surface-hover hover:border-border-medium transition-all text-text-secondary">
                        <Phone className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Call</span>
                      </button>
                    </CallOptionModal>
                  )}
                  {workOrder.coordinator.email && (
                    <a
                      href={`mailto:${workOrder.coordinator.email}`}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-hover border border-border-subtle hover:bg-surface-hover hover:border-border-medium transition-all text-text-secondary"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Email</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-1.5 shadow-xl">
              <div className="flex flex-col">
                <button
                  onClick={() => setActiveTab("messages")}
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-hover group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageSquare className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                    </div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-dim">{workOrder._count?.threads || 0}</span>
                    <ChevronRight className="h-3 w-3 text-text-dim" />
                  </div>
                </button>
                <Link
                  href="/dashboard/invoices"
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-hover group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Receipt className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Invoices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-dim">{workOrder._count?.invoices || 0}</span>
                    <ChevronRight className="h-3 w-3 text-text-dim" />
                  </div>
                </Link>
                <button
                  onClick={() =>
                    printWorkOrder({
                      workOrder,
                      tasks,
                      bids,
                      photos: allPhotos,
                      complianceItems,
                      invoices: workOrder.invoices || [],
                    })
                  }
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-hover group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Printer className="h-4 w-4 text-violet-700 dark:text-violet-400" />
                    </div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Report</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-text-dim" />
                </button>
              </div>
            </div>

            {/* Document Upload */}
            <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Documents</h3>
                    <p className="text-[9px] text-text-dim">Upload required files</p>
                  </div>
                </div>
                <button
                  onClick={() => documentUploadRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-surface-hover text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-surface-hover border border-border-subtle transition-all uppercase tracking-tighter"
                >
                  <Upload className="h-3 w-3 inline mr-1" />
                  Upload
                </button>
                <input
                  ref={documentUploadRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.png,.jpg,.jpeg"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    for (const file of Array.from(files)) {
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("category", "DOCUMENT");
                        const res = await fetch(`/api/work-orders/${id}/files`, { method: "POST", body: formData });
                        if (res.ok) {
                          toast.success(`Uploaded ${file.name}`);
                        } else {
                          toast.error(`Failed: ${file.name}`);
                        }
                      } catch {
                        toast.error(`Failed: ${file.name}`);
                      }
                    }
                    e.target.value = "";
                    queryClient.invalidateQueries({ queryKey: ["work-order", id] });
                  }}
                  className="hidden"
                />
              </div>
              <div className="p-4">
                {workOrder.files?.filter((f: any) => !f.mimeType?.startsWith("image/")).length > 0 ? (
                  <div className="space-y-2">
                    {workOrder.files
                      .filter((f: any) => !f.mimeType?.startsWith("image/"))
                      .map((file: any) => (
                        <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle group">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{file.originalName}</p>
                            <p className="text-[10px] text-text-dim">{file.mimeType} • {new Date(file.createdAt).toLocaleDateString()}</p>
                          </div>
                          <a
                            href={file.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-cyan-700 dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (!files?.length) return;
                      for (const file of Array.from(files)) {
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("category", "DOCUMENT");
                          const res = await fetch(`/api/work-orders/${id}/files`, { method: "POST", body: formData });
                          if (res.ok) toast.success(`Uploaded ${file.name}`);
                          else toast.error(`Failed: ${file.name}`);
                        } catch {
                          toast.error(`Failed: ${file.name}`);
                        }
                      }
                      queryClient.invalidateQueries({ queryKey: ["work-order", id] });
                    }}
                    onClick={() => documentUploadRef.current?.click()}
                    className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border-medium rounded-xl cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all"
                  >
                    <Upload className="h-6 w-6 text-text-dim mb-2" />
                    <p className="text-xs text-text-muted font-medium">Drop files or click to upload</p>
                    <p className="text-[10px] text-text-dim mt-1">PDF, DOC, XLS, CSV, JSON, images</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Assistant - Floating */}
            <div className="relative group hidden md:block">
              {showAIChat ? (
                <div className="bg-surface/95 backdrop-blur-2xl rounded-[2rem] border border-border-medium shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <Sparkles className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-text-primary uppercase tracking-widest leading-none">Aura Intelligence</h4>
                        <p className="text-[8px] font-bold text-cyan-500/70 uppercase tracking-tighter mt-1">Operational Support System</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAIChat(false)}
                      className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-foreground dark:hover:text-white transition-all active:scale-95"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative z-10">
                    <AIChat
                      embedded
                      context={{
                        type: "work_order",
                        id: workOrder.id,
                        title: workOrder.title,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAIChat(true)}
                  className="w-full bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-5 shadow-xl hover:border-cyan-500/40 hover:shadow-cyan-500/10 transition-all text-left relative overflow-hidden group/ai"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/ai:opacity-20 transition-all group-hover/ai:scale-110">
                    <Sparkles className="h-16 w-16 text-cyan-700 dark:text-cyan-400" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-lg">
                        <Sparkles className="h-5 w-5 text-cyan-700 dark:text-cyan-400 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-text-primary tracking-tight">Need Assistance?</h4>
                        <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest">Aura v2.4 Active</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed max-w-[180px]">
                      Ask questions about this work order, compliance, or logistics.
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Tasks</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-hover text-text-muted">
                {completedTasks}/{totalTasks}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openGPSCamera("global", "BEFORE")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium border border-emerald-500/20"
              >
                <MapPin className="h-3.5 w-3.5" />
                GPS Camera
              </button>
              {tasks.some((t) => t.photos?.length > 0) && (
                <button
                  onClick={() => setAllPhotosModal({ open: true, source: "tasks" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors text-xs font-medium border border-cyan-500/20"
                >
                  <Camera className="h-3.5 w-3.5" />
                  View All Photos
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-[10px]">
                    {tasks.reduce((s, t) => s + (t.photos?.length || 0), 0)}
                  </span>
                </button>
              )}
            </div>
          </div>
          <Card padding={false}>
            <TaskEntryList
              tasks={tasks}
              onTasksChange={setTasks}
              serviceType={workOrder.serviceType}
              onUpload={handlePhotoUpload}
              onOpenCamera={(category, taskId) => openGPSCamera("task", category as PhotoCategory, taskId)}
            />
          </Card>
        </div>
      )}

      {activeTab === "bids" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Bids</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-hover text-text-muted">
                {bids.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {bids.some((b) => b.photos?.length > 0) && (
                <button
                  onClick={() => setAllPhotosModal({ open: true, source: "bids" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-500/20 transition-colors text-xs font-medium border border-violet-500/20"
                >
                  <Camera className="h-3.5 w-3.5" />
                  View All Photos
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-[10px]">
                    {bids.reduce((s, b) => s + (b.photos?.length || 0), 0)}
                  </span>
                </button>
              )}
            </div>
          </div>
          <Card padding={false}>
            <div className="p-4">
              <BidEntryList bids={bids} onBidsChange={setBids} onUpload={handlePhotoUpload} onOpenCamera={(category, bidId) => openGPSCamera("bid", category as PhotoCategory, undefined, bidId)} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "inspection" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Shield className="h-5 w-5 text-violet-700 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Property Inspection</h3>
                <p className="text-[10px] font-bold text-text-muted">
                  {customInspectionItems.filter(c => c.completed).length} of {customInspectionItems.length} inspection items verified
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddInspection(true)}
                className="px-3.5 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-violet-500/20 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Inspection Item</span>
              </button>

              {customInspectionItems.length > 0 && (
                <div className="text-right">
                  <span className="text-lg font-black text-violet-700 dark:text-violet-400 leading-none">
                    {Math.round((customInspectionItems.filter(c => c.completed).length / customInspectionItems.length) * 100)}%
                  </span>
                  <p className="text-[9px] font-black text-text-dim uppercase tracking-tighter">Inspection Score</p>
                </div>
              )}
            </div>
          </div>

          {/* Inspection Items List */}
          {customInspectionItems.length === 0 && !showAddInspection ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-border-medium bg-surface/40 backdrop-blur-md space-y-4">
              <div className="h-14 w-14 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-700 dark:text-violet-400">
                <Shield className="h-7 w-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-extrabold text-text-primary">No Inspection Items Added</h4>
                <p className="text-xs text-text-muted">
                  Add custom property inspection targets to track damage assessments, safety findings, or condition reports with photos.
                </p>
              </div>
              <button
                onClick={() => setShowAddInspection(true)}
                className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Inspection Item</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {customInspectionItems.map((item, i) => (
                <div
                  key={`custom-${i}`}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                    item.completed
                      ? "bg-emerald-500/10 border-emerald-500/20 shadow-md"
                      : "bg-surface/60 backdrop-blur-md border-border-subtle hover:border-border-subtle"
                  )}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <button
                      onClick={() => {
                        setCustomInspectionItems((prev) =>
                          prev.map((ci, ciIdx) =>
                            ciIdx === i ? { ...ci, completed: !ci.completed } : ci
                          )
                        );
                      }}
                      className="relative flex-shrink-0"
                    >
                      {item.completed ? (
                        <div className="h-6 w-6 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-lg border-2 border-border-medium hover:border-cyan-500/50 flex items-center justify-center transition-all">
                          <div className="h-2 w-2 rounded-sm bg-surface-hover opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingInspectionIdx === i ? (
                        <div className="space-y-3 py-1">
                          <input
                            type="text"
                            value={editInspectionLabel}
                            onChange={(e) => setEditInspectionLabel(e.target.value)}
                            className="w-full px-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editInspectionDesc}
                            onChange={(e) => setEditInspectionDesc(e.target.value)}
                            placeholder="Additional instructions..."
                            className="w-full px-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-secondary focus:border-cyan-500/50 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (!editInspectionLabel.trim()) return;
                                setCustomInspectionItems((prev) =>
                                  prev.map((ci, ciIdx) =>
                                    ciIdx === i ? { ...ci, label: editInspectionLabel.trim(), description: editInspectionDesc.trim() || undefined } : ci
                                  )
                                );
                                setEditingInspectionIdx(null);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingInspectionIdx(null)} className="px-4 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h4 className={cn("text-sm font-bold", item.completed ? "text-text-secondary" : "text-text-primary")}>{item.label}</h4>
                          {item.description && <p className="text-[11px] text-text-muted mt-1 italic line-clamp-1 group-hover:line-clamp-none transition-all">{item.description}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-surface-hover border border-border-subtle rounded-xl p-1 gap-1">
                        <button
                          onClick={() => {
                            setCustomInspectionItems((prev) =>
                              prev.map((ci, ciIdx) => ciIdx === i ? { ...ci, expanded: !ci.expanded } : ci)
                            );
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            item.expanded ? "bg-cyan-500 text-white shadow-lg" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                          )}
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                        <div className="w-px h-4 bg-surface-hover mx-0.5" />
                        <button
                          onClick={() => {
                            setEditingInspectionIdx(i);
                            setEditInspectionLabel(item.label);
                            setEditInspectionDesc(item.description || "");
                          }}
                          className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setCustomInspectionItems((prev) => prev.filter((_, ciIdx) => ciIdx !== i));
                          }}
                          className="p-2 rounded-lg text-text-muted hover:text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setCustomInspectionItems((prev) =>
                            prev.map((ci, ciIdx) => ciIdx === i ? { ...ci, expanded: !ci.expanded } : ci)
                          );
                        }}
                        className="p-2 rounded-xl text-text-dim hover:text-text-secondary transition-all ml-1"
                      >
                        {item.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {item.expanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-border-subtle bg-surface-hover">
                      <PhotoUploadSection
                        photos={item.photos}
                        onPhotosChange={(photos) => {
                          setCustomInspectionItems((prev) =>
                            prev.map((ci, ciIdx) => ciIdx === i ? { ...ci, photos } : ci)
                          );
                        }}
                        onUpload={handlePhotoUpload}
                        onOpenCamera={(category) => openGPSCamera("inspection", category as PhotoCategory, undefined, undefined, `custom-${i}`)}
                        title={`${item.label} Evidence`}
                        singleBucket
                        singleBucketCategory="INSPECTION"
                        showCategories={["INSPECTION"]}
                        compact
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showAddInspection ? (
              <div className="p-6 rounded-3xl border border-border-medium bg-surface/60 backdrop-blur-xl shadow-2xl space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                  </div>
                  <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">New Inspection Target</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Item Label</label>
                    <input
                      type="text"
                      value={newInspectionLabel}
                      onChange={(e) => setNewInspectionLabel(e.target.value)}
                      placeholder="e.g., Attic Mold Assessment"
                      className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Assessment Directions</label>
                    <textarea
                      value={newInspectionDesc}
                      onChange={(e) => setNewInspectionDesc(e.target.value)}
                      placeholder="Describe what needs to be inspected or documented..."
                      rows={3}
                      className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-xs text-text-secondary focus:border-cyan-500/50 focus:outline-none resize-none shadow-inner"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!newInspectionLabel.trim()) return;
                      setCustomInspectionItems((prev) => [
                        ...prev,
                        {
                          label: newInspectionLabel.trim(),
                          description: newInspectionDesc.trim() || undefined,
                          required: false,
                          completed: false,
                          photos: [],
                          expanded: false,
                        },
                      ]);
                      setNewInspectionLabel("");
                      setNewInspectionDesc("");
                      setShowAddInspection(false);
                    }}
                    disabled={!newInspectionLabel.trim()}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    Add Inspection Item
                  </button>
                  <button
                    onClick={() => {
                      setShowAddInspection(false);
                      setNewInspectionLabel("");
                      setNewInspectionDesc("");
                    }}
                    className="px-6 py-3 rounded-2xl bg-surface-hover text-white text-xs font-black uppercase tracking-widest hover:bg-surface-hover transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddInspection(true)}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-hover text-text-muted hover:text-cyan-700 dark:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all group"
              >
                <div className="h-8 w-8 rounded-xl bg-surface-hover group-hover:bg-cyan-500/10 flex items-center justify-center transition-all">
                  <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Add Custom Inspection Point</span>
              </button>
            )}
        </div>
      )}

      {activeTab === "photos" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Camera className="h-5 w-5 text-violet-700 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Asset Repository</h3>
                <p className="text-[10px] font-bold text-text-muted">{itemPhotoCount} documented visuals</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-surface/60 backdrop-blur-md border border-border-subtle rounded-2xl p-1 gap-2">
                <select
                  value={photoTabDownloadMode}
                  onChange={(e) => setPhotoTabDownloadMode(e.target.value as typeof photoTabDownloadMode)}
                  className="bg-transparent px-3 py-1.5 text-xs text-text-secondary outline-none font-bold"
                >
                  <option value="datetime">Timestamped</option>
                  <option value="date">Date Only</option>
                  <option value="datetimeExif">Full Metadata</option>
                  <option value="custom">Manual Stamp</option>
                  <option value="none">Raw Original</option>
                </select>
                {photoTabDownloadMode === "custom" && (
                  <input
                    type="datetime-local"
                    value={photoTabCustomDateTime}
                    onChange={(e) => setPhotoTabCustomDateTime(e.target.value)}
                    className="bg-surface-hover border border-border-medium rounded-xl px-3 py-1.5 text-xs text-cyan-700 dark:text-cyan-400 outline-none"
                  />
                )}
              </div>
              
              <button
                onClick={downloadAllPhotoTabPhotos}
                disabled={itemPhotoCount === 0 || photoTabDownloading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40"
              >
                {photoTabDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Archive All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {itemPhotoSections.length === 0 ? (
              <div className="py-24 border-2 border-dashed border-border-subtle rounded-[40px] text-center">
                <div className="h-20 w-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="h-10 w-10 text-slate-800 opacity-20" />
                </div>
                <h4 className="text-text-secondary font-black uppercase tracking-widest mb-1">Visual Void</h4>
                <p className="text-sm text-text-dim font-medium">No operational photos have been captured yet.</p>
              </div>
            ) : (
              itemPhotoSections.map((section, idx) => (
                <div key={`${section.type}-${section.label}-${idx}`} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-surface-hover text-text-muted border border-border-subtle uppercase tracking-widest">
                        {section.type}
                      </span>
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">{section.label}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-text-dim">{section.photos.length} item{section.photos.length !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {section.photos.map((photo: any, photoIdx: number) => (
                      <button
                        key={photo.id || `${idx}-${photoIdx}`}
                        type="button"
                        onClick={() => setAllPhotosModal({ open: true, source: "all" })}
                        className="group relative aspect-square overflow-hidden rounded-2xl border border-border-subtle bg-surface hover:border-cyan-500/50 transition-all shadow-lg"
                      >
                        <img
                          src={photo.url || photo.path}
                          alt={photo.name || "Documentation"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <p className="text-[8px] font-black text-white uppercase tracking-tighter truncate">
                            {photo.name?.split('-').pop() || 'VISUAL'}
                          </p>
                          {photo.category && (
                            <span className="text-[7px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-widest mt-0.5">
                              {photo.category}
                            </span>
                          )}
                        </div>
                        {photo.category && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-border-subtle">
                            <span className="text-[7px] font-black text-white uppercase tracking-widest">
                              {photo.category}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => setAllPhotosModal({ open: true, source: "all" })}
                      className="aspect-square rounded-2xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-2 hover:bg-surface-hover hover:border-border-medium transition-all text-text-dim hover:text-text-muted"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Expand</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Receipt className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Invoice Generator</h3>
                <p className="text-[10px] font-bold text-text-muted">
                  Add line items with task name, description, unit, quantity, unit price & discount
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => { 
                setInvoiceType("client"); 
                const existing = workOrder?.invoices?.find((i: any) => i.type !== "CONTRACTOR");
                if (existing) {
                  setClientEditingInvoiceId(existing.id);
                  setClientInvoiceItems([...existing.items]);
                  setClientInvoiceNotes(existing.notes || "");
                } else {
                  cancelEditInvoice(); 
                }
                setShowNewInvoiceForm(true); 
              }} className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg ${invoiceType === "client" ? "from-cyan-500 to-blue-600 text-white border-cyan-400/20 shadow-cyan-500/10" : "from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 border-cyan-500/20 hover:border-cyan-500/40 shadow-cyan-500/5"}`}>
                <Plus className="h-3.5 w-3.5" /> Client Invoice
              </button>
              <button onClick={() => { 
                setInvoiceType("contractor"); 
                const existing = workOrder?.invoices?.find((i: any) => i.type === "CONTRACTOR");
                if (existing) {
                  setContractorEditingInvoiceId(existing.id);
                  setContractorInvoiceItems([...existing.items]);
                  setContractorInvoiceNotes(existing.notes || "");
                } else {
                  cancelEditInvoice(); 
                }
                setShowNewInvoiceForm(true); 
              }} className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg ${invoiceType === "contractor" ? "from-emerald-500 to-teal-600 text-white border-emerald-400/20 shadow-emerald-500/10" : "from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5"}`}>
                <Plus className="h-3.5 w-3.5" /> Contractor Invoice
              </button>
            </div>
          </div>

          {/* Controls Row */}
          <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-5 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-2 block">Completion Date</label>
                <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} className="w-full px-3 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50 [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-2 block">Sent to Client Date</label>
                <input type="date" value={sentToClientDate} onChange={(e) => setSentToClientDate(e.target.value)} className="w-full px-3 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50 [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-2 block">Due Date</label>
                <input type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} className="w-full px-3 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50 [color-scheme:dark]" />
              </div>
              <div className="flex items-end">
                <button onClick={populateInvoiceFromTasks} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
                  <Sparkles className="h-3.5 w-3.5" /> Auto-Populate from Tasks
                </button>
              </div>
            </div>
          </div>

          {/* New Invoice Form */}
          {showNewInvoiceForm && (
            <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-subtle pb-3 gap-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary">
                  New {invoiceType === "client" ? "Client" : "Contractor"} Invoice Items
                </h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  <button onClick={() => { cancelEditInvoice(); setShowNewInvoiceForm(false); }} className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-surface-hover text-text-secondary text-[10px] font-bold uppercase border border-border-subtle hover:text-foreground dark:hover:text-white transition-all">
                    Cancel
                  </button>
                  <button onClick={handleSaveInvoice} disabled={savingInvoice} className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r text-white text-[10px] font-black uppercase tracking-widest transition-all ${invoiceType === "client" ? "from-cyan-500 to-blue-600 shadow-cyan-500/20" : "from-emerald-500 to-teal-600 shadow-emerald-500/20"}`}>
                    {savingInvoice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    {savingInvoice ? "Saving..." : "Save Invoice"}
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto hide-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[750px]">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-hover/50">
                      <th className="text-center px-2 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-8">#</th>
                      <th className="text-left px-3 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-[18%]">Task</th>
                      <th className="text-left px-3 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider">Description</th>
                      <th className="text-left px-1 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-16">Unit</th>
                      <th className="text-right px-1 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-16">Qty</th>
                      <th className="text-right px-1 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-24">Price</th>
                      <th className="text-right px-1 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-24">Disc %</th>
                      <th className="text-right px-3 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-28">Amount</th>
                      <th className="w-10 px-1 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {activeInvoiceItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-text-dim text-xs">
                          No items added yet. Click "Add Row" or "Auto-Populate from Tasks".
                        </td>
                      </tr>
                    ) : (
                      activeInvoiceItems.map((item, idx) => {
                        const itemAmount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 - (Number(item.discountPercent) || 0) / 100);
                        return (
                          <tr key={item.id} className="hover:bg-surface-hover/30 transition-colors group align-top">
                            <td className="px-2 py-3 text-[10px] font-bold text-text-dim text-center">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.taskName}
                                onChange={(e) => updateInvoiceItem(item.id, "taskName", e.target.value)}
                                placeholder="Task name"
                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none transition-colors"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <textarea
                                value={item.description}
                                onChange={(e) => updateInvoiceItem(item.id, "description", e.target.value)}
                                placeholder="Description"
                                rows={1}
                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none transition-colors resize-none"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <select
                                value={item.unit || ""}
                                onChange={(e) => updateInvoiceItem(item.id, "unit", e.target.value)}
                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-1 py-1.5 text-xs text-text-primary outline-none transition-colors cursor-pointer"
                              >
                                <option value="">—</option>
                                {["sqft","LF","EA","CYD","UI","SY","SF","CF","GAL","LB","TON","HR","DAY","LS","LOT","EACH","ROOM","SQ"].map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateInvoiceItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-1 py-1.5 text-xs text-text-primary outline-none text-right transition-colors"
                              />
                            </td>
                            <td className="px-1 py-2">
                              <div className="relative">
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-text-dim text-[9px]">$</span>
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => updateInvoiceItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                                  className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg pl-3 pr-1 py-1.5 text-xs text-text-primary outline-none text-right transition-colors"
                                />
                              </div>
                            </td>
                            <td className="px-1 py-2">
                              <input
                                type="number"
                                value={item.discountPercent}
                                onChange={(e) => updateInvoiceItem(item.id, "discountPercent", parseFloat(e.target.value) || 0)}
                                min="0"
                                max="100"
                                step="0.01"
                                className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-1 py-1.5 text-xs text-text-primary outline-none text-right transition-colors"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-xs font-bold text-text-primary">{formatCurrency(itemAmount)}</span>
                            </td>
                            <td className="px-1 py-2 text-center">
                              <button
                                onClick={() => removeInvoiceItem(item.id)}
                                className="p-1 rounded-lg text-text-dim hover:text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    <tr>
                      <td colSpan={9} className="px-5 py-2">
                        <button
                          onClick={addInvoiceItem}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all text-[10px] font-bold uppercase tracking-wider"
                        >
                          <Plus className="h-3 w-3" /> Add Row
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    {invoiceTotalDiscount > 0.01 && (
                      <tr className="border-t border-border-subtle">
                        <td colSpan={7} className="px-5 py-2 text-xs text-text-muted text-right uppercase tracking-wider">Subtotal</td>
                        <td className="px-5 py-2 text-xs font-bold text-text-primary text-right">{formatCurrency(invoiceSubtotal)}</td>
                        <td></td>
                      </tr>
                    )}
                    {invoiceTotalDiscount > 0.01 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-2 text-xs text-text-muted text-right uppercase tracking-wider">Discount</td>
                        <td className="px-5 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 text-right">-{formatCurrency(invoiceTotalDiscount)}</td>
                        <td></td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-border-medium bg-surface-hover/30">
                      <td colSpan={7} className="px-5 py-3 text-xs font-black text-text-primary text-right uppercase tracking-wider">Total</td>
                      <td className={`px-5 py-3 text-sm font-black text-right ${invoiceType === "client" ? "text-cyan-500" : "text-emerald-500"}`}>{formatCurrency(invoiceGrandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes */}
              <div className="pt-4 border-t border-border-subtle">
                <label className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-2 block">Notes (optional)</label>
                <textarea
                  value={activeInvoiceNotes}
                  onChange={(e) => setActiveInvoiceNotes(e.target.value)}
                  placeholder={`Add any notes for this ${invoiceType} invoice...`}
                  rows={2}
                  className="w-full bg-surface-hover border border-border-medium rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-cyan-500/50 placeholder:text-text-dim resize-none"
                />
              </div>
            </div>
          )}

          {/* Existing Invoices — split by Client / Contractor */}
          {workOrder.invoices && workOrder.invoices.length > 0 && (() => {
            const clientInvoices = workOrder.invoices.filter((inv: any) => inv.type !== "CONTRACTOR");
            const contractorInvoices = workOrder.invoices.filter((inv: any) => inv.type === "CONTRACTOR");

            const renderInvoiceGroup = (invoices: any[], label: string, color: "cyan" | "emerald") => {
              if (invoices.length === 0) {
                return (
                  <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-xl">
                    <div className="px-5 py-3 border-b border-border-subtle bg-surface-hover flex items-center gap-4 flex-wrap">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${color === "cyan" ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"}`}>{label}</span>
                      <div className="ml-auto">
                        <button onClick={() => { setInvoiceType(color === "cyan" ? "client" : "contractor"); cancelEditInvoice(); setShowNewInvoiceForm(true); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg ${color === "cyan" ? "from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 border-cyan-500/20 hover:border-cyan-500/40 shadow-cyan-500/5" : "from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5"}`}>
                          <Plus className="h-3.5 w-3.5" /> Add Invoice
                        </button>
                      </div>
                    </div>
                    <div className="px-5 py-10 text-center text-text-dim text-xs">No {color === "cyan" ? "client" : "contractor"} invoices yet.</div>
                  </div>
                );
              }
              const colorClasses = color === "cyan"
                ? { badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20", edit: "from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 border-cyan-500/20 hover:border-cyan-500/40 shadow-cyan-500/5", total: "text-cyan-500", accent: "cyan" }
                : { badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", edit: "from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5", total: "text-emerald-500", accent: "emerald" };

              return (
                <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-xl">
                  <div className="px-5 py-3 border-b border-border-subtle bg-surface-hover flex items-center gap-4 flex-wrap">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${colorClasses.badge}`}>{label}</span>
                    {completionDate && <span className="text-[9px] font-bold text-text-muted">Completed: {new Date(completionDate).toLocaleDateString()}</span>}
                    {sentToClientDate && <span className="text-[9px] font-bold text-text-muted">Sent: {new Date(sentToClientDate).toLocaleDateString()}</span>}
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={() => { 
                        setInvoiceType(color === "cyan" ? "client" : "contractor"); 
                        const existing = invoices[0];
                        if (existing) {
                          if (color === "cyan") {
                            setClientEditingInvoiceId(existing.id);
                            setClientInvoiceItems([...existing.items]);
                            setClientInvoiceNotes(existing.notes || "");
                          } else {
                            setContractorEditingInvoiceId(existing.id);
                            setContractorInvoiceItems([...existing.items]);
                            setContractorInvoiceNotes(existing.notes || "");
                          }
                        } else {
                          cancelEditInvoice(); 
                        }
                        setShowNewInvoiceForm(true); 
                      }} className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg ${color === "cyan" ? "from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 border-cyan-500/20 hover:border-cyan-500/40 shadow-cyan-500/5" : "from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5"}`}>
                        <Plus className="h-3.5 w-3.5" /> {invoices.length > 0 ? "Add Invoice Items" : "Add Invoice"}
                      </button>
                    </div>
                  </div>

                  {invoices.map((inv: any) => {
                    const isEditing = !!inlineEditItems[inv.id];
                    const editItems = inlineEditItems[inv.id];
                    const displayItems = isEditing ? editItems : (inv.items || []);
                    const editSubtotal = isEditing
                      ? editItems!.reduce((s: number, i: InvoiceItem) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
                      : inv.subtotal || 0;
                    const editDiscount = isEditing
                      ? editItems!.reduce((s: number, i: InvoiceItem) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0) * (Number(i.discountPercent) || 0) / 100, 0)
                      : (inv.subtotal || 0) - (inv.total || 0);
                    const editTotal = editSubtotal - editDiscount;

                    return (
                      <div key={inv.id} className="border-b border-border-subtle last:border-b-0">
                        {/* Invoice sub-header */}
                        <div className="px-5 py-2 bg-surface-hover/30 flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-black text-text-primary">{inv.invoiceNumber}</span>
                          <Badge className={`text-[8px] px-1.5 py-0.5 ${colorClasses.badge}`}>{inv.status}</Badge>
                          {isEditing && (
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded bg-${colorClasses.accent}-500/10 text-${colorClasses.accent}-400 border border-${colorClasses.accent}-500/20`}>
                              INLINE EDITING
                            </span>
                          )}
                          <div className="ml-auto flex items-center gap-2 overflow-x-auto hide-scrollbar">
                            {isEditing ? (
                              <>
                                <button onClick={() => cancelInlineEdit(inv.id)} className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-bold uppercase tracking-wider border border-border-medium hover:text-foreground dark:hover:text-white transition-all">
                                  <X className="h-3 w-3" /> Cancel
                                </button>
                                <button onClick={() => saveInlineEdit(inv.id)} disabled={savingInline === inv.id} className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r text-white text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${color === "cyan" ? "from-cyan-500 to-blue-600" : "from-emerald-500 to-teal-600"}`}>
                                  {savingInline === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                  {savingInline === inv.id ? "Saving..." : "Save Changes"}
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handlePrintInvoice(inv)} className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-hover text-text-secondary hover:text-foreground dark:hover:text-white border border-border-subtle hover:border-border-medium transition-all text-[10px] font-black uppercase tracking-widest">
                                  <Printer className="h-3 w-3" /> Print
                                </button>
                                <button onClick={async () => {
                                  if (confirm("Are you sure you want to delete this invoice?")) {
                                    try {
                                      await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
                                      toast.success("Invoice deleted");
                                      refetchWorkOrder();
                                    } catch (e) {
                                      toast.error("Failed to delete invoice");
                                    }
                                  }
                                }} className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-700 dark:text-rose-400 border border-rose-500/20 transition-all text-[10px] font-black uppercase tracking-widest">
                                  <Trash2 className="h-3 w-3" /> Delete
                                </button>
                                <button onClick={() => startInlineEdit(inv)} className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg ${colorClasses.edit}`}>
                                  <Edit className="h-3 w-3" /> Edit Items
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Items table */}
                        <div className="overflow-x-auto hide-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
                          <table className="w-full min-w-[750px]">
                            <thead><tr className="border-b border-border-subtle bg-surface-hover/50">
                              <th className="text-center px-2 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-8">#</th>
                              <th className="text-left px-3 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-[18%]">Task</th>
                              <th className="text-left px-3 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider">Description</th>
                              <th className="text-left px-1 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-16">Unit</th>
                              <th className="text-right px-1 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-16">Qty</th>
                              <th className="text-right px-1 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-24">Price</th>
                              <th className="text-right px-1 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-24">Disc</th>
                              <th className="text-right px-3 py-2 text-[9px] font-bold text-text-dim uppercase tracking-wider w-28">Amount</th>
                              {(isEditing || inv.status === "DRAFT") && <th className="w-10 px-1 py-2 text-center"></th>}
                            </tr></thead>
                            <tbody className="divide-y divide-border-subtle">
                              {displayItems.map((item: any, idx: number) => {
                                const itemAmount = isEditing
                                  ? item.total || (item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100))
                                  : item.amount || (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discountPercent || 0) / 100);
                                return (
                                  <tr key={item.id || idx} className="hover:bg-surface-hover/30 transition-colors group align-top">
                                    <td className="px-2 py-3 text-[10px] font-bold text-text-dim text-center tabular-nums">{idx + 1}</td>
                                    <td className="px-3 py-2">
                                      {isEditing ? (
                                        <input type="text" value={item.taskName} onChange={(e) => updateInlineItem(inv.id, item.id, "taskName", e.target.value)} placeholder="Task name" className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-2 py-1.5 text-sm text-text-primary outline-none transition-colors" />
                                      ) : (
                                        <div className="py-1">
                                          <div className="text-sm font-medium text-text-primary">{item.taskName || "\u2014"}</div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {isEditing ? (
                                        <textarea
                                          value={item.description}
                                          onChange={(e) => {
                                            updateInlineItem(inv.id, item.id, "description", e.target.value);
                                            e.target.style.height = "auto";
                                            e.target.style.height = e.target.scrollHeight + "px";
                                          }}
                                          onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                                          ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                                          placeholder="Description..."
                                          rows={1}
                                          className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-2 py-1.5 text-sm text-text-primary outline-none transition-colors resize-none overflow-hidden"
                                          style={{ minHeight: "32px" }}
                                        />
                                      ) : (
                                        item.description ? <div className="text-xs text-text-muted whitespace-pre-wrap leading-relaxed">{item.description}</div> : <span className="text-text-dim">{"\u2014"}</span>
                                      )}
                                    </td>
                                    <td className="px-1 py-2">
                                      {isEditing ? (
                                        <select value={item.unit || ""} onChange={(e) => updateInlineItem(inv.id, item.id, "unit", e.target.value)} className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-1 py-1.5 text-sm text-text-primary outline-none transition-colors cursor-pointer">
                                          <option value="">{"\u2014"}</option>
                                          {["sqft","LF","EA","CYD","UI","SY","SF","CF","GAL","LB","TON","HR","DAY","LS","LOT","EACH","ROOM","SQ"].map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                      ) : (
                                        <span className="text-xs text-text-muted text-right uppercase">{(item.unit && item.unit.trim()) ? item.unit : "\u2014"}</span>
                                      )}
                                    </td>
                                    <td className="px-1 py-2">
                                      {isEditing ? (
                                        <input type="number" value={item.quantity} onChange={(e) => updateInlineItem(inv.id, item.id, "quantity", parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-1 py-1.5 text-sm text-text-primary outline-none text-right tabular-nums transition-colors" />
                                      ) : (
                                        <span className="text-sm text-text-muted text-right">{item.quantity ?? "\u2014"}</span>
                                      )}
                                    </td>
                                    <td className="px-1 py-2">
                                      {isEditing ? (
                                        <div className="relative">
                                          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-text-dim text-xs">$</span>
                                          <input type="number" value={item.unitPrice} onChange={(e) => updateInlineItem(inv.id, item.id, "unitPrice", parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg pl-3 pr-1 py-1.5 text-sm text-text-primary outline-none text-right tabular-nums transition-colors" />
                                        </div>
                                      ) : (
                                        <span className="text-sm text-text-muted text-right">{formatCurrency(item.unitPrice || 0)}</span>
                                      )}
                                    </td>
                                    <td className="px-1 py-2">
                                      {isEditing ? (
                                        <input type="number" value={item.discountPercent} onChange={(e) => updateInlineItem(inv.id, item.id, "discountPercent", parseFloat(e.target.value) || 0)} min="0" max="100" step="0.01" className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-cyan-500/50 rounded-lg px-1 py-1.5 text-sm text-text-primary outline-none text-right tabular-nums transition-colors" />
                                      ) : (
                                        <span className="text-sm text-text-muted text-right">{item.discountPercent ? item.discountPercent + "%" : "\u2014"}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={`text-sm font-bold tabular-nums ${isEditing ? (color === "cyan" ? "text-cyan-700 dark:text-cyan-400" : "text-emerald-700 dark:text-emerald-400") : "text-text-primary"}`}>
                                        {formatCurrency(itemAmount)}
                                      </span>
                                    </td>
                                    {(isEditing || inv.status === "DRAFT") && (
                                      <td className="px-1 py-2 text-center">
                                        <button onClick={() => deleteInlineItem(inv.id, item.id)} disabled={deletingItem === item.id} className="p-1.5 rounded-lg text-text-dim hover:text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-30">
                                          {deletingItem === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                              {isEditing && (
                                <tr>
                                  <td colSpan={9} className="px-4 py-2">
                                    <button onClick={() => addInlineItem(inv.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all text-[10px] font-bold uppercase tracking-wider">
                                      <Plus className="h-3 w-3" /> Add Row
                                    </button>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              {editDiscount > 0.01 && (
                                <tr className="border-t border-border-subtle">
                                  <td colSpan={7} className="px-5 py-2 text-xs text-text-muted text-right uppercase tracking-wider">Subtotal</td>
                                  <td className="px-5 py-2 text-sm font-bold text-text-primary text-right">{formatCurrency(editSubtotal)}</td>
                                  {isEditing && <td></td>}
                                </tr>
                              )}
                              {editDiscount > 0.01 && (
                                <tr>
                                  <td colSpan={7} className="px-5 py-2 text-xs text-text-muted text-right uppercase tracking-wider">Discount</td>
                                  <td className="px-5 py-2 text-sm font-bold text-amber-700 dark:text-amber-400 text-right">-{formatCurrency(editDiscount)}</td>
                                  {isEditing && <td></td>}
                                </tr>
                              )}
                              <tr className="border-t-2 border-border-medium bg-surface-hover/30">
                                <td colSpan={7} className="px-5 py-3 text-sm font-black text-text-primary text-right uppercase tracking-wider">Total</td>
                                <td className={`px-5 py-3 text-lg font-black text-right ${colorClasses.total}`}>{formatCurrency(editTotal)}</td>
                                {isEditing && <td></td>}
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            };

            const activeInvoices = invoiceType === "client" ? clientInvoices : contractorInvoices;
            const activeLabel = invoiceType === "client" ? "Client Invoices" : "Contractor Invoices";
            const activeColor = invoiceType === "client" ? "cyan" : "emerald";

            return (
              <div className="space-y-4">
                {/* Sub-tabs for Client / Contractor */}
                <div className="flex rounded-xl border border-border-medium overflow-hidden max-w-xs">
                  <button onClick={() => setInvoiceType("client")} className={cn("flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", invoiceType === "client" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" : "bg-surface-hover text-text-dim hover:text-text-secondary")}>
                    <Receipt className="h-3.5 w-3.5" /> Client {clientInvoices.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/20">{clientInvoices.length}</span>}
                  </button>
                  <button onClick={() => setInvoiceType("contractor")} className={cn("flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", invoiceType === "contractor" ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white" : "bg-surface-hover text-text-dim hover:text-text-secondary")}>
                    <Receipt className="h-3.5 w-3.5" /> Contractor {contractorInvoices.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/20">{contractorInvoices.length}</span>}
                  </button>
                </div>
                {renderInvoiceGroup(activeInvoices, activeLabel, activeColor as "cyan" | "emerald")}
              </div>
            );
          })()}

        </div>
      )}

      {activeTab === "history" && (
        <PropertyHistoryTab
          workOrders={propertyHistoryData?.workOrders || []}
          currentWorkOrderId={id}
          onOpenPhotos={(photos, title) => {
            setPhotoPopupPhotos(photos);
            setPhotoPopupTitle(title);
            setPhotoPopupOpen(true);
          }}
        />
      )}

      {activeTab === "messages" && (
        <WorkOrderMessagesTab
          workOrderId={id}
          workOrderTitle={workOrder.title}
        />
      )}

      {/* All Photos Modal (Tasks / Bids / Inspection) */}
      {allPhotosModal.open && createPortal(
        <AllPhotosModal
          source={allPhotosModal.source}
          tasks={tasks}
          bids={bids}
          inspectionPhotos={[]}
          complianceItems={[]}
          customInspectionItems={customInspectionItems}
          onClose={() => setAllPhotosModal({ open: false, source: "tasks" })}
          onEditPhoto={(url, name, category, source, sourceId) => setEditorPhoto({ url, name, category, source, sourceId })}
          onDeletePhoto={handlePhotoDelete}
        />,
        document.body
      )}

      {/* Photo Popup Modal */}
      {photoPopupOpen && createPortal(
        <PhotoPopupModal
          photos={photoPopupPhotos}
          title={photoPopupTitle}
          onClose={() => setPhotoPopupOpen(false)}
          onEditPhoto={(url, name) => setEditorPhoto({ url, name, source: "global" })}
          onDeletePhoto={handlePhotoDelete}
        />,
        document.body
      )}

      {propertyFrontViewerOpen && propertyFrontPhotos[0] && createPortal(
        <PhotoLightbox
          photo={propertyFrontPhotos[0]}
          photos={propertyFrontPhotos.slice(0, 1)}
          selectedIndex={0}
          onClose={() => setPropertyFrontViewerOpen(false)}
        />,
        document.body
      )}

      {/* Quick View Modal */}
      {showQuickView && workOrder && createPortal(
        <WorkOrderQuickViewModal
          workOrder={workOrder}
          tasks={tasks}
          bids={bids}
          allPhotos={allPhotos}
          complianceItems={complianceItems}
          onClose={() => setShowQuickView(false)}
        />,
        document.body
      )}

      {/* Edit Work Order Modal */}
      {showEdit && workOrder && (
        <EditWorkOrderModal
          workOrder={workOrder}
          onClose={() => setShowEdit(false)}
          updateMutation={updateMutation}
        />
      )}

      {/* GPS Camera Modal */}
      {gpsCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center">
          <div className="w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                <span className="text-sm font-semibold text-white">
                  GPS Camera — {gpsCameraCategory.charAt(0) + gpsCameraCategory.slice(1).toLowerCase()} Photo
                </span>
              </div>
              <button
                onClick={() => setGpsCameraOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <GPSCamera
              onCapture={handleGPSCapture}
              onClose={() => setGpsCameraOpen(false)}
              multiCapture={gpsCameraMultiCapture}
              categoryLabel={gpsCameraCategory.charAt(0) + gpsCameraCategory.slice(1).toLowerCase()}
            />
          </div>
        </div>
      )}

      {/* Image Editor Modal — portaled to body to escape overflow/clipping */}
      {editorPhoto && createPortal(
        <Suspense fallback={
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
            <Loader2 className="h-8 w-8 text-cyan-700 dark:text-cyan-400 animate-spin" />
          </div>
        }>
          <PhotoEditor
            imageUrl={editorPhoto.url}
            onClose={() => setEditorPhoto(null)}
            onSave={async (blob: Blob) => {
              // Create a new file from the edited image
              const editedName = editorPhoto.name.replace(/\.[^.]+$/, "") + "-edited.png";
              const file = new File([blob], editedName, { type: "image/png" });
              try {
                const src = editorPhoto.source || "global";
                const srcId = editorPhoto.sourceId;
                const editedCategory =
                  editorPhoto.category ||
                  (src === "bid" ? "BID" : src === "inspection" ? "INSPECTION" : "AFTER");
                const result = await handlePhotoUpload(file, editedCategory);
                const newPhoto: PhotoItem = {
                  id: result.id,
                  url: result.url,
                  name: editedName,
                  size: blob.size,
                  category: editedCategory,
                  timestamp: new Date().toISOString(),
                  persisted: true,
                };
                // Route edited copy back to the correct bucket
                if (src === "task" && srcId) {
                  setTasks((prev) => prev.map((t) => t.id === srcId ? { ...t, photos: [...t.photos, newPhoto] } : t));
                } else if (src === "bid" && srcId) {
                  setBids((prev) => prev.map((b) => b.id === srcId ? { ...b, photos: [...(b.photos || []), newPhoto] } : b));
                } else if (src === "inspection") {
                  const customMatch = srcId?.match(/^custom-(\d+)$/);
                  if (customMatch) {
                    const index = parseInt(customMatch[1], 10);
                    setCustomInspectionItems((prev) =>
                      prev.map((item, itemIdx) =>
                        itemIdx === index ? { ...item, photos: [...(item.photos || []), newPhoto] } : item
                      )
                    );
                  } else {
                    setInspectionPhotos((prev) => [...prev, newPhoto]);
                  }
                } else {
                  setGlobalPhotos((prev) => [...prev, newPhoto]);
                }
                toast.success("Edited photo saved as new copy");
                setEditorPhoto(null);
              } catch (err) {
                toast.error("Failed to save edited photo");
              }
            }}
          />
        </Suspense>,
        document.body
      )}


    </div>
  );
}

// ─── Work Order Quick View Modal ──────────────────────────────────────────────

function WorkOrderQuickViewModal({
  workOrder,
  tasks,
  bids,
  allPhotos,
  complianceItems,
  onClose,
}: {
  workOrder: any;
  tasks: TaskEntry[];
  bids: BidEntry[];
  allPhotos: PhotoItem[];
  complianceItems: { label: string; description?: string; required: boolean; completed: boolean }[];
  onClose: () => void;
}) {
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalBids = bids.reduce((s, b) => s + b.amount, 0);
  const approvedBids = bids.filter((b) => b.status === "APPROVED").reduce((s, b) => s + b.amount, 0);
  const beforePhotos = allPhotos.filter((p) => p.category === "BEFORE");
  const duringPhotos = allPhotos.filter((p) => p.category === "DURING");
  const afterPhotos = allPhotos.filter((p) => p.category === "AFTER");

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2147483600 }}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-hover flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <FileText className="h-5 w-5 text-cyan-700 dark:text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 uppercase tracking-widest">
                  WO-{workOrder.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}
                </span>
                <Badge className={cn("text-[9px] px-2 py-0.5", STATUS_COLORS[workOrder.status])}>
                  {STATUS_LABELS[workOrder.status]}
                </Badge>
              </div>
              <h2 className="text-lg font-black text-text-primary mt-1">{workOrder.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: MapPin, label: "Address", value: `${workOrder.address}${workOrder.city ? `, ${workOrder.city}` : ""}${workOrder.state ? `, ${workOrder.state}` : ""}` },
              { icon: Activity, label: "Service", value: SERVICE_TYPE_LABELS[workOrder.serviceType] },
              { icon: Calendar, label: "Due Date", value: workOrder.dueDate ? formatDate(workOrder.dueDate) : "No due date" },
              { icon: User, label: "Contractor", value: workOrder.contractor?.name || "Unassigned" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface-hover border border-border-subtle">
                <div className="flex items-center gap-2 mb-1.5">
                  <item.icon className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">{item.label}</span>
                </div>
                <p className="text-xs font-bold text-text-primary truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20">
              <p className="text-[9px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-widest mb-1">Tasks</p>
              <p className="text-xl font-black text-text-primary">{completedTasks}<span className="text-xs text-text-dim">/{tasks.length}</span></p>
              <div className="h-1.5 bg-surface-hover rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
              <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Bids</p>
              <p className="text-xl font-black text-text-primary">${totalBids.toLocaleString()}</p>
              {approvedBids > 0 && <p className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">${approvedBids.toLocaleString()} approved</p>}
            </div>
            <div className="p-4 rounded-xl bg-violet-500/[0.04] border border-violet-500/20">
              <p className="text-[9px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-1">Photos</p>
              <p className="text-xl font-black text-text-primary">{allPhotos.length}</p>
              <p className="text-[9px] text-text-muted mt-1">{beforePhotos.length}B · {duringPhotos.length}D · {afterPhotos.length}A</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
              <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Compliance</p>
              <p className="text-xl font-black text-text-primary">{complianceItems.filter(c => c.completed).length}<span className="text-xs text-text-dim">/{complianceItems.length}</span></p>
              <div className="h-1.5 bg-surface-hover rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${complianceItems.length > 0 ? (complianceItems.filter(c => c.completed).length / complianceItems.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Personnel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workOrder.coordinator && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
                <Avatar name={workOrder.coordinator.name} src={workOrder.coordinator.image} size="sm" />
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Coordinator</p>
                  <p className="text-xs font-bold text-text-primary">{workOrder.coordinator.name}</p>
                </div>
              </div>
            )}
            {workOrder.contractor && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
                <Avatar name={workOrder.contractor.name} src={workOrder.contractor.image} size="sm" />
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Contractor</p>
                  <p className="text-xs font-bold text-text-primary">{workOrder.contractor.name}</p>
                </div>
              </div>
            )}
            {workOrder.createdBy && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
                <Avatar name={workOrder.createdBy.name} src={workOrder.createdBy.image} size="sm" />
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Client</p>
                  <p className="text-xs font-bold text-text-primary">{workOrder.createdBy.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {workOrder.description && (
            <div className="p-4 rounded-xl bg-surface-hover border border-border-subtle">
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-2">Project Scope</p>
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{workOrder.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()}</p>
            </div>
          )}

          {/* Access Codes */}
          {(workOrder.lockCode || workOrder.gateCode || workOrder.keyCode) && (
            <div className="grid grid-cols-3 gap-3">
              {workOrder.lockCode && (
                <div className="p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20">
                  <p className="text-[9px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-widest mb-1">Lock Code</p>
                  <p className="text-sm font-mono font-bold text-text-primary">{workOrder.lockCode}</p>
                </div>
              )}
              {workOrder.gateCode && (
                <div className="p-3 rounded-xl bg-violet-500/[0.04] border border-violet-500/20">
                  <p className="text-[9px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-1">Gate Code</p>
                  <p className="text-sm font-mono font-bold text-text-primary">{workOrder.gateCode}</p>
                </div>
              )}
              {workOrder.keyCode && (
                <div className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                  <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Key Code</p>
                  <p className="text-sm font-mono font-bold text-text-primary">{workOrder.keyCode}</p>
                </div>
              )}
            </div>
          )}

          {/* Tasks List */}
          {tasks.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Tasks ({completedTasks}/{tasks.length})</h4>
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle">
                    {task.completed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-border-medium flex-shrink-0" />
                    )}
                    <span className={cn("text-xs", task.completed ? "text-text-muted line-through" : "text-text-secondary")}>
                      {task.title}
                    </span>
                    {task.photos.length > 0 && (
                      <span className="ml-auto text-[9px] text-text-dim">{task.photos.length}📷</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bids List */}
          {bids.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Bids ({bids.length})</h4>
              <div className="space-y-2">
                {bids.map((bid) => (
                  <div key={bid.id} className="flex items-start justify-between p-3 rounded-xl bg-surface-hover border border-border-subtle gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <DollarSign className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-text-primary">{bid.title}</p>
                        {bid.description && <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{bid.description}</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-xs font-black text-amber-500">${bid.amount.toLocaleString()}</p>
                        <span className={cn("text-[8px] font-bold uppercase tracking-widest block", bid.status === "APPROVED" ? "text-emerald-400" : bid.status === "REJECTED" ? "text-rose-400" : "text-text-muted")}>
                          {bid.status}
                        </span>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const { downloadSingleBid } = await import("@/lib/download-helper");
                          downloadSingleBid(bid, workOrder?.orderNumber || workOrder?.id);
                        }}
                        className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle text-text-secondary hover:text-cyan-400 transition-colors"
                        title="Download single bid summary"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Checklist */}
          {complianceItems.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Compliance & Inspection</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {complianceItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-hover border border-border-subtle gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={cn("h-4 w-4 rounded-full flex items-center justify-center border flex-shrink-0", item.completed ? "bg-emerald-500 border-emerald-500" : "border-border-medium")}>
                        {item.completed && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className={cn("text-xs font-medium truncate", item.completed ? "text-text-muted" : "text-text-secondary")}>{item.label}</span>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const { downloadSingleInspection } = await import("@/lib/download-helper");
                        downloadSingleInspection(item, i, allPhotos, workOrder?.orderNumber || workOrder?.id);
                      }}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle text-text-secondary hover:text-cyan-400 transition-colors flex-shrink-0"
                      title="Download single inspection report"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {workOrder.specialInstructions && (
            <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
              <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2">Special Instructions</p>
              <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed italic">
                &quot;{workOrder.specialInstructions.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()}&quot;
              </p>
            </div>
          )}

          {/* Invoices */}
          {workOrder.invoices && workOrder.invoices.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Invoices ({workOrder.invoices.length})</h4>
              <div className="space-y-1.5">
                {workOrder.invoices.map((inv: any) => {
                  const isContractor = inv.type === "CONTRACTOR";
                  return (
                    <div key={inv.id} className={`flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover border ${isContractor ? "border-emerald-500/20" : "border-border-subtle"}`}>
                      <div className="flex items-center gap-3">
                        <Receipt className={`h-3.5 w-3.5 ${isContractor ? "text-emerald-700 dark:text-emerald-400" : "text-cyan-700 dark:text-cyan-400"}`} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-text-primary">{inv.invoiceNumber}</p>
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${isContractor ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20"}`}>
                              {isContractor ? "Contractor" : "Client"}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted">{inv.items?.length || 0} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-black ${isContractor ? "text-emerald-700 dark:text-emerald-400" : "text-cyan-700 dark:text-cyan-400"}`}>${(inv.total || 0).toFixed(2)}</p>
                        <span className="text-[8px] font-bold text-text-muted uppercase">{inv.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle bg-surface-hover flex justify-between items-center flex-shrink-0">
          <p className="text-[10px] text-text-dim">Created {formatDateTime(workOrder.createdAt)}</p>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/work-orders/${workOrder.id}`}
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-[10px] font-bold uppercase tracking-widest border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
            >
              Open Full Page
            </Link>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Work Order Messages Tab ─────────────────────────────────────────────────

function WorkOrderMessagesTab({
  workOrderId,
  workOrderTitle,
}: {
  workOrderId: string;
  workOrderTitle: string;
}) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const qc = useQueryClient();
  const { data: channelsData } = useChatChannels();
  const createChannel = useCreateChatChannel();
  const { data: usersData } = useUsers();
  const allUsers = usersData?.users || [];
  const [newMessage, setNewMessage] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showMentions, setShowMentions] = useState(false);

  // Find the chat channel specifically for this work order
  const channels = channelsData?.channels || [];
  const workOrderChannel = channels.find(
    (c: any) =>
      c.type === "WORK_ORDERS" &&
      (c.name?.includes(workOrderId) ||
        c.description?.includes(workOrderId) ||
        c.name?.toLowerCase().includes(workOrderId.slice(-8).toLowerCase()))
  );

  const hasAttemptedCreate = useRef(false);

  // Auto-create a WORK_ORDERS channel if none exists
  useEffect(() => {
    if (channelsData && !workOrderChannel && !creatingChannel && !hasAttemptedCreate.current) {
      hasAttemptedCreate.current = true;
      setCreatingChannel(true);
      const shortId = workOrderId.slice(-8).toUpperCase();
      createChannel.mutate(
        {
          name: `WO-${shortId}`,
          description: `Work order channel for ${workOrderTitle} (${workOrderId})`,
          type: "WORK_ORDERS",
        },
        {
          onSuccess: () => setCreatingChannel(false),
          onError: () => {
            setCreatingChannel(false);
            hasAttemptedCreate.current = false; // Allow retry on error
          },
        }
      );
    }
  }, [channelsData, workOrderChannel, creatingChannel, workOrderId, workOrderTitle]); // omitted createChannel to prevent infinite loops

  // Fetch messages for this specific channel only
  const channelId = workOrderChannel?.id || "";
  const { data: messagesData, isLoading } = useChatMessages(channelId);
  const channelMessages = messagesData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !channelId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setNewMessage("");
      qc.invalidateQueries({ queryKey: ["chat-messages", channelId] });
      qc.invalidateQueries({ queryKey: ["chat-channels"] });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-surface/60 backdrop-blur-xl rounded-3xl border border-border-subtle overflow-hidden shadow-2xl flex flex-col h-[600px]">
      {/* Channel header */}
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-hover">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <MessageSquare className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">{workOrderChannel?.name || `WO-${workOrderId.slice(-8).toUpperCase()}`}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">
                {channelMessages.length} Operational Message{channelMessages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/dashboard/chat`}
          className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20 transition-all text-[10px] font-black uppercase tracking-widest border border-cyan-500/20 shadow-lg shadow-cyan-500/5"
        >
          <MessageSquare className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
          Full Channel
        </Link>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent">
        {isLoading || creatingChannel ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <Loader2 className="h-8 w-8 text-cyan-700 dark:text-cyan-400 animate-spin mb-3" />
            <p className="text-xs font-black text-text-muted uppercase tracking-widest">
              {creatingChannel ? "Creating channel..." : "Synchronizing..."}
            </p>
          </div>
        ) : channelMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <div className="h-20 w-20 bg-surface-hover rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-text-muted" />
            </div>
            <p className="text-sm font-black text-text-muted uppercase tracking-widest">No Communication Found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {channelMessages.map((msg: any, idx: number) => {
              const isOwn = msg.authorId === userId;
              const prevMsg = channelMessages[idx - 1];
              const showAvatar = !isOwn && (!prevMsg || prevMsg.authorId !== msg.authorId);
              
              return (
                <div key={msg.id} className={cn("flex gap-3", isOwn ? "flex-row-reverse" : "flex-row")}>
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0 flex items-end">
                      {showAvatar ? (
                        <Avatar src={msg.author?.image} name={msg.author?.name} size="sm" className="ring-2 ring-white/[0.05] border border-border-medium" />
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  )}
                  <div className={cn("max-w-[80%] space-y-1", isOwn ? "items-end" : "items-start")}>
                    {showAvatar && (
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 mb-1">{msg.author?.name}</p>
                    )}
                    <div
                      className={cn(
                        "px-4 py-3 rounded-2xl text-sm shadow-xl transition-all hover:scale-[1.01]",
                        isOwn
                          ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-tr-sm border border-cyan-400/20"
                          : "bg-surface-hover backdrop-blur-md text-text-primary rounded-tl-sm border border-border-subtle"
                      )}
                    >
                      <p className="leading-relaxed font-medium">{msg.content}</p>
                    </div>
                    <p className={cn("text-[9px] font-black text-text-dim uppercase tracking-tighter mt-1 px-1", isOwn ? "text-right" : "text-left")}>
                      {formatRelativeTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input section */}
      <div className="p-6 bg-surface-hover border-t border-border-subtle">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <div className="flex-1 relative group">
            {showMentions && (
              <MentionDropdown
                users={allUsers}
                query={mentionQuery}
                position={mentionPosition}
                onSelect={(user) => {
                  // Replace @query with @name in the message
                  const textarea = textareaRef.current;
                  if (textarea) {
                    const cursorPos = textarea.selectionStart;
                    const textBefore = newMessage.slice(0, cursorPos);
                    const atIdx = textBefore.lastIndexOf("@");
                    const textAfter = newMessage.slice(cursorPos);
                    const newText = textBefore.slice(0, atIdx) + `@${user.name} ` + textAfter;
                    setNewMessage(newText);
                  }
                  setShowMentions(false);
                  setMentionQuery(null);
                  textareaRef.current?.focus();
                }}
                onClose={() => { setShowMentions(false); setMentionQuery(null); }}
              />
            )}
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => {
                const val = e.target.value;
                setNewMessage(val);
                // Detect @ mentions
                const cursorPos = e.target.selectionStart;
                const textBefore = val.slice(0, cursorPos);
                const atIdx = textBefore.lastIndexOf("@");
                if (atIdx >= 0) {
                  const queryAfterAt = textBefore.slice(atIdx + 1);
                  // Only show if @ is at start or preceded by space
                  if (atIdx === 0 || textBefore[atIdx - 1] === " ") {
                    if (!queryAfterAt.includes(" ") || queryAfterAt.length < 20) {
                      setMentionQuery(queryAfterAt);
                      setShowMentions(true);
                      // Position the dropdown
                      const textarea = e.target;
                      const rect = textarea.getBoundingClientRect();
                      setMentionPosition({ top: rect.top, left: 0 });
                      return;
                    }
                  }
                }
                setShowMentions(false);
                setMentionQuery(null);
              }}
              placeholder="Transmit message to field staff... (type @ to mention)"
              rows={1}
              className="w-full px-5 py-4 bg-surface/60 border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:bg-surface-hover transition-all resize-none shadow-inner"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !showMentions) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <div className="absolute inset-0 rounded-2xl border border-cyan-500/20 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity" />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || !channelId || sending}
            className="h-[52px] w-[52px] rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Property History Tab ─────────────────────────────────────────────────────

function PropertyHistoryTab({
  workOrders,
  currentWorkOrderId,
  onOpenPhotos,
}: {
  workOrders: any[];
  currentWorkOrderId: string;
  onOpenPhotos: (photos: any[], title: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [bidSearch, setBidSearch] = useState("");

  if (workOrders.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-text-dim mx-auto mb-3" />
          <p className="text-text-secondary font-medium">No property history</p>
          <p className="text-sm text-text-dim mt-1">No other work orders found for this property</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: workOrders.length, icon: FileText, color: "text-text-secondary", bg: "bg-surface-hover" },
          { label: "Resolved", value: workOrders.filter((wo: any) => wo.status === "COMPLETED" || wo.status === "CLOSED").length, icon: CheckCircle2, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Visual Documentation", value: workOrders.reduce((sum: number, wo: any) => sum + (wo.files?.length || 0), 0), icon: Camera, color: "text-cyan-700 dark:text-cyan-400", bg: "bg-cyan-500/10" },
          { 
            label: "Total Valuation", 
            value: `$${workOrders.reduce((sum: number, wo: any) => {
              const bids = (wo.metadata?.bids as any[]) || [];
              return sum + bids.reduce((s: number, b: any) => s + (b.amount || 0), 0);
            }, 0).toLocaleString()}`, 
            icon: DollarSign, 
            color: "text-amber-700 dark:text-amber-400", 
            bg: "bg-amber-500/10" 
          }
        ].map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl bg-surface/60 backdrop-blur-md border border-border-subtle p-5 transition-all hover:border-border-subtle">
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{stat.label}</p>
            <p className={cn("text-xl font-black mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Historical Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Operational Timeline</h4>
        </div>

        <div className="space-y-3">
          {workOrders.map((wo: any) => {
            const isCurrent = wo.id === currentWorkOrderId;
            const isExpanded = expandedId === wo.id;
            const tasks = (wo.tasks as any[]) || [];
            const completedTasks = tasks.filter((t: any) => t.completed).length;
            const files = wo.files || [];
            const bids = (wo.metadata?.bids as any[]) || [];
            const totalBidAmount = bids.reduce((s: number, b: any) => s + (b.amount || 0), 0);
            const woNumber = wo.id.slice(-8).toUpperCase();

            return (
              <div 
                key={wo.id} 
                className={cn(
                  "group overflow-hidden rounded-2xl border transition-all duration-300",
                  isCurrent 
                    ? "bg-cyan-500/[0.03] border-cyan-500/30 shadow-[0_0_20px_-5px_rgba(6,182,212,0.1)]" 
                    : "bg-surface/60 backdrop-blur-md border-border-subtle hover:border-border-subtle"
                )}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : wo.id)}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors",
                      wo.status === "COMPLETED" || wo.status === "CLOSED" 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                        : wo.status === "IN_PROGRESS" 
                          ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400 animate-pulse" 
                          : "bg-slate-500/10 border-slate-500/20 text-text-secondary"
                    )}>
                      {wo.status === "COMPLETED" || wo.status === "CLOSED" ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter">#{woNumber}</span>
                        <h4 className="text-sm font-bold text-text-primary truncate">{wo.title}</h4>
                        {isCurrent && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">Active</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">{SERVICE_TYPE_LABELS[wo.serviceType]}</span>
                        <span className="h-1 w-1 rounded-full bg-surface-hover" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter truncate max-w-[200px]">{wo.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-4 sm:pt-0 border-t sm:border-0 border-border-subtle">
                    <div className="flex items-center gap-4">
                      {tasks.length > 0 && (
                        <div className="text-center">
                          <p className="text-[9px] font-black text-text-dim uppercase tracking-widest leading-none mb-1">Tasks</p>
                          <p className="text-xs font-bold text-text-secondary">{completedTasks}/{tasks.length}</p>
                        </div>
                      )}
                      {totalBidAmount > 0 && (
                        <div className="text-center">
                          <p className="text-[9px] font-black text-text-dim uppercase tracking-widest leading-none mb-1">Value</p>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">${totalBidAmount.toLocaleString()}</p>
                        </div>
                      )}
                      {files.length > 0 && (
                        <div className="text-center">
                          <p className="text-[9px] font-black text-text-dim uppercase tracking-widest leading-none mb-1">Visuals</p>
                          <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400">{files.length}</p>
                        </div>
                      )}
                    </div>
                    <div className={cn("p-2 rounded-xl bg-surface-hover transition-transform", isExpanded && "rotate-180")}>
                      <ChevronDown className="h-4 w-4 text-text-muted" />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 space-y-6 bg-surface-hover border-t border-border-subtle">
                    {/* Enhanced Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Protocol</p>
                        <p className="text-sm font-bold text-text-primary">{SERVICE_TYPE_LABELS[wo.serviceType]}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Initiated</p>
                        <p className="text-sm font-bold text-text-primary">{formatDate(wo.createdAt)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Resolved</p>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{wo.completedAt ? formatDate(wo.completedAt) : "Ongoing"}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        {!isCurrent && (
                          <Link
                            href={`/dashboard/work-orders/${wo.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Access Full Report →
                          </Link>
                        )}
                      </div>
                    </div>

                    {wo.description && (
                      <div className="p-4 rounded-2xl bg-surface-hover border border-border-subtle">
                        <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">Scope Summary</p>
                        <p className="text-sm text-text-secondary leading-relaxed italic">{wo.description}</p>
                      </div>
                    )}

                    {/* Compact Section for Tasks/Bids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tasks.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Task Execution</h5>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{Math.round((completedTasks/tasks.length)*100)}% Match</span>
                          </div>
                          <div className="space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.06]">
                            {tasks.map((task: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-hover border border-border-subtle">
                                {task.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <div className="h-3.5 w-3.5 rounded-full border border-border-medium" />}
                                <span className={cn("text-xs font-medium", task.completed ? "text-text-muted line-through" : "text-text-secondary")}>{task.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {files.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Captured Assets ({files.length})</h5>
                          <div className="grid grid-cols-4 gap-2">
                            {files.filter((f: any) => f.mimeType?.startsWith("image/")).slice(0, 8).map((f: any) => (
                              <div key={f.id} className="aspect-square rounded-xl overflow-hidden bg-surface border border-border-medium shadow-lg group/img">
                                <img src={f.url || f.path} alt="Historical Documentation" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── All Photos Modal ────────────────────────────────────────────────────────

function AllPhotosModal({
  source,
  tasks,
  bids,
  inspectionPhotos,
  complianceItems,
  customInspectionItems,
  onClose,
  onEditPhoto,
  onDeletePhoto,
}: {
  source: "tasks" | "bids" | "inspection" | "all";
  tasks: any[];
  bids: any[];
  inspectionPhotos: any[];
  complianceItems: any[];
  customInspectionItems: any[];
  onClose: () => void;
  onEditPhoto?: (url: string, name: string, category?: PhotoCategory, source?: "global" | "task" | "bid" | "inspection", sourceId?: string) => void;
  onDeletePhoto?: (id: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [downloadMode, setDownloadMode] = useState<"none" | "date" | "datetime" | "datetimeExif" | "custom">("datetime");
  const [customDownloadDateTime, setCustomDownloadDateTime] = useState("");
  const [downloadingPhotos, setDownloadingPhotos] = useState(false);

  // Track which task/bid each photo belongs to
  const photoSourceMap = useRef(new Map<string, { source: "task" | "bid" | "inspection"; sourceId?: string }>());

  // Collect photos based on source
  let sections: { type: string; label: string; photos: any[] }[] = [];

  if (source === "tasks" || source === "all") {
    sections = tasks
      .filter((t) => t.photos?.length > 0)
      .map((t) => {
        t.photos.forEach((p: any) => photoSourceMap.current.set(p.id, { source: "task", sourceId: t.id }));
        return { type: "Task", label: t.title, photos: t.photos };
      });
  }

  if (source === "bids" || source === "all") {
    const bidSections = bids
      .filter((b) => b.photos?.length > 0)
      .map((b) => {
        b.photos.forEach((p: any) => photoSourceMap.current.set(p.id, { source: "bid", sourceId: b.id }));
        return { type: "Bid", label: `${b.title} - $${b.amount.toLocaleString()}`, photos: b.photos };
      });
    sections = source === "all" ? [...sections, ...bidSections] : bidSections;
  }

  if (source === "inspection" || source === "all") {
    const inspectionSections: { type: string; label: string; photos: any[] }[] = [];
    inspectionPhotos.forEach((p: any) => {
      const match = p.name?.match(/^compliance-(\d+)-/);
      if (match) {
        const idx = parseInt(match[1]);
        const label = complianceItems[idx]?.label || `Compliance ${idx + 1}`;
        const existing = inspectionSections.find((s) => s.label === label);
        if (existing) existing.photos.push(p);
        else inspectionSections.push({ type: "Inspection", label, photos: [p] });
      }
    });
    inspectionPhotos.forEach((p: any) => {
      const match = p.name?.match(/^(compliance-\d+)-/);
      photoSourceMap.current.set(p.id, { source: "inspection", sourceId: match?.[1] });
    });
    customInspectionItems.forEach((item: any, i: number) => {
      if (item.photos?.length > 0) {
        item.photos.forEach((p: any) => photoSourceMap.current.set(p.id, { source: "inspection", sourceId: `custom-${i}` }));
        inspectionSections.push({ type: "Inspection", label: item.label, photos: item.photos });
      }
    });
    if (inspectionSections.length === 0 && inspectionPhotos.length > 0) {
      inspectionSections.push({ type: "Inspection", label: "Inspection Photos", photos: inspectionPhotos });
    }
    sections = source === "all" ? [...sections, ...inspectionSections] : inspectionSections;
  }
  const allPhotos = sections.flatMap((s) => s.photos);
  const totalPhotos = allPhotos.length;

  // Category filter for task/bid/inspection photo sets
  const categories =
    source === "tasks"
      ? ["ALL", "BEFORE", "DURING", "AFTER"]
      : source === "all"
      ? ["ALL", "BEFORE", "DURING", "AFTER", "BID", "INSPECTION"]
      : ["ALL"];
  const filteredSections =
    filter === "ALL"
      ? sections
      : sections
          .map((s) => ({
            ...s,
            photos: s.photos.filter((p: any) => p.category === filter),
          }))
          .filter((s) => s.photos.length > 0);

  const filteredTotal = filteredSections.reduce((s, sec) => s + sec.photos.length, 0);
  const activeLightboxSection =
    selectedSectionIndex !== null ? filteredSections[selectedSectionIndex] : null;
  const activeLightboxPhotos = activeLightboxSection?.photos || [];
  const selectedPhoto = selectedIndex !== null ? activeLightboxPhotos[selectedIndex] : null;
  const allVisiblePhotoEntries = filteredSections.flatMap((section, sectionIndex) =>
    section.photos.map((photo: any, photoIndex: number) => ({ photo, section, sectionIndex, photoIndex }))
  );
  const getPhotoKey = (photo: any, fallback: string) => String(photo.id || photo.url || photo.path || fallback);
  const selectedEntries = allVisiblePhotoEntries.filter((entry) =>
    selectedPhotoIds.has(getPhotoKey(entry.photo, `${entry.sectionIndex}-${entry.photoIndex}`))
  );

  function togglePhotoSelection(photo: any, fallback: string) {
    const key = getPhotoKey(photo, fallback);
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function safeFileName(value: string) {
    return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "photo";
  }

  function getPhotoDate(photo: any) {
    const raw = downloadMode === "custom" ? customDownloadDateTime : photo.timestamp || photo.createdAt || photo.updatedAt || photo.date;
    const parsed = raw ? new Date(raw) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function getStampText(photo: any, mode: typeof downloadMode) {
    const date = getPhotoDate(photo);
    if (mode === "date") return date.toLocaleDateString();
    if (mode === "datetime" || mode === "custom") return date.toLocaleString();
    const exifParts = [
      photo.category ? `Category: ${photo.category}` : null,
      photo.latitude && photo.longitude ? `GPS: ${photo.latitude}, ${photo.longitude}` : null,
      photo.camera ? `Camera: ${photo.camera}` : null,
      photo.uploader?.name ? `Uploader: ${photo.uploader.name}` : null,
    ].filter(Boolean);
    return `${date.toLocaleString()}${exifParts.length ? ` | ${exifParts.join(" | ")}` : " | EXIF data unavailable"}`;
  }

  async function loadDownloadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function clickDownload(href: string, fileName: string) {
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function getOriginalFile(src: string, fileName: string): Promise<ZipFileInput> {
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) throw new Error("Photo fetch failed");
    return { name: fileName, blob: await response.blob() };
  }

  async function getDownloadFile(photo: any, customFileName: string, mode: typeof downloadMode): Promise<ZipFileInput | null> {
    const src = photo.url || photo.path;
    if (!src) return null;
    const getOriginal = async () => {
      const response = await fetch(src, { cache: "no-store" });
      if (!response.ok) throw new Error("Photo fetch failed");
      return { name: `${customFileName}.jpg`, blob: await response.blob() };
    };

    if (mode === "none") {
      return getOriginal();
    }

    try {
      const img = await loadDownloadImage(src);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(img, 0, 0);
      const text = getStampText(photo, mode);
      const fontSize = Math.max(18, Math.floor(canvas.width / 42));
      const pad = Math.max(14, Math.floor(fontSize * 0.75));
      const lineHeight = Math.floor(fontSize * 1.35);
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
      ctx.fillRect(0, canvas.height - lineHeight - pad, canvas.width, lineHeight + pad);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, pad, canvas.height - pad);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Photo export failed");
      return { name: `${customFileName}-${mode}.jpg`, blob };
    } catch {
      return getOriginal();
    }
  }

  async function downloadPhoto(photo: any, sectionType: string, sectionLabel: string, mode: typeof downloadMode) {
    const cleanLabel = sectionLabel.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
    const customName = `${sectionType.toLowerCase() === "task" ? "task " : ""}${cleanLabel}`;
    const file = await getDownloadFile(photo, customName, mode);
    if (!file) return;
    const href = URL.createObjectURL(file.blob);
    clickDownload(href, file.name);
    URL.revokeObjectURL(href);
  }

  async function downloadEntries(entries: typeof allVisiblePhotoEntries) {
    if (entries.length === 0) return;
    setDownloadingPhotos(true);
    try {
      const files: ZipFileInput[] = [];
      const counters: { [key: string]: number } = {};

      for (const entry of entries) {
        try {
          const type = entry.section.type;
          const label = entry.section.label;
          const category = (entry.photo.category || "general").toLowerCase();
          const counterKey = `${type}-${label}-${category}`.toLowerCase();
          counters[counterKey] = (counters[counterKey] || 0) + 1;
          const index = counters[counterKey];

          const customName = getSanitizedFileName(type, label, entry.photo, index);
          const file = await getDownloadFile(entry.photo, customName, downloadMode);
          if (file) files.push(file);
        } catch (err) {
          console.error(`Failed to download photo ${entry.photo.name || "photo"}:`, err);
        }
      }
      if (files.length > 0) {
        const zip = await createStoredZip(files);
        const href = URL.createObjectURL(zip);
        clickDownload(href, `${source}-photos-${new Date().toISOString().slice(0, 10)}.zip`);
        URL.revokeObjectURL(href);
        toast.success(`Downloaded ${files.length} of ${entries.length} photos`);
      } else {
        toast.error("Could not download any photos. Check CORS config or network.");
      }
    } catch (e: any) {
      toast.error("Photo download failed");
    } finally {
      setDownloadingPhotos(false);
    }
  }

  const goPrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
  }, [selectedIndex]);

  const goNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < activeLightboxPhotos.length - 1) setSelectedIndex(selectedIndex + 1);
  }, [selectedIndex, activeLightboxPhotos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") setSelectedIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, goPrev, goNext]);

  const titleMap = {
    tasks: "All Task Photos",
    bids: "All Bid Photos",
    inspection: "All Inspection Photos",
    all: "All Photos",
  };
  const colorMap = {
    tasks: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-500/20" },
    bids: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-400", border: "border-violet-500/20" },
    inspection: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/20" },
    all: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-400", border: "border-sky-500/20" },
  };
  const colors = colorMap[source];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2147483600 }}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-3 px-6 py-4 border-b border-border-subtle flex-shrink-0 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors.bg)}>
              <Camera className={cn("h-5 w-5", colors.text)} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">{titleMap[source]}</h2>
              <p className="text-xs text-text-muted">
                {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""} across {sections.length} item{sections.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(source === "tasks" || source === "all") && (
              <div className="flex items-center gap-1 mr-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all",
                      filter === cat
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : "bg-surface-hover text-text-muted border-border-subtle hover:bg-surface-hover"
                    )}
                  >
                    {cat === "ALL" ? "All" : cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            <select
              value={downloadMode}
              onChange={(e) => setDownloadMode(e.target.value as typeof downloadMode)}
              className="h-8 rounded-lg border border-border-subtle bg-surface-hover px-2 text-xs text-text-primary outline-none"
              title="Download stamp option"
            >
              <option value="datetime">With date & time stamp</option>
              <option value="date">With date only stamp</option>
              <option value="datetimeExif">With date, time & EXIF data</option>
              <option value="custom">Custom date & time stamp</option>
              <option value="none">Without date/time stamp</option>
            </select>
            {downloadMode === "custom" && (
              <input
                type="datetime-local"
                value={customDownloadDateTime}
                onChange={(e) => setCustomDownloadDateTime(e.target.value)}
                className="h-8 rounded-lg border border-border-subtle bg-surface-hover px-2 text-xs text-text-primary outline-none"
                title="Custom stamp date and time"
              />
            )}
            <button
              onClick={() => {
                setSelectionMode((prev) => !prev);
                setSelectedPhotoIds(new Set());
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                selectionMode
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : "border-border-subtle bg-surface-hover text-text-secondary hover:bg-surface-hover"
              )}
            >
              Select photos
            </button>
            <button
              onClick={() => downloadEntries(selectedEntries)}
              disabled={selectedEntries.length === 0 || downloadingPhotos}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-hover px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Download selected
            </button>
            <button
              onClick={() => downloadEntries(allVisiblePhotoEntries)}
              disabled={allVisiblePhotoEntries.length === 0 || downloadingPhotos}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-hover px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Download all photos
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Photo sections */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {filteredSections.length === 0 ? (
            <div className="text-center py-16">
              <Camera className="h-12 w-12 text-text-dim mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No photos found</p>
              <p className="text-sm text-text-dim mt-1">
                {filter !== "ALL" ? `No ${filter.toLowerCase()} photos in ${source}` : `No photos uploaded for ${source} yet`}
              </p>
            </div>
          ) : (
            filteredSections.map((section, idx) => (
              <div key={idx}>
                {/* Section label */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold", colors.bg, colors.text)}>
                    {idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSectionIndex(idx);
                      setSelectedIndex(0);
                    }}
                    className="text-left text-sm font-semibold text-text-primary hover:text-foreground dark:hover:text-white transition-colors"
                    title="Open this item photo set"
                  >
                    {section.label}
                  </button>
                  <span className="text-[10px] text-text-muted">
                    {section.photos.length} photo{section.photos.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Photo grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {section.photos.map((photo: any, pIdx: number) => (
                    <button
                      key={photo.id || pIdx}
                      type="button"
                      onClick={() => {
                        if (selectionMode) {
                          togglePhotoSelection(photo, `${idx}-${pIdx}`);
                          return;
                        }
                        setSelectedSectionIndex(idx);
                        setSelectedIndex(pIdx);
                      }}
                      className="relative group rounded-xl overflow-hidden aspect-square bg-surface-hover border border-border-subtle hover:border-border-subtle transition-all"
                    >
                      <img
                        src={photo.url || photo.path}
                        alt={photo.name || photo.originalName || "Photo"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {selectionMode && (
                        <div
                          className={cn(
                            "absolute right-1.5 top-1.5 h-5 w-5 rounded-md border flex items-center justify-center text-[10px] font-bold",
                            selectedPhotoIds.has(getPhotoKey(photo, `${idx}-${pIdx}`))
                              ? "border-cyan-400 bg-cyan-500 text-white"
                              : "border-white/50 bg-black/50 text-transparent"
                          )}
                        >
                          ok
                        </div>
                      )}
                      {photo.category && (
                        <div className="absolute top-1.5 left-1.5">
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded",
                              photo.category === "BEFORE" && "bg-amber-500/80 text-white",
                              photo.category === "DURING" && "bg-cyan-500/80 text-white",
                              photo.category === "AFTER" && "bg-emerald-500/80 text-white",
                              photo.category === "BID" && "bg-rose-500/80 text-white",
                              photo.category === "INSPECTION" && "bg-violet-500/80 text-white"
                            )}
                          >
                            {photo.category}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle bg-surface-hover flex-shrink-0">
          <span className="text-xs text-text-muted">
            Showing {filteredTotal} of {totalPhotos} photos
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Lightbox for selected photo */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={activeLightboxPhotos}
          selectedIndex={selectedIndex!}
          onPrev={goPrev}
          onNext={goNext}
          onClose={() => setSelectedIndex(null)}
          onEditPhoto={(url, name, category, src, srcId) => {
            if (!onEditPhoto) return;
            const srcInfo = photoSourceMap.current.get(selectedPhoto.id);
            const fallbackSource = source === "tasks" ? "task" : source === "bids" ? "bid" : "inspection";
            onEditPhoto(
              url,
              name,
              category,
              srcInfo?.source || fallbackSource,
              srcInfo?.sourceId
            );
          }}
          onDeletePhoto={(id) => {
            if (onDeletePhoto) {
              onDeletePhoto(id);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Photo Popup Modal ───────────────────────────────────────────────────────

function PhotoPopupModal({
  photos,
  title,
  onClose,
  onEditPhoto,
  onDeletePhoto,
}: {
  photos: any[];
  title: string;
  onClose: () => void;
  onEditPhoto?: (url: string, name: string, category?: PhotoCategory, source?: "global" | "task" | "bid" | "inspection", sourceId?: string) => void;
  onDeletePhoto?: (id: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  const goPrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
  }, [selectedIndex]);

  const goNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) setSelectedIndex(selectedIndex + 1);
  }, [selectedIndex, photos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") setSelectedIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, goPrev, goNext]);

  return (
    <>
      {/* Grid popup */}
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 2147483600 }}>
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />
        <div className="relative w-full max-w-4xl max-h-[85vh] mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-text-primary">{title}</h2>
              <p className="text-xs text-text-muted mt-0.5">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Photo grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo: any, idx: number) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedIndex(idx)}
                  className="relative group rounded-xl overflow-hidden aspect-square bg-surface-hover border border-border-subtle hover:border-border-subtle transition-all"
                >
                  <img
                    src={photo.path || photo.url}
                    alt={photo.originalName || photo.name || "Photo"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-[10px] text-white truncate">
                      {photo.originalName || photo.name || "Photo"}
                    </p>
                    {photo.category && (
                      <span
                        className={cn(
                          "text-[9px] font-medium px-1 py-0.5 rounded mt-0.5 inline-block",
                          photo.category === "BEFORE"
                            ? "bg-amber-500/20 text-amber-300"
                            : photo.category === "DURING"
                            ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
                            : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        )}
                      >
                        {photo.category}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for selected photo */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          selectedIndex={selectedIndex!}
          onPrev={goPrev}
          onNext={goNext}
          onClose={() => setSelectedIndex(null)}
          onEditPhoto={onEditPhoto}
          onDeletePhoto={onDeletePhoto}
        />
      )}
    </>
  );
}

function PhotoLightbox({ photo, photos, selectedIndex, onPrev, onNext, onClose, onEditPhoto, onDeletePhoto }: {
  photo: any;
  photos?: any[];
  selectedIndex?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onEditPhoto?: (url: string, name: string, category?: PhotoCategory, source?: "global" | "task" | "bid" | "inspection", sourceId?: string) => void;
  onDeletePhoto?: (id: string) => void;
}) {
  const [showExif, setShowExif] = useState(false);
  const [exifData, setExifData] = useState<any>(null);
  const [exifLoading, setExifLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setExifData(null);
    if (showExif) {
      loadExif();
    }
  }, [photo, showExif]);


  async function loadExif() {
    setExifLoading(true);
    try {
      const { readEXIF, reverseGeocode } = await import("@/lib/exif");
      const res = await fetch(photo.path || photo.url);
      const buffer = await res.arrayBuffer();
      const exif = readEXIF(buffer);
      if (exif.gps) {
        const addr = await reverseGeocode(exif.gps.latitude, exif.gps.longitude);
        exif.address = addr ?? undefined;
      }
      setExifData(exif);
    } catch (err) {
      console.warn("EXIF read failed:", err);
    }
    setExifLoading(false);
  }

  async function downloadOriginal() {
    setDownloading(true);
    try {
      const { triggerFileDownload } = await import("@/lib/download-helper");
      await triggerFileDownload(photo.path || photo.url, photo.originalName || photo.name || "photo.jpg");
    } catch (err) {
      console.error("Download failed:", err);
    }
    setDownloading(false);
  }

  async function downloadWithTimestamp() {
    if (!imgRef.current) return;
    setDownloading(true);
    try {
      const { generatePhotoWithOverlay, DEFAULT_OVERLAY_OPTIONS } = await import("@/lib/exif");
      const { triggerFileDownload } = await import("@/lib/download-helper");
      const canvas = generatePhotoWithOverlay(
        imgRef.current,
        {
          dateTime: exifData?.dateTime ? new Date(exifData.dateTime.replace(/(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")) : photo.createdAt ? new Date(photo.createdAt) : new Date(),
          gps: exifData?.gps || undefined,
          address: exifData?.address || undefined,
        },
        DEFAULT_OVERLAY_OPTIONS
      );
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
      const filename = (photo.originalName?.replace(/\.[^.]+$/, "") || "photo") + "-timestamped.jpg";
      await triggerFileDownload(blob, filename);
    } catch (err) {
      console.error("Download with overlay failed:", err);
      downloadOriginal(); // Fallback
    }
    setDownloading(false);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4 touch-none"
      style={{
        zIndex: 2147483647,
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      onClick={onClose}
    >
      <div className="relative flex h-full w-full max-w-6xl gap-4 items-center justify-center overflow-hidden flex-col md:flex-row">
        
        {/* Main image container */}
        <div 
          className="flex-1 flex items-center justify-center min-h-0 min-w-0"
          onClick={(e) => {
            if (zoom > 1) {
              setZoom(1);
            }
          }}
        >
          <img
            ref={imgRef}
            src={photo.path || photo.url}
            alt={photo.originalName || photo.name || "Photo"}
            className={cn(
              "rounded-xl object-contain transition-all duration-300 shadow-2xl",
              zoom === 1 ? "max-w-[calc(100vw-32px)] max-h-[calc(100vh-160px)] cursor-zoom-in" : "max-w-none max-h-none cursor-zoom-out"
            )}
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            crossOrigin="anonymous"
            onClick={(e) => {
              e.stopPropagation();
              if (zoom === 1) setZoom(2);
              else if (zoom === 2) setZoom(3);
              else setZoom(1);
            }}
          />
        </div>

        {/* EXIF Panel: Bottom Drawer on Mobile, Side Panel on Desktop */}
        {showExif && (
          <div
            className="absolute bottom-16 left-3 right-3 md:static md:w-72 flex-shrink-0 bg-zinc-900/95 border border-white/20 rounded-2xl overflow-hidden self-end md:self-start max-h-[35vh] md:max-h-[85vh] overflow-y-auto z-50 text-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Photo EXIF Info</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setShowExif(false); }}
                className="p-1 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2 text-zinc-300">
              {exifLoading ? (
                <div className="text-center py-2"><Loader2 className="h-4 w-4 text-cyan-400 animate-spin mx-auto" /></div>
              ) : exifData ? (
                <>
                  {exifData.dateTime && (
                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Date/Time (EXIF)</p>
                      <p className="text-xs font-mono text-cyan-300">{exifData.dateTime}</p>
                    </div>
                  )}
                  {exifData.gps && (
                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">GPS Location</p>
                      <p className="text-xs font-mono text-emerald-400">{exifData.gps.latitude.toFixed(6)}, {exifData.gps.longitude.toFixed(6)}</p>
                      {exifData.address && <p className="text-[11px] text-zinc-300 mt-0.5">{exifData.address}</p>}
                      <a href={`https://www.google.com/maps?q=${exifData.gps.latitude},${exifData.gps.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 hover:underline mt-0.5 inline-block" onClick={(e) => e.stopPropagation()}>Open in Google Maps →</a>
                    </div>
                  )}
                  {exifData.make && (
                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Device</p>
                      <p className="text-xs text-zinc-200">{exifData.make} {exifData.model || ""}</p>
                    </div>
                  )}
                  {!exifData.gps && !exifData.dateTime && (
                    <p className="text-xs text-zinc-400 text-center py-2">No EXIF GPS metadata found in photo</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-2">Loading EXIF metadata...</p>
              )}
            </div>
          </div>
        )}

        {/* Prev button */}
        {onPrev && selectedIndex !== undefined && selectedIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/90 border border-white/20 shadow-xl backdrop-blur-md transition-colors z-30"
            title="Previous (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Next button */}
        {onNext && photos && selectedIndex !== undefined && selectedIndex < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/90 border border-white/20 shadow-xl backdrop-blur-md transition-colors z-30"
            title="Next (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 z-40">
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(Math.max(1, zoom - 0.5)); }}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-all disabled:opacity-30"
            disabled={zoom <= 1}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-black text-white w-10 text-center uppercase tracking-widest">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(Math.min(4, zoom + 0.5)); }}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-all disabled:opacity-30"
            disabled={zoom >= 4}
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(1); }}
            className="px-2 py-0.5 rounded-lg hover:bg-white/10 text-[10px] font-bold text-cyan-400 uppercase tracking-tighter"
          >
            Reset
          </button>
        </div>

        {/* Top Action Header (Positioned Safely Below Device Camera Notch) */}
        <div
          className="absolute right-3 flex items-center gap-2 z-50"
          style={{ top: "max(3.5rem, calc(env(safe-area-inset-top) + 0.75rem))" }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); downloadOriginal(); }}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 backdrop-blur-md transition-all text-xs font-bold disabled:opacity-40 shadow-lg"
            title="Download photo to phone/computer"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline uppercase tracking-wider">Save</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); downloadWithTimestamp(); }}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 backdrop-blur-md transition-all text-xs font-bold disabled:opacity-40 shadow-lg"
            title="Download with GPS & timestamp overlay"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden lg:inline uppercase tracking-wider">Timestamp</span>
          </button>

          {onEditPhoto && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditPhoto(photo.path || photo.url, photo.originalName || photo.name || "photo.jpg"); }}
              className="p-2 rounded-xl bg-black/70 text-white hover:bg-black/90 border border-white/20 shadow-lg backdrop-blur-md transition-all"
              title="Edit in Photo Editor"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (confirm("Are you sure you want to delete this photo?")) {
                onDeletePhoto?.(photo.id);
                onClose();
              }
            }}
            className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all shadow-lg"
            title="Delete photo"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setShowExif(!showExif); if (!exifData) loadExif(); }}
            className={cn(
              "p-2 rounded-xl border transition-all shadow-lg",
              showExif
                ? "bg-cyan-500 text-black font-bold border-cyan-400"
                : "bg-black/70 text-white hover:bg-black/90 border-white/20 backdrop-blur-md"
            )}
            title="Toggle Photo EXIF metadata"
          >
            <Info className="h-4 w-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/80 text-white hover:bg-black border border-white/20 shadow-lg backdrop-blur-md transition-all"
            title="Close viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bottom info label */}
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between z-20 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 max-w-[75%]">
            <p className="text-xs font-semibold text-white truncate">
              {photo.originalName || photo.name || "Photo"}
            </p>
            {photo.createdAt && (
              <p className="text-[10px] text-zinc-300 mt-0.5">
                {formatDateTime(photo.createdAt)}
              </p>
            )}
          </div>
          {photos && selectedIndex !== undefined && (
            <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-xl">
              {selectedIndex + 1} / {photos.length}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Edit Work Order Modal ───────────────────────────────────────────────────

const SERVICE_OPTIONS = [
  { value: "GRASS_CUT", label: "Grass Cut" },
  { value: "DEBRIS_REMOVAL", label: "Debris Removal" },
  { value: "WINTERIZATION", label: "Winterization" },
  { value: "BOARD_UP", label: "Board-Up" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "MOLD_REMEDIATION", label: "Mold Remediation" },
  { value: "OTHER", label: "Other (Custom)" },
];

function EditWorkOrderModal({
  workOrder,
  onClose,
  updateMutation,
}: {
  workOrder: any;
  onClose: () => void;
  updateMutation: any;
}) {
  const [form, setForm] = useState({
    title: workOrder.title || "",
    description: workOrder.description || "",
    address: workOrder.address || "",
    city: workOrder.city || "",
    state: workOrder.state || "",
    zipCode: workOrder.zipCode || "",
    serviceType: SERVICE_OPTIONS.some((o) => o.value === workOrder.serviceType)
      ? workOrder.serviceType
      : "OTHER",
    customServiceType: SERVICE_OPTIONS.some(
      (o) => o.value === workOrder.serviceType
    )
      ? ""
      : workOrder.serviceType || "",
    dueDate: workOrder.dueDate
      ? new Date(workOrder.dueDate).toISOString().split("T")[0]
      : "",
    priority: String(workOrder.priority ?? 0),
    lockCode: workOrder.lockCode || "",
    lockboxLocation: workOrder.lockboxLocation || "",
    gateCode: workOrder.gateCode || "",
    keyCode: workOrder.keyCode || "",
    keycodeLocation: workOrder.keycodeLocation || "",
    lotSize: workOrder.lotSize || "",
    lawnSize: workOrder.lawnSize || "",
    specialInstructions: workOrder.specialInstructions || "",
  });

  const showCustom = form.serviceType === "OTHER";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.address.trim()) {
      toast.error("Title and address are required");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        address: form.address.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zipCode: form.zipCode.trim() || null,
        serviceType: showCustom
          ? form.customServiceType.trim().toUpperCase().replace(/\s+/g, "_")
          : form.serviceType,
        dueDate: form.dueDate || null,
        priority: parseInt(form.priority) || 0,
        lockCode: form.lockCode.trim() || null,
        lockboxLocation: form.lockboxLocation.trim() || null,
        gateCode: form.gateCode.trim() || null,
        keyCode: form.keyCode.trim() || null,
        keycodeLocation: form.keycodeLocation.trim() || null,
        lotSize: form.lotSize.trim() || null,
        lawnSize: form.lawnSize.trim() || null,
        specialInstructions: form.specialInstructions.trim() || null,
      });
      toast.success("Work order updated");
      onClose();
    } catch {
      toast.error("Failed to update work order");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-all duration-500 animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-surface/95 backdrop-blur-2xl border border-border-medium rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-border-subtle relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(6,182,212,0.2)]">
              <Pencil className="h-5 w-5 text-cyan-700 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary tracking-tight">Modify Protocols</h2>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Refining Work Order Assets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl hover:bg-surface-hover text-text-muted hover:text-foreground dark:hover:text-white transition-all group active:scale-95"
          >
            <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto px-10 py-8 space-y-10 custom-scrollbar relative z-10"
        >
          {/* Basic Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Operational Core</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Asset Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Scope Documentation</label>
                <div className="rounded-2xl border border-border-subtle bg-surface-hover overflow-hidden focus-within:border-cyan-500/50 transition-all shadow-inner">
                  <RichTextEditor
                    value={form.description}
                    onChange={(val) => setForm({ ...form, description: val })}
                    placeholder="Describe the work to be done..."
                    minHeight={150}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Service Protocol</label>
                  <div className="relative group">
                    <select
                      value={form.serviceType}
                      onChange={(e) => setForm({ ...form, serviceType: e.target.value, customServiceType: "" })}
                      className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner appearance-none"
                    >
                      {SERVICE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none transition-transform group-hover:scale-110" />
                  </div>
                </div>

                {showCustom && (
                  <div className="space-y-2 animate-in slide-in-from-left-4 duration-300">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Custom Designation</label>
                    <input
                      type="text"
                      value={form.customServiceType}
                      onChange={(e) => setForm({ ...form, customServiceType: e.target.value })}
                      placeholder="e.g., Pressure Washing"
                      className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-t border-border-subtle pt-10">
              <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Geospatial Data</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Site Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary focus:border-violet-500/50 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary focus:border-violet-500/50 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">ZIP Code</label>
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className="w-full px-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary focus:border-violet-500/50 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling & Access */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-t border-border-subtle pt-10">
              <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Protocol Timing & Access</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Operational Deadline</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 focus:outline-none transition-all shadow-inner [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Urgency Tier</label>
                  <div className="relative group">
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 focus:outline-none transition-all shadow-inner appearance-none"
                    >
                      <option value="0">Standard Priority</option>
                      <option value="1">High Priority</option>
                      <option value="2">Critical / Urgent</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none transition-transform group-hover:scale-110" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Lockbox Code", key: "lockCode", icon: Lock },
                  { label: "Key Code", key: "keyCode", icon: Key },
                  { label: "Gate Code", key: "gateCode", icon: Shield },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{field.label}</label>
                    <div className="relative group">
                      <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim group-focus-within:text-amber-700 dark:text-amber-400 transition-colors" />
                      <input
                        type="text"
                        value={(form as any)[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        placeholder="N/A"
                        className="w-full pl-11 pr-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary focus:border-amber-500/50 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Lockbox Location", key: "lockboxLocation", placeholder: "e.g., Front door, side gate..." },
                  { label: "Key Code Location", key: "keycodeLocation", placeholder: "e.g., Lockbox, office..." },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{field.label}</label>
                    <input
                      type="text"
                      value={(form as any)[field.key]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary focus:border-amber-500/50 focus:outline-none transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Lot Size", key: "lotSize", placeholder: "e.g., 0.25 acres, 10,000 sqft..." },
                  { label: "Lawn Size", key: "lawnSize", placeholder: "e.g., 5,000 sqft, 1/4 acre..." },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{field.label}</label>
                    <input
                      type="text"
                      value={(form as any)[field.key]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary focus:border-amber-500/50 focus:outline-none transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Directive Override</label>
                <RichTextEditor
                  value={form.specialInstructions}
                  onChange={(val) => setForm({ ...form, specialInstructions: val })}
                  placeholder="Additional logistical requirements..."
                  minHeight={150}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-border-subtle bg-surface-hover flex justify-end gap-4 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 rounded-2xl bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest border border-border-subtle hover:bg-surface-hover hover:text-foreground dark:hover:text-white transition-all active:scale-95"
          >
            Abort Changes
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_8px_25px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_12px_30px_-5px_rgba(6,182,212,0.5)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-3"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Commit Updates
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task-Level Chat Component ────────────────────────────────────────────────

function TaskChat({
  workOrderId,
  taskId,
}: {
  workOrderId: string;
  taskId: string;
}) {
  const { data: session } = useSession();
  const { data: taskThread } = useTaskMessages(workOrderId, taskId);
  const sendMessage = useSendTaskMessage(workOrderId, taskId);
  const [msg, setMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = (session?.user as any)?.id;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [taskThread?.messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    try {
      await sendMessage.mutateAsync({ content: msg.trim() });
      setMsg("");
    } catch {
      toast.error("Failed to send message");
    }
  }

  const messages = taskThread?.messages || [];

  return (
    <div className="ml-8 mt-2 mb-4 border border-border-subtle rounded-xl overflow-hidden bg-background">
      <div className="px-4 py-2 bg-surface-hover border-b border-border-subtle flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs font-medium text-text-muted">Task Chat</span>
      </div>

      <div className="max-h-48 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs text-text-dim text-center py-2">
            No messages for this task yet.
          </p>
        ) : (
          messages.map((m: any) => (
            <div
              key={m.id}
              className={`flex gap-2 ${
                m.authorId === userId ? "flex-row-reverse" : ""
              }`}
            >
              <Avatar name={m.author?.name} src={m.author?.image} size="sm" />
              <div
                className={`max-w-[70%] px-3 py-1.5 rounded-xl text-xs ${
                  m.authorId === userId
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-sm"
                    : "bg-surface-hover text-text-primary rounded-tl-sm"
                }`}
              >
                <p>{m.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 p-2 border-t border-border-subtle"
      >
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Message about this task..."
          className="flex-1 px-3 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!msg.trim() || sendMessage.isPending}
          className="p-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}

// ─── Compliance Items ─────────────────────────────────────────────────────────

function getComplianceItems(
  serviceType: string,
  workOrder: any,
  tasks: any[],
  allPhotos: PhotoItem[]
): {
  label: string;
  description?: string;
  required: boolean;
  completed: boolean;
}[] {
  const base = [
    {
      label: "Before photos uploaded",
      description: "Photos taken before starting work",
      required: true,
      completed:
        workOrder.files?.some((f: any) => f.category === "BEFORE") ||
        allPhotos.some((p) => p.category === "BEFORE"),
    },
    {
      label: "During photos uploaded",
      description: "Photos taken during work progress",
      required: true,
      completed:
        workOrder.files?.some((f: any) => f.category === "DURING") ||
        allPhotos.some((p) => p.category === "DURING"),
    },
    {
      label: "After photos uploaded",
      description: "Photos taken after work completion",
      required: true,
      completed:
        workOrder.files?.some((f: any) => f.category === "AFTER") ||
        allPhotos.some((p) => p.category === "AFTER"),
    },
    {
      label: "All tasks completed",
      description: "Every task item checked off",
      required: true,
      completed:
        tasks.length > 0 && tasks.every((t: any) => t.completed),
    },
    {
      label: "Property secured",
      description: "All doors and windows locked",
      required: true,
      completed: false,
    },
    {
      label: "Access codes documented",
      description: "Lock/gate/key codes recorded",
      required: true,
      completed: !!(
        workOrder.lockCode ||
        workOrder.gateCode ||
        workOrder.keyCode
      ),
    },
  ];

  const serviceSpecific: Record<string, typeof base> = {
    WINTERIZATION: [
      {
        label: "Lock change completed",
        description: "New lock installed with photos before/during/after",
        required: true,
        completed: false,
      },
      {
        label: "Key code inside lockbox",
        description: "Key code placed inside the lockbox",
        required: true,
        completed: false,
      },
      {
        label: "Lockbox code documented",
        description: "Lockbox combination recorded",
        required: true,
        completed: !!workOrder.lockCode,
      },
    ],
    BOARD_UP: [
      {
        label: "Board-up materials documented",
        description: "All materials used recorded for billing",
        required: true,
        completed: false,
      },
      {
        label: "Entry points secured",
        description: "All windows and doors boarded",
        required: true,
        completed: false,
      },
    ],
    MOLD_REMEDIATION: [
      {
        label: "Pre-remediation testing",
        description: "Air quality test before work",
        required: true,
        completed: false,
      },
      {
        label: "Post-remediation testing",
        description: "Air quality test after work",
        required: true,
        completed: false,
      },
    ],
  };

  return [...base, ...(serviceSpecific[serviceType] || [])];
}
