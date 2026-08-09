"use client";

import React from "react";

// Helper to determine active selection styles in custom radio pills
const getRadioPillStyle = (optionValue: string, active: boolean) => {
  const normalizedValue = optionValue.toLowerCase();
  if (!active) {
    return "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60";
  }
  if (normalizedValue === "yes") {
    return "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black shadow-sm ring-1 ring-emerald-500/20";
  }
  if (normalizedValue === "no") {
    return "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 font-black shadow-sm ring-1 ring-rose-500/20";
  }
  return "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-black shadow-sm ring-1 ring-cyan-500/20";
};

// ── Reusable Form Field Primitives ────────────────────────────────────────────

interface RadioGroupProps {
  label: string;
  name: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  info?: string;
}

export function RadioGroup({ label, name, options, value, onChange, required, info }: RadioGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px]">ⓘ</span>
        )}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-4 py-2 rounded-xl border text-[11px] font-bold transition-all duration-200 ${getRadioPillStyle(opt.value, active)}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  info?: string;
  type?: string;
  disabled?: boolean;
}

export function TextField({ label, value, onChange, placeholder, required, info, type = "text", disabled = false }: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          {label}
          {required && <span className="text-rose-500">*</span>}
          {info && (
            <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px]">ⓘ</span>
          )}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all duration-200 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  info?: string;
  placeholder?: string;
}

export function TextAreaField({ label, value, onChange, rows = 3, info, placeholder }: TextAreaFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
        {label}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px]">ⓘ</span>
        )}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all duration-200 shadow-inner resize-y"
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  info?: string;
}

export function SelectField({ label, value, onChange, options, info }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
        {label}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px]">ⓘ</span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all duration-200 shadow-inner cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  info?: string;
}

export function CheckboxField({ label, checked, onChange, info }: CheckboxFieldProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between w-full p-4 border rounded-xl transition-all duration-200 text-left ${
        checked
          ? "bg-cyan-500/5 border-cyan-500/40 text-cyan-700 dark:text-cyan-400 font-bold shadow-sm"
          : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
      }`}
    >
      <span className="text-xs font-bold flex items-center gap-1.5">
        {label}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px]">ⓘ</span>
        )}
      </span>
      
      {/* Custom toggle switch styling */}
      <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 flex-shrink-0 ${checked ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700"}`}>
        <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
    </button>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white px-5 py-3 rounded-t-2xl text-[11px] font-black uppercase tracking-widest shadow-md">
      {title}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-md hover:shadow-lg transition-shadow duration-300">
      <SectionHeader title={title} />
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}
