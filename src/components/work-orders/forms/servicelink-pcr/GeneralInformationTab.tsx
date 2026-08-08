"use client";

import React from "react";
import {
  RadioGroup,
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  FormSection,
} from "../FormPrimitives";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneralInformationData {
  wasWorkPerformed: string; // "yes" | "no" | ""
  serviceStartDate: string;
  serviceEndDate: string;
  keyCode: string;
  lockboxCode: string;
  lockboxStatus: string; // "present" | "missing" | "damaged" | ""
  correctedAddress1: string;
  correctedAddress2: string;
  correctedCity: string;
  correctedZip: string;
  howAddressFound: string;
  geoLatitude: string;
  geoLongitude: string;
  gateAccessCode: string;
  dawgsVpsCode: string;
  correctedState: string;
  hoa: string; // "yes" | "no" | "unable" | ""
  getCommunity: string; // "yes" | "no" | ""
  review: string;
  isAdditionalWorkNeeded: boolean;
  oneTimeFee: string;
  drainWaterHeater: string; // "yes" | "no" | ""
  systemHoldPressure: string;
  waterSource: string; // "public" | "well" | "other" | ""
  blowOutPlumbing: string;
  blowOutHeating: string; // "yes" | "no" | "na" | ""
  activeLeaks: string;
  antiFreezeInTraps: string;
  utilitiesActive: string;
  postStickers: string;
  // Proof of Service Summary dropdowns
  escalatedEvents: string;
  healthSafetyIssues: string;
  unsecuredOpenings: string;
  violationsPosted: string;
  boilerExplosionDamage: string;
  earthquakeDamage: string;
  floodDamage: string;
  hurricaneDamage: string;
  tornadoDamage: string;
  lawnMaintained: string;
  propertyOccupied: string;
  roofDamage: string;
  vandalismPresent: string;
  fireDamage: string;
  exteriorDebris: string;
  comments: string;
}

export const defaultGeneralInformationData: GeneralInformationData = {
  wasWorkPerformed: "",
  serviceStartDate: "",
  serviceEndDate: "",
  keyCode: "",
  lockboxCode: "",
  lockboxStatus: "",
  correctedAddress1: "",
  correctedAddress2: "",
  correctedCity: "",
  correctedZip: "",
  howAddressFound: "",
  geoLatitude: "",
  geoLongitude: "",
  gateAccessCode: "",
  dawgsVpsCode: "",
  correctedState: "",
  hoa: "",
  getCommunity: "",
  review: "",
  isAdditionalWorkNeeded: false,
  oneTimeFee: "",
  drainWaterHeater: "",
  systemHoldPressure: "",
  waterSource: "",
  blowOutPlumbing: "",
  blowOutHeating: "",
  activeLeaks: "",
  antiFreezeInTraps: "",
  utilitiesActive: "",
  postStickers: "",
  escalatedEvents: "No",
  healthSafetyIssues: "No",
  unsecuredOpenings: "No",
  violationsPosted: "No",
  boilerExplosionDamage: "No",
  earthquakeDamage: "No",
  floodDamage: "No",
  hurricaneDamage: "No",
  tornadoDamage: "No",
  lawnMaintained: "No",
  propertyOccupied: "No",
  roofDamage: "No",
  vandalismPresent: "No",
  fireDamage: "No",
  exteriorDebris: "No",
  comments: "",
};

const yesNoOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];
const yesNoNaOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "N/A", value: "na" },
];
const yesNoUnableOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Unable To Determine", value: "unable" },
];
const proofDropdownOptions = [
  { label: "No", value: "No" },
  { label: "Yes", value: "Yes" },
  { label: "N/A", value: "N/A" },
  { label: "Unknown", value: "Unknown" },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  data: GeneralInformationData;
  onChange: (data: GeneralInformationData) => void;
}

