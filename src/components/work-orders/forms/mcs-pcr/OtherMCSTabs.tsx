"use client";

import React from "react";
import { 
  RadioGroup, 
  TextField, 
  SelectField, 
  CheckboxField, 
  TextAreaField,
  FormSection 
} from "../FormPrimitives";

// Completion Info Tab is now imported from its own dedicated file CompletionInfoTab.tsx

// Occupancy Tab is now imported from its own dedicated file OccupancyTab.tsx



// ── Winterization Tab ──
export function WinterizationTab() {
  const statusOptions = [
    { label: "Winterized", value: "Winterized" },
    { label: "Not Winterized", value: "Not" },
    { label: "Partially Winterized", value: "Partial" },
    { label: "N/A - Property Exempt", value: "Exempt" },
  ];

  const heatTypeOptions = [
    { label: "-- Select Heat Type --", value: "" },
    { label: "Gas Forced Air", value: "Gas Forced" },
    { label: "Electric Forced Air", value: "Electric Forced" },
    { label: "Hot Water Boiler", value: "Boiler" },
    { label: "Electric Baseboard", value: "Baseboard" },
    { label: "Heat Pump", value: "Heat Pump" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <FormSection title="Winterization / System Checklist">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Winterization Status:" options={statusOptions} value="Winterized" onChange={() => {}} />
          <TextField label="Winterized Date:" type="date" value="" onChange={() => {}} />
          <SelectField label="Heating Type:" options={heatTypeOptions} value="" onChange={() => {}} />
          <TextField label="Pressure Test PSI:" placeholder="e.g. 35 lbs" value="" onChange={() => {}} />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">Anti-Freeze checklist:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxField label="Antifreeze added to toilets" checked={true} onChange={() => {}} />
            <CheckboxField label="Antifreeze added to traps/sinks" checked={true} onChange={() => {}} />
            <CheckboxField label="Water lines blown with air" checked={true} onChange={() => {}} />
            <CheckboxField label="Hot water heater drained" checked={true} onChange={() => {}} />
          </div>
        </div>
      </FormSection>
    </div>
  );
}

// Dump & Storage Tab is now imported from its own dedicated file DumpStorageTab.tsx

// ── Generic Checklist Tab ──
export function GenericChecklistTab({ title }: { title: string }) {
  return (
    <div className="space-y-6 max-w-3xl">
      <FormSection title={title}>
        <p className="text-xs text-slate-500">
          This is a checklist section for <span className="font-bold text-cyan-600">{title}</span>. Complete and verify all inspection standards.
        </p>
        
        <div className="space-y-3 pt-2">
          <CheckboxField label="Photo documentation uploaded for this step" checked={true} onChange={() => {}} />
          <CheckboxField label="Inspection findings confirmed with area supervisor" checked={false} onChange={() => {}} />
          <CheckboxField label="Compliance guidelines validated for client portfolio" checked={true} onChange={() => {}} />
        </div>

        <div className="pt-4">
          <TextAreaField 
            label="Section Notes / Comments:" 
            placeholder={`Additional observations regarding ${title}...`} 
            value="" 
            onChange={() => {}} 
          />
        </div>
      </FormSection>
    </div>
  );
}
