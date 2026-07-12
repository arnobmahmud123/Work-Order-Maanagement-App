"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Download, Upload, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Bold, X, FileSpreadsheet,
  Maximize2, Minimize2,
  Eye, EyeOff,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Cell {
  value: string;
  formula?: string;
  format?: "currency" | "percent" | "number" | "text";
  bold?: boolean;
  italic?: boolean;
  bgColor?: string;
}

export interface Column {
  key: string;
  label: string;
  width: number;
  type: "text" | "number" | "currency" | "date" | "select";
  options?: string[];
}

export interface SheetData {
  id: string;
  name: string;
  columns: Column[];
  rows: Record<string, Cell>[];
}

// ─── Default Sheets ──────────────────────────────────────────────────────────

export const DEFAULT_COLUMNS: Column[] = [
  { key: "date", label: "Date", width: 120, type: "date" },
  { key: "description", label: "Description", width: 250, type: "text" },
  { key: "category", label: "Category", width: 150, type: "select", options: ["Revenue", "Expense", "Payroll", "Materials", "Equipment", "Subcontractor", "Overhead", "Other"] },
  { key: "reference", label: "Reference #", width: 130, type: "text" },
  { key: "vendor", label: "Vendor / Client", width: 180, type: "text" },
  { key: "debit", label: "Debit ($)", width: 120, type: "currency" },
  { key: "credit", label: "Credit ($)", width: 120, type: "currency" },
  { key: "balance", label: "Balance ($)", width: 130, type: "currency" },
  { key: "notes", label: "Notes", width: 200, type: "text" },
];

export function createEmptyRow(columns?: Column[]): Record<string, Cell> {
  const row: Record<string, Cell> = {};
  (columns || DEFAULT_COLUMNS).forEach((col) => {
    row[col.key] = { value: "" };
  });
  return row;
}

export function createDefaultSheet(): SheetData {
  return {
    id: "transactions",
    name: "Transactions",
    columns: DEFAULT_COLUMNS,
    rows: Array.from({ length: 100 }, () => createEmptyRow()),
  };
}

