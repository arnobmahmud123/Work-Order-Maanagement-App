"use client";

import { useState, useRef, lazy, Suspense, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Camera,
  Upload,
  X,
  ZoomIn,
  Trash2,
  Loader2,
  MapPin,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Info,
  ImagePlus,
  Download,
} from "lucide-react";
import { readEXIF, type EXIFInfo } from "@/lib/exif";
import { compressImageToTarget } from "@/lib/image-compression";
import { ItemPhotoDownloadModal } from "./item-photo-download-modal";

function parseEXIFDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [datePart, timePart] = dateStr.split(" ");
  if (!datePart || !timePart) return new Date();
  const [y, m, d] = datePart.split(":");
  return new Date(`${y}-${m}-${d}T${timePart}`);
}

// Lazy load the editor to avoid bloating initial bundle
const PhotoEditor = lazy(() =>
  import("@/components/photo-editor").then((m) => ({ default: m.PhotoEditor }))
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PhotoItem {
  id: string;
  url: string;
  /** Permanent public R2 URL — stored to DB. url may be a short-lived signed URL for display only. */
  rawUrl?: string;
  name: string;
  size: number;
  category: PhotoCategory;
  timestamp?: string;
  /** If true, this photo is already saved on the server (not a blob URL) */
  persisted?: boolean;
}

export type PhotoCategory = "BEFORE" | "DURING" | "AFTER" | "BID" | "INSPECTION" | "PROPERTY_FRONT";

const CATEGORY_CONFIG: Record<
  PhotoCategory,
  { label: string; color: string; gradient: string; icon: string }
> = {
  BEFORE: {
    label: "Before",
    color: "text-amber-400",
    gradient: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    icon: "📋",
  },
  DURING: {
    label: "During",
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
    icon: "🔧",
  },
  AFTER: {
    label: "After",
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    icon: "✅",
  },
  BID: {
    label: "Bid",
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
    icon: "💰",
  },
  INSPECTION: {
    label: "Inspection",
    color: "text-violet-400",
    gradient: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
    icon: "🔍",
  },
  PROPERTY_FRONT: {
    label: "Property Front",
    color: "text-sky-400",
    gradient: "from-sky-500/20 to-indigo-500/20 border-sky-500/30",
    icon: "🏠",
  },
};

// ─── Photo Bucket ────────────────────────────────────────────────────────────

function PhotoBucket({
  category,
  photos,
  onDrop,
  onRemove,
  onView,
  onEdit,
  onDownload,
  onDownloadSingle,
  hideLabel,
  uploading,
  compact,
}: {
  category: PhotoCategory;
  photos: PhotoItem[];
  onDrop: (files: File[], category: PhotoCategory) => void;
  onRemove: (id: string) => void;
  onView: (photo: PhotoItem) => void;
  onEdit?: (photo: PhotoItem) => void;
  onDownload?: (category: PhotoCategory) => void;
  onDownloadSingle?: (photo: PhotoItem) => void;
  hideLabel?: boolean;
  uploading?: boolean;
  compact?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = CATEGORY_CONFIG[category];

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) onDrop(files, category);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) onDrop(files, category);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Bucket header */}
      {!hideLabel && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{config.icon}</span>
          <h4 className={cn("text-sm font-semibold", config.color)}>
            {config.label}
          </h4>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-hover text-text-muted">
            {photos.length}
          </span>
          {uploading && (
            <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />
          )}
          {photos.length > 0 && onDownload && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(category);
              }}
              className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-cyan-400 transition-colors ml-auto cursor-pointer"
              title={`Download ${config.label} photos`}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col",
          compact ? "min-h-[92px]" : "min-h-[140px]",
          isDragOver
            ? `bg-gradient-to-br ${config.gradient} border-solid scale-[1.02]`
            : photos.length === 0
            ? "border-border-subtle hover:border-border-subtle bg-surface-hover hover:bg-surface-hover"
            : "border-border-subtle bg-surface-hover hover:border-border-subtle"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {photos.length === 0 ? (
          <div className={cn("flex-1 flex flex-col items-center justify-center gap-2", compact ? "p-3" : "p-4")}>
            <div
              className={cn(
                "rounded-xl flex items-center justify-center transition-all",
                compact ? "h-8 w-8" : "h-10 w-10",
                isDragOver
                  ? `bg-gradient-to-br ${config.gradient}`
                  : "bg-surface-hover"
              )}
            >
              <Upload
                className={cn(
                  "transition-colors",
                  compact ? "h-4 w-4" : "h-5 w-5",
                  isDragOver ? config.color : "text-text-dim"
                )}
              />
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-medium", isDragOver ? config.color : "text-text-muted")}>
                {isDragOver ? "Drop photos here" : "Drag & drop photos"}
              </p>
              <p className="text-[10px] text-text-dim mt-0.5">
                or click to browse
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {/* Photo grid — scrollable container caps visible height */}
            <div className={cn("overflow-y-auto overflow-x-hidden pr-1", compact ? "max-h-[156px]" : "max-h-[400px]")}>
              <div className={cn("grid gap-1.5", compact ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8" : "grid-cols-2")}>
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(photo);
                    }}
                    className="relative group rounded-lg overflow-hidden aspect-square bg-surface-hover cursor-pointer"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        "w-full h-full object-cover transition-opacity",
                        !photo.persisted && "opacity-60"
                      )}
                    />
                    {!photo.persisted && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}

                    {/* Mobile Touch Quick Action Badge */}
                    <div className="absolute top-1.5 right-1.5 flex md:hidden items-center gap-1 z-10">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(photo);
                          }}
                          className="p-1.5 rounded-lg bg-violet-950/90 text-violet-200 border border-violet-500/50 shadow-md backdrop-blur-md active:scale-95"
                          title="Edit Photo"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/40 transition-colors hidden md:flex items-center justify-center gap-1 opacity-0 md:group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(photo);
                        }}
                        className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                      >
                        <ZoomIn className="h-3 w-3" />
                      </button>
                      {onDownloadSingle && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadSingle(photo);
                          }}
                          className="p-1.5 rounded-lg bg-cyan-600/80 text-white hover:bg-cyan-600 transition-colors"
                          title="Download photo"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(photo);
                          }}
                          className="p-1.5 rounded-lg bg-violet-600/80 text-white hover:bg-violet-600 transition-colors"
                          title="Edit photo"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(photo.id);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add more */}
            <div className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border-subtle hover:border-border-subtle text-text-dim hover:text-text-secondary transition-colors">
              <Camera className="h-3.5 w-3.5" />
              <span className="text-[11px]">Add more</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Photo Upload Section (3 buckets) ────────────────────────────────────────

