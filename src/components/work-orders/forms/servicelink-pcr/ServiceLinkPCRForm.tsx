"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Printer, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  GeneralInformationTab,
  defaultGeneralInformationData,
  type GeneralInformationData,
} from "./GeneralInformationTab";

import {
  PCRTab1,
  defaultPCR1Data,
  type PCR1Data,
} from "./PCRTab1";

import {
  PCRTab2,
  defaultPCR2Data,
  type PCR2Data,
} from "./PCRTab2";

import {
  OtherResultTab,
  BidsTab,
  SummaryTab,
} from "./tabs/Placeholders";

interface Props {
  workOrderId: string;
  submissionId?: string; // If undefined, this is a new submission
  onClose: () => void;
  onSaved: () => void;
}

interface FullPCRData {
  generalInfo: GeneralInformationData;
  pcr1: PCR1Data;
  pcr2: PCR2Data;
}

const defaultFullData: FullPCRData = {
  generalInfo: defaultGeneralInformationData,
  pcr1: defaultPCR1Data,
  pcr2: defaultPCR2Data,
};

export function ServiceLinkPCRForm({ workOrderId, submissionId, onClose, onSaved }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<string>("general");
  const [formData, setFormData] = useState<FullPCRData>(defaultFullData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load existing submission if editing
  useEffect(() => {
    if (!submissionId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/work-orders/${workOrderId}/forms/${submissionId}`);
        if (!res.ok) throw new Error("Failed to load form submission");
        const data = await res.json();
        
        // Ensure structure is correct
        const parsed = data.formData || {};
        setFormData({
          generalInfo: { ...defaultGeneralInformationData, ...parsed.generalInfo },
          pcr1: { ...defaultPCR1Data, ...parsed.pcr1 },
          pcr2: { ...defaultPCR2Data, ...parsed.pcr2 },
        });
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load existing form data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [workOrderId, submissionId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let res;
      if (submissionId) {
        // Update existing
        res = await fetch(`/api/work-orders/${workOrderId}/forms/${submissionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData }),
        });
      } else {
        // Create new
        res = await fetch(`/api/work-orders/${workOrderId}/forms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formType: "servicelink-pcr",
            formName: "ServiceLink PCR Form",
            formData,
          }),
        });
      }

      if (!res.ok) throw new Error("Failed to save form");
      
      toast.success("ServiceLink PCR Form saved successfully!");
      setIsDirty(false);
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save form submission");
    } finally {
      setSaving(false);
    }
  };

  const handleDataChange = (section: keyof FullPCRData) => (sectionData: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: sectionData,
    }));
    setIsDirty(true);
  };

  const subTabs = [
    { id: "general", label: "General Information" },
    { id: "pcr1", label: "Property Conditions Report-1" },
    { id: "pcr2", label: "Property Conditions Report-2" },
    { id: "other", label: "Other Result" },
    { id: "bids", label: "Bids" },
    { id: "summary", label: "Summary" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/50 backdrop-blur-sm">
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 w-full max-w-[1400px] mx-auto shadow-2xl overflow-hidden border-x border-slate-200 dark:border-slate-800 my-0">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">ServiceLink PCR Form</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complete property details, occupancy checks, and conditions reporting</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeSubTab === tab.id
                  ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
              <p className="text-sm text-slate-500">Loading form submission...</p>
            </div>
          ) : (
            <>
              {activeSubTab === "general" && (
                <GeneralInformationTab
                  data={formData.generalInfo}
                  onChange={handleDataChange("generalInfo")}
                />
              )}
              {activeSubTab === "pcr1" && (
                <PCRTab1
                  data={formData.pcr1}
                  onChange={handleDataChange("pcr1")}
                />
              )}
              {activeSubTab === "pcr2" && (
                <PCRTab2
                  data={formData.pcr2}
                  onChange={handleDataChange("pcr2")}
                />
              )}
              {activeSubTab === "other" && <OtherResultTab />}
              {activeSubTab === "bids" && <BidsTab />}
              {activeSubTab === "summary" && <SummaryTab />}
            </>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all ${
                isDirty 
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 cursor-pointer"
                  : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-50"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save & Close
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
