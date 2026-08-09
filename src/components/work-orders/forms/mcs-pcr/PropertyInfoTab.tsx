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

export interface PropertyInfoData {
  isCompletionNeeded: string;
  buildingType: string;
  numberOfUnits: string;
  unableToAccess: string;
  reasonWhyAccess: string;
  isOccupied: string;
  reasonWhyOccupied?: string;
  isVacantWithPersonals: string;
  environmentalHazards: string;
  hasDamages: string;
  isMoldPresent: string;
  hasPool: string;
  hasAdditionalBuildings: string;
  isOpenExposed: string;
  describeExposureIssue: string;
  hasViolation: string;
  isRoofTarped: string;
  
  // Securing Information
  entryGainedAllKeycodes: string;
  lockboxCode: string;
  keycode1: string;
  doorSecure1: string;
  keycode2: string;
  doorSecure2: string;
 
  // Additional Buildings Checkbox List
  barn: boolean;
  detachedGarage: boolean;
  guestHouse: boolean;
  motherInLawSuite: boolean;
  workShop: boolean;
  otherBuilding: boolean;
}

export const defaultPropertyInfoData: PropertyInfoData = {
  isCompletionNeeded: "",
  buildingType: "Single Family Home",
  numberOfUnits: "1",
  unableToAccess: "No",
  reasonWhyAccess: "",
  isOccupied: "",
  reasonWhyOccupied: "",
  isVacantWithPersonals: "",
  environmentalHazards: "",
  hasDamages: "",
  isMoldPresent: "",
  hasPool: "",
  hasAdditionalBuildings: "",
  isOpenExposed: "",
  describeExposureIssue: "",
  hasViolation: "",
  isRoofTarped: "No",
  
  entryGainedAllKeycodes: "",
  lockboxCode: "",
  keycode1: "",
  doorSecure1: "",
  keycode2: "",
  doorSecure2: "",

  barn: false,
  detachedGarage: false,
  guestHouse: false,
  motherInLawSuite: false,
  workShop: false,
  otherBuilding: false,
};

interface Props {
  data: PropertyInfoData;
  onChange: (data: PropertyInfoData) => void;
}