/**
 * Photo upload section with Before/During/After buckets.
 *
 * Props:
 * - `photos` / `onPhotosChange`: local photo state (includes both blob and persisted photos)
 * - `onUpload`: called when files need to be uploaded to the server. Should return permanent URL.
 *   Signature: (file: File, category: PhotoCategory) => Promise<{ url: string; id: string }>
 * - `existingFiles`: files already saved on the server (from workOrder.files)
 */
export function PhotoUploadSection({
  photos,
  onPhotosChange,
  onUpload,
  existingFiles,
  existingPhotos,
  title = "Photos",
  singleBucket,
  singleBucketCategory,
  showCategories,
  onOpenCamera,
  className,
  compact,
}: {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  onUpload?: (file: File, category: PhotoCategory) => Promise<{ url: string; rawUrl?: string; id: string }>;
  existingFiles?: any[];
  existingPhotos?: PhotoItem[];
  title?: string;
  singleBucket?: boolean;
  /** Category used by single-bucket mode. Defaults to the first shown category. */
  singleBucketCategory?: PhotoCategory;
  /** Which categories to show. Defaults to ["BEFORE","DURING","AFTER"]. */
  showCategories?: PhotoCategory[];
  /** Called when user taps the GPS Camera button */
  onOpenCamera?: (category: PhotoCategory) => void;
  className?: string;
  compact?: boolean;
}) {
  const [viewerPhoto, setViewerPhoto] = useState<PhotoItem | null>(null);
  const [editorPhoto, setEditorPhoto] = useState<PhotoItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedExistingIds, setSelectedExistingIds] = useState<Set<string>>(new Set());
  const [targetCategory, setTargetCategory] = useState<PhotoCategory>("DURING");
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadModalPhotos, setDownloadModalPhotos] = useState<PhotoItem[]>([]);
  const [downloadModalTitle, setDownloadModalTitle] = useState("");

  const photosRef = useRef(photos);
  photosRef.current = photos;

  const categories: PhotoCategory[] =
    showCategories && showCategories.length > 0
      ? showCategories
      : ["BEFORE", "DURING", "AFTER"];
  const bucketCategory = singleBucketCategory || categories[0] || "DURING";

  function getPhotosByCategory(cat: PhotoCategory): PhotoItem[] {
    return photos.filter((p) => p.category === cat);
  }

  async function handleDrop(files: File[], category: PhotoCategory) {
    // Helper: read a File as base64 data URL (works on iOS WebKit, unlike blob: URLs)
    function toDataURL(file: File): Promise<string> {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    // Create immediate base64 previews for iOS WebKit compatibility
    const previews: PhotoItem[] = await Promise.all(
      files.map(async (file) => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: await toDataURL(file),
        name: file.name,
        size: file.size,
        category,
        timestamp: new Date().toISOString(),
        persisted: false,
      }))
    );

    // Add previews immediately for instant feedback
    const currentPhotos = photosRef.current;
    onPhotosChange([...currentPhotos, ...previews]);

    // If upload handler provided, upload each file
    if (onUpload) {
      setUploading(true);
      try {
        const uploaded: PhotoItem[] = [];
        for (let i = 0; i < files.length; i++) {
          try {
            const compressedFile = await compressImageToTarget(files[i], {
              maxSizeBytes: 200 * 1024,
              maxDimension: 1600,
              initialQuality: 0.72,
            });
            const result = await onUpload(compressedFile, category);
            uploaded.push({
              id: result.id,
              url: result.url,
              rawUrl: result.rawUrl,
              name: compressedFile.name,
              size: compressedFile.size,
              category,
              timestamp: new Date().toISOString(),
              persisted: true,
            });
          } catch (err) {
            console.error("Failed to upload:", files[i].name, err);
            toast.error(`Failed to upload ${files[i].name}: ${err instanceof Error ? err.message : "Unknown error"}`);
          }
        }

        // Use latest photos ref to avoid stale closure
        const latestPhotos = photosRef.current;
        const withoutPreviews = latestPhotos.filter(
          (p) => !previews.find((pre) => pre.id === p.id)
        );
        onPhotosChange([...withoutPreviews, ...uploaded]);
      } finally {
        setUploading(false);
      }
    }
  }

  function handleRemove(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (photo?.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
    onPhotosChange(photos.filter((p) => p.id !== id));
  }

  const totalPhotos = photos.length;

  // Single bucket mode (for bids / inspection)
  if (singleBucket) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          </div>
          {totalPhotos > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDownloadModalPhotos(photos);
                  setDownloadModalTitle(title || "Photos");
                  setDownloadModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Download photos with timestamp & selection"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>

        <PhotoBucket
          category={bucketCategory}
          photos={photos}
          onDrop={(files) => handleDrop(files, bucketCategory)}
          onRemove={handleRemove}
          onView={setViewerPhoto}
          onEdit={setEditorPhoto}
          onDownload={() => {
            setDownloadModalPhotos(photos);
            setDownloadModalTitle(title || "Photos");
            setDownloadModalOpen(true);
          }}
          onDownloadSingle={(singleP) => {
            setDownloadModalPhotos([singleP]);
            setDownloadModalTitle(singleP.name || "Photo");
            setDownloadModalOpen(true);
          }}
          hideLabel
          uploading={uploading}
          compact={compact}
        />

        <div className="flex gap-2">
          {onOpenCamera && (
            <button
              type="button"
              onClick={() => onOpenCamera(bucketCategory)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/[0.05] text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-xs font-medium"
            >
              <MapPin className="h-3.5 w-3.5" />
              GPS Camera
            </button>
          )}
          {existingPhotos && existingPhotos.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTargetCategory(bucketCategory);
                setSelectedExistingIds(new Set());
                setShowAttachModal(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-sky-500/30 bg-sky-500/[0.05] text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all text-xs font-medium"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Select Existing
            </button>
          )}
        </div>

        {/* Lightbox */}
        {viewerPhoto && createPortal(
          <PhotoLightboxNav
            photos={photos}
            currentPhoto={viewerPhoto}
            onClose={() => setViewerPhoto(null)}
            onEdit={(photo) => { setEditorPhoto(photo); setViewerPhoto(null); }}
            onRemove={(id) => { handleRemove(id); setViewerPhoto(null); }}
          />,
          document.body
        )}

        {/* Image Editor (single bucket) - portaled to body */}
        {editorPhoto && createPortal(
          <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center bg-black/90" style={{ zIndex: 2147483647 }}>
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
            </div>
          }>
            <PhotoEditor
              imageUrl={editorPhoto.url}
              onClose={() => setEditorPhoto(null)}
              onSave={(blob) => {
                if (onUpload) {
                  const file = new File([blob], editorPhoto.name.replace(/\.[^.]+$/, "") + "-edited.png", { type: "image/png" });
                  onUpload(file, editorPhoto.category).then((result) => {
                    onPhotosChange(photos.map((p) =>
                      p.id === editorPhoto.id ? { ...p, url: result.url, id: result.id, persisted: true } : p
                    ));
                  }).catch((err) => console.error("Failed to save edited image:", err));
                }
                setEditorPhoto(null);
              }}
            />
          </Suspense>,
          document.body
        )}

        {showAttachModal && existingPhotos && typeof window !== "undefined" && createPortal(
          <div className="fixed inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-[999999]" onClick={() => setShowAttachModal(false)}>
            <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 m-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Select Existing Photos</h3>
                <button onClick={() => setShowAttachModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-zinc-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <p className="text-[11px] text-zinc-400">
                Choose photos from this work order to attach to this item. Already attached photos are marked with a check.
              </p>

              <div className="grid grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {existingPhotos.map((photo) => {
                  const isAttached = photos.some((p) => p.url === photo.url);
                  const isSelected = selectedExistingIds.has(photo.url);

                  return (
                    <div
                      key={photo.url}
                      onClick={() => {
                        if (isAttached) return;
                        const next = new Set(selectedExistingIds);
                        if (isSelected) next.delete(photo.url);
                        else next.add(photo.url);
                        setSelectedExistingIds(next);
                      }}
                      className={cn(
                        "relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer",
                        isAttached ? "border-zinc-800 opacity-40 cursor-not-allowed" :
                        isSelected ? "border-sky-500 scale-95 shadow-md shadow-sky-500/20" : "border-white/10 hover:border-white/20"
                      )}
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      
                      {/* Checkmark overlay for selected/attached states */}
                      {isAttached && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Attached</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-sky-500 flex items-center justify-center text-black font-black text-[10px]">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-xs font-bold text-zinc-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedExistingIds.size === 0}
                  onClick={() => {
                    const toAttach = existingPhotos.filter((p) => selectedExistingIds.has(p.url)).map((p, idx) => ({
                      ...p,
                      id: p.id || `attached-photo-${Date.now()}-${idx}`,
                      persisted: true,
                      category: targetCategory // Assign the current bucket's category!
                    }));
                    onPhotosChange([...photos, ...toAttach]);
                    setSelectedExistingIds(new Set());
                    setShowAttachModal(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-500 text-xs font-bold text-black hover:bg-sky-400 disabled:opacity-40"
                >
                  Attach Selected ({selectedExistingIds.size})
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Single Bucket Photo Download Modal */}
        {downloadModalOpen && (
          <ItemPhotoDownloadModal
            isOpen={downloadModalOpen}
            onClose={() => setDownloadModalOpen(false)}
            title={downloadModalTitle || title || "Photos"}
            photos={downloadModalPhotos}
          />
        )}
      </div>
    );
  }

  // Multi-bucket mode (default)
  const activeBuckets = categories.map((cat) => ({ cat, photos: getPhotosByCategory(cat) }));
  const filledBuckets = activeBuckets.filter((b) => b.photos.length > 0).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {totalPhotos > 0 && (
            <>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDownloadModalPhotos(photos);
                  setDownloadModalTitle(title || "Photos");
                  setDownloadModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Download photos with timestamp & selection"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
            </>
          )}
          {uploading && (
            <span className="text-[10px] text-cyan-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading...
            </span>
          )}
        </div>
      </div>

      {/* Buckets */}
      <div className={cn("grid grid-cols-1 gap-4", categories.length >= 3 ? "sm:grid-cols-3" : categories.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
        {categories.map((cat) => (
          <div key={cat} className="space-y-2">
            <PhotoBucket
              category={cat}
              photos={getPhotosByCategory(cat)}
              onDrop={handleDrop}
              onRemove={handleRemove}
              onView={setViewerPhoto}
              onEdit={setEditorPhoto}
              onDownload={(bucketCat) => {
                const bPhotos = getPhotosByCategory(bucketCat);
                setDownloadModalPhotos(bPhotos);
                setDownloadModalTitle(`${title || "Photos"} - ${bucketCat}`);
                setDownloadModalOpen(true);
              }}
              onDownloadSingle={(singleP) => {
                setDownloadModalPhotos([singleP]);
                setDownloadModalTitle(singleP.name || "Photo");
                setDownloadModalOpen(true);
              }}
              uploading={uploading}
            />
            <div className="flex gap-2">
              {onOpenCamera && (
                <button
                  type="button"
                  onClick={() => onOpenCamera(cat)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/[0.05] text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-xs font-medium"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  GPS Camera
                </button>
              )}
              {existingPhotos && existingPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetCategory(cat);
                    setSelectedExistingIds(new Set());
                    setShowAttachModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-sky-500/30 bg-sky-500/[0.05] text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/50 transition-all text-xs font-medium"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Select Existing
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Completion indicator */}
      {filledBuckets > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-text-secondary">Photo Progress</span>
              <span className="text-[11px] font-semibold text-text-secondary">
                {filledBuckets}/{categories.length} stages
              </span>
            </div>
            <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(filledBuckets / categories.length) * 100}%` }}
              />
            </div>
          </div>
          {filledBuckets === categories.length && (
            <span className="text-xs text-emerald-400 font-medium">✓ Complete</span>
          )}
        </div>
      )}

      {/* Lightbox */}
      {viewerPhoto && createPortal(
        <PhotoLightboxNav
          photos={photos}
          currentPhoto={viewerPhoto}
          onClose={() => setViewerPhoto(null)}
          onEdit={(photo) => { setEditorPhoto(photo); setViewerPhoto(null); }}
          onRemove={(id) => { handleRemove(id); setViewerPhoto(null); }}
        />,
        document.body
      )}

      {/* Image Editor - portaled to body to escape stacking context */}
      {editorPhoto && createPortal(
        <Suspense fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-black/90" style={{ zIndex: 2147483647 }}>
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          </div>
        }>
          <PhotoEditor
            imageUrl={editorPhoto.url}
            onClose={() => setEditorPhoto(null)}
            onSave={(blob) => {
              // If there's an upload handler, save the edited image
              if (onUpload) {
                const file = new File([blob], editorPhoto.name.replace(/\.[^.]+$/, "") + "-edited.png", { type: "image/png" });
                onUpload(file, editorPhoto.category).then((result) => {
                  // Update the photo in the list
                  onPhotosChange(photos.map((p) =>
                    p.id === editorPhoto.id ? { ...p, url: result.url, id: result.id, persisted: true } : p
                  ));
                }).catch((err) => console.error("Failed to save edited image:", err));
              }
              setEditorPhoto(null);
            }}
          />
        </Suspense>,
        document.body
      )}

      {showAttachModal && existingPhotos && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-[999999]" onClick={() => setShowAttachModal(false)}>
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Select Existing Photos</h3>
              <button onClick={() => setShowAttachModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-zinc-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-400">
              Choose photos from this work order to attach to this item. Already attached photos are marked with a check.
            </p>

            <div className="grid grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {existingPhotos.map((photo) => {
                const isAttached = photos.some((p) => p.url === photo.url);
                const isSelected = selectedExistingIds.has(photo.url);

                return (
                  <div
                    key={photo.url}
                    onClick={() => {
                      if (isAttached) return;
                      const next = new Set(selectedExistingIds);
                      if (isSelected) next.delete(photo.url);
                      else next.add(photo.url);
                      setSelectedExistingIds(next);
                    }}
                    className={cn(
                      "relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer",
                      isAttached ? "border-zinc-800 opacity-40 cursor-not-allowed" :
                      isSelected ? "border-sky-500 scale-95 shadow-md shadow-sky-500/20" : "border-white/10 hover:border-white/20"
                    )}
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    
                    {/* Checkmark overlay for selected/attached states */}
                    {isAttached && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Attached</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-sky-500 flex items-center justify-center text-black font-black text-[10px]">
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 text-xs font-bold text-zinc-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedExistingIds.size === 0}
                onClick={() => {
                  const toAttach = existingPhotos.filter((p) => selectedExistingIds.has(p.url)).map((p, idx) => ({
                    ...p,
                    id: p.id || `attached-photo-${Date.now()}-${idx}`,
                    persisted: true,
                    category: targetCategory // Assign the current bucket's category!
                  }));
                  onPhotosChange([...photos, ...toAttach]);
                  setSelectedExistingIds(new Set());
                  setShowAttachModal(false);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500 text-xs font-bold text-black hover:bg-sky-400 disabled:opacity-40"
              >
                Attach Selected ({selectedExistingIds.size})
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Multi-Bucket Photo Download Modal */}
      {downloadModalOpen && (
        <ItemPhotoDownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          title={downloadModalTitle || title || "Photos"}
          photos={downloadModalPhotos}
        />
      )}
    </div>
  );
}

// ─── Navigable Photo Lightbox ────────────────────────────────────────────────

function PhotoLightboxNav({
  photos,
  currentPhoto,
  onClose,
  onEdit,
  onRemove,
}: {
  photos: PhotoItem[];
  currentPhoto: PhotoItem;
  onClose: () => void;
  onEdit?: (photo: PhotoItem) => void;
  onRemove?: (id: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    photos.findIndex((p) => p.id === currentPhoto.id)
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [exifData, setExifData] = useState<EXIFInfo | null>(null);

  const photo = photos[currentIndex] || currentPhoto;

  useEffect(() => {
    let active = true;
    async function loadExif() {
      try {
        const res = await fetch(photo.url);
        const buf = await res.arrayBuffer();
        if (active) {
          setExifData(readEXIF(buf));
        }
      } catch (err) {
        console.warn("Failed to load EXIF:", err);
      }
    }
    setExifData(null);
    loadExif();
    return () => { active = false; };
  }, [photo.url]);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsZoomed(false);
    }
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsZoomed(false);
    }
  }, [currentIndex, photos.length]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { triggerFileDownload } = await import("@/lib/download-helper");
      await triggerFileDownload(photo.url, photo.name);
    } catch {
      const a = document.createElement("a");
      a.href = photo.url;
      a.download = photo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  return (
    <div
      className="fixed inset-0 flex flex-col md:flex-row bg-black/95 backdrop-blur-md overflow-hidden"
      style={{
        zIndex: 2147483647,
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      onClick={onClose}
    >
      {/* MAIN IMAGE VIEWER AREA */}
      <div className="relative flex-1 flex h-full items-center justify-center min-w-0 min-h-0">
        {/* Prev button */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/75 text-white hover:bg-slate-950/90 border border-white/15 shadow-lg shadow-black/40 backdrop-blur-md transition-colors z-20"
            title="Previous (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div 
          className={cn(
            "relative transition-all duration-300 ease-out flex items-center justify-center overflow-auto max-w-full max-h-full",
            isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
          )}
          onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
        >
          <img
            src={photo.url}
            alt={photo.name}
            className={cn(
              "rounded-xl transition-all duration-300",
              isZoomed 
                ? "max-w-none scale-150" 
                : "max-w-[calc(100vw-32px)] max-h-[calc(100vh-80px)] object-contain"
            )}
          />
        </div>

        {/* Next button */}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/75 text-white hover:bg-slate-950/90 border border-white/15 shadow-lg shadow-black/40 backdrop-blur-md transition-colors z-20"
            title="Next (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Top toolbar buttons (Positioned Below Device Notch) */}
        <div 
          className="absolute right-4 flex items-center gap-2 z-30"
          style={{ top: "max(3.5rem, calc(env(safe-area-inset-top) + 0.75rem))" }}
        >
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(photo);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white border border-violet-400/40 shadow-lg shadow-violet-950/60 backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer"
              title="Edit photo (Draw, Crop, Text, Filters)"
            >
              <Pencil className="h-4 w-4 text-violet-200" />
              <span className="uppercase tracking-wider">Edit</span>
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showInfo
                ? "bg-cyan-500 text-white border border-cyan-300/40 shadow-lg shadow-cyan-900/30"
                : "bg-slate-950/75 text-white hover:bg-slate-950/90 border border-white/15 shadow-lg shadow-black/40 backdrop-blur-md"
            )}
            title="Toggle Info"
          >
            <Info className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-slate-950/75 text-white hover:bg-slate-950/90 border border-white/15 shadow-lg shadow-black/40 backdrop-blur-md transition-colors"
            title="Download image"
          >
            <Upload className="h-4 w-4 rotate-180" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isZoomed
                ? "bg-cyan-500 text-white border border-cyan-300/40 shadow-lg shadow-cyan-900/30"
                : "bg-slate-950/75 text-white hover:bg-slate-950/90 border border-white/15 shadow-lg shadow-black/40 backdrop-blur-md"
            )}
            title="Toggle zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
              className="p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
              title="Delete photo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <div className="w-px h-8 bg-white/25 mx-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom index counter */}
        <div className="absolute bottom-4 right-4 flex items-end justify-between pointer-events-none z-20">
          <span className="text-xs font-medium text-white/90 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            {currentIndex + 1} of {photos.length}
          </span>
        </div>
      </div>

      {/* EXIF / INFO PANEL (Bottom sheet on Mobile, Right sidebar on Desktop) */}
      {showInfo && (
        <div 
          className="fixed bottom-4 left-3 right-3 max-h-[35vh] md:static md:w-80 md:h-full md:max-h-none flex-shrink-0 bg-zinc-950/95 border border-white/20 md:border-t-0 md:border-l rounded-2xl md:rounded-none p-4 space-y-4 overflow-y-auto text-white z-50 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Photo Metadata & EXIF</p>
            <button
              onClick={() => setShowInfo(false)}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3 text-xs">
            <div className="col-span-2 md:col-span-1">
              <p className="text-white/50 text-[10px] uppercase">File Name</p>
              <p className="text-white break-all font-mono font-medium mt-0.5">{photo.name}</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase">Uploaded By</p>
              <p className="text-white font-medium mt-0.5">System User</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase">Upload Time</p>
              <p className="text-white font-medium mt-0.5">{photo.timestamp ? new Date(photo.timestamp).toLocaleString() : "Unknown"}</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase">Date Taken</p>
              <p className="text-cyan-300 font-mono font-medium mt-0.5">
                {exifData?.dateTime ? parseEXIFDate(exifData.dateTime).toLocaleString() : (photo.timestamp ? new Date(photo.timestamp).toLocaleString() : "Unknown")}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase">GPS Lat / Long</p>
              <p className="text-emerald-400 font-mono font-medium mt-0.5">
                {exifData?.gps?.latitude ? `${exifData.gps.latitude.toFixed(6)}, ${exifData.gps.longitude?.toFixed(6)}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase">Camera Make</p>
              <p className="text-white font-medium mt-0.5">{exifData?.make || "—"}</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase">Camera Model</p>
              <p className="text-white font-medium mt-0.5">{exifData?.model || "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: convert existing FileUpload records to PhotoItem[] ──────────────

export function fileUploadsToPhotos(files: any[]): PhotoItem[] {
  return (files || [])
    .filter((f: any) => f.mimeType?.startsWith("image/"))
    .map((f: any) => ({
      id: f.id,
      url: f.path,
      name: f.originalName || f.filename,
      size: f.size || 0,
      category: (f.category as PhotoCategory) || "DURING",
      timestamp: f.createdAt,
      persisted: true,
    }));
}
