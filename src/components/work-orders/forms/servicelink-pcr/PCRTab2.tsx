"use client";

import React from "react";
import {
  RadioGroup,
  TextField,
  TextAreaField,
  CheckboxField,
  FormSection,
} from "../FormPrimitives";

export interface PCR2Data {
  // Electric
  electricActive: string;
  electricVerifiedBy: string;
  electricOtherExplain: string;
  electricCompany: string;
  electricMeterReading: string;
  electricSerialNum: string;
  electricMeterNum: string;
  electricPhone: string;
  electricRep: string;
  electricAreaReq: string;
  electricMeterLoc: string;
  electricComments: string;

  // Gas
  gasActive: string;
  gasVerifiedBy: string;
  gasOtherExplain: string;
  gasCompany: string;
  gasMeterReading: string;
  gasSerialNum: string;
  gasMeterNum: string;
  gasPhone: string;
  gasRep: string;
  gasAreaReq: string;
  gasMeterLoc: string;
  gasComments: string;

  // Water
  waterActive: string;
  waterVerifiedBy: string;
  waterOtherExplain: string;
  waterCompany: string;
  waterMeterReading: string;
  waterSerialNum: string;
  waterMeterNum: string;
  waterPhone: string;
  waterRep: string;
  waterAreaReq: string;
  waterMeterLoc: string;
  waterComments: string;

  // Interior Damage
  intDamageEst: string;
  intDamageComment: string;
  intDamageTypes: string[]; // checklist values

  // Exterior Damage
  extDamageEst: string;
  extDamageComment: string;
  extDamageTypes: string[];

  // Violations
  violationsExist: string;
  violationAgency: string;
  violationAgent: string;
  violationPhone: string;
  violationDate: string;
  violationType: string;
  violationComments: string;
}

export const defaultPCR2Data: PCR2Data = {
  electricActive: "",
  electricVerifiedBy: "",
  electricOtherExplain: "",
  electricCompany: "",
  electricMeterReading: "",
  electricSerialNum: "",
  electricMeterNum: "",
  electricPhone: "",
  electricRep: "",
  electricAreaReq: "",
  electricMeterLoc: "",
  electricComments: "",
  gasActive: "",
  gasVerifiedBy: "",
  gasOtherExplain: "",
  gasCompany: "",
  gasMeterReading: "",
  gasSerialNum: "",
  gasMeterNum: "",
  gasPhone: "",
  gasRep: "",
  gasAreaReq: "",
  gasMeterLoc: "",
  gasComments: "",
  waterActive: "",
  waterVerifiedBy: "",
  waterOtherExplain: "",
  waterCompany: "",
  waterMeterReading: "",
  waterSerialNum: "",
  waterMeterNum: "",
  waterPhone: "",
  waterRep: "",
  waterAreaReq: "",
  waterMeterLoc: "",
  waterComments: "",
  intDamageEst: "",
  intDamageComment: "",
  intDamageTypes: [],
  extDamageEst: "",
  extDamageComment: "",
  extDamageTypes: [],
  violationsExist: "",
  violationAgency: "",
  violationAgent: "",
  violationPhone: "",
  violationDate: "",
  violationType: "",
  violationComments: "",
};

interface Props {
  data: PCR2Data;
  onChange: (data: PCR2Data) => void;
}

