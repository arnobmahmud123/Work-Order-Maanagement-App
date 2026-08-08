"use client";

import React from "react";

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
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 text-[10px]">ⓘ</span>
        )}
      </label>
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="w-3.5 h-3.5 accent-cyan-600"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-cyan-600 transition-colors">
              {opt.label}
            </span>
          </label>
        ))}
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
}

export function TextField({ label, value, onChange, placeholder, required, info, type = "text" }: TextFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 text-[10px]">ⓘ</span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-400 outline-none transition"
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
}

export function TextAreaField({ label, value, onChange, rows = 3, info }: TextAreaFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
        {label}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 text-[10px]">ⓘ</span>
        )}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-400 outline-none transition resize-y"
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
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
        {label}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 text-[10px]">ⓘ</span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-400 outline-none transition"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
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
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-cyan-600 rounded"
      />
      <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-cyan-600 transition-colors flex items-center gap-1">
        {label}
        {info && (
          <span title={info} className="cursor-help text-slate-400 hover:text-slate-600 text-[10px]">ⓘ</span>
        )}
      </span>
    </label>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-slate-700 dark:bg-slate-800 text-white px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wide -mx-0">
      {title}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <SectionHeader title={title} />
      <div className="p-4 bg-white dark:bg-slate-900 space-y-4">
        {children}
      </div>
    </div>
  );
}