export const SHEET_TEMPLATES: Record<string, () => SheetData> = {
  transactions: createDefaultSheet,
  invoices: () => ({
    id: "invoices",
    name: "Invoices",
    columns: [
      { key: "invoiceNo", label: "Invoice #", width: 120, type: "text" },
      { key: "type", label: "Type", width: 100, type: "select", options: ["Client", "Contractor"] },
      { key: "date", label: "Date", width: 120, type: "date" },
      { key: "client", label: "Client", width: 180, type: "text" },
      { key: "property", label: "Property", width: 200, type: "text" },
      { key: "description", label: "Description", width: 250, type: "text" },
      { key: "amount", label: "Amount ($)", width: 120, type: "currency" },
      { key: "tax", label: "Tax ($)", width: 100, type: "currency" },
      { key: "total", label: "Total ($)", width: 130, type: "currency" },
      { key: "status", label: "Status", width: 110, type: "select", options: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"] },
      { key: "paidDate", label: "Paid Date", width: 120, type: "date" },
    ],
    rows: Array.from({ length: 50 }, () => {
      const row: Record<string, Cell> = {};
      ["invoiceNo", "type", "date", "client", "property", "description", "amount", "tax", "total", "status", "paidDate"].forEach((k) => { row[k] = { value: "" }; });
      return row;
    }),
  }),
  expenses: () => ({
    id: "expenses",
    name: "Expenses",
    columns: [
      { key: "date", label: "Date", width: 120, type: "date" },
      { key: "vendor", label: "Vendor", width: 180, type: "text" },
      { key: "category", label: "Category", width: 150, type: "select", options: ["Materials", "Equipment", "Labor", "Subcontractor", "Fuel", "Insurance", "Office", "Marketing", "Other"] },
      { key: "description", label: "Description", width: 250, type: "text" },
      { key: "amount", label: "Amount ($)", width: 120, type: "currency" },
      { key: "paymentMethod", label: "Payment Method", width: 140, type: "select", options: ["Check", "Credit Card", "ACH", "Cash", "Wire"] },
      { key: "reference", label: "Reference #", width: 130, type: "text" },
      { key: "workOrder", label: "Work Order", width: 150, type: "text" },
      { key: "deductible", label: "Deductible", width: 100, type: "select", options: ["Yes", "No"] },
    ],
    rows: Array.from({ length: 50 }, () => {
      const row: Record<string, Cell> = {};
      ["date", "vendor", "category", "description", "amount", "paymentMethod", "reference", "workOrder", "deductible"].forEach((k) => { row[k] = { value: "" }; });
      return row;
    }),
  }),
  logistics: () => ({
    id: "logistics",
    name: "Logistics",
    columns: [
      { key: "date", label: "Date", width: 120, type: "date" },
      { key: "item", label: "Item / Material", width: 200, type: "text" },
      { key: "category", label: "Category", width: 140, type: "select", options: ["Hardware", "Board-Up", "Winterization", "Debris Removal", "Grass Cut", "Inspection", "Plumbing", "Electrical", "Paint", "Roofing", "Other"] },
      { key: "supplier", label: "Supplier", width: 160, type: "text" },
      { key: "quantity", label: "Qty", width: 80, type: "number" },
      { key: "unit", label: "Unit", width: 80, type: "text" },
      { key: "unitCost", label: "Unit Cost ($)", width: 110, type: "currency" },
      { key: "total", label: "Total ($)", width: 110, type: "currency" },
      { key: "orderRef", label: "Order Ref #", width: 130, type: "text" },
      { key: "status", label: "Status", width: 120, type: "select", options: ["Ordered", "In Transit", "Delivered", "Backordered", "Cancelled"] },
      { key: "deliveryDate", label: "Delivery Date", width: 120, type: "date" },
      { key: "notes", label: "Notes", width: 200, type: "text" },
    ],
    rows: Array.from({ length: 50 }, () => {
      const row: Record<string, Cell> = {};
      ["date", "item", "category", "supplier", "quantity", "unit", "unitCost", "total", "orderRef", "status", "deliveryDate", "notes"].forEach((k) => { row[k] = { value: "" }; });
      return row;
    }),
  }),
  profitLoss: () => ({
    id: "profitLoss",
    name: "Profit & Loss",
    columns: [
      { key: "category", label: "Category", width: 250, type: "text" },
      { key: "jan", label: "Jan", width: 100, type: "currency" },
      { key: "feb", label: "Feb", width: 100, type: "currency" },
      { key: "mar", label: "Mar", width: 100, type: "currency" },
      { key: "apr", label: "Apr", width: 100, type: "currency" },
      { key: "may", label: "May", width: 100, type: "currency" },
      { key: "jun", label: "Jun", width: 100, type: "currency" },
      { key: "jul", label: "Jul", width: 100, type: "currency" },
      { key: "aug", label: "Aug", width: 100, type: "currency" },
      { key: "sep", label: "Sep", width: 100, type: "currency" },
      { key: "oct", label: "Oct", width: 100, type: "currency" },
      { key: "nov", label: "Nov", width: 100, type: "currency" },
      { key: "dec", label: "Dec", width: 100, type: "currency" },
      { key: "total", label: "Total", width: 130, type: "currency" },
    ],
    rows: [
      ...["Revenue", "  Grass Cut Services", "  Debris Removal", "  Winterization", "  Board-Up", "  Inspections", "  Other Services", "TOTAL REVENUE"].map((cat) => {
        const row: Record<string, Cell> = {};
        ["category", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "total"].forEach((k) => { row[k] = { value: k === "category" ? cat : "", bold: cat.startsWith("TOTAL") }; });
        return row;
      }),
      ...["", "EXPENSES", "  Materials & Supplies", "  Equipment", "  Labor / Payroll", "  Subcontractors", "  Fuel & Transportation", "  Insurance", "  Office & Admin", "  Marketing", "  Other Expenses", "TOTAL EXPENSES", "", "NET PROFIT / (LOSS)"].map((cat) => {
        const row: Record<string, Cell> = {};
        ["category", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "total"].forEach((k) => { row[k] = { value: k === "category" ? cat : "", bold: cat.startsWith("TOTAL") || cat === "NET PROFIT / (LOSS)" || cat === "EXPENSES" }; });
        return row;
      }),
    ],
  }),
};

// ─── Spreadsheet Component ───────────────────────────────────────────────────

type CellRef = { row: number; col: string };
type CellLocation = { row: number; colKey: string };

interface SpreadsheetProps {
  sheet: SheetData;
  onChange: (sheet: SheetData) => void;
}

export function Spreadsheet({ sheet, onChange }: SpreadsheetProps) {
  const [activeCell, setActiveCell] = useState<CellRef | null>(null);
  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [resizing, setResizing] = useState<{ type: "row" | "col"; index: number | string; startPos: number; startSize: number } | null>(null);
  const [clipboard, setClipboard] = useState<Cell | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [formulaBarVisible, setFormulaBarVisible] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [cellSize, setCellSize] = useState<"compact" | "normal" | "comfortable">("normal");
  const [isFormulaEditing, setIsFormulaEditing] = useState(false);
  const [dragStart, setDragStart] = useState<CellRef | null>(null);
  const [dragEnd, setDragEnd] = useState<CellRef | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const skipBlurCommitRef = useRef(false);
  const pendingCellInsertRef = useRef(false);

  // Detect theme
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Get the currently active input (formula bar or cell input)
  const getActiveInput = () => inputRef.current || formulaBarRef.current;

  const getWidth = (col: Column) => getColWidth(col);
  const cellPadding = cellSize === "compact" ? "px-2 py-1" : cellSize === "comfortable" ? "px-3 py-2.5" : "px-2 py-1.5";

  const displayRows = useMemo(() => {
    let rows = sheet.rows.map((row, idx) => ({ ...row, _idx: idx })) as (Record<string, Cell> & { _idx: number })[];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((row) => Object.values(row).some((cell) => typeof cell === "object" && cell !== null && "value" in cell && (cell as Cell).value.toLowerCase().includes(q)));
    }
    if (sortCol) {
      rows.sort((a, b) => {
        const aVal = (a[sortCol] as Cell)?.value || "";
        const bVal = (b[sortCol] as Cell)?.value || "";
        const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ""));
        const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ""));
        if (!isNaN(aNum) && !isNaN(bNum)) return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return rows;
  }, [sheet.rows, sortCol, sortDir, searchQuery]);

  function startEdit(rowIdx: number, colKey: string) {
    const cell = sheet.rows[rowIdx]?.[colKey];
    setEditingCell({ row: rowIdx, col: colKey });
    setEditValue(cell?.formula || cell?.value || "");
    setIsFormulaEditing(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Insert a cell reference (like "F6") into the current formula being edited
  function insertCellRefIntoFormula(rowIdx: number, colKey: string) {
    const letter = colKeyToLetter(colKey, sheet.columns);
    const ref = `${letter}${rowIdx + 1}`;
    const newVal = editValue + ref;
    setEditValue(newVal);
    // Live-evaluate the formula as user builds it
    if (newVal.startsWith("=")) {
      const tempRows = [...sheet.rows];
      const editingRow = editingCell?.row ?? activeCell?.row ?? rowIdx;
      const editingCol = editingCell?.col ?? activeCell?.col ?? colKey;
      const evaluated = evaluateFormula(newVal, tempRows, editingRow, sheet.columns);
      // Update the cell preview in real-time
      const newRows = [...sheet.rows];
      const cell: Cell = { ...newRows[editingRow][editingCol] };
      cell.formula = newVal;
      cell.value = evaluated;
      newRows[editingRow] = { ...newRows[editingRow], [editingCol]: cell };
      onChange({ ...sheet, rows: recalcFormulas(newRows) });
    }
    // Refocus the correct input so user can keep typing
    setTimeout(() => getActiveInput()?.focus(), 0);
  }

  function recalcFormulas(rows: Record<string, Cell>[]): Record<string, Cell>[] {
    const newRows = rows.map(r => ({ ...r }));
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      newRows.forEach((row, rowIdx) => {
        sheet.columns.forEach((col) => {
          const cell = row[col.key];
          if (cell?.formula) {
            const newVal = evaluateFormula(cell.formula, newRows, rowIdx, sheet.columns);
            if (newVal !== cell.value) { newRows[rowIdx] = { ...newRows[rowIdx], [col.key]: { ...cell, value: newVal } }; changed = true; }
          }
        });
      });
    }
    return newRows;
  }

  function commitEdit() {
    if (!editingCell) return;
    const { row, col } = editingCell;
    let newRows = [...sheet.rows];
    const cell: Cell = { ...newRows[row][col] };
    if (editValue.startsWith("=")) { cell.formula = editValue; cell.value = evaluateFormula(editValue, newRows, row, sheet.columns); }
    else { cell.value = editValue; cell.formula = undefined; }
    newRows[row] = { ...newRows[row], [col]: cell };
    if (col === "debit" || col === "credit") recalcBalance(newRows, row);
    newRows = recalcFormulas(newRows);
    onChange({ ...sheet, rows: newRows });
    setEditingCell(null);
    setIsFormulaEditing(false);
  }

  function getCellNumeric(row: Record<string, Cell>, colKey: string): number { const val = row[colKey]?.value?.replace(/[^0-9.-]/g, "") || "0"; const num = parseFloat(val); return isNaN(num) ? 0 : num; }
  function getCellRaw(row: Record<string, Cell>, colKey: string): string { return row[colKey]?.value || ""; }
  function getCellText(row: Record<string, Cell>, colKey: string): string { return row[colKey]?.value?.toString() || ""; }
  function letterToColKey(letter: string, columns: Column[]): string | null { const idx = letter.toUpperCase().charCodeAt(0) - 65; if (idx >= 0 && idx < columns.length) return columns[idx].key; /* Support double letters AA-ZZ */ if (letter.length === 2) { const idx2 = (letter.toUpperCase().charCodeAt(0) - 65 + 1) * 26 + (letter.toUpperCase().charCodeAt(1) - 65); if (idx2 >= 0 && idx2 < columns.length) return columns[idx2].key; } return null; }
  function colKeyToLetter(key: string, columns: Column[]): string { const idx = columns.findIndex(c => c.key === key); if (idx < 0) return "?"; if (idx < 26) return String.fromCharCode(65 + idx); return String.fromCharCode(65 + Math.floor(idx / 26) - 1) + String.fromCharCode(65 + (idx % 26)); }

  // Resolve a cell reference like "A1" or "debit3" to {row, colKey}
  function resolveCellRef(ref: string, columns: Column[]): CellLocation | null {
    // Try letter+number format: A1, B2, AA5
    const letterMatch = ref.match(/^([A-Z]{1,2})(\d+)$/i);
    if (letterMatch) {
      const colKey = letterToColKey(letterMatch[1], columns);
      const rowIdx = parseInt(letterMatch[2]) - 1;
      if (colKey && rowIdx >= 0) return { row: rowIdx, colKey };
    }
    // Try columnKey+number format: debit1, description5
    const keyMatch = ref.match(/^([a-zA-Z_]+)(\d+)$/);
    if (keyMatch) {
      const col = columns.find(c => c.key === keyMatch[1].toLowerCase());
      if (col) return { row: parseInt(keyMatch[2]) - 1, colKey: col.key };
    }
    return null;
  }

  // Parse a range like "A1:C5" or "debit1:credit5" into array of cell refs
  function parseRange(rangeStr: string, columns: Column[]): CellLocation[] {
    const parts = rangeStr.split(":");
    if (parts.length !== 2) return [];
    const start = resolveCellRef(parts[0].trim(), columns);
    const end = resolveCellRef(parts[1].trim(), columns);
    if (!start || !end) return [];

    const refs: CellLocation[] = [];
    const startColIdx = columns.findIndex(c => c.key === start.colKey);
    const endColIdx = columns.findIndex(c => c.key === end.colKey);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r >= 0 && r < 1000 && c >= 0 && c < columns.length) {
          refs.push({ row: r, colKey: columns[c].key });
        }
      }
    }
    return refs;
  }

  // Get numeric values from a range
  function getRangeValues(rangeStr: string, rows: Record<string, Cell>[], columns: Column[]): number[] {
    const refs = parseRange(rangeStr, columns);
    return refs.filter(r => r.row >= 0 && r.row < rows.length).map(r => getCellNumeric(rows[r.row], r.colKey));
  }

  // Get raw text values from a range
  function getRangeTexts(rangeStr: string, rows: Record<string, Cell>[], columns: Column[]): string[] {
    const refs = parseRange(rangeStr, columns);
    return refs.filter(r => r.row >= 0 && r.row < rows.length).map(r => getCellText(rows[r.row], r.colKey));
  }

  // ─── Full Excel-like Formula Engine ─────────────────────────────────────
  function evaluateFormula(formula: string, rows: Record<string, Cell>[], currentRow: number, columns: Column[]): string {
    try {
      let expr = formula.slice(1).trim();

      // ── Helper: evaluate a function call ──
      const evalFunc = (name: string, rawArgs: string): string => {
        const fn = name.toUpperCase();

        // IF(condition, trueVal, falseVal)
        if (fn === "IF") {
          const parts = splitFuncArgs(rawArgs);
          if (parts.length < 2) return "#ERROR";
          const condition = evalExpression(parts[0].trim(), rows, currentRow, columns);
          const isTrue = typeof condition === "number" ? condition !== 0 : condition.toLowerCase() === "true" || condition === "1";
          if (isTrue) return evalExpression(parts[1].trim(), rows, currentRow, columns).toString();
          return parts.length > 2 ? evalExpression(parts[2].trim(), rows, currentRow, columns).toString() : "FALSE";
        }

        // IFS(cond1, val1, cond2, val2, ...)
        if (fn === "IFS") {
          const parts = splitFuncArgs(rawArgs);
          for (let i = 0; i < parts.length - 1; i += 2) {
            const cond = evalExpression(parts[i].trim(), rows, currentRow, columns);
            const isTrue = typeof cond === "number" ? cond !== 0 : cond.toLowerCase() === "true" || cond === "1";
            if (isTrue) return evalExpression(parts[i + 1].trim(), rows, currentRow, columns).toString();
          }
          return "#N/A";
        }

        // CONCATENATE(val1, val2, ...) or CONCAT(...)
        if (fn === "CONCATENATE" || fn === "CONCAT") {
          const parts = splitFuncArgs(rawArgs);
          return parts.map(p => {
            const v = evalExpression(p.trim(), rows, currentRow, columns);
            return v.toString();
          }).join("");
        }

        // LEN(text)
        if (fn === "LEN") {
          const val = evalExpression(rawArgs.trim(), rows, currentRow, columns);
          return String(val.toString().length);
        }

        // UPPER(text), LOWER(text), TRIM(text)
        if (fn === "UPPER") { return evalExpression(rawArgs.trim(), rows, currentRow, columns).toString().toUpperCase(); }
        if (fn === "LOWER") { return evalExpression(rawArgs.trim(), rows, currentRow, columns).toString().toLowerCase(); }
        if (fn === "TRIM") { return evalExpression(rawArgs.trim(), rows, currentRow, columns).toString().trim(); }

        // LEFT(text, n), RIGHT(text, n), MID(text, start, n)
        if (fn === "LEFT") { const parts = splitFuncArgs(rawArgs); const text = evalExpression(parts[0].trim(), rows, currentRow, columns).toString(); const n = parseInt(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()) || 1; return text.slice(0, n); }
        if (fn === "RIGHT") { const parts = splitFuncArgs(rawArgs); const text = evalExpression(parts[0].trim(), rows, currentRow, columns).toString(); const n = parseInt(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()) || 1; return text.slice(-n); }
        if (fn === "MID") { const parts = splitFuncArgs(rawArgs); const text = evalExpression(parts[0].trim(), rows, currentRow, columns).toString(); const start = (parseInt(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()) || 1) - 1; const n = parseInt(evalExpression(parts[2]?.trim() || "1", rows, currentRow, columns).toString()) || 1; return text.slice(start, start + n); }

        // ABS, ROUND, CEILING, FLOOR, POWER, SQRT, MOD
        if (fn === "ABS") { const v = parseFloat(evalExpression(rawArgs.trim(), rows, currentRow, columns).toString()); return isNaN(v) ? "#ERROR" : String(Math.abs(v)); }
        if (fn === "ROUND") { const parts = splitFuncArgs(rawArgs); const v = parseFloat(evalExpression(parts[0].trim(), rows, currentRow, columns).toString()); const d = parseInt(evalExpression(parts[1]?.trim() || "0", rows, currentRow, columns).toString()) || 0; return isNaN(v) ? "#ERROR" : v.toFixed(d); }
        if (fn === "CEILING") { const v = parseFloat(evalExpression(rawArgs.trim(), rows, currentRow, columns).toString()); return isNaN(v) ? "#ERROR" : String(Math.ceil(v)); }
        if (fn === "FLOOR") { const v = parseFloat(evalExpression(rawArgs.trim(), rows, currentRow, columns).toString()); return isNaN(v) ? "#ERROR" : String(Math.floor(v)); }
        if (fn === "SQRT") { const v = parseFloat(evalExpression(rawArgs.trim(), rows, currentRow, columns).toString()); return isNaN(v) || v < 0 ? "#ERROR" : String(Math.sqrt(v)); }
        if (fn === "POWER" || fn === "POW") { const parts = splitFuncArgs(rawArgs); const base = parseFloat(evalExpression(parts[0].trim(), rows, currentRow, columns).toString()); const exp = parseFloat(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()); return (isNaN(base) || isNaN(exp)) ? "#ERROR" : String(Math.pow(base, exp)); }
        if (fn === "MOD") { const parts = splitFuncArgs(rawArgs); const a = parseFloat(evalExpression(parts[0].trim(), rows, currentRow, columns).toString()); const b = parseFloat(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()); return (isNaN(a) || isNaN(b) || b === 0) ? "#ERROR" : String(a % b); }

        // TODAY(), NOW()
        if (fn === "TODAY") { return new Date().toLocaleDateString("en-US"); }
        if (fn === "NOW") { return new Date().toLocaleString("en-US"); }

        // VLOOKUP(lookupValue, range, colIndex, [approxMatch])
        if (fn === "VLOOKUP" || fn === "HLOOKUP") {
          const parts = splitFuncArgs(rawArgs);
          if (parts.length < 3) return "#ERROR";
          const lookupVal = evalExpression(parts[0].trim(), rows, currentRow, columns).toString().toLowerCase();
          const rangeStr = parts[1].trim();
          const colIdx = parseInt(evalExpression(parts[2].trim(), rows, currentRow, columns).toString()) - 1;
          const approxMatch = parts.length > 3 ? evalExpression(parts[3].trim(), rows, currentRow, columns).toString().toLowerCase() === "true" : false;

          const refs = parseRange(rangeStr, columns);
          if (refs.length === 0) return "#REF";

          // Group refs by row
          const rowGroups = new Map<number, CellLocation[]>();
          refs.forEach(r => {
            if (!rowGroups.has(r.row)) rowGroups.set(r.row, []);
            rowGroups.get(r.row)!.push(r);
          });

          for (const [, cells] of rowGroups) {
            if (cells.length === 0) continue;
            // First column of range is the lookup column
            const firstCell = cells[0];
            if (firstCell.row < 0 || firstCell.row >= rows.length) continue;
            const cellVal = getCellText(rows[firstCell.row], firstCell.colKey).toLowerCase();

            const match = approxMatch ? cellVal.includes(lookupVal) : cellVal === lookupVal;
            if (match && colIdx >= 0 && colIdx < cells.length) {
              const resultCell = cells[colIdx];
              if (resultCell.row >= 0 && resultCell.row < rows.length) {
                return getCellText(rows[resultCell.row], resultCell.colKey);
              }
            }
          }
          return "#N/A";
        }

        // COUNTIF(range, criteria), SUMIF(range, criteria, [sumRange])
        if (fn === "COUNTIF") {
          const parts = splitFuncArgs(rawArgs);
          if (parts.length < 2) return "#ERROR";
          const texts = getRangeTexts(parts[0].trim(), rows, columns);
          const criteria = evalExpression(parts[1].trim(), rows, currentRow, columns).toString().toLowerCase();
          // Support >, <, >=, <= operators
          if (criteria.startsWith(">=")) { const t = parseFloat(criteria.slice(2)); return String(texts.filter(v => parseFloat(v.replace(/[^0-9.-]/g, "")) >= t).length); }
          if (criteria.startsWith("<=")) { const t = parseFloat(criteria.slice(2)); return String(texts.filter(v => parseFloat(v.replace(/[^0-9.-]/g, "")) <= t).length); }
          if (criteria.startsWith(">")) { const t = parseFloat(criteria.slice(1)); return String(texts.filter(v => parseFloat(v.replace(/[^0-9.-]/g, "")) > t).length); }
          if (criteria.startsWith("<")) { const t = parseFloat(criteria.slice(1)); return String(texts.filter(v => parseFloat(v.replace(/[^0-9.-]/g, "")) < t).length); }
          return String(texts.filter(v => v.toLowerCase() === criteria || v.toLowerCase().includes(criteria)).length);
        }

        if (fn === "SUMIF") {
          const parts = splitFuncArgs(rawArgs);
          if (parts.length < 2) return "#ERROR";
          const rangeStr = parts[0].trim();
          const criteria = evalExpression(parts[1].trim(), rows, currentRow, columns).toString().toLowerCase();
          const sumRangeStr = parts.length > 2 ? parts[2].trim() : rangeStr;
          const texts = getRangeTexts(rangeStr, rows, columns);
          const sumValues = getRangeValues(sumRangeStr, rows, columns);
          let sum = 0;
          texts.forEach((v, i) => {
            const match = criteria.startsWith(">=") ? parseFloat(v.replace(/[^0-9.-]/g, "")) >= parseFloat(criteria.slice(2))
              : criteria.startsWith("<=") ? parseFloat(v.replace(/[^0-9.-]/g, "")) <= parseFloat(criteria.slice(2))
              : criteria.startsWith(">") ? parseFloat(v.replace(/[^0-9.-]/g, "")) > parseFloat(criteria.slice(1))
              : criteria.startsWith("<") ? parseFloat(v.replace(/[^0-9.-]/g, "")) < parseFloat(criteria.slice(1))
              : v.toLowerCase() === criteria || v.toLowerCase().includes(criteria);
            if (match && i < sumValues.length) sum += sumValues[i];
          });
          return String(sum);
        }

        // SUMPRODUCT(range1, range2, ...) — multiply corresponding elements then sum
        if (fn === "SUMPRODUCT") {
          const parts = splitFuncArgs(rawArgs);
          const allRanges = parts.map(p => getRangeValues(p.trim(), rows, columns));
          if (allRanges.length === 0) return "#ERROR";
          const len = Math.min(...allRanges.map(r => r.length));
          let sum = 0;
          for (let i = 0; i < len; i++) {
            let product = 1;
            allRanges.forEach(range => { product *= range[i]; });
            sum += product;
          }
          return String(sum);
        }

        // MAX, MIN, SUM, AVG, COUNT — with range support
        const rangeMatch = rawArgs.match(/^([A-Za-z]{1,2}\d*|[a-zA-Z_]+\d*):([A-Za-z]{1,2}\d*|[a-zA-Z_]+\d*)$/);
        if (rangeMatch) {
          const values = getRangeValues(rawArgs.trim(), rows, columns);
          if (fn === "SUM") return String(values.reduce((a, b) => a + b, 0));
          if (fn === "AVG" || fn === "AVERAGE") return values.length > 0 ? String(values.reduce((a, b) => a + b, 0) / values.length) : "0";
          if (fn === "MIN") return values.length > 0 ? String(Math.min(...values)) : "0";
          if (fn === "MAX") return values.length > 0 ? String(Math.max(...values)) : "0";
          if (fn === "COUNT") return String(values.filter(v => v !== 0).length);
          if (fn === "COUNTA") return String(values.length);
        }

        // Comma-separated args fallback
        const parts = splitFuncArgs(rawArgs);
        const values = parts.map(a => {
          const trimmed = a.trim();
          // Check if it's a range
          if (trimmed.includes(":")) {
            return getRangeValues(trimmed, rows, columns);
          }
          // Check cell reference
          const ref = resolveCellRef(trimmed, columns);
          if (ref && ref.row >= 0 && ref.row < rows.length) return [getCellNumeric(rows[ref.row], ref.colKey)];
          // Number literal
          const num = parseFloat(trimmed);
          return [isNaN(num) ? 0 : num];
        }).flat();

        if (fn === "SUM") return String(values.reduce((a, b) => a + b, 0));
        if (fn === "AVG" || fn === "AVERAGE") return values.length > 0 ? String(values.reduce((a, b) => a + b, 0) / values.length) : "0";
        if (fn === "MIN") return values.length > 0 ? String(Math.min(...values)) : "0";
        if (fn === "MAX") return values.length > 0 ? String(Math.max(...values)) : "0";
        if (fn === "COUNT") return String(values.filter(v => v !== 0).length);
        if (fn === "COUNTA") return String(values.length);
        return "0";
      };

      // Split function arguments respecting nested parentheses
      const splitFuncArgs = (args: string): string[] => {
        const parts: string[] = [];
        let depth = 0;
        let current = "";
        for (let i = 0; i < args.length; i++) {
          const ch = args[i];
          if (ch === "(") depth++;
          else if (ch === ")") depth--;
          if (ch === "," && depth === 0) { parts.push(current); current = ""; }
          else current += ch;
        }
        if (current) parts.push(current);
        return parts;
      };

      // Evaluate a sub-expression (number, cell ref, or formula result)
      const evalExpression = (subExpr: string, rows: Record<string, Cell>[], currentRow: number, columns: Column[]): string | number => {
        const trimmed = subExpr.trim();
        // String literal
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
        // Boolean
        if (trimmed.toLowerCase() === "true") return 1;
        if (trimmed.toLowerCase() === "false") return 0;
        // Cell reference
        const ref = resolveCellRef(trimmed, columns);
        if (ref && ref.row >= 0 && ref.row < rows.length) {
          const cellVal = getCellText(rows[ref.row], ref.colKey);
          const num = parseFloat(cellVal.replace(/[^0-9.-]/g, ""));
          return isNaN(num) ? cellVal : num;
        }
        // Column key reference (current row)
        const col = columns.find(c => c.key === trimmed.toLowerCase());
        if (col) return getCellNumeric(rows[currentRow], col.key);
        // Number
        const num = parseFloat(trimmed);
        if (!isNaN(num)) return num;
        // Nested function — evaluate recursively
        return evaluateFormula("=" + trimmed, rows, currentRow, columns);
      };

      // ── Main evaluation pipeline ────────────────────────────────────────

      // Step 1: Replace function calls (innermost first, handle nesting)
      // Process functions in a loop to handle nested calls
      let maxIterations = 20;
      while (maxIterations-- > 0) {
        const funcMatch = expr.match(/\b([A-Z_]+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/i);
        if (!funcMatch) break;
        const [fullMatch, fnName, fnArgs] = funcMatch;
        const result = evalFunc(fnName, fnArgs);
        expr = expr.replace(fullMatch, typeof result === "string" && !isNaN(parseFloat(result)) && result !== "#ERROR" && result !== "#N/A" && result !== "#REF" ? result : `"${result}"`);
      }

      // Step 2: Replace cell references (A1, B2, etc.)
      expr = expr.replace(/\b([A-Z]{1,2})(\d+)\b/gi, (_, letter, rowNum) => {
        const colKey = letterToColKey(letter, columns);
        const rowIdx = parseInt(rowNum) - 1;
        if (colKey && rowIdx >= 0 && rowIdx < rows.length) return String(getCellNumeric(rows[rowIdx], colKey));
        return "0";
      });

      // Step 3: Replace column key references (debit, credit, etc.)
      columns.forEach((col) => {
        const regex = new RegExp(`\\b${col.key}\\b`, "gi");
        expr = expr.replace(regex, String(getCellNumeric(rows[currentRow], col.key)));
      });

      // Step 4: Handle & concatenation operator
      expr = expr.replace(/"([^"]*?)"\s*&\s*"([^"]*?)"/g, '"$1$2"');
      expr = expr.replace(/"([^"]*?)"\s*&\s*(\d+)/g, '"$1$2"');
      expr = expr.replace(/(\d+)\s*&\s*"([^"]*?)"/g, '"$1$2"');

      // Step 5: Handle comparison operators in arithmetic
      expr = expr.replace(/!=/g, "!==");

      // Step 6: Evaluate arithmetic (strip non-numeric strings for math)
      // If the expression is a pure string, return it
      const stringMatch = expr.match(/^"([^"]*)"$/);
      if (stringMatch) return stringMatch[1];

      // Sanitize for safe eval
      const sanitized = expr.replace(/[^0-9+\-*/.() e!<>=&|%,]/gi, "").replace(/[^0-9+\-*/.() e]/gi, "");
      if (sanitized.trim() === "") return expr.replace(/"/g, "");

      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) return Number.isInteger(result) ? String(result) : result.toFixed(2);
      if (typeof result === "boolean") return result ? "TRUE" : "FALSE";
      return String(result);
    } catch (e) { return "#ERROR"; }
  }

  function recalcBalance(rows: Record<string, Cell>[], rowIdx: number) {
    const hasBalance = sheet.columns.some((c) => c.key === "balance"); if (!hasBalance) return;
    let balance = 0;
    for (let i = 0; i <= rowIdx; i++) { const debit = parseFloat(rows[i]["debit"]?.value?.replace(/[^0-9.-]/g, "") || "0"); const credit = parseFloat(rows[i]["credit"]?.value?.replace(/[^0-9.-]/g, "") || "0"); if (!isNaN(debit)) balance += debit; if (!isNaN(credit)) balance -= credit; rows[i]["balance"] = { value: balance.toFixed(2), format: "currency" }; }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && isFullscreen) { setIsFullscreen(false); return; }
    if (e.key === "Escape" && editingCell) { setEditingCell(null); return; }
    if (!activeCell) return;
    const rowIdx = activeCell.row; const colIdx = sheet.columns.findIndex((c) => c.key === activeCell.col);
    if (editingCell) {
      if (e.key === "Enter") { commitEdit(); if (rowIdx < sheet.rows.length - 1) setActiveCell({ row: rowIdx + 1, col: activeCell.col }); }
      else if (e.key === "Tab") { e.preventDefault(); commitEdit(); if (colIdx < sheet.columns.length - 1) setActiveCell({ row: rowIdx, col: sheet.columns[colIdx + 1].key }); }
      return;
    }
    if (e.key === "ArrowDown" && rowIdx < sheet.rows.length - 1) setActiveCell({ row: rowIdx + 1, col: activeCell.col });
    else if (e.key === "ArrowUp" && rowIdx > 0) setActiveCell({ row: rowIdx - 1, col: activeCell.col });
    else if (e.key === "ArrowRight" && colIdx < sheet.columns.length - 1) setActiveCell({ row: rowIdx, col: sheet.columns[colIdx + 1].key });
    else if (e.key === "ArrowLeft" && colIdx > 0) setActiveCell({ row: rowIdx, col: sheet.columns[colIdx - 1].key });
    else if (e.key === "Enter" || e.key === "F2") startEdit(rowIdx, activeCell.col);
    else if (e.key === "Delete" || e.key === "Backspace") { let newRows = [...sheet.rows]; newRows[rowIdx] = { ...newRows[rowIdx], [activeCell.col]: { value: "" } }; newRows = recalcFormulas(newRows); onChange({ ...sheet, rows: newRows }); }
    else if (e.key === "Tab") { e.preventDefault(); if (colIdx < sheet.columns.length - 1) setActiveCell({ row: rowIdx, col: sheet.columns[colIdx + 1].key }); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { startEdit(rowIdx, activeCell.col); setEditValue(e.key); }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "c" && activeCell) { setClipboard(sheet.rows[rowIdx][activeCell.col]); toast.success("Copied"); }
      else if (e.key === "v" && clipboard && activeCell) { let newRows = [...sheet.rows]; newRows[rowIdx] = { ...newRows[rowIdx], [activeCell.col]: { ...clipboard } }; newRows = recalcFormulas(newRows); onChange({ ...sheet, rows: newRows }); }
      else if (e.key === "b") { e.preventDefault(); toggleBold(); }
    }
  }

  function toggleBold() { if (!activeCell) return; const newRows = [...sheet.rows]; const cell = { ...newRows[activeCell.row][activeCell.col] }; cell.bold = !cell.bold; newRows[activeCell.row] = { ...newRows[activeCell.row], [activeCell.col]: cell }; onChange({ ...sheet, rows: newRows }); }
  function formatActiveCell(format: Cell["format"]) { if (!activeCell) return; const newRows = [...sheet.rows]; const cell = { ...newRows[activeCell.row][activeCell.col] }; cell.format = format; newRows[activeCell.row] = { ...newRows[activeCell.row], [activeCell.col]: cell }; onChange({ ...sheet, rows: newRows }); }
  function addRow() { onChange({ ...sheet, rows: [...sheet.rows, createEmptyRow(sheet.columns)] }); }
  function deleteSelectedRows() { if (selectedRows.size === 0) return; const newRows = sheet.rows.filter((_, i) => !selectedRows.has(i)); onChange({ ...sheet, rows: newRows }); setSelectedRows(new Set()); }
  function handleSort(colKey: string) { if (sortCol === colKey) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortCol(colKey); setSortDir("asc"); } }

  // ── Drag-fill (like Excel's fill handle) ────────────────────────────────
  function handleDragStart(e: React.MouseEvent, row: number, col: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragStart({ row, col });
    setDragEnd({ row, col });
    setIsDragging(true);
  }

  function handleDragMove(e: React.MouseEvent, row: number, col: string) {
    if (!isDragging || !dragStart) return;
    setDragEnd({ row, col });
  }

  // Adjust cell references in a formula when filling to a new row/col
  function adjustFormulaReferences(formula: string, rowOffset: number, colOffset: number): string {
    if (!formula.startsWith("=")) return formula;
    return formula.replace(/\b([A-Z]{1,2})(\d+)\b/gi, (match, letter, rowNum) => {
      const colIdx = letter.charCodeAt(0) - 65 + (letter.length === 2 ? (letter.charCodeAt(0) - 64) * 26 : 0);
      const newColIdx = colIdx + colOffset;
      const newRow = parseInt(rowNum) + rowOffset;
      if (newRow < 1) return match; // Don't adjust invalid refs
      const newLetter = newColIdx < 26 ? String.fromCharCode(65 + newColIdx) : String.fromCharCode(65 + Math.floor(newColIdx / 26) - 1) + String.fromCharCode(65 + (newColIdx % 26));
      return `${newLetter}${newRow}`;
    });
  }

  function handleDragEnd() {
    if (!isDragging || !dragStart || !dragEnd) { setIsDragging(false); return; }

    const sourceCell = sheet.rows[dragStart.row]?.[dragStart.col];
    if (!sourceCell) { setIsDragging(false); setDragStart(null); setDragEnd(null); return; }

    const startRow = Math.min(dragStart.row, dragEnd.row);
    const endRow = Math.max(dragStart.row, dragEnd.row);
    const startColIdx = sheet.columns.findIndex(c => c.key === dragStart.col);
    const endColIdx = sheet.columns.findIndex(c => c.key === dragEnd.col);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);

    const newRows = [...sheet.rows];

    // Detect pattern: numbers increment, dates increment, text repeats
    const sourceVal = parseFloat(sourceCell.value.replace(/[^0-9.-]/g, ""));
    const isSourceNumber = !isNaN(sourceVal) && sourceCell.value.trim() !== "";
    const hasFormula = !!sourceCell.formula;

    // Check if there's a sequence (2+ cells in the drag direction)
    let step = 1;
    if (isSourceNumber && !hasFormula && startRow !== endRow) {
      // Vertical fill — check if there's a second value to determine step
      const secondCell = newRows[dragStart.row + 1]?.[dragStart.col];
      if (secondCell && !secondCell.formula) {
        const secondVal = parseFloat(secondCell.value.replace(/[^0-9.-]/g, ""));
        if (!isNaN(secondVal)) step = secondVal - sourceVal;
      }
    }

    let fillIdx = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const colKey = sheet.columns[c].key;
        if (r === dragStart.row && colKey === dragStart.col) continue; // Skip source

        const newCell: Cell = { ...sourceCell };

        if (hasFormula) {
          // ── Formula fill: adjust cell references relatively ──
          const rowOffset = r - dragStart.row;
          const colOffset = c - startColIdx;
          newCell.formula = adjustFormulaReferences(sourceCell.formula!, rowOffset, colOffset);
          // Evaluate the adjusted formula
          newCell.value = evaluateFormula(newCell.formula, newRows, r, sheet.columns);
        } else if (isSourceNumber) {
          fillIdx++;
          const newVal = sourceVal + step * fillIdx;
          newCell.value = Number.isInteger(newVal) ? String(newVal) : newVal.toFixed(2);
          newCell.formula = undefined;
        } else {
          // Repeat text or increment if it ends with a number
          const textMatch = sourceCell.value.match(/^(.*?)(\d+)$/);
          if (textMatch) {
            fillIdx++;
            newCell.value = textMatch[1] + (parseInt(textMatch[2]) + fillIdx);
          } else {
            newCell.value = sourceCell.value; // Just copy
          }
        }

        newRows[r] = { ...newRows[r], [colKey]: newCell };
      }
    }

    // Recalculate all formulas
    const recalculated = recalcFormulas(newRows);
    onChange({ ...sheet, rows: recalculated });

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    toast.success("Filled");
  }

  // Check if a cell is in the drag selection range
  function isInDragRange(row: number, col: string): boolean {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const colIdx = sheet.columns.findIndex(c => c.key === col);
    const startColIdx = sheet.columns.findIndex(c => c.key === dragStart.col);
    const endColIdx = sheet.columns.findIndex(c => c.key === dragEnd.col);
    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);
    return row >= minRow && row <= maxRow && colIdx >= minCol && colIdx <= maxCol;
  }

  // ── Row & Column Resize ──────────────────────────────────────────────
  const getRowHeight = (rowIdx: number) => rowHeights[rowIdx] || 32;
  const getColWidth = (col: Column) => colWidths[col.key] || col.width;

  function startRowResize(e: React.MouseEvent, rowIdx: number) {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ type: "row", index: rowIdx, startPos: e.clientY, startSize: getRowHeight(rowIdx) });
  }

  function startColResize(e: React.MouseEvent, colKey: string) {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ type: "col", index: colKey, startPos: e.clientX, startSize: getColWidth(sheet.columns.find(c => c.key === colKey)!) });
  }

  useEffect(() => {
    if (!resizing) return;

    function onMouseMove(e: MouseEvent) {
      if (!resizing) return;
      if (resizing.type === "row") {
        const delta = e.clientY - resizing.startPos;
        const newHeight = Math.max(24, Math.min(400, resizing.startSize + delta));
        setRowHeights(prev => ({ ...prev, [resizing.index as number]: newHeight }));
      } else {
        const delta = e.clientX - resizing.startPos;
        const newWidth = Math.max(40, Math.min(800, resizing.startSize + delta));
        setColWidths(prev => ({ ...prev, [resizing.index as string]: newWidth }));
      }
    }

    function onMouseUp() {
      setResizing(null);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing]);

  // Auto-fit row height to content on double-click
  function autoFitRow(rowIdx: number) {
    const row = sheet.rows[rowIdx];
    if (!row) return;
    let maxLines = 1;
    sheet.columns.forEach(col => {
      const val = row[col.key]?.value || "";
      const lines = val.split("\n").length;
      const approxCharsPerLine = Math.max(1, Math.floor((getColWidth(col) - 16) / 7));
      const wrappedLines = Math.ceil(val.length / approxCharsPerLine);
      maxLines = Math.max(maxLines, lines, wrappedLines);
    });
    const newHeight = Math.max(32, maxLines * 20 + 12);
    setRowHeights(prev => ({ ...prev, [rowIdx]: newHeight }));
  }

  // Auto-fit column width to content on double-click
  function autoFitCol(colKey: string) {
    const col = sheet.columns.find(c => c.key === colKey);
    if (!col) return;
    let maxLen = col.label.length;
    sheet.rows.forEach(row => {
      const val = row[colKey]?.value || "";
      maxLen = Math.max(maxLen, val.length);
    });
    const newWidth = Math.max(60, Math.min(500, maxLen * 8 + 24));
    setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
  }

  // ── Mouse cursor style during resize ─────────────────────────────────
  useEffect(() => {
    if (resizing) {
      document.body.style.cursor = resizing.type === "row" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, [resizing]);

  function exportCSV() {
    const headers = sheet.columns.map((c) => c.label); const csvRows = [headers.join(",")];
    sheet.rows.forEach((row) => { const vals = sheet.columns.map((c) => { const v = row[c.key]?.value || ""; return `"${v.replace(/"/g, '""')}"`; }); csvRows.push(vals.join(",")); });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sheet.name.toLowerCase().replace(/\s+/g, "-")}.csv`; a.click(); URL.revokeObjectURL(url); toast.success("Exported to CSV");
  }

  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string; const lines = text.split("\n").filter((l) => l.trim()); if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim()); const newRows: Record<string, Cell>[] = [];
      for (let i = 1; i < lines.length; i++) { const vals = lines[i].match(/(".*?"|[^,]+)/g)?.map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"')) || []; const row: Record<string, Cell> = {}; sheet.columns.forEach((col, colIdx) => { row[col.key] = { value: vals[colIdx] || "" }; }); newRows.push(row); }
      while (newRows.length < 100) newRows.push(createEmptyRow(sheet.columns));
      onChange({ ...sheet, rows: newRows }); toast.success(`Imported ${lines.length - 1} rows`);
    };
    reader.readAsText(file); e.target.value = "";
  }

  function formatCellValue(cell: Cell): string {
    if (!cell.value) return "";
    if (cell.format === "currency") { const num = parseFloat(cell.value.replace(/[^0-9.-]/g, "")); if (isNaN(num)) return cell.value; return num.toLocaleString("en-US", { style: "currency", currency: "USD" }); }
    if (cell.format === "percent") { const num = parseFloat(cell.value); if (isNaN(num)) return cell.value; return `${num}%`; }
    if (cell.format === "number") { const num = parseFloat(cell.value); if (isNaN(num)) return cell.value; return num.toLocaleString(); }
    return cell.value;
  }

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sheet.columns.forEach((col) => { if (col.type === "currency") { let sum = 0; sheet.rows.forEach((row) => { const val = parseFloat(row[col.key]?.value?.replace(/[^0-9.-]/g, "") || "0"); if (!isNaN(val)) sum += val; }); totals[col.key] = sum; } });
    return totals;
  }, [sheet]);

  // Map cell bgColor classes to actual CSS colors (theme-aware)
  const CELL_BG_COLORS: Record<string, { light: string; dark: string }> = {
    "excel-bg-yellow":   { light: "#FFF2CC", dark: "#3D3200" },
    "excel-bg-green":    { light: "#E2EFDA", dark: "#1A3A1A" },
    "excel-bg-blue":     { light: "#D6E4F0", dark: "#1A2A3D" },
    "excel-bg-pink":     { light: "#FCE4EC", dark: "#3D1A22" },
    "excel-bg-peach":    { light: "#FBE5D6", dark: "#3D2A1A" },
    "excel-bg-lavender": { light: "#E8DAEF", dark: "#2A1A3D" },
    "excel-bg-mint":     { light: "#D1F2EB", dark: "#1A3D2A" },
    "excel-bg-gray":     { light: "#E8E8E8", dark: "#2A2A2A" },
  };

  function getCellBgColor(cls?: string): string | undefined {
    if (!cls) return undefined;
    const entry = CELL_BG_COLORS[cls];
    if (!entry) return undefined;
    return isDark ? entry.dark : entry.light;
  }

  // ── Excel-like color palette (theme-aware) ──────────────────────────
  const C = {
    green:       isDark ? "#4CAF50" : "#217346",
    greenLight:  isDark ? "#1A3A1A" : "#E2EFDA",
    greenHeader: isDark ? "#2E7D32" : "#D5E8D4",
    blue:        isDark ? "#64B5F6" : "#4472C4",
    blueLight:   isDark ? "#1A2A3D" : "#D6E4F0",
    headerBg:    isDark ? "#2D2D2D" : "#F5F5F5",
    grid:        isDark ? "#404040" : "#D4D4D4",
    activeBg:    isDark ? "#1E1E1E" : "#FFFFFF",
    text:        isDark ? "#E0E0E0" : "#1a1a1a",
    textDim:     isDark ? "#666" : "#B0B0B0",
    textMid:     isDark ? "#999" : "#666",
    toolbarBg:   isDark ? "#252525" : "#FAFAFA",
    statusBg:    isDark ? "#2A2A2A" : "#F5F5F5",
    inputBg:     isDark ? "#1E1E1E" : "#FFFFFF",
    hoverBg:     isDark ? "#333" : "#F0F0F0",
    totalsBg:    isDark ? "#2A2A2A" : "#F0F0F0",
  };

  const spreadsheetContent = (
    <div className="flex flex-col h-full" style={{ ["--excel-green" as any]: C.green, ["--excel-blue" as any]: C.blue }}>
      {/* ── Toolbar (collapsible) ────────────────────────────────────── */}
      {toolbarVisible && (
        <div className="flex items-center gap-1 px-2 py-1 border-b flex-wrap flex-shrink-0" style={{ borderColor: C.grid, backgroundColor: C.toolbarBg }}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: C.textDim }} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-7 pr-2 py-1 rounded text-xs outline-none w-36" style={{ backgroundColor: C.inputBg, border: `1px solid ${C.grid}`, color: C.text }} />
          </div>
          <div className="w-px h-4" style={{ backgroundColor: C.grid }} />

          {/* Formatting */}
          <button onClick={toggleBold} className={cn("p-1 rounded hover:bg-gray-100", activeCell && sheet.rows[activeCell.row]?.[activeCell.col]?.bold && "font-bold")} style={{ color: activeCell && sheet.rows[activeCell.row]?.[activeCell.col]?.bold ? C.green : "#555" }} title="Bold (Ctrl+B)"><Bold className="h-3 w-3" /></button>
          <button
            onClick={() => {
              if (!activeCell) return;
              // AutoSum: find the first numeric column above the active cell and insert =SUM(range)
              const colIdx = sheet.columns.findIndex(c => c.key === activeCell.col);
              const colKey = activeCell.col;
              const letter = colKeyToLetter(colKey, sheet.columns);
              // Scan upward to find first non-empty cell
              let startRow = activeCell.row - 1;
              while (startRow >= 0) {
                const val = sheet.rows[startRow]?.[colKey]?.value?.trim();
                if (!val) break;
                startRow--;
              }
              startRow = Math.max(0, startRow + 1);
              const range = `${letter}${startRow + 1}:${letter}${activeCell.row}`;
              const formula = `=SUM(${range})`;
              setEditingCell(activeCell);
              setEditValue(formula);
              setIsFormulaEditing(true);
              // Apply immediately
              let newRows = [...sheet.rows];
              const cell: Cell = { ...newRows[activeCell.row][colKey] };
              cell.formula = formula;
              cell.value = evaluateFormula(formula, newRows, activeCell.row, sheet.columns);
              newRows[activeCell.row] = { ...newRows[activeCell.row], [colKey]: cell };
              newRows = recalcFormulas(newRows);
              onChange({ ...sheet, rows: newRows });
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="px-1.5 py-1 rounded hover:bg-gray-200/10 text-[11px] font-bold"
            style={{ color: C.green }}
            title="AutoSum (Σ) — click a cell below numbers, then click this"
          >
            Σ
          </button>
          <div className="w-px h-4" style={{ backgroundColor: C.grid }} />

          {/* Cell color picker — Excel-style */}
          <div className="flex items-center gap-0.5">
            {[
              { name: "none", cls: "", preview: isDark ? "#1E1E1E" : "#FFFFFF" },
              { name: "yellow", cls: "excel-bg-yellow", preview: isDark ? "#3D3200" : "#FFF2CC" },
              { name: "light green", cls: "excel-bg-green", preview: isDark ? "#1A3A1A" : "#E2EFDA" },
              { name: "light blue", cls: "excel-bg-blue", preview: isDark ? "#1A2A3D" : "#D6E4F0" },
              { name: "pink", cls: "excel-bg-pink", preview: isDark ? "#3D1A22" : "#FCE4EC" },
              { name: "peach", cls: "excel-bg-peach", preview: isDark ? "#3D2A1A" : "#FBE5D6" },
              { name: "lavender", cls: "excel-bg-lavender", preview: isDark ? "#2A1A3D" : "#E8DAEF" },
              { name: "mint", cls: "excel-bg-mint", preview: isDark ? "#1A3D2A" : "#D1F2EB" },
              { name: "gray", cls: "excel-bg-gray", preview: isDark ? "#2A2A2A" : "#E8E8E8" },
            ].map((c) => {
              const isActiveColor = activeCell && sheet.rows[activeCell.row]?.[activeCell.col]?.bgColor === c.cls;
              return (
                <button
                  key={c.name}
                  onClick={() => {
                    if (!activeCell) { toast.error("Select a cell first"); return; }
                    const newRows = [...sheet.rows];
                    const cell: Cell = { ...newRows[activeCell.row][activeCell.col] };
                    cell.bgColor = c.name === "none" ? undefined : c.cls;
                    newRows[activeCell.row] = { ...newRows[activeCell.row], [activeCell.col]: cell };
                    onChange({ ...sheet, rows: newRows });
                  }}
                  className="w-5 h-5 rounded-sm transition-all hover:scale-125 hover:shadow-md"
                  style={{
                    backgroundColor: c.preview,
                    outline: isActiveColor ? `2px solid ${C.green}` : "none",
                    outlineOffset: "1px",
                    border: `1px solid ${C.grid}`,
                  }}
                  title={c.name === "none" ? "Clear color" : c.name}
                >
                  {c.name === "none" && <X className="h-2.5 w-2.5 mx-auto" style={{ color: C.textDim }} />}
                </button>
              );
            })}
          </div>
          <div className="w-px h-4" style={{ backgroundColor: C.grid }} />

          {/* Row & Column actions */}
          <button onClick={() => addRow()} className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200/10 text-[11px]" style={{ color: C.textMid }}><Plus className="h-3 w-3" />Row</button>
          <button onClick={() => {
            const name = prompt("Column name:");
            if (!name?.trim()) return;
            const key = name.trim().toLowerCase().replace(/\s+/g, "_");
            if (sheet.columns.some(c => c.key === key)) { toast.error("Column already exists"); return; }
            const newCol: Column = { key, label: name.trim(), width: 120, type: "text" };
            const newColumns = [...sheet.columns, newCol];
            const newRows = sheet.rows.map(row => ({ ...row, [key]: { value: "" } }));
            onChange({ ...sheet, columns: newColumns, rows: newRows });
            toast.success(`Added column "${name.trim()}"`);
          }} className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200/10 text-[11px]" style={{ color: C.textMid }}><Plus className="h-3 w-3" />Col</button>
          {selectedRows.size > 0 && <button onClick={deleteSelectedRows} className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-red-50 text-[11px]" style={{ color: isDark ? "#FF6B6B" : "#C00000" }}><Trash2 className="h-3 w-3" />{selectedRows.size}</button>}
          <div className="flex-1" />

          {/* Import/Export */}
          <label className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200/10 text-[11px] cursor-pointer" style={{ color: C.textMid }}><Upload className="h-3 w-3" />Import<input type="file" accept=".csv" className="hidden" onChange={importCSV} /></label>
          <button onClick={exportCSV} className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-200/10 text-[11px]" style={{ color: C.textMid }}><Download className="h-3 w-3" />CSV</button>
          <div className="w-px h-4" style={{ backgroundColor: C.grid }} />

          {/* Fullscreen */}
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 rounded hover:bg-gray-200/10" style={{ color: isFullscreen ? C.green : "#555" }} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          <button onClick={() => setToolbarVisible(false)} className="p-1 rounded hover:bg-gray-200/10" style={{ color: C.textDim }} title="Hide toolbar"><EyeOff className="h-3 w-3" /></button>
        </div>
      )}

      {/* Show toolbar button (when hidden) */}
      {!toolbarVisible && (
        <div className="flex items-center gap-1 px-2 py-0.5 border-b flex-shrink-0" style={{ borderColor: C.grid, backgroundColor: C.toolbarBg }}>
          <button onClick={() => setToolbarVisible(true)} className="px-2 py-0.5 rounded text-[10px] hover:bg-gray-100 flex items-center gap-1" style={{ color: C.textDim }}>
            <Eye className="h-3 w-3" /> Show toolbar
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-0.5 rounded hover:bg-gray-100" style={{ color: isFullscreen ? C.green : "#999" }}>
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          <div className="flex-1" />
          <span className="text-[10px]" style={{ color: C.textDim }}>{sheet.name} · {sheet.rows.length} rows</span>
        </div>
      )}

      {/* ── Formula bar ─────────────────────────────────────────────── */}
      {toolbarVisible && (
        <div className="flex items-center gap-2 px-2 py-1 border-b flex-shrink-0" style={{ borderColor: C.grid, backgroundColor: C.inputBg }}>
          <span className="text-[10px] font-mono w-16 text-center flex-shrink-0 rounded px-1 py-0.5 font-bold"
            style={{ backgroundColor: C.inputBg, border: `1px solid ${C.grid}`, color: C.text }}>
            {activeCell ? `${colKeyToLetter(activeCell.col, sheet.columns)}${activeCell.row + 1}` : "—"}
          </span>
          <span className="italic text-[11px]" style={{ color: C.textDim }}>fx</span>
          <input
            ref={formulaBarRef}
            type="text"
            value={editingCell ? editValue : (activeCell ? (sheet.rows[activeCell.row]?.[activeCell.col]?.formula || sheet.rows[activeCell.row]?.[activeCell.col]?.value || "") : "")}
            onFocus={() => {
              // Don't start editing if we're in the middle of inserting a cell ref
              if (pendingCellInsertRef.current || skipBlurCommitRef.current) return;
              // If not already editing, start editing the active cell from the formula bar
              if (!editingCell && activeCell) {
                const cell = sheet.rows[activeCell.row]?.[activeCell.col];
                setEditingCell(activeCell);
                setEditValue(cell?.formula || cell?.value || "");
                setIsFormulaEditing(!!cell?.formula?.startsWith("="));
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              setEditValue(val);
              setIsFormulaEditing(val.startsWith("="));
              // Live preview in the cell
              if (editingCell) {
                let newRows = [...sheet.rows];
                const cell: Cell = { ...newRows[editingCell.row][editingCell.col] };
                if (val.startsWith("=")) { cell.formula = val; cell.value = evaluateFormula(val, newRows, editingCell.row, sheet.columns); }
                else { cell.value = val; cell.formula = undefined; }
                newRows[editingCell.row] = { ...newRows[editingCell.row], [editingCell.col]: cell };
                if (editingCell.col === "debit" || editingCell.col === "credit") recalcBalance(newRows, editingCell.row);
                newRows = recalcFormulas(newRows);
                onChange({ ...sheet, rows: newRows });
              } else if (activeCell) {
                // Direct edit without going through editingCell
                let newRows = [...sheet.rows];
                const cell: Cell = { ...newRows[activeCell.row][activeCell.col] };
                if (val.startsWith("=")) { cell.formula = val; cell.value = evaluateFormula(val, newRows, activeCell.row, sheet.columns); }
                else { cell.value = val; cell.formula = undefined; }
                newRows[activeCell.row] = { ...newRows[activeCell.row], [activeCell.col]: cell };
                newRows = recalcFormulas(newRows);
                onChange({ ...sheet, rows: newRows });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitEdit();
                tableRef.current?.focus();
              }
              if (e.key === "Escape") {
                setEditingCell(null);
                setEditValue("");
                tableRef.current?.focus();
              }
            }}
            onBlur={() => {
              if (skipBlurCommitRef.current) {
                skipBlurCommitRef.current = false;
                return;
              }
              if (editingCell) commitEdit();
            }}
            placeholder="=SUM(A1:E1)  =IF(G2>100,G2*0.9,G2)  =D1*E1*(1-F1/100)"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: editingCell && editValue.startsWith("=") ? C.blue : "#1a1a1a" }}
          />
          {editingCell && editValue.startsWith("=") && (
            <span className="text-[10px] flex-shrink-0 animate-pulse" style={{ color: C.green }}>Click cells to insert · Enter to confirm</span>
          )}
        </div>
      )}

      {/* ── Spreadsheet grid ─────────────────────────────────────────── */}
      <div ref={tableRef} className="flex-1 overflow-auto" tabIndex={0} onKeyDown={handleKeyDown}
        onMouseUp={handleDragEnd}
        onMouseLeave={() => { if (isDragging) handleDragEnd(); }}
        style={{ backgroundColor: C.inputBg }}
      >
        <table className="w-full border-collapse min-w-max select-none">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-10 px-1 py-0 text-center text-[10px] font-medium border-b-2 border-r select-none"
                style={{
                  backgroundColor: C.headerBg,
                  borderColor: C.grid,
                  color: C.textMid,
                  borderBottomColor: C.green,
                  borderBottomWidth: "2px",
                }}
              >
                <button onClick={() => { /* select all */ }} className="w-full h-full opacity-0 hover:opacity-50">#</button>
              </th>
              {sheet.columns.map((col) => {
                const isColActive = activeCell?.col === col.key;
                return (
                  <th key={col.key} className="text-left group select-none relative" style={{ width: getWidth(col), minWidth: 40, backgroundColor: isColActive ? (isDark ? "#1A3A5C" : "#E8F0FE") : C.headerBg, borderRight: `1px solid ${C.grid}`, borderBottom: `2px solid ${isColActive ? C.green : C.grid}` }}>
                    <div className="flex items-center gap-1 px-2 py-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: isColActive ? C.green : C.textMid }}>{col.label}</span>
                      <button onClick={() => handleSort(col.key)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                        {sortCol === col.key ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" style={{ color: C.green }} /> : <ArrowDown className="h-3 w-3" style={{ color: C.green }} />) : <ArrowUpDown className="h-3 w-3" style={{ color: C.textDim }} />}
                      </button>
                    </div>
                    {/* Column resize handle */}
                    <div
                      className="absolute top-0 right-0 w-[5px] h-full cursor-col-resize z-20"
                      onMouseDown={(e) => startColResize(e, col.key)}
                      onDoubleClick={() => autoFitCol(col.key)}
                      style={{ background: resizing?.type === "col" && resizing?.index === col.key ? C.green : "transparent" }}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const rowIdx = row._idx;
              const isSelected = selectedRows.has(rowIdx);
              const isRowActive = activeCell?.row === rowIdx;
              const rowH = getRowHeight(rowIdx);
              return (
                <tr key={rowIdx} className={cn("transition-colors", isSelected ? "" : "")}
                  style={{ backgroundColor: isSelected ? C.blueLight : isRowActive ? C.greenLight : "transparent", height: rowH }}
                >
                  {/* Row number cell — Excel style with resize handle */}
                  <td className="px-1 py-0 text-center text-[10px] select-none relative"
                    style={{
                      backgroundColor: isRowActive ? C.greenHeader : C.headerBg,
                      borderRight: `1px solid ${C.grid}`,
                      borderBottom: `1px solid ${C.grid}`,
                      color: isRowActive ? C.green : C.textMid,
                      fontWeight: isRowActive ? 700 : 400,
                    }}
                  >
                    <button onClick={() => { const newSet = new Set(selectedRows); if (newSet.has(rowIdx)) newSet.delete(rowIdx); else newSet.add(rowIdx); setSelectedRows(newSet); }}
                      className="w-6 h-5 flex items-center justify-center text-[10px] hover:opacity-70">
                      {rowIdx + 1}
                    </button>
                    {/* Row resize handle — bottom border of row number */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[4px] cursor-row-resize z-20"
                      onMouseDown={(e) => startRowResize(e, rowIdx)}
                      onDoubleClick={() => autoFitRow(rowIdx)}
                      style={{ background: resizing?.type === "row" && resizing?.index === rowIdx ? C.green : "transparent" }}
                    />
                  </td>
                  {sheet.columns.map((col) => {
                    const cell = row[col.key] as Cell;
                    const isActive = activeCell?.row === rowIdx && activeCell?.col === col.key;
                    const isEditing = editingCell?.row === rowIdx && editingCell?.col === col.key;
                    const isInDrag = isInDragRange(rowIdx, col.key);
                    return (
                      <td
                        key={col.key}
                        className={cn("cursor-cell relative", cellPadding)}
                        style={{
                          borderRight: `1px solid ${C.grid}`,
                          borderBottom: `1px solid ${C.grid}`,
                          backgroundColor: isActive
                            ? C.activeBg
                            : isInDrag
                            ? C.blueLight
                            : cell?.bgColor
                            ? getCellBgColor(cell.bgColor)
                            : "transparent",
                          outline: isActive ? `2px solid ${C.green}` : "none",
                          outlineOffset: "-1px",
                          zIndex: isActive ? 1 : 0,
                          boxShadow: isActive ? `0 0 0 1px ${C.green}33` : "none",
                        }}
                        onMouseDown={(e) => {
                          if (editingCell && editValue.startsWith("=")) {
                            skipBlurCommitRef.current = true;
                            pendingCellInsertRef.current = true;
                          }
                        }}
                        onClick={() => {
                          if (editingCell && editValue.startsWith("=") && (pendingCellInsertRef.current || skipBlurCommitRef.current)) {
                            pendingCellInsertRef.current = false;
                            skipBlurCommitRef.current = false;
                            insertCellRefIntoFormula(rowIdx, col.key);
                            return;
                          }
                          setActiveCell({ row: rowIdx, col: col.key });
                        }}
                        onDoubleClick={() => startEdit(rowIdx, col.key)}
                        onMouseMove={(e) => handleDragMove(e, rowIdx, col.key)}
                      >
                        {isEditing ? (
                          <input ref={inputRef} type="text" value={editValue} onChange={(e) => { setEditValue(e.target.value); setIsFormulaEditing(e.target.value.startsWith("=")); }}
                            onBlur={() => {
                              if (skipBlurCommitRef.current) { skipBlurCommitRef.current = false; return; }
                              commitEdit();
                            }}
                            className="w-full text-sm outline-none px-0.5"
                            style={{ backgroundColor: C.inputBg, color: C.text, border: `2px solid ${C.green}`, borderRadius: "2px" }}
                          />
                        ) : (
                          <span className={cn("text-sm truncate block", cell?.bold && "font-bold")}
                            style={{
                              color: cell?.formula
                                ? C.blue
                                : col.type === "currency" && cell?.value
                                ? "#0B6623"
                                : !cell?.value
                                ? "#B0B0B0"
                                : "#1a1a1a",
                            }}
                          >
                            {cell?.value ? formatCellValue(cell) : ""}
                          </span>
                        )}
                        {/* Drag-fill handle — Excel green square */}
                        {isActive && !isEditing && (
                          <div
                            className="absolute -right-[5px] -bottom-[5px] w-[9px] h-[9px] cursor-crosshair z-10"
                            style={{
                              backgroundColor: C.green,
                              border: `1px solid ${C.green}`,
                              borderRadius: "1px",
                            }}
                            onMouseDown={(e) => handleDragStart(e, rowIdx, col.key)}
                            title="Drag to fill (formulas auto-adjust)"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Add Row button at the bottom */}
            <tr>
              <td colSpan={sheet.columns.length + 1} className="p-0">
                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors hover:bg-emerald-50 border-t"
                  style={{ color: C.green, borderColor: C.grid, backgroundColor: C.headerBg }}
                >
                  <Plus className="h-3 w-3" />
                  Add Row
                </button>
              </td>
            </tr>
            {/* Totals row — Excel style */}
            {Object.keys(columnTotals).length > 0 && (
              <tr style={{ backgroundColor: C.totalsBg, borderTop: `2px solid ${C.green}` }}>
                <td className="px-1 py-1.5 text-center text-[10px] font-bold select-none"
                  style={{ backgroundColor: C.headerBg, borderRight: `1px solid ${C.grid}`, borderBottom: `1px solid ${C.grid}`, color: C.green }}
                >Σ</td>
                {sheet.columns.map((col) => (
                  <td key={col.key} className="px-2 py-1.5" style={{ borderRight: `1px solid ${C.grid}`, borderBottom: `1px solid ${C.grid}` }}>
                    {columnTotals[col.key] !== undefined ? (
                      <span className="text-sm font-bold" style={{ color: C.green }}>{formatCurrency(columnTotals[col.key])}</span>
                    ) : col.key === sheet.columns[0].key ? (
                      <span className="text-xs font-bold" style={{ color: C.textMid }}>TOTALS</span>
                    ) : null}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-2 py-1 border-t text-[10px] flex-shrink-0" style={{ borderColor: C.grid, backgroundColor: C.statusBg, color: C.textMid }}>
        <span className="font-mono rounded px-1.5 py-0.5 font-bold" style={{ backgroundColor: C.inputBg, border: `1px solid ${C.grid}`, color: C.green }}>
          {activeCell ? `${colKeyToLetter(activeCell.col, sheet.columns)}${activeCell.row + 1}` : "Ready"}
        </span>
        {activeCell && sheet.rows[activeCell.row]?.[activeCell.col]?.formula && (
          <span style={{ color: C.blue }}>{sheet.rows[activeCell.row][activeCell.col].formula} → {sheet.rows[activeCell.row][activeCell.col].value}</span>
        )}
        <span>{sheet.rows.length} rows × {sheet.columns.length} cols</span>
        {selectedRows.size > 0 && <span style={{ color: C.green }}>{selectedRows.size} selected</span>}
        <span className="ml-auto hidden sm:inline">Type = then click cells · Drag corner to fill · Enter confirm · Esc cancel</span>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ zIndex: 2147483647, backgroundColor: C.inputBg }}>
        {spreadsheetContent}
      </div>
    );
  }

  return spreadsheetContent;
}
