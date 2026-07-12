"use client";

import { useState, useRef, useCallback } from "react";
import { Button, Card, Badge } from "@/components/ui";
import {
  Upload,
  FileJson,
  FileText,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Eye,
  FileUp,
  Loader2,
  ChevronDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type ImportMode = "upload" | "preview" | "importing" | "done" | "auto";

interface PreviewRow {
  row: number;
  title: string;
  address: string;
  serviceType: string;
  dueDate: string | null;
  status: string;
  contractorName: string;
  errors: string[];
  valid: boolean;
  rawData: Record<string, any>;
}

interface ImportResult {
  created: number;
  failed: number;
  total: number;
  results: { success: boolean; row: number; id?: string; error?: string; title?: string }[];
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase().replace(/\s+/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)/g)?.map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || [];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

// ─── Column Name Normalizer ──────────────────────────────────────────────────
const COLUMN_ALIASES: Record<string, string> = {
  // Title
  "title": "title", "name": "title", "workorder": "title", "workordertitle": "title", "jobtitle": "title", "job": "title",
  // Address
  "address": "address", "propertyaddress": "address", "street": "address", "location": "address", "propaddress": "address", "property": "address",
  // City/State/Zip
  "city": "city", "town": "city",
  "state": "state", "st": "state", "province": "state",
  "zip": "zipCode", "zipcode": "zipCode", "zipCode": "zipCode", "postal": "zipCode", "postalcode": "zipCode",
  // Service Type
  "servicetype": "serviceType", "service": "serviceType", "type": "serviceType", "category": "serviceType", "worktype": "serviceType", "ordertype": "serviceType",
  // Status
  "status": "status", "orderstatus": "status", "workorderstatus": "status",
  // Dates
  "duedate": "dueDate", "due": "dueDate", "deadline": "dueDate", "targetdate": "dueDate", "scheduledate": "dueDate", "date": "dueDate",
  // Description
  "description": "description", "notes": "description", "details": "description", "comments": "description", "workdescription": "description",
  // Priority
  "priority": "priority", "urgency": "priority", "importance": "priority",
  // Lock/Gate/Key
  "lockcode": "lockCode", "lock": "lockCode", "code": "lockCode",
  "lockboxlocation": "lockboxLocation", "lockbox": "lockboxLocation",
  "gatecode": "gateCode", "gate": "gateCode",
  "keycode": "keyCode", "key": "keyCode",
  "keycodelocation": "keycodeLocation",
  // Sizes
  "lotsize": "lotSize", "lot": "lotSize",
  "lawnsize": "lawnSize", "lawn": "lawnSize",
  // Special instructions
  "specialinstructions": "specialInstructions", "instructions": "specialInstructions", "special": "specialInstructions",
  // Assignments
  "contractor": "contractorName", "contractorname": "contractorName", "assignedto": "contractorName", "vendor": "contractorName",
  "coordinator": "coordinatorName", "coordinatorname": "coordinatorName", "assignedby": "coordinatorName",
  "client": "clientName", "clientname": "clientName",
  // Tasks
  "tasks": "tasks", "tasklist": "tasks", "checklist": "tasks",
};

function normalizeColumns(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((row) => {
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const mappedKey = COLUMN_ALIASES[cleanKey] || COLUMN_ALIASES[key.toLowerCase().trim()] || key;
      normalized[mappedKey] = value;
    }
    return normalized;
  });
}

// ─── Excel Parser (uses SheetJS from CDN) ────────────────────────────────────
async function parseExcelFile(file: File): Promise<Record<string, any>[]> {
  // Load SheetJS from CDN if not already loaded
  if (!(window as any).XLSX) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Excel parser"));
      document.head.appendChild(script);
    });
  }

  const XLSX = (window as any).XLSX;
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return json;
}