export function PCRTab2({ data, onChange }: Props) {
  const set = (key: keyof PCR2Data) => (value: any) =>
    onChange({ ...data, [key]: value });

  const activeOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
    { label: "Unknown", value: "unknown" },
  ];

  const verifyOptions = [
    { label: "Meter", value: "meter" },
    { label: "Utility Company", value: "company" },
    { label: "Other", value: "other" },
    { label: "Tested", value: "tested" },
  ];

  const yesNoOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ];

  const damageCheckboxList = [
    "Roof Leak", "Freeze", "Flood", "Fire", "Wind", "Hurricane",
    "Earthquake", "Vandalism", "Boiler Explosion", "Environmental Hazard",
    "Plumbing Theft", "Sewer Back Up"
  ];

  const toggleDamageType = (type: string, isInt: boolean) => {
    const list = isInt ? data.intDamageTypes : data.extDamageTypes;
    const newList = list.includes(type)
      ? list.filter((t) => t !== type)
      : [...list, type];
    set(isInt ? "intDamageTypes" : "extDamageTypes")(newList);
  };

  return (
    <div className="space-y-5">
      {/* ── Utility Information ─────────────────────────────────────────── */}
      <FormSection title="Utility Information">
        {/* Electric Sub-Section */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1">Electricity</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RadioGroup label="Electricity Active?" name="elActive" options={activeOptions} value={data.electricActive} onChange={set("electricActive")} />
            <RadioGroup label="Verified By:" name="elVerify" options={verifyOptions} value={data.electricVerifiedBy} onChange={set("electricVerifiedBy")} />
            <TextField label="If Other, Explain:" value={data.electricOtherExplain} onChange={set("electricOtherExplain")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField label="Utility Company Name" value={data.electricCompany} onChange={set("electricCompany")} />
            <TextField label="Meter Reading" value={data.electricMeterReading} onChange={set("electricMeterReading")} />
            <TextField label="Serial Number" value={data.electricSerialNum} onChange={set("electricSerialNum")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField label="Meter Number" value={data.electricMeterNum} onChange={set("electricMeterNum")} />
            <TextField label="Phone Number" value={data.electricPhone} onChange={set("electricPhone")} />
            <TextField label="Representative" value={data.electricRep} onChange={set("electricRep")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RadioGroup label="Is Lock/Area Req's Removed?" name="elAreaReq" options={yesNoOptions} value={data.electricAreaReq} onChange={set("electricAreaReq")} />
            <TextField label="If Unknown, Explain Location" value={data.electricMeterLoc} onChange={set("electricMeterLoc")} />
          </div>
          <TextAreaField label="Comments" value={data.electricComments} onChange={set("electricComments")} />
        </div>

        {/* Gas Sub-Section */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50 mt-4">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1">Gas</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RadioGroup label="Gas Active?" name="gasActive" options={activeOptions} value={data.gasActive} onChange={set("gasActive")} />
            <RadioGroup label="Verified By:" name="gasVerify" options={verifyOptions} value={data.gasVerifiedBy} onChange={set("gasVerifiedBy")} />
            <TextField label="If Other, Explain:" value={data.gasOtherExplain} onChange={set("gasOtherExplain")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField label="Utility Company Name" value={data.gasCompany} onChange={set("gasCompany")} />
            <TextField label="Meter Reading" value={data.gasMeterReading} onChange={set("gasMeterReading")} />
            <TextField label="Serial Number" value={data.gasSerialNum} onChange={set("gasSerialNum")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField label="Meter Number" value={data.gasMeterNum} onChange={set("gasMeterNum")} />
            <TextField label="Phone Number" value={data.gasPhone} onChange={set("gasPhone")} />
            <TextField label="Representative" value={data.gasRep} onChange={set("gasRep")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RadioGroup label="Is Lock/Area Req's Removed?" name="gasAreaReq" options={yesNoOptions} value={data.gasAreaReq} onChange={set("gasAreaReq")} />
            <TextField label="If Unknown, Explain Location" value={data.gasMeterLoc} onChange={set("gasMeterLoc")} />
          </div>
          <TextAreaField label="Comments" value={data.gasComments} onChange={set("gasComments")} />
        </div>

        {/* Water Sub-Section */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50 mt-4">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1">Water</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RadioGroup label="Water Active?" name="watActive" options={activeOptions} value={data.waterActive} onChange={set("waterActive")} />
            <RadioGroup label="Verified By:" name="watVerify" options={verifyOptions} value={data.waterVerifiedBy} onChange={set("waterVerifiedBy")} />
            <TextField label="If Other, Explain:" value={data.waterOtherExplain} onChange={set("waterOtherExplain")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField label="Utility Company Name" value={data.waterCompany} onChange={set("waterCompany")} />
            <TextField label="Meter Reading" value={data.waterMeterReading} onChange={set("waterMeterReading")} />
            <TextField label="Serial Number" value={data.waterSerialNum} onChange={set("waterSerialNum")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField label="Meter Number" value={data.waterMeterNum} onChange={set("waterMeterNum")} />
            <TextField label="Phone Number" value={data.waterPhone} onChange={set("waterPhone")} />
            <TextField label="Representative" value={data.waterRep} onChange={set("waterRep")} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RadioGroup label="Is Lock/Area Req's Removed?" name="watAreaReq" options={yesNoOptions} value={data.waterAreaReq} onChange={set("waterAreaReq")} />
            <TextField label="If Unknown, Explain Location" value={data.waterMeterLoc} onChange={set("waterMeterLoc")} />
          </div>
          <TextAreaField label="Comments" value={data.waterComments} onChange={set("waterComments")} />
        </div>
      </FormSection>

      {/* ── Interior Damage Information ─────────────────────────────────── */}
      <FormSection title="Interior Damage Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Total Estimate of Damages" value={data.intDamageEst} onChange={set("intDamageEst")} placeholder="$0.00" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Location of Interior Damage (Select all that apply):
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {damageCheckboxList.map((type) => (
              <CheckboxField
                key={type}
                label={type}
                checked={data.intDamageTypes.includes(type)}
                onChange={() => toggleDamageType(type, true)}
              />
            ))}
          </div>
        </div>
        <TextAreaField label="Damage Comments" value={data.intDamageComment} onChange={set("intDamageComment")} />
      </FormSection>

      {/* ── Exterior Damage Information ─────────────────────────────────── */}
      <FormSection title="Exterior Damage Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Total Estimate of Damages" value={data.extDamageEst} onChange={set("extDamageEst")} placeholder="$0.00" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Location of Exterior Damage (Select all that apply):
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {damageCheckboxList.map((type) => (
              <CheckboxField
                key={type}
                label={type}
                checked={data.extDamageTypes.includes(type)}
                onChange={() => toggleDamageType(type, false)}
              />
            ))}
          </div>
        </div>
        <TextAreaField label="Damage Comments" value={data.extDamageComment} onChange={set("extDamageComment")} />
      </FormSection>

      {/* ── Violations Information ──────────────────────────────────────── */}
      <FormSection title="Violations Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Known Violations Exist?" name="violationsExist" options={yesNoOptions} value={data.violationsExist} onChange={set("violationsExist")} />
          <TextField label="Agency Name" value={data.violationAgency} onChange={set("violationAgency")} />
          <TextField label="Agent Name" value={data.violationAgent} onChange={set("violationAgent")} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Agency Phone Number" value={data.violationPhone} onChange={set("violationPhone")} />
          <TextField label="Date of Violation" type="date" value={data.violationDate} onChange={set("violationDate")} />
          <TextField label="Type of Violation" value={data.violationType} onChange={set("violationType")} />
        </div>
        <TextAreaField label="Violation Comments" value={data.violationComments} onChange={set("violationComments")} />
      </FormSection>
    </div>
  );
}
