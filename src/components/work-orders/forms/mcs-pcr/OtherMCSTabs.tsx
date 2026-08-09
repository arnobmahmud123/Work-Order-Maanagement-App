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

// ── Completion Info Tab ──
export function CompletionInfoTab() {
  const yesNoOptions = [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
  ];
  return (
    <div className="space-y-6 max-w-3xl">
      <FormSection title="Completion Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Actual Completion Date:" type="date" value="" onChange={() => {}} />
          <TextField label="Completed By (Crew Lead):" placeholder="Crew Name / ID" value="" onChange={() => {}} />
          <TextField label="Crew Size:" type="number" placeholder="1" value="" onChange={() => {}} />
          <TextField label="Hours spent on site:" placeholder="e.g. 3.5" value="" onChange={() => {}} />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-4">
          <RadioGroup 
            label="Was all requested work completed?" 
            name="allWorkCompleted"
            options={yesNoOptions} 
            value="Yes" 
            onChange={() => {}} 
          />
        </div>
        <div className="pt-2">
          <TextAreaField 
            label="General Crew / Completion Notes:" 
            placeholder="Describe overall work performed, delays, or on-site conditions..." 
            value="" 
            onChange={() => {}} 
          />
        </div>
      </FormSection>
    </div>
  );
}

// ── Occupancy Tab ──
export function OccupancyTab() {
  const occupancyOptions = [
    { label: "Vacant", value: "Vacant" },
    { label: "Occupied", value: "Occupied" },
    { label: "Co-Occupied", value: "Co-Occupied" },
    { label: "Unknown / Unable to Verify", value: "Unknown" },
  ];

  const verificationOptions = [
    { label: "Visual Inspection", value: "Visual" },
    { label: "Contact with Neighbor", value: "Neighbor" },
    { label: "Contact with Tenant/Owner", value: "Contact" },
    { label: "Direct Observation", value: "Direct" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <FormSection title="Occupancy Verification">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField 
            label="Occupancy Status:" 
            options={occupancyOptions} 
            value="Vacant" 
            onChange={() => {}} 
          />
          <SelectField 
            label="Verified By:" 
            options={verificationOptions} 
            value="Visual" 
            onChange={() => {}} 
          />
          <TextField label="Date Checked:" type="date" value="" onChange={() => {}} />
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">Occupancy Indicators Found:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxField label="Active Utilities (Lights/Meter running)" checked={false} onChange={() => {}} />
            <CheckboxField label="Accumulated Mail/Circulars" checked={true} onChange={() => {}} />
            <CheckboxField label="Lawn Maintained/Overgrown" checked={false} onChange={() => {}} />
            <CheckboxField label="Personal Items visible inside" checked={false} onChange={() => {}} />
            <CheckboxField label="Neighbors confirm occupancy" checked={false} onChange={() => {}} />
            <CheckboxField label="Trash/Garbage cans out" checked={false} onChange={() => {}} />
          </div>
        </div>
      </FormSection>
    </div>
  );
}

// ── Utilities Tab ──
export function UtilitiesTab() {
  const statusOptions = [
    { label: "On", value: "On" },
    { label: "Off", value: "Off" },
    { label: "Disconnected / Meter Removed", value: "Disconnected" },
    { label: "Unable to Determine", value: "Unknown" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <FormSection title="Utility Status Check">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField label="Water Service:" options={statusOptions} value="Off" onChange={() => {}} />
          <SelectField label="Electric Service:" options={statusOptions} value="Off" onChange={() => {}} />
          <SelectField label="Gas Service:" options={statusOptions} value="Off" onChange={() => {}} />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Water Meter Reading (if visible):" placeholder="Reading" value="" onChange={() => {}} />
            <TextField label="Electric Meter Serial #:" placeholder="Serial Number" value="" onChange={() => {}} />
          </div>
        </div>
      </FormSection>
    </div>
  );
}

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

// ── Dump & Storage Tab ──
export function DumpStorageTab() {
  const yesNoOptions = [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
  ];
  return (
    <div className="space-y-6 max-w-3xl">
      <FormSection title="Debris & Storage Management">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RadioGroup 
            label="Is interior debris present?" 
            name="intDebris"
            options={yesNoOptions} 
            value="No" 
            onChange={() => {}} 
          />
          <RadioGroup 
            label="Is exterior debris present?" 
            name="extDebris"
            options={yesNoOptions} 
            value="No" 
            onChange={() => {}} 
          />
          <TextField label="Estimated Debris Volume (Cubic Yards):" placeholder="e.g. 10 CY" value="" onChange={() => {}} />
          <TextField label="Hazards/Chemicals present?" placeholder="Describe any paints, tires, etc." value="" onChange={() => {}} />
        </div>
      </FormSection>
    </div>
  );
}

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
