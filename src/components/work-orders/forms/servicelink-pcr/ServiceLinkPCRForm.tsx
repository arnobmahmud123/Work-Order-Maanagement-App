"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Printer, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-[1400px] h-[90vh] flex flex-col bg-slate-50 dark:bg-slate-950 shadow-2xl rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/80 my-0">
        
        {/* Header - Glassmorphic styled */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-8 sm:py-5 border-b border-slate-200/60 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div>
            <h2 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight">ServiceLink PCR Form</h2>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">Complete property details, occupancy checks, and conditions reporting</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200 border border-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection - Glassmorphic pill controls */}
        <div className="flex px-3 sm:px-8 py-2.5 sm:py-3 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 overflow-x-auto gap-1.5 sm:gap-2 scrollbar-none shrink-0">
          {subTabs.map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex-shrink-0 ${
                  active
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 scale-102"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
              <p className="text-sm text-slate-500 font-bold">Loading form submission...</p>
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

        {/* Sticky Action Footer - Print/Export Removed as requested */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-8 sm:py-4 border-t border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          {/* Live Status indicator */}
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isDirty ? "bg-amber-500 animate-pulse ring-4 ring-amber-500/10" : "bg-emerald-500 ring-4 ring-emerald-500/10"}`} />
            {isDirty ? "Unsaved Changes" : "All Changes Saved"}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all duration-200 ${
                isDirty 
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 shadow-cyan-500/25 cursor-pointer active:scale-98"
                  : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-50 shadow-none"
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
    </div>,
    document.body
  );
}
