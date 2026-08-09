"use client";

import React from "react";
import { 
  RadioGroup, 
  TextField, 
  SelectField, 
  FormSection 
} from "../FormPrimitives";

export interface UtilitiesData {
  // Electric
  elecArrivalStatus: string;
  elecBreakersOff: string;
  elecMeterReading: string;
  elecMeterShared: boolean;
  elecNoMeter: boolean;
  elecMeterSerial: string;
  elecMeterSerialNa: boolean;
  elecWasActivated: string;
  elecWhyNotTransferred: string;
  elecActivationReason: string;
  elecCompanyName: string;
  elecCompanyContact: string;

  // Gas
  gasArrivalStatus: string;
  gasMeterReading: string;
  gasMeterShared: boolean;
  gasNoMeter: boolean;
  gasMeterSerial: string;
  gasMeterSerialNa: boolean;
  gasWasActivated: string;
  gasWhyNotTransferred: string;
  gasActivationReason: string;
  gasCompanyName: string;
  gasCompanyContact: string;

  // Water
  waterArrivalStatus: string;
  waterMeterReading: string;
  waterMeterShared: boolean;
  waterNoMeter: boolean;
  waterMeterSerial: string;
  waterMeterSerialNa: boolean;
  waterWasActivated: string;
  waterWhyNotTransferred: string;
  waterActivationReason: string;
  waterCompanyName: string;
  waterCompanyContact: string;

  // Sump Pump
  sumpRequireSumpPump: string;
  sumpCrockPresent: string;
  sumpCondition: string;
  sumpTransferredToClient: string;
  sumpDehumidifierPresent: string;
  sumpDehumidifierNeeded: string;
}

export const defaultUtilitiesData: UtilitiesData = {
  elecArrivalStatus: "",
  elecBreakersOff: "",
  elecMeterReading: "",
  elecMeterShared: false,
  elecNoMeter: false,
  elecMeterSerial: "",
  elecMeterSerialNa: false,
  elecWasActivated: "",
  elecWhyNotTransferred: "",
  elecActivationReason: "",
  elecCompanyName: "",
  elecCompanyContact: "",

  gasArrivalStatus: "",
  gasMeterReading: "",
  gasMeterShared: false,
  gasNoMeter: false,
  gasMeterSerial: "",
  gasMeterSerialNa: false,
  gasWasActivated: "",
  gasWhyNotTransferred: "",
  gasActivationReason: "",
  gasCompanyName: "",
  gasCompanyContact: "",

  waterArrivalStatus: "",
  waterMeterReading: "",
  waterMeterShared: false,
  waterNoMeter: false,
  waterMeterSerial: "",
  waterMeterSerialNa: false,
  waterWasActivated: "",
  waterWhyNotTransferred: "",
  waterActivationReason: "",
  waterCompanyName: "",
  waterCompanyContact: "",

  sumpRequireSumpPump: "",
  sumpCrockPresent: "",
  sumpCondition: "",
  sumpTransferredToClient: "",
  sumpDehumidifierPresent: "",
  sumpDehumidifierNeeded: "",
};

function CompactCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500/20"
      />
      <span>{label}</span>
    </label>
  );
}

interface Props {
  data: UtilitiesData;
  onChange: (data: UtilitiesData) => void;
}

