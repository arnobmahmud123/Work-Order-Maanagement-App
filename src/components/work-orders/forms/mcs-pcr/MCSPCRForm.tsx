"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

import {
  PropertyInfoTab,
  defaultPropertyInfoData,
  type PropertyInfoData,
} from "./PropertyInfoTab";

import {
  UtilitiesTab,
  defaultUtilitiesData,
  type UtilitiesData,
} from "./UtilitiesTab";

import {
  OccupancyTab,
  WinterizationTab,
  DumpStorageTab,
  GenericChecklistTab,
} from "./OtherMCSTabs";

import {
  CompletionInfoTab,
  defaultCompletionInfoData,
  type CompletionInfoData,
} from "./CompletionInfoTab";

interface Props {
  workOrderId: string;
  submissionId?: string; // If undefined, this is a new submission
  onClose: () => void;
  onSaved: () => void;
}

interface FullMCSPCRData {
  propertyInfo: PropertyInfoData;
  utilities: UtilitiesData;
  completionInfo: CompletionInfoData;
}

const defaultFullData: FullMCSPCRData = {
  propertyInfo: defaultPropertyInfoData,
  utilities: defaultUtilitiesData,
  completionInfo: defaultCompletionInfoData,
};

export function MCSPCRForm({ workOrderId, submissionId, onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<string>("property_info");
  const [formData, setFormData] = useState<FullMCSPCRData>(defaultFullData);
  const [woTasks, setWoTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load work order tasks and existing submission if editing
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        // 1. Fetch work order details to get tasks
        const woRes = await fetch(`/api/work-orders/${workOrderId}`);
        if (woRes.ok) {
          const woData = await woRes.json();
          setWoTasks(woData.tasks || []);
        }

        // 2. Fetch existing form submission if editing
        if (submissionId) {
          const res = await fetch(`/api/work-orders/${workOrderId}/forms/${submissionId}`);
          if (!res.ok) throw new Error("Failed to load form submission");
          const data = await res.json();
          
          const parsed = data.formData || {};
          setFormData({
            propertyInfo: { ...defaultPropertyInfoData, ...parsed.propertyInfo },
            utilities: { ...defaultUtilitiesData, ...parsed.utilities },
            completionInfo: { ...defaultCompletionInfoData, ...parsed.completionInfo },
          });
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load form data");
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
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
            formType: "mcs-pcr",
            formName: "MCS Maintenance Form",
            formData,
          }),
        });
      }

      if (!res.ok) throw new Error("Failed to save form");
      
      toast.success("MCS Maintenance Form saved successfully!");
      setIsDirty(false);
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save form submission");
    } finally {
      setSaving(false);
    }
  };

  const handlePropertyInfoChange = (propertyInfoData: PropertyInfoData) => {
    setFormData((prev) => ({
      ...prev,
      propertyInfo: propertyInfoData,
    }));
    setIsDirty(true);
  };

  const handleUtilitiesChange = (utilitiesData: UtilitiesData) => {
    setFormData((prev) => ({
      ...prev,
      utilities: utilitiesData,
    }));
    setIsDirty(true);
  };

  const handleCompletionInfoChange = (completionInfoData: CompletionInfoData) => {
    setFormData((prev) => ({
      ...prev,
      completionInfo: completionInfoData,
    }));
    setIsDirty(true);
  };

  const mcsTabs = [
    { id: "property_info", label: "Property Info", status: "needs_info" },
    { id: "completion_info", label: "Completion Info", status: "needs_info" },
    { id: "occupancy", label: "Occupancy", status: "needs_info" },
    { id: "utilities", label: "Utilities", status: "needs_info" },
    { id: "dump_storage", label: "Dump & Storage", status: "needs_info" },
    { id: "winterization", label: "Winterization", status: "needs_info" },
    { id: "wint_checklist", label: "Wint. Checklist", status: "needs_info" },
    { id: "access_issue", label: "Access Issue", status: "needs_info" },
    { id: "damages", label: "Damages", status: "needs_info" },
    { id: "violations", label: "Violations", status: "needs_info" },
    { id: "mobile_home", label: "Mobile Home", status: "needs_info" },
    { id: "reo_checklist", label: "REO Checklist", status: "needs_info" },
    { id: "dil_checklist", label: "DIL Checklist", status: "needs_info" },
    { id: "vcl", label: "VCL", status: "needs_info" },
    { id: "viccr_checklist", label: "VICCR Checklist", status: "needs_info" },
    { id: "hazard_eob", label: "Hazard EOB", status: "needs_info" },
    { id: "outstanding_bids", label: "Outstanding Bids", status: "needs_info" },
    { id: "checkins", label: "Checkins", status: "needs_info" },
    { id: "notes", label: "Notes", status: "completed" },
    { id: "exp_comp_date", label: "Exp Comp Date", status: "none" },
  ];

  // Helper to determine status icon on the tab sidebar
  const renderTabIcon = (tabId: string, status: string) => {
    if (tabId === "property_info" && formData.propertyInfo.isCompletionNeeded !== "") {
      return <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
    }
    if (tabId === "completion_info" && formData.completionInfo?.dateWorkCompleted !== "") {
      return <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
    }
    if (status === "completed") {
      return <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
    }
    if (status === "needs_info") {
      return <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />;
    }
    return <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex-shrink-0" />;
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1500px] h-[92vh] flex flex-col bg-slate-50 dark:bg-slate-950 shadow-2xl rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/80 my-0">
        
        {/* Header - Glassmorphic styled */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200/60 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div>
            <h2 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight">MCS Maintenance Form</h2>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">Complete property checklist, securing info, and conditions reporting</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200 border border-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Layout Body: Left Sidebar + Right Main Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Vertical Tabs list */}
          <div className="w-64 border-r border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 overflow-y-auto p-4 space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">Form Chapters</p>
            {mcsTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {renderTabIcon(tab.id, tab.status)}
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Content View */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-950/20">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
                <p className="text-sm text-slate-500 font-bold">Loading form data...</p>
              </div>
            ) : (
              <>
                {activeTab === "property_info" && (
                  <PropertyInfoTab
                    data={formData.propertyInfo}
                    onChange={handlePropertyInfoChange}
                  />
                )}
                {activeTab === "completion_info" && (
                  <CompletionInfoTab
                    data={formData.completionInfo}
                    onChange={handleCompletionInfoChange}
                    woTasks={woTasks}
                  />
                )}
                {activeTab === "occupancy" && <OccupancyTab />}
                {activeTab === "utilities" && (
                  <UtilitiesTab
                    data={formData.utilities}
                    onChange={handleUtilitiesChange}
                  />
                )}
                {activeTab === "dump_storage" && <DumpStorageTab />}
                {activeTab === "winterization" && <WinterizationTab />}
                
                {/* Fallback for other checkboxes checklist tabs */}
                {!["property_info", "completion_info", "occupancy", "utilities", "dump_storage", "winterization"].includes(activeTab) && (
                  <GenericChecklistTab title={mcsTabs.find(t => t.id === activeTab)?.label || "Checklist"} />
                )}
              </>
            )}
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
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
