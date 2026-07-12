"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, X, FileSpreadsheet, ChevronUp, ChevronDown,
  Table2, DollarSign, Receipt, TrendingDown, PieChart, Truck,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Spreadsheet,
  SHEET_TEMPLATES,
  DEFAULT_COLUMNS,
  createEmptyRow,
  createDefaultSheet,
} from "@/components/spreadsheet";
import type { Cell, Column, SheetData } from "@/components/spreadsheet";

const SHEET_ICONS: Record<string, any> = {
  transactions: Table2,
  invoices: Receipt,
  expenses: TrendingDown,
  profitLoss: PieChart,
  logistics: Truck,
};

export default function AccountingPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  // Only ADMIN and ACCOUNTANT can access accounting
  if (role && !["ADMIN", "ACCOUNTANT"].includes(role)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <FileSpreadsheet className="h-16 w-16 text-text-dim mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
          <p className="text-text-muted">Only administrators and accountants can access the accounting section.</p>
        </div>
      </div>
    );
  }

  const [sheets, setSheets] = useState<SheetData[]>([
    SHEET_TEMPLATES.transactions(),
    SHEET_TEMPLATES.invoices(),
    SHEET_TEMPLATES.expenses(),
    SHEET_TEMPLATES.logistics(),
    SHEET_TEMPLATES.profitLoss(),
  ]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [showAddSheetMenu, setShowAddSheetMenu] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  function updateSheet(idx: number, sheet: SheetData) {
    const newSheets = [...sheets];
    newSheets[idx] = sheet;
    setSheets(newSheets);
  }

  function addSheet(template?: string) {
    const newSheet = template && SHEET_TEMPLATES[template]
      ? SHEET_TEMPLATES[template]()
      : {
          id: `sheet-${Date.now()}`,
          name: `Sheet ${sheets.length + 1}`,
          columns: DEFAULT_COLUMNS,
          rows: Array.from({ length: 100 }, () => createEmptyRow()),
        };
    setSheets([...sheets, newSheet]);
    setActiveSheet(sheets.length);
    toast.success(`Created "${newSheet.name}"`);
  }

  function deleteSheet(idx: number) {
    if (sheets.length <= 1) { toast.error("Cannot delete last sheet"); return; }
    if (!confirm(`Delete "${sheets[idx].name}"?`)) return;
    const newSheets = sheets.filter((_, i) => i !== idx);
    setSheets(newSheets);
    if (activeSheet >= newSheets.length) setActiveSheet(newSheets.length - 1);
    toast.success("Sheet deleted");
  }

  function renameSheet(idx: number) {
    const name = prompt("Sheet name:", sheets[idx].name);
    if (!name?.trim()) return;
    const newSheets = [...sheets];
    newSheets[idx] = { ...newSheets[idx], name: name.trim() };
    setSheets(newSheets);
  }

  function duplicateSheet(idx: number) {
    const copy: SheetData = {
      ...sheets[idx],
      id: `sheet-${Date.now()}`,
      name: `${sheets[idx].name} (Copy)`,
      rows: sheets[idx].rows.map(r => ({ ...r })),
    };
    const newSheets = [...sheets];
    newSheets.splice(idx + 1, 0, copy);
    setSheets(newSheets);
    setActiveSheet(idx + 1);
    toast.success(`Duplicated "${copy.name}"`);
  }

  const summary = useMemo(() => {
    let totalRevenue = 0, totalExpenses = 0;
    sheets.forEach((sheet) => {
      sheet.rows.forEach((row) => {
        if (row.debit) {
          const val = parseFloat(row.debit.value?.replace(/[^0-9.-]/g, "") || "0");
          if (!isNaN(val) && val > 0) totalRevenue += val;
        }
        if (row.credit) {
          const val = parseFloat(row.credit.value?.replace(/[^0-9.-]/g, "") || "0");
          if (!isNaN(val) && val > 0) totalExpenses += val;
        }
        if (row.amount) {
          const val = parseFloat(row.amount.value?.replace(/[^0-9.-]/g, "") || "0");
          if (!isNaN(val)) totalExpenses += val;
        }
        if (row.total && sheet.id === "invoices") {
          const val = parseFloat(row.total.value?.replace(/[^0-9.-]/g, "") || "0");
          if (!isNaN(val)) totalRevenue += val;
        }
      });
    });
    return { totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses };
  }, [sheets]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* ── Header ────────────────────────────────────────────────── */}
      {headerCollapsed ? (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0" style={{ backgroundColor: "#FAFAFA", borderColor: "#D4D4D4" }}>
          <FileSpreadsheet className="h-4 w-4" style={{ color: "#217346" }} />
          <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>Accounting</span>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "#0B6623" }}>{formatCurrency(summary.totalRevenue)}</span>
            <span className="text-[10px]" style={{ color: "#999" }}>·</span>
            <span className="text-[10px]" style={{ color: "#C00000" }}>{formatCurrency(summary.totalExpenses)}</span>
            <span className="text-[10px]" style={{ color: "#999" }}>·</span>
            <span className="text-[10px] font-medium" style={{ color: summary.profit >= 0 ? "#217346" : "#C00000" }}>{formatCurrency(summary.profit)}</span>
          </div>
          <button onClick={() => setHeaderCollapsed(false)} className="p-1 rounded hover:bg-gray-200/10" style={{ color: "#999" }}><ChevronDown className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" style={{ backgroundColor: "#FAFAFA", borderColor: "#D4D4D4" }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#E2EFDA", border: "1px solid #217346" }}>
              <FileSpreadsheet className="h-5 w-5" style={{ color: "#217346" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "#1a1a1a" }}>Accounting</h1>
              <p className="text-[11px]" style={{ color: "#666" }}>Excel-like spreadsheets for financial tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#E2EFDA", border: "1px solid #217346" }}>
                <p className="text-[9px]" style={{ color: "#217346" }}>Revenue</p>
                <p className="text-xs font-bold" style={{ color: "#0B6623" }}>{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <div className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#FCE4EC", border: "1px solid #C00000" }}>
                <p className="text-[9px]" style={{ color: "#C00000" }}>Expenses</p>
                <p className="text-xs font-bold" style={{ color: "#C00000" }}>{formatCurrency(summary.totalExpenses)}</p>
              </div>
              <div className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#D6E4F0", border: "1px solid #4472C4" }}>
                <p className="text-[9px]" style={{ color: "#4472C4" }}>Profit</p>
                <p className="text-xs font-bold" style={{ color: summary.profit >= 0 ? "#217346" : "#C00000" }}>{formatCurrency(summary.profit)}</p>
              </div>
            </div>
            <button onClick={() => setHeaderCollapsed(true)} className="p-1.5 rounded-lg hover:bg-gray-200/10" style={{ color: "#999" }} title="Collapse header"><ChevronUp className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* ── Sheet tabs ──────────────────────────────────────────── */}
      <div className="flex items-center gap-0 px-1 pt-1 flex-shrink-0" style={{ backgroundColor: "#F0F0F0", borderBottom: "1px solid #D4D4D4" }}>
        <div className="flex items-center gap-0 overflow-x-auto flex-1 min-w-0">
          {sheets.map((sheet, idx) => {
            const Icon = SHEET_ICONS[sheet.id] || FileSpreadsheet;
            const isActive = activeSheet === idx;
            return (
              <div
                key={sheet.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveSheet(idx)}
                onDoubleClick={() => renameSheet(idx)}
                onKeyDown={(e) => { if (e.key === "Enter") setActiveSheet(idx); }}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all border border-b-0 rounded-t-md whitespace-nowrap group cursor-pointer select-none")}
                style={{
                  backgroundColor: isActive ? "#FFFFFF" : "transparent",
                  borderColor: isActive ? "#D4D4D4" : "transparent",
                  color: isActive ? "#217346" : "#666",
                  borderBottom: isActive ? "1px solid #FFFFFF" : "1px solid transparent",
                  marginBottom: isActive ? "-1px" : "0",
                }}
              >
                <Icon className="h-3 w-3" />
                {sheet.name}
                <div className="ml-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); duplicateSheet(idx); }} className="p-0.5 rounded hover:bg-gray-200/20" title="Duplicate"><Plus className="h-2.5 w-2.5" /></button>
                  {sheets.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteSheet(idx); }} className="p-0.5 rounded hover:bg-red-100" title="Delete"><X className="h-2.5 w-2.5" /></button>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Sheet Button — outside overflow container so dropdown isn't clipped */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowAddSheetMenu(!showAddSheetMenu)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-t-md transition-colors hover:bg-white/50"
            style={{ color: "#217346" }}
            title="Add Sheet"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {showAddSheetMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAddSheetMenu(false)} />
              <div className="absolute right-0 top-full z-20">
                <div className="border rounded-lg shadow-xl mt-1 py-1 min-w-[180px]" style={{ backgroundColor: "#FFFFFF", borderColor: "#D4D4D4" }}>
                  <button onClick={() => { addSheet(); setShowAddSheetMenu(false); }} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-100" style={{ color: "#1a1a1a" }}>
                    <Table2 className="h-3.5 w-3.5" style={{ color: "#217346" }} />
                    Blank Sheet
                  </button>
                  <div className="h-px my-1" style={{ backgroundColor: "#E8E8E8" }} />
                  {Object.keys(SHEET_TEMPLATES).map((key) => {
                    const Icon = SHEET_ICONS[key] || FileSpreadsheet;
                    return (
                      <button key={key} onClick={() => { addSheet(key); setShowAddSheetMenu(false); }} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-100" style={{ color: "#1a1a1a" }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: "#4472C4" }} />
                        {SHEET_TEMPLATES[key]().name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Active spreadsheet ──────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ border: "1px solid #D4D4D4", borderTop: "none" }}>
        <Spreadsheet sheet={sheets[activeSheet]} onChange={(sheet) => updateSheet(activeSheet, sheet)} />
      </div>
    </div>
  );
}
