"use client";

import React, { useState, useEffect } from "react";
import { Plus, ClipboardCheck, Trash2, Eye, Edit, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { ServiceLinkPCRForm } from "./servicelink-pcr/ServiceLinkPCRForm";
import { MCSPCRForm } from "./mcs-pcr/MCSPCRForm";

interface Props {
  workOrderId: string;
}

interface FormSubmission {
  id: string;
  formType: string;
  formName: string;
  createdAt: string;
  updatedAt: string;
}

export function WorkOrderFormsTab({ workOrderId }: Props) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState("");
  const [activeFormType, setActiveFormType] = useState("");
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/forms`);
      if (!res.ok) throw new Error("Failed to load forms list");
      const data = await res.json();
      setSubmissions(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [workOrderId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this form submission?")) return;

    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/forms/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete form");
      
      toast.success("Form deleted successfully");
      loadSubmissions();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete form");
    }
  };

  const handleCreateForm = () => {
    if (!selectedFormType) {
      toast.error("Please select a form type first");
      return;
    }
    
    if (selectedFormType === "servicelink-pcr" || selectedFormType === "mcs-pcr") {
      setIsEditing(true);
      setActiveFormType(selectedFormType);
      setActiveSubmissionId(null); // Create new
      setShowAddModal(false);
    } else {
      toast.error("Only ServiceLink PCR & MCS Maintenance Forms are currently implemented");
    }
  };

  const availableForms = [
    { value: "servicelink-pcr", label: "ServiceLink PCR" },
    { value: "mcs-pcr", label: "MCS Maintenance Form" },
    { value: "cyprexx-grass", label: "Cyprexx Grass checklist (Coming Soon)", disabled: true },
    { value: "cyprexx-icc", label: "Cyprexx ICC checklist (Coming Soon)", disabled: true },
    { value: "cyprexx-universal", label: "Cyprexx Universal Damage (Coming Soon)", disabled: true },
    { value: "five-brother-inspection", label: "Five Brother Inspection (Coming Soon)", disabled: true },
    { value: "msi-preservation", label: "MSI Preservation PCR (Coming Soon)", disabled: true },
  ];

  return (
    <div className="space-y-6">
      
      {/* Upper header action area */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-text-primary">Work Order Forms</h3>
          <p className="text-xs text-text-secondary">Fill, save, and export structural and client-specific forms</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-lg transition"
        >
          <Plus className="h-4 w-4" />
          Add Form
        </button>
      </div>

      {/* Forms submission list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="text-sm text-text-secondary">Loading forms list...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border-medium rounded-3xl p-12 bg-surface/30 text-center">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
            <ClipboardCheck className="h-6 w-6 text-cyan-500" />
          </div>
          <h4 className="text-sm font-bold text-text-primary">No Forms Added Yet</h4>
          <p className="text-xs text-text-muted mt-1 max-w-[280px]">Add forms like the ServiceLink PCR to record and save detailed property metrics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((sub) => (
            <div 
              key={sub.id}
              onClick={() => {
                setActiveSubmissionId(sub.id);
                setActiveFormType(sub.formType);
                setIsEditing(true);
              }}
              className="bg-surface/50 border border-border-subtle rounded-2xl p-4 flex flex-col justify-between hover:bg-surface-hover hover:border-cyan-500/30 transition cursor-pointer group shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-500/10 px-2 py-1 rounded">
                    Active Form
                  </span>
                  <button
                    onClick={(e) => handleDelete(sub.id, e)}
                    className="p-1 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h4 className="text-sm font-black text-text-primary tracking-tight group-hover:text-cyan-500 transition-colors">
                  {sub.formName}
                </h4>
                <p className="text-[10px] text-text-muted mt-1">
                  Last Updated: {new Date(sub.updatedAt).toLocaleString()}
                </p>
              </div>
              
              <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-4 text-[10px] font-black uppercase tracking-wider text-text-muted">
                <span>Edit Details</span>
                <Edit className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Form Modal ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider">Add PCR Form</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Select Form <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedFormType}
                  onChange={(e) => setSelectedFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                >
                  <option value="">-- Select Form --</option>
                  {availableForms.map((form) => (
                    <option key={form.value} value={form.value} disabled={form.disabled}>
                      {form.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateForm}
                disabled={!selectedFormType}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active ServiceLink PCR Form Sheet/Modal ────────────────────── */}
      {isEditing && activeFormType === "servicelink-pcr" && (
        <ServiceLinkPCRForm
          workOrderId={workOrderId}
          submissionId={activeSubmissionId || undefined}
          onClose={() => {
            setIsEditing(false);
            setActiveSubmissionId(null);
            setActiveFormType("");
          }}
          onSaved={() => {
            loadSubmissions();
            setIsEditing(false);
            setActiveSubmissionId(null);
            setActiveFormType("");
          }}
        />
      )}

      {/* ── Active MCS PCR Form Sheet/Modal ───────────────────────────── */}
      {isEditing && activeFormType === "mcs-pcr" && (
        <MCSPCRForm
          workOrderId={workOrderId}
          submissionId={activeSubmissionId || undefined}
          onClose={() => {
            setIsEditing(false);
            setActiveSubmissionId(null);
            setActiveFormType("");
          }}
          onSaved={() => {
            loadSubmissions();
            setIsEditing(false);
            setActiveSubmissionId(null);
            setActiveFormType("");
          }}
        />
      )}

    </div>
  );
}