export function PropertyInfoTab({ data, onChange }: Props) {
  const updateField = (field: keyof PropertyInfoData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const yesNoOptions = [
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
  ];

  const buildingTypeOptions = [
    { label: "-- Select Building Type --", value: "" },
    { label: "Vacant Lot", value: "Vacant Lot" },
    { label: "Single Family Home", value: "Single Family Home" },
    { label: "Mobile Home", value: "Mobile Home" },
    { label: "Multi-Unit", value: "Multi-Unit" },
  ];

  const unitOptions = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5+", value: "5+" },
  ];

  const accessReasonOptions = [
    { label: "-- Select Reason --", value: "" },
    { label: "Gate Locked", value: "Gate Locked" },
    { label: "Vicious Dog", value: "Vicious Dog" },
    { label: "Guard/No Access Allowed", value: "Guard" },
    { label: "No Keycode Worked", value: "No Keycode Worked" },
    { label: "Boarded Property", value: "Boarded" },
    { label: "Demolished", value: "Demolished" },
    { label: "Other / Refusal", value: "Other" },
  ];

  const keycodeOptions = [
    { label: "-- Select Keycode --", value: "" },
    { label: "23323", value: "23323" },
    { label: "25223", value: "25223" },
    { label: "2563", value: "2563" },
    { label: "25632", value: "25632" },
    { label: "34255", value: "34255" },
    { label: "34939", value: "34939" },
    { label: "35241", value: "35241" },
    { label: "35542", value: "35542" },
    { label: "4453", value: "4453" },
    { label: "44535", value: "44535" },
    { label: "64445", value: "64445" },
    { label: "67767", value: "67767" },
    { label: "76667", value: "76667" },
    { label: "7667", value: "7667" },
    { label: "A389 Padlock", value: "A389 Padlock" },
    { label: "PK67767", value: "PK67767" },
  ];

  const secureLocationOptions = [
    { label: "-- Select Location --", value: "" },
    { label: "Front", value: "Front" },
    { label: "Back", value: "Back" },
    { label: "Side", value: "Side" },
    { label: "Other", value: "Other" },
    { label: "Gate/Fence", value: "Gate/Fence" },
    { label: "All Doors", value: "All Doors" },
    { label: "None", value: "None" },
  ];

  const reasonWhyOccupiedOptions = [
    { label: "-- Select Reason --", value: "" },
    { label: "Contact made with occupant", value: "Contact made with occupant" },
    { label: "Personal property present", value: "Personal property present" },
    { label: "Neighbors confirm occupied", value: "Neighbors confirm occupied" },
    { label: "Active utilities & lights", value: "Active utilities & lights" },
    { label: "Visual observation of occupant", value: "Visual observation of occupant" },
    { label: "Other / Direct Contact", value: "Other" },
  ];

  const roofTarpOptions = [
    { label: "No", value: "No" },
    { label: "Yes", value: "Yes" },
    { label: "Unknown / Slate Roof", value: "Unknown" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left Column: General Property Information (Span 7) */}
      <div className="lg:col-span-7 space-y-6">
        <FormSection title="General Property Status">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RadioGroup
              label="Is completion needed?"
              name="isCompletionNeeded"
              options={yesNoOptions}
              value={data.isCompletionNeeded}
              onChange={(v) => updateField("isCompletionNeeded", v)}
            />

            <SelectField
              label="Building type of the property?"
              options={buildingTypeOptions}
              value={data.buildingType}
              onChange={(v) => updateField("buildingType", v)}
            />

            <SelectField
              label="Number of Units:"
              options={unitOptions}
              value={data.numberOfUnits}
              onChange={(v) => updateField("numberOfUnits", v)}
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RadioGroup
              label="Unable to access the property?"
              name="unableToAccess"
              options={yesNoOptions}
              value={data.unableToAccess}
              onChange={(v) => updateField("unableToAccess", v)}
            />

            {data.unableToAccess === "Yes" && (
              <SelectField
                label="Reason Why:"
                options={accessReasonOptions}
                value={data.reasonWhyAccess}
                onChange={(v) => updateField("reasonWhyAccess", v)}
              />
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RadioGroup
              label="Is the property occupied?"
              name="isOccupied"
              options={yesNoOptions}
              value={data.isOccupied}
              onChange={(v) => updateField("isOccupied", v)}
            />

            {data.isOccupied === "Yes" && (
              <SelectField
                label="Reason Why Occupied:"
                options={reasonWhyOccupiedOptions}
                value={data.reasonWhyOccupied || ""}
                onChange={(v) => updateField("reasonWhyOccupied", v)}
              />
            )}

            <RadioGroup
              label="Is the property vacant with personals?"
              name="isVacantWithPersonals"
              options={yesNoOptions}
              value={data.isVacantWithPersonals}
              onChange={(v) => updateField("isVacantWithPersonals", v)}
            />
          </div>
        </FormSection>

        <FormSection title="Hazards, Damage & Violations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RadioGroup
              label="Are environmental hazards present?"
              name="environmentalHazards"
              options={yesNoOptions}
              value={data.environmentalHazards}
              onChange={(v) => updateField("environmentalHazards", v)}
            />

            <RadioGroup
              label="Does the property have damages?"
              name="hasDamages"
              options={yesNoOptions}
              value={data.hasDamages}
              onChange={(v) => updateField("hasDamages", v)}
            />

            <RadioGroup
              label="Is mold present?"
              name="isMoldPresent"
              options={yesNoOptions}
              value={data.isMoldPresent}
              onChange={(v) => updateField("isMoldPresent", v)}
            />

            <RadioGroup
              label="Does the property have a pool?"
              name="hasPool"
              options={yesNoOptions}
              value={data.hasPool}
              onChange={(v) => updateField("hasPool", v)}
            />

            <RadioGroup
              label="Does the property have additional buildings?"
              name="hasAdditionalBuildings"
              options={yesNoOptions}
              value={data.hasAdditionalBuildings}
              onChange={(v) => updateField("hasAdditionalBuildings", v)}
            />

            <RadioGroup
              label="Is the property open/exposed to elements?"
              name="isOpenExposed"
              options={yesNoOptions}
              value={data.isOpenExposed}
              onChange={(v) => updateField("isOpenExposed", v)}
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RadioGroup
              label="Is there a violation?"
              name="hasViolation"
              options={yesNoOptions}
              value={data.hasViolation}
              onChange={(v) => updateField("hasViolation", v)}
            />

            <SelectField
              label="Is the roof tarped?"
              options={roofTarpOptions}
              value={data.isRoofTarped}
              onChange={(v) => updateField("isRoofTarped", v)}
            />
          </div>

          {data.isOpenExposed === "Yes" && (
            <div className="pt-2">
              <TextAreaField
                label="Describe Exposure Issue:"
                value={data.describeExposureIssue}
                onChange={(v) => updateField("describeExposureIssue", v)}
                rows={3}
              />
            </div>
          )}
        </FormSection>
      </div>

      {/* Right Column: Securing Info & Checkbox Cards (Span 5) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Securing Information Sub-Panel */}
        <FormSection title="Securing Information">
          <div className="space-y-4">
            <RadioGroup
              label="Able to enter after trying all MCS keycodes?"
              name="entryGainedAllKeycodes"
              options={yesNoOptions}
              value={data.entryGainedAllKeycodes}
              onChange={(v) => updateField("entryGainedAllKeycodes", v)}
            />

            <TextField
              label="Lockbox Code:"
              placeholder="e.g. 7618"
              value={data.lockboxCode}
              onChange={(v) => updateField("lockboxCode", v)}
            />

            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="Keycode 1"
                options={keycodeOptions}
                value={data.keycode1}
                onChange={(v) => updateField("keycode1", v)}
              />
              <SelectField
                label="Door Secure 1"
                options={secureLocationOptions}
                value={data.doorSecure1}
                onChange={(v) => updateField("doorSecure1", v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="Keycode 2"
                options={keycodeOptions}
                value={data.keycode2}
                onChange={(v) => updateField("keycode2", v)}
              />
              <SelectField
                label="Door Secure 2"
                options={secureLocationOptions}
                value={data.doorSecure2}
                onChange={(v) => updateField("doorSecure2", v)}
              />
            </div>
          </div>
        </FormSection>

        {/* Additional Building Information */}
        <FormSection title="Additional Building Information">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">
            Please select any additional buildings found on the property:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CheckboxField
              label="Barn"
              checked={data.barn}
              onChange={(v) => updateField("barn", v)}
            />
            <CheckboxField
              label="Detached Garage"
              checked={data.detachedGarage}
              onChange={(v) => updateField("detachedGarage", v)}
            />
            <CheckboxField
              label="Guest House"
              checked={data.guestHouse}
              onChange={(v) => updateField("guestHouse", v)}
            />
            <CheckboxField
              label="Mother-in-law Suite"
              checked={data.motherInLawSuite}
              onChange={(v) => updateField("motherInLawSuite", v)}
            />
            <CheckboxField
              label="Work Shop"
              checked={data.workShop}
              onChange={(v) => updateField("workShop", v)}
            />
            <CheckboxField
              label="Other"
              checked={data.otherBuilding}
              onChange={(v) => updateField("otherBuilding", v)}
            />
          </div>
        </FormSection>
      </div>

    </div>
  );
}