// ─── PDF Parser (uses pdf.js from CDN) ───────────────────────────────────────
async function parsePDFFile(file: File): Promise<Record<string, any>[]> {
  // Load pdf.js from CDN if not already loaded
  if (!(window as any).pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load PDF parser"));
      document.head.appendChild(script);
    });
  }

  const pdfjsLib = (window as any).pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allRows: Record<string, any>[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = "";

    // Group text items into lines based on Y position
    let lastY: number | null = null;
    for (const item of textContent.items) {
      const y = Math.round((item as any).transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = "";
      }
      currentLine += (item as any).str + " ";
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    // Try to detect table structure
    const tableRows = extractTableFromLines(lines);
    if (tableRows.length > 0) {
      allRows.push(...tableRows);
    } else {
      // Fallback: try to extract key-value pairs
      const kvRow = extractKeyValuePairs(lines);
      if (Object.keys(kvRow).length > 0) allRows.push(kvRow);
    }
  }

  return allRows;
}

function extractTableFromLines(lines: string[]): Record<string, any>[] {
  if (lines.length < 2) return [];

  // Try to detect if first line is a header
  const potentialHeaders = lines[0].split(/\s{2,}|\t/).map((h) => h.trim().toLowerCase());
  if (potentialHeaders.length < 2) return [];

  // Check if subsequent lines have similar column count
  const dataLines = lines.slice(1).filter((l) => l.trim());
  const rows: Record<string, any>[] = [];

  for (const line of dataLines) {
    const cols = line.split(/\s{2,}|\t/).map((c) => c.trim());
    if (cols.length >= 2) {
      const row: Record<string, any> = {};
      potentialHeaders.forEach((h, i) => {
        if (h && cols[i]) row[h] = cols[i];
      });
      if (Object.keys(row).length > 0) rows.push(row);
    }
  }

  return rows;
}

