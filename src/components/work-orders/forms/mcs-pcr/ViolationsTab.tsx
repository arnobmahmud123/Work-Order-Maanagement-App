"use client";

import React, { useState } from "react";
import { FormSection } from "../FormPrimitives";
import { AlertCircle, Trash2 } from "lucide-react";

export interface ViolationItem {
  violationDate: string;
  discoveredDate: string;
  remediationDate: string;
  receivedDate: string;
  violationType: string;
  violationAmount: string;
  officerName: string;
  contactNumber: string;
  complaintNumber: string;
  hearingScheduled: string; // "Yes", "No", ""
  hearingDate: string;
  caseNumber: string;
  description: string;
  correctiveAction: string;
}

export interface ViolationsData {
  violationsList: ViolationItem[];
}

export const defaultViolationsData: ViolationsData = {
  violationsList: [],
};

interface ViolationsTabProps {
  data: ViolationsData;
  onChange: (data: ViolationsData) => void;
  enabled: boolean;
}

export function ViolationsTab({ data, onChange, enabled }: ViolationsTabProps) {
  const currentData = data || defaultViolationsData;
  const list = currentData.violationsList || [];

  // Form local state for creating a new violation item
  const [form, setForm] = useState<ViolationItem>({
    violationDate: "",
    discoveredDate: "",
    remediationDate: "1944-01-01",
    receivedDate: "",
    violationType: "",
    violationAmount: "",
    officerName: "",
    contactNumber: "",
    complaintNumber: "",
    hearingScheduled: "",
    hearingDate: "",
    caseNumber: "",
    description: "",
    correctiveAction: "",
  });

  const updateFormField = (field: keyof ViolationItem, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddViolation = () => {
    // Append to list
    onChange({
      ...currentData,
      violationsList: [...list, form],
    });
    // Reset form fields (keeping default dates where appropriate)
    setForm({
      violationDate: "",
      discoveredDate: "",
      remediationDate: "1944-01-01",
      receivedDate: "",
      violationType: "",
      violationAmount: "",
      officerName: "",
      contactNumber: "",
      complaintNumber: "",
      hearingScheduled: "",
      hearingDate: "",
      caseNumber: "",
      description: "",
      correctiveAction: "",
    });
  };

  const handleRemoveViolation = (idx: number) => {
    onChange({
      ...currentData,
      violationsList: list.filter((_, i) => i !== idx),
    });
  };

  const violationTypeOptions = [
    { label: "-- Select Type --", value: "" },
    { label: "Abandoned Vehicle", value: "Abandoned Vehicle" },
    { label: "Boarding", value: "Boarding" },
    { label: "Cleaning", value: "Cleaning" },
    { label: "Condemned", value: "Condemned" },
    { label: "Debris", value: "Debris" },
    { label: "Deck/Porch", value: "Deck/Porch" },
    { label: "Demo/Condemnation", value: "Demo/Condemnation" },
    { label: "Demolished", value: "Demolished" },
    { label: "Do Not Enter Notice", value: "Do Not Enter Notice" },
    { label: "Do Not Occupy Notice", value: "Do Not Occupy Notice" },
    { label: "Electric", value: "Electric" },
    { label: "Exterior Debris Notice", value: "Exterior Debris Notice" },
    { label: "Fence Repair", value: "Fence Repair" },
    { label: "Grass", value: "Grass" },
    { label: "Gutters/Downspouts", value: "Gutters/Downspouts" },
    { label: "Health Notice", value: "Health Notice" },
    { label: "Hearing", value: "Hearing" },
    { label: "HVAC", value: "HVAC" },
    { label: "Interior Debris Notice", value: "Interior Debris Notice" },
    { label: "Landscaping", value: "Landscaping" },
    { label: "Lead Based Paint", value: "Lead Based Paint" },
    { label: "Lien", value: "Lien" },
    { label: "Lien Release", value: "Lien Release" },
    { label: "Meth Lab Notice", value: "Meth Lab Notice" },
    { label: "Minimal Maintenance", value: "Minimal Maintenance" },
    { label: "Mold", value: "Mold" },
    { label: "No Trespassing Notice", value: "No Trespassing Notice" },
    { label: "Notice of Demolition", value: "Notice of Demolition" },
    { label: "Nuisance", value: "Nuisance" },
    { label: "Other", value: "Other" },
  ];

  if (!enabled) {
    return (
      <div className="py-8 text-center bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 max-w-3xl">
        <p className="text-xs font-bold text-slate-500">
          Violations tab is disabled because no violations were indicated. It only becomes enabled when "IS THERE A VIOLATION?" is checked "Yes" under the Property Info tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <FormSection title="Violations Reporting">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Dates & Type */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Violation Date:
                {!form.violationDate && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="date"
                value={form.violationDate}
                onChange={(e) => updateFormField("violationDate", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Discovered Date:
                {!form.discoveredDate && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="date"
                value={form.discoveredDate}
                onChange={(e) => updateFormField("discoveredDate", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Remediation Date:</label>
              <input
                type="date"
                value={form.remediationDate}
                onChange={(e) => updateFormField("remediationDate", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Received Date:
                {!form.receivedDate && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="date"
                value={form.receivedDate}
                onChange={(e) => updateFormField("receivedDate", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Violation Type:
                {!form.violationType && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <select
                value={form.violationType}
                onChange={(e) => updateFormField("violationType", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {violationTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Violation Amount:</label>
              <input
                type="text"
                placeholder="e.g. $250.00"
                value={form.violationAmount}
                onChange={(e) => updateFormField("violationAmount", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Column 2: Officer & Hearing */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Officer's Name:
                {!form.officerName && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="text"
                placeholder="Officer Name"
                value={form.officerName}
                onChange={(e) => updateFormField("officerName", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Contact Number:</label>
              <input
                type="text"
                placeholder="(___) ___-____"
                value={form.contactNumber}
                onChange={(e) => updateFormField("contactNumber", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Violation Complaint Number:</label>
              <input
                type="text"
                placeholder="Complaint #"
                value={form.complaintNumber}
                onChange={(e) => updateFormField("complaintNumber", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                Is a hearing scheduled?
                {!form.hearingScheduled && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="hearingScheduled"
                    checked={form.hearingScheduled === "Yes"}
                    onChange={() => updateFormField("hearingScheduled", "Yes")}
                    className="text-cyan-500 focus:ring-cyan-500"
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="hearingScheduled"
                    checked={form.hearingScheduled === "No"}
                    onChange={() => updateFormField("hearingScheduled", "No")}
                    className="text-cyan-500 focus:ring-cyan-500"
                  />
                  No
                </label>
              </div>
            </div>

            {form.hearingScheduled === "Yes" && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Hearing Date:</label>
                <input
                  type="date"
                  value={form.hearingDate}
                  onChange={(e) => updateFormField("hearingDate", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Violation Case Number:</label>
              <input
                type="text"
                placeholder="Case #"
                value={form.caseNumber}
                onChange={(e) => updateFormField("caseNumber", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Column 3: Textareas & Action */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Violation Description:
                {!form.description && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <textarea
                value={form.description}
                placeholder="Enter description..."
                rows={3}
                onChange={(e) => updateFormField("description", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[64px]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Action Required To Correct Violation:
                {!form.correctiveAction && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <textarea
                value={form.correctiveAction}
                placeholder="Describe corrective actions required..."
                rows={3}
                onChange={(e) => updateFormField("correctiveAction", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[64px]"
              />
            </div>

            <div className="pt-2 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
              >
                Violation Photos
              </button>
              <button
                type="button"
                onClick={handleAddViolation}
                disabled={!form.violationDate || !form.discoveredDate || !form.receivedDate || !form.violationType || !form.officerName || !form.hearingScheduled || !form.description || !form.correctiveAction}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Violation
              </button>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Table of Violations */}
      {list.length > 0 && (
        <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-md">
          <div className="bg-slate-100 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Violations Listed</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 border-b border-slate-200 dark:border-slate-850 font-black uppercase text-[10px] tracking-wider select-none">
                  <th className="py-3 px-4">Violation Type</th>
                  <th className="py-3 px-4">Case #</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Violation Dt</th>
                  <th className="py-3 px-4">Discovered Dt</th>
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4">Contact #</th>
                  <th className="py-3 px-4">Hearing Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Corrective Action</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
                {list.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{v.violationType}</td>
                    <td className="py-3 px-4 font-mono">{v.caseNumber || "—"}</td>
                    <td className="py-3 px-4">{v.violationAmount || "—"}</td>
                    <td className="py-3 px-4">{v.violationDate}</td>
                    <td className="py-3 px-4">{v.discoveredDate}</td>
                    <td className="py-3 px-4">{v.officerName}</td>
                    <td className="py-3 px-4">{v.contactNumber || "—"}</td>
                    <td className="py-3 px-4">{v.hearingScheduled === "Yes" ? v.hearingDate : "No"}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate" title={v.description}>{v.description}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate" title={v.correctiveAction}>{v.correctiveAction}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveViolation(i)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