export function UtilitiesTab({ data, onChange }: Props) {
  const updateField = (field: keyof UtilitiesData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const onOffNaOptions = [
    { label: "On", value: "On" },
    { label: "Off", value: "Off" },
    { label: "N/A", value: "N/A" },
  ];

  const yesNoOptions = [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
  ];

  const activatedOptions = [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
    { label: "Not Required", value: "Not Required" },
    { label: "Not Activated, But Required", value: "Not Activated, But Required" },
  ];

  const activationReasonOptions = [
    { label: "-- Select Reason --", value: "" },
    { label: "Transfer to Client", value: "Transfer to Client" },
    { label: "Transfer to Broker", value: "Transfer to Broker" },
    { label: "Authorized by Client", value: "Authorized by Client" },
    { label: "Seasonal Requirement", value: "Seasonal Requirement" },
    { label: "System testing", value: "System testing" },
    { label: "Other", value: "Other" },
  ];

  const sumpConditionOptions = [
    { label: "-- Select Condition --", value: "" },
    { label: "Working", value: "Working" },
    { label: "Not Working / Damaged", value: "Not Working / Damaged" },
    { label: "Missing", value: "Missing" },
    { label: "No Power / Untested", value: "No Power / Untested" },
    { label: "N/A", value: "N/A" },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      
      {/* ── ELECTRIC PANEL ── */}
      <div className="space-y-6">
        <FormSection title="Electric">
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RadioGroup
                label="Arrival Status:"
                name="elecArrivalStatus"
                options={onOffNaOptions}
                value={data.elecArrivalStatus}
                onChange={(v) => updateField("elecArrivalStatus", v)}
              />
              
              <RadioGroup
                label="Are Breakers Off?"
                name="elecBreakersOff"
                options={yesNoOptions}
                value={data.elecBreakersOff}
                onChange={(v) => updateField("elecBreakersOff", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Meter Reading */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Meter Reading:</label>
                  <div className="flex items-center gap-2">
                    <CompactCheckbox label="Shared" checked={data.elecMeterShared} onChange={(v) => updateField("elecMeterShared", v)} />
                    <CompactCheckbox label="No Meter" checked={data.elecNoMeter} onChange={(v) => updateField("elecNoMeter", v)} />
                  </div>
                </div>
                <TextField
                  label=""
                  value={data.elecMeterReading}
                  onChange={(v) => updateField("elecMeterReading", v)}
                  disabled={data.elecNoMeter}
                  placeholder={data.elecNoMeter ? "N/A - No Meter" : "Enter reading"}
                />
              </div>

              {/* Meter Serial Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Meter Serial Number:</label>
                  <CompactCheckbox label="Not Available" checked={data.elecMeterSerialNa} onChange={(v) => updateField("elecMeterSerialNa", v)} />
                </div>
                <TextField
                  label=""
                  value={data.elecMeterSerial}
                  onChange={(v) => updateField("elecMeterSerial", v)}
                  disabled={data.elecMeterSerialNa}
                  placeholder={data.elecMeterSerialNa ? "Not Available" : "Enter serial number"}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <RadioGroup
                label="Was Utility Activated?"
                name="elecWasActivated"
                options={activatedOptions}
                value={data.elecWasActivated}
                onChange={(v) => updateField("elecWasActivated", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Why Not Transferred?"
                value={data.elecWhyNotTransferred}
                onChange={(v) => updateField("elecWhyNotTransferred", v)}
                placeholder="Explain reason"
              />
              
              <SelectField
                label="Activation Reason:"
                options={activationReasonOptions}
                value={data.elecActivationReason}
                onChange={(v) => updateField("elecActivationReason", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-end">
              <div className="sm:col-span-2">
                <TextField
                  label="Company's Name:"
                  value={data.elecCompanyName}
                  onChange={(v) => updateField("elecCompanyName", v)}
                  placeholder="Utility Company"
                />
              </div>
              <button 
                type="button" 
                className="w-full py-2 px-3 text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/5 transition select-none text-center"
              >
                Change Company
              </button>
            </div>

            <TextField
              label="Company's Contact:"
              value={data.elecCompanyContact}
              onChange={(v) => updateField("elecCompanyContact", v)}
              placeholder="e.g. 555-0199"
            />

          </div>
        </FormSection>

        {/* ── WATER PANEL ── */}
        <FormSection title="Water">
          <div className="space-y-4">
            
            <RadioGroup
              label="Arrival Status:"
              name="waterArrivalStatus"
              options={onOffNaOptions}
              value={data.waterArrivalStatus}
              onChange={(v) => updateField("waterArrivalStatus", v)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Meter Reading */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Meter Reading:</label>
                  <div className="flex items-center gap-2">
                    <CompactCheckbox label="Shared" checked={data.waterMeterShared} onChange={(v) => updateField("waterMeterShared", v)} />
                    <CompactCheckbox label="No Meter" checked={data.waterNoMeter} onChange={(v) => updateField("waterNoMeter", v)} />
                  </div>
                </div>
                <TextField
                  label=""
                  value={data.waterMeterReading}
                  onChange={(v) => updateField("waterMeterReading", v)}
                  disabled={data.waterNoMeter}
                  placeholder={data.waterNoMeter ? "N/A - No Meter" : "Enter reading"}
                />
              </div>

              {/* Meter Serial Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Meter Serial Number:</label>
                  <CompactCheckbox label="Not Available" checked={data.waterMeterSerialNa} onChange={(v) => updateField("waterMeterSerialNa", v)} />
                </div>
                <TextField
                  label=""
                  value={data.waterMeterSerial}
                  onChange={(v) => updateField("waterMeterSerial", v)}
                  disabled={data.waterMeterSerialNa}
                  placeholder={data.waterMeterSerialNa ? "Not Available" : "Enter serial number"}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <RadioGroup
                label="Was Utility Activated?"
                name="waterWasActivated"
                options={activatedOptions}
                value={data.waterWasActivated}
                onChange={(v) => updateField("waterWasActivated", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Why Not Transferred?"
                value={data.waterWhyNotTransferred}
                onChange={(v) => updateField("waterWhyNotTransferred", v)}
                placeholder="Explain reason"
              />
              
              <SelectField
                label="Activation Reason:"
                options={activationReasonOptions}
                value={data.waterActivationReason}
                onChange={(v) => updateField("waterActivationReason", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-end">
              <div className="sm:col-span-2">
                <TextField
                  label="Company's Name:"
                  value={data.waterCompanyName}
                  onChange={(v) => updateField("waterCompanyName", v)}
                  placeholder="Utility Company"
                />
              </div>
              <button 
                type="button" 
                className="w-full py-2 px-3 text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/5 transition select-none text-center"
              >
                Change Company
              </button>
            </div>

            <TextField
              label="Company's Contact:"
              value={data.waterCompanyContact}
              onChange={(v) => updateField("waterCompanyContact", v)}
              placeholder="e.g. 555-0199"
            />

          </div>
        </FormSection>
      </div>

      {/* ── RIGHT COLUMN: GAS AND SUMP PUMP ── */}
      <div className="space-y-6">
        
        {/* ── GAS PANEL ── */}
        <FormSection title="Gas">
          <div className="space-y-4">
            
            <RadioGroup
              label="Arrival Status:"
              name="gasArrivalStatus"
              options={onOffNaOptions}
              value={data.gasArrivalStatus}
              onChange={(v) => updateField("gasArrivalStatus", v)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Meter Reading */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Meter Reading:</label>
                  <div className="flex items-center gap-2">
                    <CompactCheckbox label="Shared" checked={data.gasMeterShared} onChange={(v) => updateField("gasMeterShared", v)} />
                    <CompactCheckbox label="No Meter" checked={data.gasNoMeter} onChange={(v) => updateField("gasNoMeter", v)} />
                  </div>
                </div>
                <TextField
                  label=""
                  value={data.gasMeterReading}
                  onChange={(v) => updateField("gasMeterReading", v)}
                  disabled={data.gasNoMeter}
                  placeholder={data.gasNoMeter ? "N/A - No Meter" : "Enter reading"}
                />
              </div>

              {/* Meter Serial Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Meter Serial Number:</label>
                  <CompactCheckbox label="Not Available" checked={data.gasMeterSerialNa} onChange={(v) => updateField("gasMeterSerialNa", v)} />
                </div>
                <TextField
                  label=""
                  value={data.gasMeterSerial}
                  onChange={(v) => updateField("gasMeterSerial", v)}
                  disabled={data.gasMeterSerialNa}
                  placeholder={data.gasMeterSerialNa ? "Not Available" : "Enter serial number"}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <RadioGroup
                label="Was Utility Activated?"
                name="gasWasActivated"
                options={activatedOptions}
                value={data.gasWasActivated}
                onChange={(v) => updateField("gasWasActivated", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Why Not Transferred?"
                value={data.gasWhyNotTransferred}
                onChange={(v) => updateField("gasWhyNotTransferred", v)}
                placeholder="Explain reason"
              />
              
              <SelectField
                label="Activation Reason:"
                options={activationReasonOptions}
                value={data.gasActivationReason}
                onChange={(v) => updateField("gasActivationReason", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-end">
              <div className="sm:col-span-2">
                <TextField
                  label="Company's Name:"
                  value={data.gasCompanyName}
                  onChange={(v) => updateField("gasCompanyName", v)}
                  placeholder="Utility Company"
                />
              </div>
              <button 
                type="button" 
                className="w-full py-2 px-3 text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/5 transition select-none text-center"
              >
                Change Company
              </button>
            </div>

            <TextField
              label="Company's Contact:"
              value={data.gasCompanyContact}
              onChange={(v) => updateField("gasCompanyContact", v)}
              placeholder="e.g. 555-0199"
            />

          </div>
        </FormSection>

        {/* ── SUMP PUMP PANEL ── */}
        <FormSection title="Sump Pump">
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RadioGroup
                label="Does Property Require a Sump Pump?"
                name="sumpRequireSumpPump"
                options={yesNoOptions}
                value={data.sumpRequireSumpPump}
                onChange={(v) => updateField("sumpRequireSumpPump", v)}
              />

              <RadioGroup
                label="Is Sump Pump Crock Visible/Present?"
                name="sumpCrockPresent"
                options={yesNoOptions}
                value={data.sumpCrockPresent}
                onChange={(v) => updateField("sumpCrockPresent", v)}
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <SelectField
                label="Please Provide the Condition of the Sump Pump:"
                options={sumpConditionOptions}
                value={data.sumpCondition}
                onChange={(v) => updateField("sumpCondition", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <RadioGroup
                label="Utilities Transferred to Client's Name?"
                name="sumpTransferredToClient"
                options={yesNoOptions}
                value={data.sumpTransferredToClient}
                onChange={(v) => updateField("sumpTransferredToClient", v)}
              />

              <RadioGroup
                label="Is There a Dehumidifier Present?"
                name="sumpDehumidifierPresent"
                options={yesNoOptions}
                value={data.sumpDehumidifierPresent}
                onChange={(v) => updateField("sumpDehumidifierPresent", v)}
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <RadioGroup
                label="Is a Dehumidifier Needed?"
                name="sumpDehumidifierNeeded"
                options={yesNoOptions}
                value={data.sumpDehumidifierNeeded}
                onChange={(v) => updateField("sumpDehumidifierNeeded", v)}
              />
            </div>

          </div>
        </FormSection>

      </div>
    </div>
  );
}
