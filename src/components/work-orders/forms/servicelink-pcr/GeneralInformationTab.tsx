"use client";

import React, { useState } from "react";
import {
  RadioGroup,
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  FormSection,
} from "../FormPrimitives";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PCRWorker {
  id: string;
  workerId: string;
  workerName: string;
}

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
  workers?: PCRWorker[];
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
  workers: [],
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
  const [workerInputId, setWorkerInputId] = useState("");
  const [workerInputName, setWorkerInputName] = useState("");
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);

  const set = (key: keyof GeneralInformationData) => (value: string | boolean) =>
    onChange({ ...data, [key]: value });

  const workers = data.workers || [];

  const handleSaveWorker = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!workerInputId.trim() && !workerInputName.trim()) {
      toast.error("Please enter a Worker ID and Name");
      return;
    }
    if (editingWorkerId) {
      const updated = workers.map((w) =>
        w.id === editingWorkerId
          ? { ...w, workerId: workerInputId.trim(), workerName: workerInputName.trim() }
          : w
      );
      onChange({ ...data, workers: updated });
      setEditingWorkerId(null);
      toast.success("Worker updated");
    } else {
      const newWorker: PCRWorker = {
        id: `worker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        workerId: workerInputId.trim(),
        workerName: workerInputName.trim(),
      };
      onChange({ ...data, workers: [...workers, newWorker] });
      toast.success("Worker added");
    }
    setWorkerInputId("");
    setWorkerInputName("");
  };

  const handleEditWorker = (w: PCRWorker) => {
    setEditingWorkerId(w.id);
    setWorkerInputId(w.workerId);
    setWorkerInputName(w.workerName);
  };

  const handleCancelEdit = () => {
    setEditingWorkerId(null);
    setWorkerInputId("");
    setWorkerInputName("");
  };

  const handleDeleteWorker = (id: string) => {
    const updated = workers.filter((w) => w.id !== id);
    onChange({ ...data, workers: updated });
    if (editingWorkerId === id) {
      handleCancelEdit();
    }
    toast.success("Worker removed");
  };

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
        <div className="space-y-3">
          {/* Add / Edit Worker Inline Form */}
          <form
            onSubmit={handleSaveWorker}
            className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
          >
            <div className="w-full sm:w-44">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1 block uppercase tracking-wider">
                Worker ID / Work Order ID
              </label>
              <input
                type="number"
                value={workerInputId}
                onChange={(e) => setWorkerInputId(e.target.value)}
                placeholder="e.g. 1024"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none shadow-sm"
              />
            </div>

            <div className="flex-1">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1 block uppercase tracking-wider">
                Worker Name
              </label>
              <input
                type="text"
                value={workerInputName}
                onChange={(e) => setWorkerInputName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="h-8 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap cursor-pointer"
              >
                {editingWorkerId ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Worker</span>
                  </>
                )}
              </button>

              {editingWorkerId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-8 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </form>

          {/* Workers Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300 w-28">Actions</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300 w-44">Worker ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">Worker Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 italic">
                      No records available. Enter Worker ID and Name above to add workers.
                    </td>
                  </tr>
                ) : (
                  workers.map((w, idx) => (
                    <tr
                      key={w.id || idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditWorker(w)}
                            className="p-1 rounded-md text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="Edit Worker"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWorker(w.id)}
                            className="p-1 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Worker"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {w.workerId || "—"}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {w.workerName || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
              <span>
                {workers.length > 0
                  ? `1 – ${workers.length} of ${workers.length} items`
                  : "0 – 0 of 0 items"}
              </span>
            </div>
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
