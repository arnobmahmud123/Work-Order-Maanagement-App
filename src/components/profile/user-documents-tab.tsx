"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  ShieldCheck,
  Award,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Upload,
  Calendar,
  Building2,
  Hash,
  Filter,
  Search,
  Check,
  X,
  FileCheck,
  IdCard,
  UserCheck,
  FileBadge,
} from "lucide-react";
import { Card, CardHeader, CardTitle, Button, Input, Badge, Modal } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export const DOCUMENT_TYPES = [
  {
    value: "CV_RESUME",
    label: "Personal CV / Resume",
    icon: FileText,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description: "Curriculum Vitae, work history, references & portfolio",
  },
  {
    value: "INSURANCE_COI",
    label: "Insurance & COI",
    icon: ShieldCheck,
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description: "General Liability, Workers' Comp, Auto Insurance certificate",
  },
  {
    value: "LICENSE",
    label: "Trade / Professional License",
    icon: Award,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description: "Contractor, Electrician, Plumbing, Roofing or Trade license",
  },
  {
    value: "W9_TAX",
    label: "W-9 & Tax Documents",
    icon: FileSpreadsheet,
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description: "W-9 Form, EIN / Tax identification verification",
  },
  {
    value: "GOVT_ID",
    label: "Government ID / Driver's License",
    icon: IdCard,
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    description: "Driver's license, State ID, or Passport",
  },
  {
    value: "BACKGROUND_CHECK",
    label: "Background Check",
    icon: UserCheck,
    color: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    description: "Criminal history check or background clearance report",
  },
  {
    value: "CERTIFICATION",
    label: "Trade Certification",
    icon: FileBadge,
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    description: "OSHA-10/30, EPA Lead-Safe, Mold remediation, Hazmat",
  },
  {
    value: "OTHER",
    label: "Other Supplemental Document",
    icon: FileCheck,
    color: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    description: "Agreements, vendor packets, and miscellaneous files",
  },
];

interface UserDocumentsTabProps {
  userId?: string;
  userName?: string;
  readOnly?: boolean;
}

