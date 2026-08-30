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

export interface WinterizationData {
  winterizationStatus: string;
  winterizedDate: string;
  heatingType: string;
  pressureTestPSI: string;
  antifreezeToilets: boolean;
  antifreezeTrapsSinks: boolean;
  waterLinesBlown: boolean;
  waterHeaterDrained: boolean;
}

export const defaultWinterizationData: WinterizationData = {
  winterizationStatus: "Winterized",
  winterizedDate: "",
  heatingType: "",
  pressureTestPSI: "",
  antifreezeToilets: true,
  antifreezeTrapsSinks: true,
  waterLinesBlown: true,
  waterHeaterDrained: true,
};

interface WinterizationTabProps {
  data?: WinterizationData;
  onChange?: (data: WinterizationData) => void;
}

export function WinterizationTab({ data = defaultWinterizationData, onChange }: WinterizationTabProps) {
  const currentData = { ...defaultWinterizationData, ...(data || {}) };

  const set = (key: keyof WinterizationData) => (val: string | boolean) => {
    if (onChange) {
      onChange({ ...currentData, [key]: val });
    }
  };

  const statusOptions = [
    { label: "Winterized", value: "Winterized" },
    { label: "Not Winterized", value: "Not" },
    { label: "Partially Winterized", value: "Partial" },
    { label: "N/A - Property Exempt", value: "Exempt" },
  ];

  const heatTypeOptions = [
    { label: "-- Select Heat Type --", value: "" },
    { label: "Gas Forced Air", value: "Gas Forced Air" },
    { label: "Electric Forced Air", value: "Electric Forced Air" },
    { label: "Hot Water Boiler", value: "Hot Water Boiler" },
    { label: "Electric Baseboard", value: "Electric Baseboard" },
    { label: "Heat Pump", value: "Heat Pump" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <FormSection title="Winterization / System Checklist">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Winterization Status:"
            options={statusOptions}
            value={currentData.winterizationStatus}
            onChange={set("winterizationStatus")}
          />
          <TextField
            label="Winterized Date:"
            type="date"
            value={currentData.winterizedDate}
            onChange={set("winterizedDate")}
          />
          <SelectField
            label="Heating Type:"
            options={heatTypeOptions}
            value={currentData.heatingType}
            onChange={set("heatingType")}
          />
          <TextField
            label="Pressure Test PSI:"
            placeholder="e.g. 35 lbs"
            value={currentData.pressureTestPSI}
            onChange={set("pressureTestPSI")}
          />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">Anti-Freeze checklist:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxField
              label="Antifreeze added to toilets"
              checked={currentData.antifreezeToilets}
              onChange={set("antifreezeToilets")}
            />
            <CheckboxField
              label="Antifreeze added to traps/sinks"
              checked={currentData.antifreezeTrapsSinks}
              onChange={set("antifreezeTrapsSinks")}
            />
            <CheckboxField
              label="Water lines blown with air"
              checked={currentData.waterLinesBlown}
              onChange={set("waterLinesBlown")}
            />
            <CheckboxField
              label="Hot water heater drained"
              checked={currentData.waterHeaterDrained}
              onChange={set("waterHeaterDrained")}
            />
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
