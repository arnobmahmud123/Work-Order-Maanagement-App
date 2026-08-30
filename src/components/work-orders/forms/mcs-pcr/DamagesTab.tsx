"use client";

import React, { useState } from "react";
import { FormSection } from "../FormPrimitives";
import { AlertCircle, Trash2 } from "lucide-react";

export interface DamageItem {
  discoveryDate: string;
  damageType: string;
  condition: string;
  location: string;
  comments: string;
  causeSource: string;
  damageAmount: string;
  lastStatus: string;
  lastDate: string;
  damageStatus: string;
  newDmgAmt: string;
  imgCount: number;
}

export interface DamagesData {
  damagesList: DamageItem[];
}

export const defaultDamagesData: DamagesData = {
  damagesList: [],
};

interface DamagesTabProps {
  data: DamagesData;
  onChange: (data: DamagesData) => void;
}

export function DamagesTab({ data, onChange }: DamagesTabProps) {
  const currentData = data || defaultDamagesData;
  const list = currentData.damagesList || [];

  // Local state for adding a new damage item
  const [form, setForm] = useState<DamageItem>({
    discoveryDate: "",
    damageType: "",
    condition: "",
    location: "",
    comments: "",
    causeSource: "",
    damageAmount: "",
    lastStatus: "",
    lastDate: "",
    damageStatus: "",
    newDmgAmt: "0",
    imgCount: 0,
  });

  const updateFormField = (field: keyof DamageItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddDamage = () => {
    onChange({
      ...currentData,
      damagesList: [...list, form],
    });
    setForm({
      discoveryDate: "",
      damageType: "",
      condition: "",
      location: "",
      comments: "",
      causeSource: "",
      damageAmount: "",
      lastStatus: "",
      lastDate: "",
      damageStatus: "",
      newDmgAmt: "0",
      imgCount: 0,
    });
  };

  const handleRemoveDamage = (idx: number) => {
    onChange({
      ...currentData,
      damagesList: list.filter((_, i) => i !== idx),
    });
  };

  const damageTypeOptions = [
    { label: "-- Select Damage Type --", value: "" },
    { label: "Boiler Explosion", value: "Boiler Explosion" },
    { label: "Earthquake", value: "Earthquake" },
    { label: "Fire", value: "Fire" },
    { label: "Flood", value: "Flood" },
    { label: "Hurricane", value: "Hurricane" },
    { label: "Tornado", value: "Tornado" },
    { label: "Animal Present", value: "Animal Present" },
    { label: "Appliances", value: "Appliances" },
    { label: "Defective Paint", value: "Defective Paint" },
    { label: "Downed/Damaged Trees", value: "Downed/Damaged Trees" },
    { label: "Driveway", value: "Driveway" },
    { label: "Environmental Hazard", value: "Environmental Hazard" },
    { label: "Exposed Electrical", value: "Exposed Electrical" },
    { label: "Exterior Porch/Decking/Fence", value: "Exterior Porch/Decking/Fence" },
    { label: "Flooring/Baseboard", value: "Flooring/Baseboard" },
    { label: "Foundation", value: "Foundation" },
    { label: "Freezing", value: "Freezing" },
    { label: "Graffiti", value: "Graffiti" },
    { label: "Hail", value: "Hail" },
    { label: "Infestation", value: "Infestation" },
    { label: "Meth Lab", value: "Meth Lab" },
    { label: "Mildew/Mold/Discoloration", value: "Mildew/Mold/Discoloration" },
    { label: "Missing/Damaged AC/heater", value: "Missing/Damaged AC/heater" },
    { label: "Missing/Damaged Sump Pump", value: "Missing/Damaged Sump Pump" },
    { label: "Missing/Damaged water heater/tank", value: "Missing/Damaged water heater/tank" },
    { label: "Mud / Landslide", value: "Mud / Landslide" },
    { label: "Oil Spill", value: "Oil Spill" },
    { label: "Owner Neglect", value: "Owner Neglect" },
    { label: "Plumbing", value: "Plumbing" },
    { label: "Roof", value: "Roof" },
  ];

  const conditionOptions = [
    { label: "-- Select Condition --", value: "" },
    { label: "Poor", value: "Poor" },
    { label: "Fair", value: "Fair" },
    { label: "Severe", value: "Severe" },
  ];

  const damageAmtOptions = [
    { label: "-- Select Amount --", value: "" },
    { label: "Less than $500.00", value: "Less than $500.00" },
    { label: "$500.00 - $1000.00", value: "$500.00 - $1000.00" },
    { label: "$1001.00 - $2000.00", value: "$1001.00 - $2000.00" },
    { label: "Greater than $2000.00", value: "Greater than $2000.00" },
  ];

  const lastStatusOptions = [
    { label: "-- Select Status --", value: "" },
    { label: "Deteriorating", value: "Deteriorating" },
    { label: "No Change/Stable", value: "No Change/Stable" },
    { label: "Did Not Enter Property", value: "Did Not Enter Property" },
  ];

  return (
    <div className="space-y-6 max-w-full">
      <FormSection title="Damages Reporting">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              Discovery Date:
              {!form.discoveryDate && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
            </label>
            <input
              type="date"
              value={form.discoveryDate}
              onChange={(e) => updateFormField("discoveryDate", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              Damage Type:
              {!form.damageType && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
            </label>
            <select
              value={form.damageType}
              onChange={(e) => updateFormField("damageType", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              {damageTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Condition:</label>
            <select
              value={form.condition}
              onChange={(e) => updateFormField("condition", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              {conditionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Location:</label>
            <input
              type="text"
              placeholder="e.g. Living Room, Exterior"
              value={form.location}
              onChange={(e) => updateFormField("location", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Cause/Source:</label>
            <input
              type="text"
              placeholder="e.g. Frozen Pipes, Storm"
              value={form.causeSource}
              onChange={(e) => updateFormField("causeSource", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Damage Amount:</label>
            <select
              value={form.damageAmount}
              onChange={(e) => updateFormField("damageAmount", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              {damageAmtOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Last Status:</label>
            <select
              value={form.lastStatus}
              onChange={(e) => updateFormField("lastStatus", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              {lastStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Last Date:</label>
            <input
              type="date"
              value={form.lastDate}
              onChange={(e) => updateFormField("lastDate", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Comments:</label>
            <input
              type="text"
              placeholder="Damage comments..."
              value={form.comments}
              onChange={(e) => updateFormField("comments", e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Img Count:</label>
            <input
              type="number"
              min="0"
              value={form.imgCount}
              onChange={(e) => updateFormField("imgCount", Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
            >
              Damage Photos
            </button>
            <button
              type="button"
              onClick={handleAddDamage}
              disabled={!form.discoveryDate || !form.damageType}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Damage
            </button>
          </div>
        </div>
      </FormSection>

      {/* Table of Reported Damages */}
      {list.length > 0 && (
        <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-md">
          <div className="bg-slate-100 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">New Damages to Report</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-black uppercase text-[10px] tracking-wider select-none">
                  <th className="py-3 px-4">Discovery Date</th>
                  <th className="py-3 px-4">Damage Type</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Comments</th>
                  <th className="py-3 px-4">Cause/Source</th>
                  <th className="py-3 px-4">Damage Amt</th>
                  <th className="py-3 px-4">Last Status</th>
                  <th className="py-3 px-4">Last Date</th>
                  <th className="py-3 px-4 text-center">Img Count</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
                {list.map((dmg, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-3 px-4">{dmg.discoveryDate}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{dmg.damageType}</td>
                    <td className="py-3 px-4">{dmg.condition || "—"}</td>
                    <td className="py-3 px-4">{dmg.location || "—"}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate" title={dmg.comments}>{dmg.comments || "—"}</td>
                    <td className="py-3 px-4">{dmg.causeSource || "—"}</td>
                    <td className="py-3 px-4">{dmg.damageAmount || "—"}</td>
                    <td className="py-3 px-4">{dmg.lastStatus || "—"}</td>
                    <td className="py-3 px-4">{dmg.lastDate || "—"}</td>
                    <td className="py-3 px-4 text-center">{dmg.imgCount}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveDamage(i)}
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
