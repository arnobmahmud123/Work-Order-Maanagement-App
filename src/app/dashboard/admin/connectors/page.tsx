"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Cable,
  Plus,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  Settings2,
  Database,
  Layers,
  Send,
  Zap,
  HelpCircle,
  FileText,
  Building,
  Check,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  Sliders,
  Sparkles,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function ConnectorsAdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"catalog" | "file_import" | "mappings" | "history" | "submissions">("catalog");
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [configuredConnectors, setConfiguredConnectors] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Configuration Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    connectorKey: "",
    clientId: "",
    name: "",
    syncIntervalMinutes: 10,
    apiKey: "",
    username: "",
    password: "",
    endpointUrl: "",
    vendorCode: "",
  });

  // File Import Studio State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<any>({});
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccessResult, setImportSuccessResult] = useState<any>(null);

  // Mappings State
  const [serviceMappings, setServiceMappings] = useState<any[]>([]);
  const [statusMappings, setStatusMappings] = useState<any[]>([]);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    type: "SERVICE",
    externalName: "",
    externalCode: "",
    internalCode: "GRASS_CUT",
    externalStatus: "",
    internalStatus: "NEW",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [connRes, healthRes, subRes] = await Promise.all([
        fetch("/api/connectors"),
        fetch("/api/connectors/health"),
        fetch("/api/connectors/submissions"),
      ]);

      if (connRes.ok) {
        const data = await connRes.json();
        setCatalog(data.catalog || []);
        setConfiguredConnectors(data.configuredConnectors || []);
        setClients(data.clients || []);
      }

      if (healthRes.ok) {
        const hData = await healthRes.json();
        setRecentJobs(hData.recentJobs || []);
      }

      if (subRes.ok) {
        const sData = await subRes.json();
        setSubmissions(sData.submissions || []);
      }
    } catch (err) {
      console.error("Failed to load connector data:", err);
      toast.error("Failed to load connectors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      const res = await fetch(`/api/connectors/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Connection Active! ${data.message} (${data.latencyMs}ms)`);
      } else {
        toast.error(`Connection Error: ${data.message || data.error}`);
      }
      fetchData();
    } catch (err) {
      toast.error("Test connection request failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncNow = async (id: string) => {
    try {
      setSyncingId(id);
      toast("Starting synchronization pipeline...");
      const res = await fetch(`/api/connectors/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.status === "COMPLETED") {
        toast.success(
          `Sync Completed! Created: ${data.recordsCreated}, Updated: ${data.recordsUpdated} (${data.durationMs}ms)`
        );
      } else if (data.status === "PARTIAL") {
        toast(
          `Sync Partial: Created ${data.recordsCreated}, ${data.recordsFailed} failed.`
        );
      } else {
        toast.error(`Sync Failed: ${data.errors?.join(", ") || data.error}`);
      }
      fetchData();
    } catch (err) {
      toast.error("Sync request failed");
    } finally {
      setSyncingId(null);
    }
  };

  const handleSaveConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        connectorKey: configForm.connectorKey,
        clientId: configForm.clientId,
        name: configForm.name,
        syncIntervalMinutes: Number(configForm.syncIntervalMinutes) || 10,
        credentials: {},
        config: {},
      };

      if (configForm.apiKey) payload.credentials.apiKey = configForm.apiKey;
      if (configForm.username) payload.credentials.username = configForm.username;
      if (configForm.password) payload.credentials.password = configForm.password;
      if (configForm.vendorCode) payload.credentials.vendorCode = configForm.vendorCode;
      if (configForm.endpointUrl) payload.config.endpointUrl = configForm.endpointUrl;

      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to configure connector");

      toast.success("Connector configured successfully!");
      setConfigModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to configure connector");
    }
  };

  // Universal Multi-Format (CSV, Excel, PDF, JSON) Parse Handler
  const processUploadedFile = async (file: File) => {
    setImportFile(file);
    setImportSuccessResult(null);
    setValidating(true);

    try {
      const fileName = file.name.toLowerCase();

      // ── 1. PDF File Parsing ────────────────────────────────────────────────
      if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
        toast("Parsing PDF Work Order document...");

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

        // Collect ALL text items with their x/y positions for column-aware parsing
        interface PdfItem { x: number; y: number; str: string; }
        const allItems: PdfItem[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          for (const item of (textContent as any).items) {
            const t = item.transform;
            const str = (item.str || "").trim();
            if (str) {
              allItems.push({ x: Math.round(t[4]), y: Math.round(t[5]), str });
            }
          }
        }

        // Build line-ordered text (sorted by Y descending, then X ascending within same Y)
        const byY = new Map<number, PdfItem[]>();
        for (const item of allItems) {
          if (!byY.has(item.y)) byY.set(item.y, []);
          byY.get(item.y)!.push(item);
        }
        const sortedYs = [...byY.keys()].sort((a, b) => b - a);
        const fullTextLines: string[] = [];
        for (const y of sortedYs) {
          const rowItems = byY.get(y)!.sort((a, b) => a.x - b.x);
          const lineStr = rowItems.map(i => i.str).join(" ").trim();
          if (lineStr) fullTextLines.push(lineStr);
        }
        const joinedText = fullTextLines.join("\n");

        // ── FIELD EXTRACTION ─────────────────────────────────────────────────────
        // Build two versions of text:
        // 1. flatText: all items joined by space (single line, good for regex spanning)
        // 2. joinedText: Y-sorted lines (good for line-by-line structured search)
        const flatText = allItems.map(i => i.str).join(" ");

        const extracted: Record<string, any> = {
          "Work Order #": file.name.replace(/\.[^/.]+$/, "").replace(/^PrintableWO_/, "").split("_")[0],
          "Service": "Property Preservation",
          "Property Address": "",
          "City": "",
          "State": "",
          "Zip": "",
          "Due Date": new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          "Lock Code": "",
          "Instructions": "",
        };

        // WO Number: search allItems directly for "MCS WO#:" then grab the next item
        {
          const mcsIdx = allItems.findIndex(i => /MCS\s*WO#/i.test(i.str) || i.str === "MCS WO#:" || i.str === "MCS WO#");
          if (mcsIdx !== -1) {
            // Next non-empty item is the WO number
            for (let j = mcsIdx + 1; j < Math.min(mcsIdx + 5, allItems.length); j++) {
              if (allItems[j].str.trim() && /^[A-Z0-9-]{4,20}$/.test(allItems[j].str.trim())) {
                extracted["Work Order #"] = allItems[j].str.trim();
                break;
              }
            }
          }
          // Fallback: regex on flatText
          if (extracted["Work Order #"] === file.name.replace(/\.[^/.]+$/, "").replace(/^PrintableWO_/, "").split("_")[0]) {
            const woMatch = flatText.match(/MCS\s*WO#[:\s]+([A-Z0-9-]{4,20})/i)
              || flatText.match(/WO\s*#[:\s]+([A-Z0-9-]{4,20})/i);
            if (woMatch) extracted["Work Order #"] = woMatch[1].trim();
          }
          // Last fallback: extract from filename (PrintableWO_M15532300_20260821 → M15532300)
          const fnMatch = file.name.match(/[_-]([A-Z]\d{6,12})[_.-]/i);
          if (fnMatch && extracted["Work Order #"] === file.name.replace(/\.[^/.]+$/, "").replace(/^PrintableWO_/, "").split("_")[0]) {
            extracted["Work Order #"] = fnMatch[1].trim();
          }
        }

        // WO Type: find "WO Type:" in allItems and grab the next item
        {
          const typeIdx = allItems.findIndex(i => /WO\s*Type[:\s]*/i.test(i.str) && i.str.length < 15);
          if (typeIdx !== -1) {
            for (let j = typeIdx + 1; j < Math.min(typeIdx + 4, allItems.length); j++) {
              const val = allItems[j].str.trim();
              if (val && val.length > 1 && val.length < 30 && !/^[\d:\/]+$/.test(val)) {
                extracted["Service"] = val;
                break;
              }
            }
          }
          // Fallback regex
          if (extracted["Service"] === "Property Preservation") {
            const svcMatch = flatText.match(/WO\s*Type[:\s]+([A-Za-z][A-Za-z\s]{0,20}?)(?:\s{2,}|$)/i);
            if (svcMatch) extracted["Service"] = svcMatch[1].trim();
          }
        }

        // Due Date: find "Due Date:" in allItems
        {
          const dueIdx = allItems.findIndex(i => /Due\s*Date/i.test(i.str));
          if (dueIdx !== -1) {
            for (let j = dueIdx + 1; j < Math.min(dueIdx + 5, allItems.length); j++) {
              const val = allItems[j].str.trim();
              if (/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(val)) {
                extracted["Due Date"] = val.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/)![1];
                break;
              }
            }
          }
          if (extracted["Due Date"] === new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]) {
            const dueMatch = flatText.match(/Due\s*Date[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i);
            if (dueMatch) extracted["Due Date"] = dueMatch[1].trim();
          }
        }

        // Lockbox Code
        {
          const lockIdx = allItems.findIndex(i => /Lockbox\s*Code/i.test(i.str));
          if (lockIdx !== -1) {
            for (let j = lockIdx + 1; j < Math.min(lockIdx + 4, allItems.length); j++) {
              const val = allItems[j].str.trim();
              if (val && /^[\d*A-Za-z]{2,12}$/.test(val)) {
                extracted["Lock Code"] = val;
                break;
              }
            }
          }
          if (!extracted["Lock Code"]) {
            const lockMatch = flatText.match(/Lockbox\s*Code[:\s]+([A-Za-z0-9*]{2,12})/i);
            if (lockMatch) extracted["Lock Code"] = lockMatch[1].trim();
          }
        }

        // ── PROPERTY (MORTGAGOR) ADDRESS ─────────────────────────────────────────
        // Strategy: find the "Mortgager Information" or "Mortgagor Information" label item in allItems,
        // then collect items near its X position (right column) below that Y.
        {
          const mortgagerItem = allItems.find(i => /Mortgager|Mortgagor/i.test(i.str));
          if (mortgagerItem) {
            const mortgagerX = mortgagerItem.x;
            const mortgagerY = mortgagerItem.y;

            // Collect items in the Mortgager column: same X region, below the header, above "Property Access Info"
            const propAccessItem = allItems.find(i => /Property\s*Access\s*Info/i.test(i.str));
            const stopY = propAccessItem ? propAccessItem.y : mortgagerY - 200;

            // Get all items in the right column, sorted top to bottom
            const colItems = allItems
              .filter(i => Math.abs(i.x - mortgagerX) < 200 && i.y < mortgagerY && i.y > stopY)
              .sort((a, b) => b.y - a.y); // top to bottom (PDF Y descends)

            // Find street address (starts with a number, optional letter for directional like 750W)
            for (const item of colItems) {
              if (/^\d{1,6}[A-Za-z]?\s+\w+/.test(item.str.trim())) {
                extracted["Property Address"] = item.str.trim();
                break;
              }
            }

            // Find City, State Zip on the next line after address
            if (extracted["Property Address"]) {
              const addrIdx = colItems.findIndex(i => i.str.trim() === extracted["Property Address"]);
              if (addrIdx !== -1 && addrIdx + 1 < colItems.length) {
                const cszLine = colItems[addrIdx + 1].str;
                const cszMatch = cszLine.match(/^([A-Za-z\s]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/)
                  || cszLine.match(/([A-Za-z\s]+)\s+([A-Z]{2})\s+(\d{5})/);
                if (cszMatch) {
                  extracted["City"] = cszMatch[1].trim();
                  extracted["State"] = cszMatch[2].trim();
                  extracted["Zip"] = cszMatch[3].trim();
                }
              }
            }
          }

          // Fallback 1: Match all addresses in flatText, skip the first one if it's the vendor (Will Enterprises / Panther)
          if (!extracted["Property Address"]) {
            const addrRegex = /\b(\d{1,6}[A-Za-z]?\s+[A-Za-z0-9\s.]{2,30}\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Ct|Court|Way|Pkwy|Pl|Place))\b/gi;
            const matches = [...flatText.matchAll(addrRegex)].map(m => m[1].trim());
            // Filter out any address that contains PANTHER or WILL or ENTERPRISES (the vendor)
            const filtered = matches.filter(a => !/panther|will|enterprises/i.test(a));
            if (filtered.length > 0) {
              extracted["Property Address"] = filtered[0];
            } else if (matches.length > 1) {
              extracted["Property Address"] = matches[1];
            } else if (matches.length > 0) {
              extracted["Property Address"] = matches[0];
            }
          }

          // Fill City, State, Zip for property address using flatText context
          if (extracted["Property Address"] && !extracted["City"]) {
            const addrEscaped = extracted["Property Address"].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const cszReg = new RegExp(addrEscaped + '[\\s,]*([A-Za-z\\s]{2,30})[\\s,]+([A-Z]{2})[\\s,]+(\\d{5})', 'i');
            const match = flatText.match(cszReg);
            if (match) {
              extracted["City"] = match[1].trim();
              extracted["State"] = match[2].trim();
              extracted["Zip"] = match[3].trim();
            }
          }

          // Fallback 2: try regex approach on joinedText (line by line after Mortgager header)
          if (!extracted["Property Address"]) {
            const lines = joinedText.split("\n");
            let inMortgager = false;
            for (const line of lines) {
              if (/Mortgager|Mortgagor/i.test(line)) { inMortgager = true; continue; }
              if (inMortgager && /Property\s*Access/i.test(line)) break;
              if (inMortgager && /^\d{1,6}[A-Za-z]?\s+\w/.test(line.trim()) && !extracted["Property Address"]) {
                extracted["Property Address"] = line.trim();
                continue;
              }
              if (inMortgager && extracted["Property Address"] && !extracted["City"]) {
                const cszMatch = line.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s+(\d{5})/)
                  || line.match(/([A-Za-z\s]+)\s+([A-Z]{2})\s+(\d{5})/);
                if (cszMatch) {
                  extracted["City"] = cszMatch[1].trim();
                  extracted["State"] = cszMatch[2].trim();
                  extracted["Zip"] = cszMatch[3].trim();
                  break;
                }
              }
            }
          }
        }

        // ── TASK TABLE PARSING ──────────────────────────────────────────────────
        const parsedServices: { name: string; description: string; instructions: string; quantity: number }[] = [];
        let instrColX = 280;

        const aiHeaderItem = allItems.find(i => i.str === "Additional Instructions" || i.str === "Additional");
        if (aiHeaderItem) instrColX = aiHeaderItem.x;

        const descHeaderItem = allItems.find(i => i.str === "Description" && i.x < instrColX - 50);
        const damagesHeaderItem = allItems.find(i => /Current\s*Damages/i.test(i.str) || i.str === "Current");

        if (descHeaderItem && damagesHeaderItem) {
          const tableTopY = descHeaderItem.y;
          const tableBottomY = damagesHeaderItem.y;
          const tableItems = allItems.filter(i => i.y < tableTopY && i.y > tableBottomY);

          const rowMap = new Map<number, typeof allItems>();
          for (const item of tableItems) {
            const snappedY = Math.round(item.y / 5) * 5;
            if (!rowMap.has(snappedY)) rowMap.set(snappedY, []);
            rowMap.get(snappedY)!.push(item);
          }

          const sortedRows = [...rowMap.entries()].sort((a, b) => b[0] - a[0]);
          const rawTaskRows: { desc: string; instr: string }[] = [];
          for (const [, rowItems] of sortedRows) {
            const leftItems = rowItems.filter(i => i.x < instrColX - 10).sort((a, b) => a.x - b.x);
            const rightItems = rowItems.filter(i => i.x >= instrColX - 10).sort((a, b) => a.x - b.x);
            const desc = leftItems.map(i => i.str).join(" ").trim();
            const instr = rightItems.map(i => i.str).join(" ").trim();
            if (desc || instr) rawTaskRows.push({ desc, instr });
          }

          const mergedTasks: { desc: string; instr: string }[] = [];
          for (const row of rawTaskRows) {
            if (row.desc) {
              mergedTasks.push({ desc: row.desc, instr: row.instr });
            } else if (mergedTasks.length > 0 && row.instr) {
              mergedTasks[mergedTasks.length - 1].instr += " " + row.instr;
            }
          }

          for (const task of mergedTasks) {
            if (task.desc) {
              parsedServices.push({
                name: task.desc,
                description: task.desc,
                instructions: task.instr,
                quantity: 1,
              });
            }
          }
        }

        // Fallback: line-split on known task keywords
        if (parsedServices.length === 0) {
          const descMarker = allItems.findIndex(i => i.str === "Description");
          const dmgMarker = allItems.findIndex(i => /Current\s*Damages/i.test(i.str));
          if (descMarker !== -1) {
            const block = flatText.substring(
              flatText.indexOf(allItems[descMarker].str),
              dmgMarker !== -1 ? flatText.indexOf(allItems[dmgMarker].str) : undefined
            );
            const segments = block.split(/(?=\b(?:Remove|Trim|TRIM|Cut|Mow|Board|Winteriz|Inspect|Clean|Haul|Debris|Lock)\b)/i);
            for (const seg of segments) {
              const trimmed = seg.trim();
              if (trimmed.length > 3) {
                const spaceIdx = trimmed.indexOf(" ");
                const taskName = spaceIdx > -1 ? trimmed.substring(0, Math.min(trimmed.indexOf("  "), 40) > 0 ? trimmed.indexOf("  ") : 40) : trimmed;
                parsedServices.push({ name: taskName.trim(), description: taskName.trim(), instructions: trimmed, quantity: 1 });
              }
            }
          }
        }

        if (parsedServices.length === 0) {
          parsedServices.push({
            name: extracted["Service"] || "Property Preservation",
            description: "Property Preservation",
            instructions: "",
            quantity: 1,
          });
        }

        const taskSummaryText = parsedServices
          .map((s, i) => `${i + 1}. ${s.name}${s.instructions ? `\n   ${s.instructions}` : ""}`)
          .join("\n\n");

        extracted["Instructions"] = taskSummaryText;
        extracted["_parsedServices"] = parsedServices;

        const headers = Object.keys(extracted).filter(k => !k.startsWith("_"));
        setFileHeaders(headers);
        setRawRows([extracted]);

        const mapping = {
          externalWorkOrderId: "Work Order #",
          address1: "Property Address",
          city: "City",
          state: "State",
          zip: "Zip",
          serviceType: "Service",
          dueDate: "Due Date",
          lockCode: "Lock Code",
          instructions: "Instructions",
        };
        setColumnMapping(mapping);
        runPreviewValidation([extracted], mapping);
        toast.success(`PDF parsed: WO# ${extracted["Work Order #"]} · ${parsedServices.length} task(s) extracted!`);
        return;
      }

      // ── 2. Excel File Parsing (.xlsx, .xls) ─────────────────────────────────

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        toast("Parsing Excel spreadsheet...");

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
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          toast.error("Excel sheet is empty");
          return;
        }

        const headers = Object.keys(rows[0]);
        setFileHeaders(headers);
        setRawRows(rows);

        const detectRes = await fetch("/api/connectors/import/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "detect_columns", headers }),
        });
        if (detectRes.ok) {
          const detectData = await detectRes.json();
          setColumnMapping(detectData.suggestedMapping || {});
          runPreviewValidation(rows, detectData.suggestedMapping);
        }
        toast.success(`Excel loaded with ${rows.length} rows!`);
        return;
      }

      // ── 3. CSV & Text File Parsing ─────────────────────────────────────────
      const text = await file.text();
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("File is empty or missing data rows");
        return;
      }

      const parseCsvLine = (line: string) => {
        const result: string[] = [];
        let curr = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(curr.trim());
            curr = "";
          } else {
            curr += char;
          }
        }
        result.push(curr.trim());
        return result;
      };

      const headers = parseCsvLine(lines[0]);
      setFileHeaders(headers);

      const parsedRows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || "";
        });
        parsedRows.push(rowObj);
      }

      setRawRows(parsedRows);

      const detectRes = await fetch("/api/connectors/import/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect_columns", headers }),
      });
      if (detectRes.ok) {
        const detectData = await detectRes.json();
        setColumnMapping(detectData.suggestedMapping || {});
        runPreviewValidation(parsedRows, detectData.suggestedMapping);
      }
      toast.success(`CSV loaded with ${parsedRows.length} rows!`);
    } catch (err: any) {
      console.error("File processing error:", err);
      toast.error(err.message || "Failed to parse file");
    } finally {
      setValidating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const runPreviewValidation = async (rows: any[], mapping: any) => {
    try {
      setValidating(true);
      const res = await fetch("/api/connectors/import/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate_preview",
          rows,
          mapping,
          clientId: "cli_custom_file",
          clientName: importFile?.name || "File Import",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewResult(data);
      }
    } catch (err) {
      console.error("Preview validation error:", err);
    } finally {
      setValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    try {
      setImporting(true);
      toast("Executing batch intake pipeline with normalization & duplicate check...");
      const res = await fetch("/api/connectors/import/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_import",
          rows: rawRows,
          mapping: columnMapping,
          clientId: "cli_custom_file",
          clientName: importFile?.name || "File Import",
        }),
      });
      const data = await res.json();
      if (res.ok && (data.status === "COMPLETED" || data.status === "PARTIAL")) {
        setImportSuccessResult(data);
        toast.success(
          `Batch Imported! Created: ${data.recordsCreated}, Updated: ${data.recordsUpdated}`
        );
        fetchData();
      } else {
        toast.error(`Import failed: ${data.errors?.join(", ") || data.error}`);
      }
    } catch (err) {
      toast.error("Execution request failed");
    } finally {
      setImporting(false);
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/connectors/global/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappingForm),
      });
      if (!res.ok) throw new Error("Failed to save mapping rule");
      toast.success("Mapping rule added successfully!");
      setMappingModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save mapping");
    }
  };

  const filteredCatalog = catalog.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
              <Cable className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                Client Connectors & Intake Engine
              </h1>
              <p className="text-sm text-text-secondary mt-0.5">
                Multi-Client synchronization, automated intake, canonical normalization & submission engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-medium text-xs font-bold text-text-primary transition-all"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => {
              setConfigForm({
                connectorKey: "mock",
                clientId: "cli_mock",
                name: "New Client Integration",
                syncIntervalMinutes: 10,
                apiKey: "",
                username: "",
                password: "",
                endpointUrl: "",
                vendorCode: "",
              });
              setConfigModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black tracking-wide shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Integration
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border-subtle overflow-x-auto pb-px">
        {[
          { id: "catalog", label: "Client Connectors", icon: Layers },
          { id: "file_import", label: "Universal File Studio", icon: FileSpreadsheet },
          { id: "mappings", label: "Normalization Rules", icon: Sliders },
          { id: "history", label: "Sync History & Audits", icon: Clock },
          { id: "submissions", label: "Outbound Submissions", icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap",
                isActive
                  ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-cyan-400" : "text-text-muted")} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content: Catalog & Connectors ─────────────────────────────────── */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search connectors (MCS, ServiceLink, Altisource, File...)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="text-xs text-text-muted font-semibold">
              Showing {filteredCatalog.length} available connectors
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCatalog.map((connector) => {
              const activeInstances = configuredConnectors.filter(
                (c) => c.connectorKey.toLowerCase() === connector.key.toLowerCase()
              );
              const isConfigured = activeInstances.length > 0;
              const primaryInstance = activeInstances[0];

              return (
                <div
                  key={connector.key}
                  className="bg-surface/80 backdrop-blur-md rounded-2xl border border-border-subtle hover:border-cyan-500/30 p-5 flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-cyan-500/5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-text-primary group-hover:text-cyan-400 transition-colors">
                            {connector.name}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-hover text-text-muted border border-border-subtle">
                            v{connector.version}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-text-dim mt-0.5">{connector.vendor}</p>
                      </div>

                      <div>
                        {isConfigured ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                              primaryInstance?.status === "HEALTHY"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                primaryInstance?.status === "HEALTHY" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                              )}
                            />
                            {primaryInstance?.status || "HEALTHY"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-text-muted bg-surface-hover border border-border-subtle">
                            Available
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {connector.description || "Official client connector module."}
                    </p>

                    {/* Capabilities Badges */}
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {connector.capabilities.importOrders && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">
                          + Intake
                        </span>
                      )}
                      {connector.capabilities.submitOrders && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                          + Submit
                        </span>
                      )}
                      {connector.capabilities.importDocuments && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                          + Docs
                        </span>
                      )}
                      {connector.capabilities.importPhotos && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                          + Photos
                        </span>
                      )}
                      {connector.capabilities.invoices && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                          + Invoices
                        </span>
                      )}
                      {connector.capabilities.fileImport && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                          + File
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="mt-5 pt-4 border-t border-border-subtle/80 flex items-center justify-between gap-2">
                    {isConfigured ? (
                      <>
                        <button
                          onClick={() => handleTestConnection(primaryInstance.id)}
                          disabled={testingId === primaryInstance.id}
                          className="px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-hover/80 text-text-primary text-[11px] font-bold border border-border-medium transition-all"
                        >
                          {testingId === primaryInstance.id ? "Testing..." : "Test"}
                        </button>
                        <button
                          onClick={() => handleSyncNow(primaryInstance.id)}
                          disabled={syncingId === primaryInstance.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-[11px] font-bold border border-cyan-500/30 transition-all"
                        >
                          <Play className={cn("h-3 w-3", syncingId === primaryInstance.id && "animate-spin")} />
                          {syncingId === primaryInstance.id ? "Syncing..." : "Sync Now"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setConfigForm({
                            connectorKey: connector.key,
                            clientId: "",
                            name: connector.name,
                            syncIntervalMinutes: 10,
                            apiKey: "",
                            username: "",
                            password: "",
                            endpointUrl: "",
                            vendorCode: "",
                          });
                          setConfigModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-surface-hover hover:bg-cyan-500/20 text-text-primary hover:text-cyan-300 text-xs font-bold border border-border-medium hover:border-cyan-500/30 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Configure Integration
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab Content: Universal File Studio ───────────────────────────────── */}
      {activeTab === "file_import" && (
        <div className="space-y-6">
          <div className="bg-surface/80 rounded-2xl border border-border-subtle p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-text-primary">Universal Work Order File Studio</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Upload PDF work order dispatches, Excel spreadsheets (.xlsx/.xls), or CSV data. Automatically extracts details, normalizes services/addresses, and prevents duplicate work orders.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black cursor-pointer shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Upload className="h-4 w-4" />
                  Select PDF / Excel / CSV
                  <input type="file" accept=".pdf,application/pdf,.csv,.xlsx,.xls,.json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Drag & Drop Visual Dropzone */}
            {!importFile && (
              <label 
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) processUploadedFile(droppedFile);
                }}
                className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/70 bg-surface-hover/40 hover:bg-cyan-500/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input type="file" accept=".pdf,application/pdf,.csv,.xlsx,.xls,.json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFileUpload} className="hidden" />
                <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform mb-3">
                  <Upload className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-text-primary">
                  Drag and drop your <span className="text-cyan-400">PDF Work Order</span>, <span className="text-emerald-400">Excel</span>, or <span className="text-purple-400">CSV</span> here
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Supports .pdf, .xlsx, .xls, .csv, and .json files up to 50MB
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px] font-bold flex items-center gap-1.5">
                    📄 PDF Work Orders
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5">
                    📊 Excel (.xlsx / .xls)
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-bold flex items-center gap-1.5">
                    📝 CSV Files
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-bold flex items-center gap-1.5">
                    📦 JSON Dispatches
                  </span>
                </div>
              </label>
            )}

            {importSuccessResult && (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-scale-in">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-400">
                      Work Orders Imported Successfully!
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Created: <span className="text-emerald-300 font-bold">+{importSuccessResult.recordsCreated}</span> • Updated: <span className="text-cyan-300 font-bold">{importSuccessResult.recordsUpdated}</span> in {importSuccessResult.durationMs}ms
                    </p>
                  </div>
                </div>

                <a
                  href="/dashboard/work-orders"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all whitespace-nowrap"
                >
                  View in Work Orders Dashboard
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}

            {importFile && (
              <div className="p-4 rounded-xl bg-surface-hover/80 border border-border-medium flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-text-primary">{importFile.name}</p>
                    <p className="text-xs text-text-muted">
                      {(importFile.size / 1024).toFixed(1)} KB • {rawRows.length} Data Rows Detected
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleExecuteImport}
                  disabled={importing || !previewResult || previewResult.validRows === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Check className={cn("h-4 w-4", importing && "animate-spin")} />
                  {importing ? "Importing..." : `Import ${previewResult?.validRows || 0} Work Orders`}
                </button>
              </div>
            )}

            {/* Validation Overview Metrics */}
            {previewResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-surface-hover border border-border-subtle">
                  <p className="text-[10px] font-bold text-text-muted uppercase">Total Rows</p>
                  <p className="text-2xl font-black text-text-primary mt-1">{previewResult.totalRows}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">Valid & Ready</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{previewResult.validRows}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">Warnings</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">{previewResult.warningRows}</p>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-[10px] font-bold text-rose-400 uppercase">Error Rows</p>
                  <p className="text-2xl font-black text-rose-400 mt-1">{previewResult.errorRows}</p>
                </div>
              </div>
            )}

            {/* Column Mapping Selector */}
            {fileHeaders.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">
                  Column Field Mappings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-surface p-4 rounded-xl border border-border-subtle">
                  {[
                    { key: "externalWorkOrderId", label: "Work Order # (Required)" },
                    { key: "address1", label: "Address (Required)" },
                    { key: "city", label: "City" },
                    { key: "state", label: "State" },
                    { key: "zip", label: "Zip Code" },
                    { key: "serviceType", label: "Service / Job Type" },
                    { key: "dueDate", label: "Due Date" },
                    { key: "lockCode", label: "Lock Code" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[11px] font-bold text-text-secondary">{field.label}</label>
                      <select
                        value={columnMapping[field.key] || ""}
                        onChange={(e) => {
                          const updated = { ...columnMapping, [field.key]: e.target.value };
                          setColumnMapping(updated);
                          runPreviewValidation(rawRows, updated);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-hover border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">-- Ignore / None --</option>
                        {fileHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Data Preview Table */}
            {previewResult && previewResult.samplePreview?.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border-subtle">
                <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">
                  Intake Data Validation Preview (First 50 Rows)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-border-subtle">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-hover border-b border-border-subtle text-text-dim text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Work Order #</th>
                        <th className="p-3">Normalized Address</th>
                        <th className="p-3">Service Code</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Issues / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {previewResult.samplePreview.map((item: any) => (
                        <tr key={item.rowNumber} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="p-3 font-mono text-text-muted">{item.rowNumber}</td>
                          <td className="p-3">
                            {item.errors.length > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold text-[10px]">
                                Error
                              </span>
                            ) : item.warnings.length > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[10px]">
                                Warning
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                                Valid
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-text-primary">
                            {item.normalized?.externalWorkOrderId || "Missing"}
                          </td>
                          <td className="p-3 text-text-secondary">
                            {item.normalized?.property?.address1}, {item.normalized?.property?.city}{" "}
                            {item.normalized?.property?.state}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono font-bold text-[10px]">
                              {item.normalized?.services?.[0]?.serviceCode || "OTHER"}
                            </span>
                          </td>
                          <td className="p-3 text-text-muted">
                            {item.normalized?.assignment?.dueAt
                              ? new Date(item.normalized.assignment.dueAt).toLocaleDateString()
                              : "Default +7d"}
                          </td>
                          <td className="p-3 text-[11px]">
                            {item.errors.length > 0 ? (
                              <span className="text-rose-400">{item.errors.join(", ")}</span>
                            ) : item.warnings.length > 0 ? (
                              <span className="text-amber-400">{item.warnings.join(", ")}</span>
                            ) : (
                              <span className="text-emerald-400">Ready for intake</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: Normalization Rules ─────────────────────────────────── */}
      {activeTab === "mappings" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-text-primary">Service & Status Normalization Rules</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Ensure external client terminology seamlessly maps to canonical PPW property preservation categories.
              </p>
            </div>
            <button
              onClick={() => setMappingModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs border border-cyan-500/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Custom Rule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Service Mappings */}
            <div className="bg-surface/80 rounded-2xl border border-border-subtle p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h4 className="text-sm font-black text-text-primary">Service Title Normalization</h4>
                <span className="text-[10px] text-text-muted font-mono">External $\rightarrow$ Canonical</span>
              </div>
              <div className="space-y-2">
                {[
                  { ext: "Grass Cut / Lawn Mow / Yard Maintenance", canonical: "GRASS_CUT" },
                  { ext: "Debris Removal / Trash Out / Cleanout", canonical: "DEBRIS_REMOVAL" },
                  { ext: "Winterization / Dry System Drain", canonical: "WINTERIZATION" },
                  { ext: "Board-Up / Window Securing", canonical: "BOARD_UP" },
                  { ext: "Rekey / Lockbox / Master Key", canonical: "LOCK_CHANGE" },
                  { ext: "Occupancy Inspection / PCR", canonical: "INSPECTION" },
                  { ext: "Roof Tarping / Emergency Cover", canonical: "ROOF_TARP" },
                  { ext: "Mold Remediation / Treatment", canonical: "MOLD_REMEDIATION" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-hover flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-semibold text-text-secondary">{item.ext}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
                    <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 font-mono font-bold text-[10px]">
                      {item.canonical}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Mappings */}
            <div className="bg-surface/80 rounded-2xl border border-border-subtle p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h4 className="text-sm font-black text-text-primary">Status State Normalization</h4>
                <span className="text-[10px] text-text-muted font-mono">External $\rightarrow$ Canonical</span>
              </div>
              <div className="space-y-2">
                {[
                  { ext: "Dispatched / Assigned / Accepted", canonical: "ASSIGNED" },
                  { ext: "In Progress / Active / Started", canonical: "IN_PROGRESS" },
                  { ext: "Completed / Field Complete / Done", canonical: "FIELD_COMPLETE" },
                  { ext: "QC Review / Under Review", canonical: "QC_REVIEW" },
                  { ext: "Revisions Needed / Rejected", canonical: "REVISIONS_NEEDED" },
                  { ext: "Office Complete / Ready for Billing", canonical: "OFFICE_COMPLETE" },
                  { ext: "Closed / Paid", canonical: "CLOSED" },
                  { ext: "Cancelled / Void", canonical: "CANCELLED" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-hover flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-semibold text-text-secondary">{item.ext}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
                    <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-300 font-mono font-bold text-[10px]">
                      {item.canonical}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content: Sync History ────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-text-primary">Synchronization Execution Logs</h3>
            <span className="text-xs text-text-muted">Last 20 Runs</span>
          </div>

          <div className="bg-surface/80 rounded-2xl border border-border-subtle overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover border-b border-border-subtle text-text-dim text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Connector</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Updated</th>
                  <th className="p-4">Failed</th>
                  <th className="p-4">Details / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {recentJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-muted text-xs">
                      No synchronization jobs recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="p-4 text-text-muted font-mono">
                        {new Date(job.startedAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-text-primary">{job.connectorName || job.connectorId}</td>
                      <td className="p-4 font-mono text-[11px] text-text-secondary">{job.type}</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            job.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : job.status === "PARTIAL"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400"
                          )}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-400">+{job.recordsCreated || 0}</td>
                      <td className="p-4 font-bold text-cyan-400">{job.recordsUpdated || 0}</td>
                      <td className="p-4 font-bold text-rose-400">{job.recordsFailed || 0}</td>
                      <td className="p-4 text-text-secondary max-w-xs truncate text-[11px]">
                        {job.error || "Execution completed without errors."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab Content: Outbound Submissions ────────────────────────────────── */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-text-primary">Outbound Work Order Submissions</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Completed work orders validated and submitted back to client portals and APIs.
              </p>
            </div>
          </div>

          <div className="bg-surface/80 rounded-2xl border border-border-subtle overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover border-b border-border-subtle text-text-dim text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Attempted</th>
                  <th className="p-4">Work Order</th>
                  <th className="p-4">Client Connector</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">External Submission ID</th>
                  <th className="p-4">Response Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-muted text-xs">
                      No client submissions queued or submitted yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="p-4 text-text-muted font-mono">
                        {new Date(sub.attemptedAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-text-primary">{sub.workOrderTitle || sub.workOrderId}</p>
                        <p className="text-[11px] text-text-muted">{sub.workOrderAddress}</p>
                      </td>
                      <td className="p-4 font-bold text-cyan-400">{sub.connectorName || sub.connectorKey}</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            sub.status === "SUBMITTED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : sub.status === "SUBMITTING"
                              ? "bg-cyan-500/10 text-cyan-400"
                              : "bg-rose-500/10 text-rose-400"
                          )}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-text-secondary text-[11px]">
                        {sub.externalSubmissionId || "Pending"}
                      </td>
                      <td className="p-4 text-text-muted text-[11px] max-w-xs truncate">
                        {sub.error || sub.response || "Submitted successfully"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Configure Connector Modal ───────────────────────────────────── */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border-medium max-w-lg w-full p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <h3 className="text-base font-black text-text-primary">Configure Client Connector</h3>
              <button onClick={() => setConfigModalOpen(false)} className="text-text-muted hover:text-text-primary">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConnector} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary">Connector Key</label>
                <select
                  value={configForm.connectorKey}
                  onChange={(e) => setConfigForm({ ...configForm, connectorKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                >
                  <option value="mock">Sandbox Simulation Client (Mock)</option>
                  <option value="mcs">Mortgage Contracting Services (MCS)</option>
                  <option value="servicelink">ServiceLink / Asset Shield</option>
                  <option value="altisource">Altisource (PPW Link)</option>
                  <option value="singlesource">SingleSource (PPW Link)</option>
                  <option value="cyprexx">Cyprexx Services</option>
                  <option value="fivebrothers">Five Brothers</option>
                  <option value="guardian">Guardian / iProperty</option>
                  <option value="g7">G7 Property Preservation</option>
                  <option value="csv_excel">Universal File Importer (CSV / Excel)</option>
                  <option value="email_intake">Email Work Order Intake</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-secondary">Display Name</label>
                <input
                  type="text"
                  required
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  placeholder="e.g. MCS Illinois Production"
                  className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary">Sync Interval (Min)</label>
                  <input
                    type="number"
                    value={configForm.syncIntervalMinutes}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, syncIntervalMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary">Vendor Code</label>
                  <input
                    type="text"
                    value={configForm.vendorCode}
                    onChange={(e) => setConfigForm({ ...configForm, vendorCode: e.target.value })}
                    placeholder="V12345"
                    className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary">Username / API Key</label>
                  <input
                    type="text"
                    value={configForm.username || configForm.apiKey}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, username: e.target.value, apiKey: e.target.value })
                    }
                    placeholder="Username or Key"
                    className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary">Password / Secret</label>
                  <input
                    type="password"
                    value={configForm.password}
                    onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                    placeholder="Encrypted at rest"
                    className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20"
                >
                  Save Integration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