export function UserDocumentsTab({ userId, userName, readOnly = false }: UserDocumentsTabProps) {
  const { data: session } = useSession();
  const callerRole = (session?.user as any)?.role;
  const isStaff = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "INCHARGE_COORDINATOR"].includes(callerRole);

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    type: "INSURANCE_COI",
    title: "",
    documentNumber: "",
    issuingAuthority: "",
    expiresAt: "",
    notes: "",
  });

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const queryParam = userId ? `?userId=${userId}` : "";
      const res = await fetch(`/api/user-documents${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      } else {
        toast.error("Failed to load documents");
      }
    } catch (err) {
      console.error("Error loading documents:", err);
      toast.error("Network error loading documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    setUploadFile(file);
    if (!uploadForm.title) {
      // Auto suggest title from file name
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setUploadForm((prev) => ({ ...prev, title: cleanName }));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (!uploadForm.title.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload File via /api/upload
      const formData = new FormData();
      formData.append("file", uploadFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Failed to upload file");
      }

      // 2. Create UserDocument Record
      const docPayload = {
        userId: userId || undefined,
        type: uploadForm.type,
        title: uploadForm.title.trim(),
        documentNumber: uploadForm.documentNumber.trim() || undefined,
        issuingAuthority: uploadForm.issuingAuthority.trim() || undefined,
        expiresAt: uploadForm.expiresAt || undefined,
        fileUrl: uploadData.url,
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
        notes: uploadForm.notes.trim() || undefined,
      };

      const docRes = await fetch("/api/user-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docPayload),
      });

      const docData = await docRes.json();
      if (!docRes.ok) {
        throw new Error(docData.error || "Failed to save document record");
      }

      toast.success("Document uploaded successfully!");
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadForm({
        type: "INSURANCE_COI",
        title: "",
        documentNumber: "",
        issuingAuthority: "",
        expiresAt: "",
        notes: "",
      });
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/user-documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Document deleted");
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete document");
      }
    } catch {
      toast.error("Error deleting document");
    }
  };

  const handleVerifyToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "VERIFIED" ? "ACTIVE" : "VERIFIED";
    try {
      const res = await fetch(`/api/user-documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(newStatus === "VERIFIED" ? "Document verified & approved" : "Verification removed");
        loadDocuments();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Error updating status");
    }
  };

  // Filtered list
  const filteredDocuments = documents.filter((doc) => {
    const matchesType = selectedType === "ALL" || doc.type === selectedType;
    const matchesQuery =
      searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.issuingAuthority?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  // Compliance metrics
  const expiredDocs = documents.filter((d) => d.isExpired);
  const expiringSoonDocs = documents.filter((d) => d.isExpiringSoon && !d.isExpired);
  const verifiedDocs = documents.filter((d) => d.status === "VERIFIED");

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            {userName ? `${userName}'s Documents & Compliance` : "My Documents & Compliance"}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Manage your personal CV, professional licenses, insurance certificates (COI), and tax forms.
          </p>
        </div>

        {!readOnly && (
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Compliance Alert Banner */}
      {expiredDocs.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-400">Action Required: Expired Compliance Documents</h4>
            <p className="text-[11px] text-text-secondary mt-0.5">
              You have {expiredDocs.length} expired document(s):{" "}
              <span className="font-semibold text-rose-300">
                {expiredDocs.map((d) => d.title).join(", ")}
              </span>
              . Please upload renewal copies to remain active.
            </p>
          </div>
        </div>
      )}

      {expiringSoonDocs.length > 0 && expiredDocs.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-400">Upcoming Expirations (Next 30 Days)</h4>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {expiringSoonDocs.length} document(s) expiring soon:{" "}
              <span className="font-semibold text-amber-300">
                {expiringSoonDocs.map((d) => `${d.title} (${d.daysUntilExpiry}d left)`).join(", ")}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Documents</p>
          <p className="text-xl font-black text-text-primary mt-1">{documents.length}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Verified & Active</p>
          <p className="text-xl font-black text-emerald-400 mt-1">{verifiedDocs.length}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Expiring Soon</p>
          <p className="text-xl font-black text-amber-400 mt-1">{expiringSoonDocs.length}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Expired</p>
          <p className="text-xl font-black text-rose-400 mt-1">{expiredDocs.length}</p>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title, policy #, or authority..."
              className="pl-9 bg-surface"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedType("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              selectedType === "ALL"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "bg-surface text-text-secondary hover:bg-surface-hover border border-border-subtle"
            )}
          >
            All Categories ({documents.length})
          </button>
          {DOCUMENT_TYPES.map((t) => {
            const count = documents.filter((d) => d.type === t.value).length;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setSelectedType(t.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  selectedType === t.value
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "bg-surface text-text-secondary hover:bg-surface-hover border border-border-subtle"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Grid / List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto mb-3" />
          <p className="text-xs text-text-muted">Loading compliance documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-border-medium">
          <ShieldCheck className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-30" />
          <h3 className="text-sm font-bold text-text-primary">No documents found</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
            {selectedType !== "ALL"
              ? "No documents in this category. Click Upload to add your credentials."
              : "Upload your CV, Insurance COI, Licenses, or W-9 form to complete your compliance profile."}
          </p>
          {!readOnly && (
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="mt-4 gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Upload Now
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => {
            const typeConfig = DOCUMENT_TYPES.find((t) => t.value === doc.type) || DOCUMENT_TYPES[7];
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={doc.id}
                className={cn(
                  "p-4 rounded-2xl bg-surface border transition-all hover:border-border-medium flex flex-col justify-between gap-4 group relative overflow-hidden",
                  doc.isExpired
                    ? "border-rose-500/30 bg-rose-500/[0.02]"
                    : doc.isExpiringSoon
                    ? "border-amber-500/30 bg-amber-500/[0.02]"
                    : "border-border-subtle hover:border-cyan-500/30"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-2.5 rounded-xl border flex-shrink-0", typeConfig.color)}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary line-clamp-1 group-hover:text-cyan-400 transition-colors">
                          {doc.title}
                        </h4>
                        <span className="text-[10px] font-semibold text-text-muted">
                          {typeConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {doc.status === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </span>
                      ) : doc.isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="h-3 w-3" />
                          Expired
                        </span>
                      ) : doc.isExpiringSoon ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="h-3 w-3" />
                          {doc.daysUntilExpiry}d left
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px]">
                    {doc.documentNumber && (
                      <div className="flex items-center gap-1.5 text-text-secondary bg-surface-hover/60 px-2 py-1 rounded-lg">
                        <Hash className="h-3 w-3 text-text-muted" />
                        <span className="font-mono text-[10px] font-bold">{doc.documentNumber}</span>
                      </div>
                    )}
                    {doc.issuingAuthority && (
                      <div className="flex items-center gap-1.5 text-text-secondary bg-surface-hover/60 px-2 py-1 rounded-lg">
                        <Building2 className="h-3 w-3 text-text-muted" />
                        <span className="line-clamp-1">{doc.issuingAuthority}</span>
                      </div>
                    )}
                    {doc.expiresAt && (
                      <div className="flex items-center gap-1.5 text-text-secondary bg-surface-hover/60 px-2 py-1 rounded-lg col-span-2">
                        <Calendar className="h-3 w-3 text-text-muted" />
                        <span>
                          Expires:{" "}
                          <strong className={doc.isExpired ? "text-rose-400" : doc.isExpiringSoon ? "text-amber-400" : "text-text-primary"}>
                            {new Date(doc.expiresAt).toLocaleDateString()}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {doc.notes && (
                    <p className="text-[11px] text-text-muted mt-2.5 line-clamp-2 italic bg-surface-hover/30 p-2 rounded-lg">
                      "{doc.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Toolbar */}
                <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                  <div className="text-[10px] text-text-dim">
                    Uploaded {formatDate(doc.createdAt)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Admin Verification Action */}
                    {isStaff && (
                      <button
                        onClick={() => handleVerifyToggle(doc.id, doc.status)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1",
                          doc.status === "VERIFIED"
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                        )}
                        title={doc.status === "VERIFIED" ? "Revoke Verification" : "Mark as Verified"}
                      >
                        <Check className="h-3 w-3" />
                        {doc.status === "VERIFIED" ? "Unverify" : "Verify"}
                      </button>
                    )}

                    {/* View / Download */}
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-surface-hover hover:bg-cyan-500/15 text-text-secondary hover:text-cyan-300 border border-border-subtle transition-all"
                      title="View / Download Document"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    {!readOnly && (
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="p-1.5 rounded-lg bg-surface-hover hover:bg-rose-500/15 text-text-secondary hover:text-rose-400 border border-border-subtle transition-all"
                        title="Delete Document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Compliance Document"
        size="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* File Selector */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">
              Document File (PDF, Images, DOCX up to 10MB) *
            </label>
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border-medium rounded-2xl hover:border-cyan-500/50 bg-surface-hover/30 cursor-pointer transition-all group">
              <input
                type="file"
                accept=".pdf,application/pdf,image/*,.docx,.doc,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUploadChange}
                className="hidden"
              />
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform mb-2">
                <Upload className="h-6 w-6" />
              </div>
              {uploadFile ? (
                <div className="text-center">
                  <p className="text-xs font-bold text-cyan-400">{uploadFile.name}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-bold text-text-primary">
                    Click to select or drag & drop file here
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Supports PDF, PNG, JPG, DOCX
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">
              Document Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DOCUMENT_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = uploadForm.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setUploadForm({ ...uploadForm, type: t.value })}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all",
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm"
                        : "bg-surface-hover/50 border-border-subtle text-text-secondary hover:bg-surface-hover"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-bold leading-tight line-clamp-2">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Document Title *"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              placeholder="e.g. 2026 General Liability COI"
              required
            />
            <Input
              label="Expiration Date (If Applicable)"
              type="date"
              value={uploadForm.expiresAt}
              onChange={(e) => setUploadForm({ ...uploadForm, expiresAt: e.target.value })}
            />
          </div>

          {/* Policy / License # & Issuer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Policy / License / Document #"
              value={uploadForm.documentNumber}
              onChange={(e) => setUploadForm({ ...uploadForm, documentNumber: e.target.value })}
              placeholder="e.g. POL-9840212 or LIC-IL-8492"
            />
            <Input
              label="Issuing Authority / Insurance Carrier"
              value={uploadForm.issuingAuthority}
              onChange={(e) => setUploadForm({ ...uploadForm, issuingAuthority: e.target.value })}
              placeholder="e.g. Travelers Insurance, State Board"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Notes / Coverage Details (Optional)
            </label>
            <textarea
              value={uploadForm.notes}
              onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
              placeholder="e.g. $1M/$2M Aggregate coverage, includes property preservation endorsements."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border-medium text-xs text-text-primary focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setUploadModalOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={uploading}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
            >
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
