"use client";

import React from "react";
import { FormSection } from "../FormPrimitives";
import { AlertCircle } from "lucide-react";

export interface DumpFeeData {
  disposalDate: string;
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  facilityState: string;
  facilityZip: string;
  facilityPhone: string;
  cubicYards: string;
  netWeight: string;
  itemDescription: string;
  notes: string;
}

export interface DumpStorageData {
  dumpFees: DumpFeeData[];
  currentDumpIndex: number;
  storageSelect: string;
}

export const defaultDumpStorageData: DumpStorageData = {
  dumpFees: [
    {
      disposalDate: "",
      facilityName: "",
      facilityAddress: "",
      facilityCity: "",
      facilityState: "MO",
      facilityZip: "",
      facilityPhone: "",
      cubicYards: "",
      netWeight: "",
      itemDescription: "",
      notes: "",
    }
  ],
  currentDumpIndex: 0,
  storageSelect: "",
};

interface DumpStorageTabProps {
  data: DumpStorageData;
  onChange: (data: DumpStorageData) => void;
}

export function DumpStorageTab({ data, onChange }: DumpStorageTabProps) {
  const currentData = data || defaultDumpStorageData;
  const fees = currentData.dumpFees || defaultDumpStorageData.dumpFees;
  const currentIndex = currentData.currentDumpIndex ?? 0;
  const currentFee = fees[currentIndex] || fees[0] || defaultDumpStorageData.dumpFees[0];

  const updateCurrentFee = (field: keyof DumpFeeData, value: string) => {
    const updatedFees = [...fees];
    updatedFees[currentIndex] = {
      ...currentFee,
      [field]: value,
    };
    onChange({
      ...currentData,
      dumpFees: updatedFees,
    });
  };

  const handleAddDumpFee = () => {
    const newFee: DumpFeeData = {
      disposalDate: "",
      facilityName: "",
      facilityAddress: "",
      facilityCity: "",
      facilityState: "MO",
      facilityZip: "",
      facilityPhone: "",
      cubicYards: "",
      netWeight: "",
      itemDescription: "",
      notes: "",
    };
    onChange({
      ...currentData,
      dumpFees: [...fees, newFee],
      currentDumpIndex: fees.length,
    });
  };

  const handleSelectDump = (val: string) => {
    if (val === "new") {
      handleAddDumpFee();
    } else {
      onChange({
        ...currentData,
        currentDumpIndex: Number(val),
      });
    }
  };

  const usStates = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-full">
      
      {/* Dump Fee Information */}
      <FormSection title="Dump Fee Information">
        <div className="space-y-4">
          {/* Select and Photos row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Select:</label>
              <select
                value={currentIndex}
                onChange={(e) => handleSelectDump(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                {fees.map((f, i) => (
                  <option key={i} value={i}>Dump Fee #{i + 1} ({f.facilityName || "Unnamed"})</option>
                ))}
                <option value="new">+ Add New --</option>
              </select>
            </div>
            <button 
              type="button"
              className="px-4 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
            >
              Photos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Disposal Date:
                {!currentFee.disposalDate && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="date"
                value={currentFee.disposalDate}
                onChange={(e) => updateCurrentFee("disposalDate", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Facility Name:
                {!currentFee.facilityName && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="text"
                placeholder="Facility name"
                value={currentFee.facilityName}
                onChange={(e) => updateCurrentFee("facilityName", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Facility Address:
                {!currentFee.facilityAddress && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="text"
                placeholder="Facility address"
                value={currentFee.facilityAddress}
                onChange={(e) => updateCurrentFee("facilityAddress", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Facility City:
                {!currentFee.facilityCity && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="text"
                placeholder="City"
                value={currentFee.facilityCity}
                onChange={(e) => updateCurrentFee("facilityCity", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Facility State:</label>
              <select
                value={currentFee.facilityState}
                onChange={(e) => updateCurrentFee("facilityState", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {usStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Facility Zip:
                {!currentFee.facilityZip && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="text"
                placeholder="Zip"
                value={currentFee.facilityZip}
                onChange={(e) => updateCurrentFee("facilityZip", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Facility Phone:</label>
              <input
                type="text"
                placeholder="(___) ___-____"
                value={currentFee.facilityPhone}
                onChange={(e) => updateCurrentFee("facilityPhone", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Cubic Yards Disposed:
                {!currentFee.cubicYards && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
              </label>
              <input
                type="text"
                placeholder="Volume"
                value={currentFee.cubicYards}
                onChange={(e) => updateCurrentFee("cubicYards", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Net Weight:</label>
              <input
                type="text"
                placeholder="Net Weight"
                value={currentFee.netWeight}
                onChange={(e) => updateCurrentFee("netWeight", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              Description of Items:
              {!currentFee.itemDescription && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
            </label>
            <textarea
              value={currentFee.itemDescription}
              placeholder="List items disposed..."
              rows={2}
              onChange={(e) => updateCurrentFee("itemDescription", e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[48px]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes:</label>
            <textarea
              value={currentFee.notes}
              placeholder="Dump fee notes..."
              rows={2}
              onChange={(e) => updateCurrentFee("notes", e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[48px]"
            />
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleAddDumpFee}
              className="w-full md:w-auto px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Add Dump Fee
            </button>
          </div>
        </div>
      </FormSection>

      {/* Storage Information */}
      <FormSection title="Storage Information">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Select:</label>
            <select
              value={currentData.storageSelect}
              onChange={(e) => onChange({ ...currentData, storageSelect: e.target.value })}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Select Option --</option>
              <option value="store">Store On Site</option>
              <option value="remove">Remove To Facility</option>
            </select>
          </div>
          
          <div className="h-64 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <p className="text-xs font-bold">No active storage logs recorded.</p>
            <p className="text-[10px] mt-1">Select storage option and click Modify to register items</p>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              className="w-full md:w-auto px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider rounded-xl cursor-not-allowed"
              disabled
            >
              Modify
            </button>
          </div>
        </div>
      </FormSection>

    </div>
  );
}
