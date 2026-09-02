"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Camera,
  Download,
  CheckSquare,
  Square,
  Check,
  Loader2,
  ZoomIn,
  SlidersHorizontal,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  PhotoDownloadItem,
  PhotoStampMode,
  downloadPhotosBatch,
  processPhotoForDownload,
  safeFileName,
} from "@/lib/photo-download-helper";
import { triggerFileDownload } from "@/lib/download-helper";
import toast from "react-hot-toast";

interface ItemPhotoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  photos: PhotoDownloadItem[];
  itemType?: "task" | "bid" | "inspection" | "all";
}

export function ItemPhotoDownloadModal({
  isOpen,
  onClose,
  title,
  subtitle,
  photos = [],
  itemType = "task",
}: ItemPhotoDownloadModalProps) {
  const [downloadMode, setDownloadMode] = useState<PhotoStampMode>("datetime");
  const [customDateTime, setCustomDateTime] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [previewPhoto, setPreviewPhoto] = useState<PhotoDownloadItem | null>(null);

  const getPhotoKey = (p: PhotoDownloadItem, idx: number) => String(p.id || p.url || p.path || `photo-${idx}`);

  // Distinct categories available in these photos
  const availableCategories = Array.from(
    new Set(photos.map((p) => p.category).filter(Boolean) as string[])
  );

  const filteredPhotos = categoryFilter === "ALL"
    ? photos
    : photos.filter((p) => p.category === categoryFilter);

  const selectedPhotosList = filteredPhotos.filter((p, i) =>
    selectedPhotoIds.has(getPhotoKey(p, i))
  );

  const toggleSelectPhoto = (p: PhotoDownloadItem, idx: number) => {
    const key = getPhotoKey(p, idx);
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    const allKeys = new Set(filteredPhotos.map((p, i) => getPhotoKey(p, i)));
    setSelectedPhotoIds(allKeys);
  };

  const deselectAll = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleDownloadSingle = async (p: PhotoDownloadItem, idx: number) => {
    const baseName = safeFileName(p.name || p.originalName || `${itemType}-photo-${idx + 1}`);
    toast.loading("Preparing photo download...", { id: "single-dl" });
    try {
      const file = await processPhotoForDownload(p, baseName, downloadMode, customDateTime);
      if (file) {
        await triggerFileDownload(file.blob, file.name);
        toast.success("Photo downloaded", { id: "single-dl" });
      } else {
        toast.error("Failed to process photo", { id: "single-dl" });
      }
    } catch {
      toast.error("Download failed", { id: "single-dl" });
    }
  };

  const handleDownloadBatch = async (photosToDownload: PhotoDownloadItem[]) => {
    if (!photosToDownload.length) {
      toast.error("No photos selected to download");
      return;
    }
    setDownloading(true);
    setDownloadProgress({ current: 0, total: photosToDownload.length });

    const zipName = `${safeFileName(title)}-photos-${new Date().toISOString().slice(0, 10)}.zip`;

    await downloadPhotosBatch(photosToDownload, {
      mode: downloadMode,
      customDateTime,
      zipFilename: zipName,
      onProgress: (current, total) => setDownloadProgress({ current, total }),
    });

    setDownloading(false);
    setDownloadProgress(null);
  };

  // Keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewPhoto) setPreviewPhoto(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, previewPhoto, onClose]);

  if (!isOpen) return null;

  const colorConfig = {
    task: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
    bid: { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
    inspection: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    all: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  }[itemType];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2147483600 }}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border-subtle bg-surface/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", colorConfig.bg, colorConfig.border)}>
              <Camera className={cn("h-5 w-5", colorConfig.text)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary tracking-tight">{title}</h2>
                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", colorConfig.bg, colorConfig.text, colorConfig.border)}>
                  {itemType}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {subtitle || `${photos.length} photo${photos.length !== 1 ? "s" : ""} available for download`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="self-end sm:self-center p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar with Timestamp Options & Selection Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-border-subtle bg-surface-hover/50 flex-shrink-0">
          
          {/* Category Filter Pills (if multiple categories exist) */}
          {availableCategories.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              <button
                onClick={() => setCategoryFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                  categoryFilter === "ALL"
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-sm"
                    : "bg-surface border-border-subtle text-text-muted hover:text-text-secondary"
                )}
              >
                All ({photos.length})
              </button>
              {availableCategories.map((cat) => {
                const count = photos.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all",
                      categoryFilter === cat
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-sm"
                        : "bg-surface border-border-subtle text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Controls: Stamp Mode Dropdown + Custom Datetime + Select Mode */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            
            {/* Timestamp Option Dropdown */}
            <div className="relative flex items-center">
              <select
                value={downloadMode}
                onChange={(e) => setDownloadMode(e.target.value as PhotoStampMode)}
                className="h-9 rounded-xl border border-border-medium bg-surface px-3 pr-8 text-xs font-semibold text-text-primary shadow-sm outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 cursor-pointer"
                title="Date & Time Stamping Option"
              >
                <option value="datetime">✓ With date & time stamp</option>
                <option value="date">With date only stamp</option>
                <option value="time">With time only stamp</option>
                <option value="custom">Custom date & time stamp</option>
                <option value="customDate">Custom date only (without time)</option>
                <option value="customTime">Custom time only (without date)</option>
                <option value="datetimeExif">With date, time & EXIF data</option>
                <option value="none">Without date/time stamp</option>
              </select>
            </div>

            {/* Custom Date Time Input when custom is chosen */}
            {downloadMode === "custom" && (
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="h-9 rounded-xl border border-cyan-500/40 bg-surface px-2.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-cyan-500/20"
                title="Pick custom date and time to stamp on photos"
              />
            )}
            {downloadMode === "customDate" && (
              <input
                type="date"
                value={customDateTime ? customDateTime.split("T")[0] : ""}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="h-9 rounded-xl border border-cyan-500/40 bg-surface px-2.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-cyan-500/20"
                title="Pick custom date (without time) to stamp on photos"
              />
            )}
            {downloadMode === "customTime" && (
              <input
                type="time"
                value={customDateTime && customDateTime.includes("T") ? customDateTime.split("T")[1]?.substring(0, 5) : customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="h-9 rounded-xl border border-cyan-500/40 bg-surface px-2.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-cyan-500/20"
                title="Pick custom time (without date) to stamp on photos"
              />
            )}

            {/* Selection Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setSelectionMode((prev) => !prev);
                if (selectionMode) setSelectedPhotoIds(new Set());
              }}
              className={cn(
                "h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all",
                selectionMode
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-sm"
                  : "bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-hover"
              )}
            >
              {selectionMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              <span>{selectionMode ? "Selecting" : "Select Photos"}</span>
            </button>

            {/* Select All / Deselect All button when selection mode is active */}
            {selectionMode && (
              <button
                type="button"
                onClick={selectedPhotoIds.size === filteredPhotos.length ? deselectAll : selectAll}
                className="h-9 px-3 rounded-xl border border-border-subtle bg-surface text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
              >
                {selectedPhotoIds.size === filteredPhotos.length ? "Deselect All" : "Select All"}
              </button>
            )}

            {/* Download Selected Button */}
            {selectionMode && (
              <button
                type="button"
                onClick={() => handleDownloadBatch(selectedPhotosList)}
                disabled={selectedPhotosList.length === 0 || downloading}
                className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span>Download Selected ({selectedPhotosList.length})</span>
              </button>
            )}

            {/* Download All Button */}
            <button
              type="button"
              onClick={() => handleDownloadBatch(filteredPhotos)}
              disabled={filteredPhotos.length === 0 || downloading}
              className={cn(
                "h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                selectionMode
                  ? "bg-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20"
              )}
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span>Download All ({filteredPhotos.length})</span>
            </button>

          </div>
        </div>

        {/* Progress Bar when downloading */}
        {downloadProgress && (
          <div className="px-6 py-2 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center justify-between text-xs text-cyan-400">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Stamping & packaging photos ({downloadProgress.current} of {downloadProgress.total})...</span>
            </div>
            <span className="font-bold">{Math.round((downloadProgress.current / downloadProgress.total) * 100)}%</span>
          </div>
        )}

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-16 text-text-dim">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-text-muted">No photos found for this item</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredPhotos.map((photo, idx) => {
                const key = getPhotoKey(photo, idx);
                const isSelected = selectedPhotoIds.has(key);

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelectPhoto(photo, idx);
                      } else {
                        setPreviewPhoto(photo);
                      }
                    }}
                    className={cn(
                      "group relative rounded-2xl overflow-hidden aspect-square bg-surface-hover border transition-all cursor-pointer",
                      isSelected
                        ? "border-cyan-500 ring-2 ring-cyan-500/30 scale-[0.98]"
                        : "border-border-subtle hover:border-border-medium hover:scale-[1.01]"
                    )}
                  >
                    {/* Photo Image */}
                    <img
                      src={photo.url || photo.path}
                      alt={photo.name || "Photo"}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />

                    {/* Selection Checkbox (always visible when selectionMode, or on hover) */}
                    <div
                      className={cn(
                        "absolute top-2 left-2 z-10 transition-all",
                        selectionMode ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectPhoto(photo, idx);
                      }}
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded-lg flex items-center justify-center border shadow-md transition-all",
                          isSelected
                            ? "bg-cyan-500 text-white border-cyan-400 shadow-cyan-500/40"
                            : "bg-black/60 text-white/50 border-white/30 hover:border-white/80"
                        )}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : null}
                      </div>
                    </div>

                    {/* Category badge */}
                    {photo.category && (
                      <div className="absolute top-2 right-2 z-10">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-md backdrop-blur-md",
                            photo.category === "BEFORE"
                              ? "bg-amber-500/90 text-white"
                              : photo.category === "DURING"
                              ? "bg-cyan-500/90 text-white"
                              : photo.category === "AFTER"
                              ? "bg-emerald-500/90 text-white"
                              : "bg-rose-500/90 text-white"
                          )}
                        >
                          {photo.category}
                        </span>
                      </div>
                    )}

                    {/* Hover actions & single download button */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3">
                      <p className="text-[11px] font-bold text-white truncate mb-2">
                        {photo.name || photo.originalName || `Photo #${idx + 1}`}
                      </p>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSingle(photo, idx);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold flex items-center justify-center gap-1 backdrop-blur-md transition-colors"
                          title="Download this photo"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPhoto(photo);
                          }}
                          className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
                          title="Preview full size"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle bg-surface-hover/30 text-xs text-text-dim flex-shrink-0">
          <span>Stamping mode: <strong className="text-text-primary capitalize">{downloadMode}</strong></span>
          <span>{filteredPhotos.length} photo{filteredPhotos.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Lightbox / Preview Modal for single photo */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-[2147483650] flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewPhoto.url || previewPhoto.path}
              alt={previewPhoto.name || "Preview"}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => handleDownloadSingle(previewPhoto, 0)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Download className="h-4 w-4" />
                <span>Download with current stamp ({downloadMode})</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