function extractKeyValuePairs(lines: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const line of lines) {
    // Try "Key: Value" pattern
    const kvMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim().toLowerCase().replace(/\s+/g, "");
      const value = kvMatch[2].trim();
      result[key] = value;
      continue;
    }

    // Try "Key    Value" pattern (tab or multi-space separated)
    const tabMatch = line.split(/\s{3,}|\t/);
    if (tabMatch.length === 2) {
      const key = tabMatch[0].trim().toLowerCase().replace(/\s+/g, "");
      const value = tabMatch[1].trim();
      if (key && value) result[key] = value;
    }
  }

  return result;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkOrderImportModal({ isOpen, onClose, onImported }: ImportModalProps) {
  const [mode, setMode] = useState<ImportMode>("upload");
  const [uploadTab, setUploadTab] = useState<"file" | "auto">("file");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setMode("upload");
    setFileName("");
    setFileType("");
    setPreview([]);
    setImportResult(null);
    setParsing(false);
    setImporting(false);
    setRawRows([]);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── Handle File Upload ──
  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setError("");
    setFileName(file.name);
    setFileType(file.name.split(".").pop()?.toLowerCase() || "");

    try {
      let rows: Record<string, any>[] = [];
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "json") {
        const text = await file.text();
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : parsed.data || parsed.rows || parsed.workOrders || [parsed];
      } else if (ext === "csv" || ext === "tsv") {
        const text = await file.text();
        rows = parseCSV(text);
      } else if (ext === "xlsx" || ext === "xls") {
        rows = await parseExcelFile(file);
      } else if (ext === "pdf") {
        rows = await parsePDFFile(file);
      } else {
        // Try as text/CSV
        const text = await file.text();
        rows = parseCSV(text);
      }

      if (rows.length === 0) {
        setError("No data found in file. Please check the format.");
        setParsing(false);
        return;
      }

      // Normalize column names
      const normalized = normalizeColumns(rows);
      setRawRows(normalized);

      // Send to server for preview
      const res = await fetch("/api/work-orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: normalized, mode: "preview" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to parse file");
      }

      const data = await res.json();
      setPreview(data.preview);
      setMode("preview");
    } catch (err: any) {
      setError(err.message || "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }, []);

  // ── Handle Import ──
  const handleImport = useCallback(async () => {
    setImporting(true);
    setError("");

    try {
      const res = await fetch("/api/work-orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows, mode: "import" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Import failed");
      }

      const data = await res.json();
      setImportResult(data);
      setMode("done");
      onImported();
      toast.success(`Imported ${data.created} work orders!`);
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }, [rawRows, onImported]);

  // ── Drop zone handlers ──
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 2147483646 }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-surface border border-border-subtle rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FileUp className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Import Work Orders</h2>
              <p className="text-xs text-text-muted">Supports JSON, CSV, Excel (.xlsx), and PDF files</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab Selector */}
          {mode === "upload" && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setUploadTab("file")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  uploadTab === "file"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "bg-surface-hover text-text-muted hover:text-text-primary"
                )}
              >
                <Upload className="h-4 w-4" />
                Upload File
              </button>
              <button
                onClick={() => setUploadTab("auto")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  uploadTab === "auto"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "bg-surface-hover text-text-muted hover:text-text-primary"
                )}
              >
                <Zap className="h-4 w-4" />
                Auto-Import from Client
              </button>
            </div>
          )}

          {/* Upload Mode — File Upload */}
          {mode === "upload" && uploadTab === "file" && (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                  parsing
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "border-border-medium hover:border-cyan-500/50 hover:bg-cyan-500/5"
                )}
              >
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
                    <p className="text-sm font-medium text-text-primary">Parsing {fileName}...</p>
                    <p className="text-xs text-text-muted">Analyzing file structure and columns</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-surface-hover flex items-center justify-center">
                      <Upload className="h-8 w-8 text-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Drop your file here or <span className="text-cyan-400">browse</span>
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        Supports .json, .csv, .xlsx, .xls, .pdf
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.csv,.tsv,.xlsx,.xls,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {/* Format Guide */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: FileJson, label: "JSON", desc: "Array of objects", color: "text-amber-500 bg-amber-500/10" },
                  { icon: FileText, label: "CSV", desc: "Comma-separated", color: "text-emerald-500 bg-emerald-500/10" },
                  { icon: FileSpreadsheet, label: "Excel", desc: ".xlsx / .xls", color: "text-blue-500 bg-blue-500/10" },
                  { icon: FileText, label: "PDF", desc: "Tables & forms", color: "text-rose-500 bg-rose-500/10" },
                ].map((fmt) => (
                  <div key={fmt.label} className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
                    <div className={cn("p-2 rounded-lg", fmt.color)}>
                      <fmt.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{fmt.label}</p>
                      <p className="text-[10px] text-text-muted">{fmt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample Download */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    const sample = [
                      { title: "Grass Cut - 123 Main St", address: "123 Main St", city: "Chicago", state: "IL", zipCode: "60601", serviceType: "Grass Cut", dueDate: "2026-05-20", priority: "1", contractorName: "John Smith", description: "Monthly grass cut" },
                      { title: "Winterization - 456 Oak Ave", address: "456 Oak Ave", city: "Chicago", state: "IL", zipCode: "60602", serviceType: "Winterization", dueDate: "2026-05-25", priority: "2", description: "Full winterization" },
                    ];
                    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "work-orders-sample.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download JSON Sample
                </button>
                <button
                  onClick={() => {
                    const csv = "title,address,city,state,zipCode,serviceType,dueDate,priority,contractorName,description\nGrass Cut - 123 Main St,123 Main St,Chicago,IL,60601,Grass Cut,2026-05-20,1,John Smith,Monthly grass cut\nWinterization - 456 Oak Ave,456 Oak Ave,Chicago,IL,60602,Winterization,2026-05-25,2,,Full winterization";
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "work-orders-sample.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download CSV Sample
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  <p className="text-sm text-rose-500">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Upload Mode — Auto-Import from Client System */}
          {mode === "upload" && uploadTab === "auto" && (
            <AutoImportSection onImported={onImported} onClose={handleClose} />
          )}

          {/* Preview Mode */}
          {mode === "preview" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover">
                  <FileUp className="h-4 w-4 text-text-muted" />
                  <span className="text-sm font-medium text-text-primary">{fileName}</span>
                  <Badge className="text-[10px] bg-cyan-500/10 text-cyan-400">{fileType.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-text-muted">
                    <span className="font-bold text-text-primary">{preview.length}</span> rows found
                  </span>
                  <span className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" />
                    {preview.filter((p) => p.valid).length} valid
                  </span>
                  {preview.some((p) => !p.valid) && (
                    <span className="flex items-center gap-1 text-rose-500">
                      <AlertTriangle className="h-3 w-3" />
                      {preview.filter((p) => !p.valid).length} with errors
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-border-subtle rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-surface-hover border-b border-border-subtle">
                        <th className="px-3 py-2 text-left font-semibold text-text-muted w-10">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">Title</th>
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">Address</th>
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">Service Type</th>
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">Due Date</th>
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">Contractor</th>
                        <th className="px-3 py-2 text-center font-semibold text-text-muted w-16">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {preview.map((row) => (
                        <tr key={row.row} className={cn("hover:bg-surface-hover", !row.valid && "bg-rose-500/5")}>
                          <td className="px-3 py-2 text-text-muted">{row.row}</td>
                          <td className="px-3 py-2 text-text-primary font-medium max-w-[200px] truncate">{row.title}</td>
                          <td className="px-3 py-2 text-text-dim max-w-[200px] truncate">{row.address}</td>
                          <td className="px-3 py-2">
                            <Badge className="text-[10px] bg-surface-hover text-text-muted">{row.serviceType}</Badge>
                          </td>
                          <td className="px-3 py-2 text-text-muted">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}</td>
                          <td className="px-3 py-2">
                            <Badge className="text-[10px] bg-blue-500/10 text-blue-500">{row.status}</Badge>
                          </td>
                          <td className="px-3 py-2 text-text-muted">{row.contractorName || "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {row.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <div className="group relative">
                                <AlertTriangle className="h-4 w-4 text-rose-500 mx-auto cursor-help" />
                                <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover:block w-48 p-2 bg-surface border border-border-subtle rounded-lg shadow-xl text-left">
                                  {row.errors.map((err, i) => (
                                    <p key={i} className="text-[10px] text-rose-500">• {err}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Column Mapping Info */}
              <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <p className="text-xs text-cyan-400 font-medium mb-1">📋 Auto-Mapped Columns</p>
                <p className="text-[10px] text-text-muted">
                  Column names are automatically recognized. Supported fields: title, address, city, state, zipCode, serviceType, status, dueDate, priority, description, lockCode, gateCode, keyCode, contractor, coordinator, tasks.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  <p className="text-sm text-rose-500">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Importing Mode */}
          {mode === "importing" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
              <p className="text-sm font-medium text-text-primary">Importing {rawRows.length} work orders...</p>
              <p className="text-xs text-text-muted">This may take a moment for large files</p>
            </div>
          )}

          {/* Done Mode */}
          {mode === "done" && importResult && (
            <div className="space-y-6">
              {/* Result Summary */}
              <div className="flex items-center justify-center gap-6 py-6">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-500">{importResult.created}</p>
                  <p className="text-xs text-text-muted">Created</p>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-2">
                      <AlertTriangle className="h-8 w-8 text-rose-500" />
                    </div>
                    <p className="text-2xl font-bold text-rose-500">{importResult.failed}</p>
                    <p className="text-xs text-text-muted">Failed</p>
                  </div>
                )}
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-2">
                    <FileUp className="h-8 w-8 text-text-muted" />
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{importResult.total}</p>
                  <p className="text-xs text-text-muted">Total</p>
                </div>
              </div>

              {/* Results List */}
              {importResult.results.length > 0 && (
                <div className="border border-border-subtle rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface-hover">
                      <tr className="border-b border-border-subtle">
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">Work Order</th>
                        <th className="px-3 py-2 text-center font-semibold text-text-muted">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {importResult.results.map((r, i) => (
                        <tr key={i} className={cn(!r.success && "bg-rose-500/5")}>
                          <td className="px-3 py-2 text-text-muted">{r.row}</td>
                          <td className="px-3 py-2 text-text-primary truncate max-w-[300px]">{r.title || r.error || "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {r.success ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <span className="text-[10px] text-rose-500">{r.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle flex-shrink-0">
          <div>
            {mode !== "upload" && mode !== "done" && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Start Over
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              {mode === "done" ? "Close" : "Cancel"}
            </Button>
            {mode === "preview" && (
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || preview.filter((p) => p.valid).length === 0}
              >
                {importing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5 mr-1" />
                )}
                Import {preview.filter((p) => p.valid).length} Work Orders
              </Button>
            )}
            {mode === "done" && (
              <Button size="sm" onClick={handleClose}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auto-Import from Client System ─────────────────────────────────────────

function AutoImportSection({ onImported, onClose }: { onImported: () => void; onClose: () => void }) {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [mapping, setMapping] = useState("");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; sampleData?: any[] } | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [recentImports, setRecentImports] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Load recent imports
  useState(() => {
    setLoadingRecent(true);
    fetch("/api/work-orders/import/auto")
      .then((r) => r.json())
      .then((data) => setRecentImports(data.recentImports || []))
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
  });

  async function handleTest() {
    if (!apiUrl) {
      toast.error("API URL is required");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/work-orders/import/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: {
            id: "test",
            name: sourceName || "External Source",
            type: "api",
            url: apiUrl,
            apiKey: apiKey || undefined,
            mapping: mapping ? JSON.parse(mapping) : undefined,
          },
          action: "test",
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) toast.success("Connection successful!");
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      toast.error("Connection failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    if (!apiUrl) {
      toast.error("API URL is required");
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/work-orders/import/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: {
            id: "sync",
            name: sourceName || "External Source",
            type: "api",
            url: apiUrl,
            apiKey: apiKey || undefined,
            mapping: mapping ? JSON.parse(mapping) : undefined,
          },
          action: "sync",
        }),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.success && data.created > 0) {
        toast.success(`Imported ${data.created} work orders!`);
        onImported();
      } else if (data.success) {
        toast("No new work orders found", { icon: "ℹ️" });
      }
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-text-primary">Connect to External System</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Source Name</label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="e.g. Client CRM, FieldEdge, Jobber"
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">API Endpoint URL *</label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.client.com/work-orders"
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">API Key / Bearer Token</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Optional — leave blank if not needed"
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">
            Column Mapping (JSON) <span className="text-text-dim">— optional</span>
          </label>
          <textarea
            value={mapping}
            onChange={(e) => setMapping(e.target.value)}
            placeholder={'{"external_field": "address", "job_type": "serviceType", "assigned_to": "contractorName"}'}
            rows={2}
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs font-mono bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none resize-none"
          />
          <p className="text-[10px] text-text-dim mt-1">Map external API field names to internal work order fields</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !apiUrl}>
            {testing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
            Test Connection
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncing || !apiUrl}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Sync & Import
          </Button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={cn(
            "p-3 rounded-lg border",
            testResult.success
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-rose-500/5 border-rose-500/20"
          )}>
            <p className={cn("text-sm font-medium", testResult.success ? "text-emerald-500" : "text-rose-500")}>
              {testResult.success ? "✅ " : "❌ "}{testResult.message}
            </p>
            {testResult.sampleData && testResult.sampleData.length > 0 && (
              <div className="mt-2 p-2 bg-surface-hover rounded text-[10px] font-mono text-text-muted max-h-32 overflow-y-auto">
                <p className="font-bold text-text-dim mb-1">Sample Data:</p>
                {testResult.sampleData.map((item, i) => (
                  <pre key={i} className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sync Result */}
        {syncResult && (
          <div className={cn(
            "p-3 rounded-lg border",
            syncResult.success
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-rose-500/5 border-rose-500/20"
          )}>
            <p className={cn("text-sm font-medium", syncResult.success ? "text-emerald-500" : "text-rose-500")}>
              {syncResult.success ? `✅ Imported ${syncResult.created} work orders` : `❌ ${syncResult.error}`}
            </p>
            {syncResult.failed > 0 && (
              <p className="text-xs text-amber-500 mt-1">{syncResult.failed} rows failed</p>
            )}
          </div>
        )}
      </div>

      {/* Supported Systems */}
      <div className="p-4 rounded-xl bg-surface-hover border border-border-subtle">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Supported Client Systems</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {["FieldEdge", "Jobber", "ServiceTitan", "Housecall Pro", "mHelpDesk", "Custom REST API"].map((sys) => (
            <div key={sys} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-subtle">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-text-primary">{sys}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-dim mt-3">
          Any system with a REST API that returns JSON can be connected. Use the column mapping to match field names.
        </p>
      </div>

      {/* Recent Imports */}
      {recentImports.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Recent Imports</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentImports.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover text-xs">
                <RefreshCw className="h-3 w-3 text-text-muted" />
                <span className="text-text-dim flex-1 truncate">{log.details}</span>
                <span className="text-text-dim">{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