export function GeneralInformationTab({ data, onChange }: Props) {
  const set = (key: keyof GeneralInformationData) => (value: string | boolean) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="space-y-5">
      {/* ── General Information Section ─────────────────────────────────── */}
      <FormSection title="General Information">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup
            label="Was Work Performed?"
            name="wasWorkPerformed"
            options={yesNoOptions}
            value={data.wasWorkPerformed}
            onChange={set("wasWorkPerformed")}
            info="Indicate whether any work was performed at this property"
          />
          <TextField
            label="Date and Service-Start"
            value={data.serviceStartDate}
            onChange={set("serviceStartDate")}
            type="date"
            info="Date service work began"
          />
          <TextField
            label="Date and Service-End"
            value={data.serviceEndDate}
            onChange={set("serviceEndDate")}
            type="date"
            info="Date service work was completed"
          />
        </div>

        {/* Row 2 - Key/Lockbox */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Key Code" value={data.keyCode} onChange={set("keyCode")} />
          <TextField label="LockBox Code" value={data.lockboxCode} onChange={set("lockboxCode")} />
          <RadioGroup
            label="LockBox"
            name="lockboxStatus"
            options={[
              { label: "Present", value: "present" },
              { label: "Missing", value: "missing" },
              { label: "Damaged", value: "damaged" },
            ]}
            value={data.lockboxStatus}
            onChange={set("lockboxStatus")}
          />
        </div>

        {/* Row 3 - Address corrections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Corrected Address 1" value={data.correctedAddress1} onChange={set("correctedAddress1")} />
          <TextField label="Corrected Address 2" value={data.correctedAddress2} onChange={set("correctedAddress2")} />
          <TextField label="Corrected City" value={data.correctedCity} onChange={set("correctedCity")} />
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Corrected Zip" value={data.correctedZip} onChange={set("correctedZip")} />
          <TextField label="How was Corrected Address Found" value={data.howAddressFound} onChange={set("howAddressFound")} />
          <TextField label="Geo Latitude" value={data.geoLatitude} onChange={set("geoLatitude")} />
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Gate Access Code" value={data.gateAccessCode} onChange={set("gateAccessCode")} />
          <TextField label="DAWGS/VPS Code" value={data.dawgsVpsCode} onChange={set("dawgsVpsCode")} />
          <TextField label="Corrected State" value={data.correctedState} onChange={set("correctedState")} />
        </div>

        {/* Row 6 - HOA + Community */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Geo Longitude" value={data.geoLongitude} onChange={set("geoLongitude")} />
          <RadioGroup
            label="HOA"
            name="hoa"
            options={yesNoUnableOptions}
            value={data.hoa}
            onChange={set("hoa")}
            info="Is this property part of a Homeowners Association?"
          />
          <RadioGroup
            label="Get Community"
            name="getCommunity"
            options={yesNoOptions}
            value={data.getCommunity}
            onChange={set("getCommunity")}
            info="Is this a gated/restricted community?"
          />
        </div>

        {/* Review + Additional Work */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextAreaField
            label="Review"
            value={data.review}
            onChange={set("review")}
            rows={3}
            info="General review notes"
          />
          <div className="flex items-start pt-6">
            <CheckboxField
              label="Is Additional Work Needed"
              checked={data.isAdditionalWorkNeeded}
              onChange={set("isAdditionalWorkNeeded")}
            />
          </div>
        </div>

        {/* One-time fee + Water/Plumbing fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="One Time Fee"
            value={data.oneTimeFee}
            onChange={set("oneTimeFee")}
            placeholder="$0.00"
            type="text"
          />
          <RadioGroup
            label="Drain Water Heater?"
            name="drainWaterHeater"
            options={yesNoOptions}
            value={data.drainWaterHeater}
            onChange={set("drainWaterHeater")}
          />
          <RadioGroup
            label="System Hold Pressure"
            name="systemHoldPressure"
            options={yesNoOptions}
            value={data.systemHoldPressure}
            onChange={set("systemHoldPressure")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup
            label="Water Source"
            name="waterSource"
            options={[
              { label: "Public", value: "public" },
              { label: "Well", value: "well" },
              { label: "Other", value: "other" },
            ]}
            value={data.waterSource}
            onChange={set("waterSource")}
          />
          <RadioGroup
            label="Blow Out Plumbing System?"
            name="blowOutPlumbing"
            options={yesNoOptions}
            value={data.blowOutPlumbing}
            onChange={set("blowOutPlumbing")}
          />
          <RadioGroup
            label="Blow Out Heating System"
            name="blowOutHeating"
            options={yesNoNaOptions}
            value={data.blowOutHeating}
            onChange={set("blowOutHeating")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup
            label="Active Leaks"
            name="activeLeaks"
            options={yesNoOptions}
            value={data.activeLeaks}
            onChange={set("activeLeaks")}
          />
          <RadioGroup
            label="Anti-Freeze in Traps"
            name="antiFreezeInTraps"
            options={yesNoOptions}
            value={data.antiFreezeInTraps}
            onChange={set("antiFreezeInTraps")}
          />
          <RadioGroup
            label="Are Utilities Active"
            name="utilitiesActive"
            options={yesNoOptions}
            value={data.utilitiesActive}
            onChange={set("utilitiesActive")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup
            label="Post Stickers"
            name="postStickers"
            options={yesNoOptions}
            value={data.postStickers}
            onChange={set("postStickers")}
          />
        </div>
      </FormSection>

      {/* ── Workers Table ─────────────────────────────────────────────────── */}
      <FormSection title="Workers">
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-300 w-24">Actions</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Worker ID</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Worker Name</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 italic">
                  No records available.
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <span>0 – 0 of 0 items</span>
          </div>
        </div>
      </FormSection>

      {/* ── Proof of Service Summary ──────────────────────────────────────── */}
      <FormSection title="Proof of Service Summary Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Are There any Escalated Events observed?"
            value={data.escalatedEvents}
            onChange={set("escalatedEvents")}
            options={proofDropdownOptions}
            info="Escalated events include emergency situations requiring immediate attention"
          />
          <SelectField
            label="Are there any Health and safety issues?"
            value={data.healthSafetyIssues}
            onChange={set("healthSafetyIssues")}
            options={proofDropdownOptions}
            info="Health hazards such as mold, sewage, or biohazards"
          />
          <SelectField
            label="Are there any Unsecured openings?"
            value={data.unsecuredOpenings}
            onChange={set("unsecuredOpenings")}
            options={proofDropdownOptions}
            info="Open windows, doors, holes in structure"
          />
          <SelectField
            label="Are any Violations posted?"
            value={data.violationsPosted}
            onChange={set("violationsPosted")}
            options={proofDropdownOptions}
            info="Municipal or code enforcement violations posted at the property"
          />
          <SelectField
            label="Is there Damage Due Boiler Explosion?"
            value={data.boilerExplosionDamage}
            onChange={set("boilerExplosionDamage")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is there Damages Due to Earthquake?"
            value={data.earthquakeDamage}
            onChange={set("earthquakeDamage")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is there damages Due to Flood?"
            value={data.floodDamage}
            onChange={set("floodDamage")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is there Damage Due to Hurricane?"
            value={data.hurricaneDamage}
            onChange={set("hurricaneDamage")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is there Damages Due to Tornado?"
            value={data.tornadoDamage}
            onChange={set("tornadoDamage")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is the Lawn Being Maintained?"
            value={data.lawnMaintained}
            onChange={set("lawnMaintained")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is the Property Occupied?"
            value={data.propertyOccupied}
            onChange={set("propertyOccupied")}
            options={proofDropdownOptions}
            info="Indicates if there are occupants present"
          />
          <SelectField
            label="If there Roof Damage?"
            value={data.roofDamage}
            onChange={set("roofDamage")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is any Vandalism Present?"
            value={data.vandalismPresent}
            onChange={set("vandalismPresent")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is there Damages Due to Fire?"
            value={data.fireDamage}
            onChange={set("fireDamage")}
            options={proofDropdownOptions}
          />
          <SelectField
            label="Is there Exterior Debris Present?"
            value={data.exteriorDebris}
            onChange={set("exteriorDebris")}
            options={proofDropdownOptions}
          />
        </div>

        <TextAreaField
          label="Comments"
          value={data.comments}
          onChange={set("comments")}
          rows={4}
        />
      </FormSection>
    </div>
  );
}
