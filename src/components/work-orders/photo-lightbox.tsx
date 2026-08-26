"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Download, Clock, Pencil, Trash2, Info, X, ChevronLeft, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

export interface PhotoLightboxProps {
  photo: any;
  photos?: any[];
  selectedIndex?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onEditPhoto?: (url: string, name: string, category?: any, source?: any, sourceId?: string) => void;
  onDeletePhoto?: (id: string) => void;
}

export function PhotoLightbox({
  photo,
  photos,
  selectedIndex,
  onPrev,
  onNext,
  onClose,
  onEditPhoto,
  onDeletePhoto,
}: PhotoLightboxProps) {
  const [showExif, setShowExif] = useState(false);
  const [exifData, setExifData] = useState<any>(null);
  const [exifLoading, setExifLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setExifData(null);
    if (showExif) {
      loadExif();
    }
  }, [photo, showExif]);

  async function loadExif() {
    setExifLoading(true);
    try {
      const { readEXIF, reverseGeocode } = await import("@/lib/exif");
      const res = await fetch(photo.path || photo.url);
      const buffer = await res.arrayBuffer();
      const exif = readEXIF(buffer);
      if (exif.gps) {
        const addr = await reverseGeocode(exif.gps.latitude, exif.gps.longitude);
        exif.address = addr ?? undefined;
      }
      setExifData(exif);
    } catch (err) {
      console.warn("EXIF read failed:", err);
    }
    setExifLoading(false);
  }

  async function downloadOriginal() {
    setDownloading(true);
    try {
      const { triggerFileDownload } = await import("@/lib/download-helper");
      await triggerFileDownload(photo.path || photo.url, photo.originalName || photo.name || "photo.jpg");
    } catch (err) {
      console.error("Download failed:", err);
    }
    setDownloading(false);
  }

  async function downloadWithTimestamp() {
    if (!imgRef.current) return;
    setDownloading(true);
    try {
      const { generatePhotoWithOverlay, DEFAULT_OVERLAY_OPTIONS } = await import("@/lib/exif");
      const { triggerFileDownload } = await import("@/lib/download-helper");
      const { optimizePhotoForDownload } = await import("@/lib/image-compression");
      const canvas = generatePhotoWithOverlay(
        imgRef.current,
        {
          dateTime: exifData?.dateTime ? new Date(exifData.dateTime.replace(/(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")) : photo.createdAt ? new Date(photo.createdAt) : new Date(),
          gps: exifData?.gps || undefined,
          address: exifData?.address || undefined,
        },
        DEFAULT_OVERLAY_OPTIONS
      );
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.75));
      const optimizedBlob = await optimizePhotoForDownload(blob, { maxSizeBytes: 200 * 1024, maxDimension: 1600 });
      const filename = (photo.originalName?.replace(/\.[^.]+$/, "") || "photo") + "-timestamped.jpg";
      await triggerFileDownload(optimizedBlob, filename);
    } catch (err) {
      console.error("Download with overlay failed:", err);
      downloadOriginal(); // Fallback
    }
    setDownloading(false);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4 touch-none"
      style={{
        zIndex: 2147483647,
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      onClick={onClose}
    >
      <div className="relative flex h-full w-full max-w-6xl gap-4 items-center justify-center overflow-hidden flex-col md:flex-row">
        
        {/* Main image container */}
        <div 
          className="flex-1 flex items-center justify-center min-h-0 min-w-0"
          onClick={(e) => {
            if (zoom > 1) {
              setZoom(1);
            }
          }}
        >
          <img
            ref={imgRef}
            src={photo.path || photo.url}
            alt={photo.originalName || photo.name || "Photo"}
            className={cn(
              "rounded-xl object-contain transition-all duration-300 shadow-2xl",
              zoom === 1 ? "max-w-[calc(100vw-32px)] max-h-[calc(100vh-160px)] cursor-zoom-in" : "max-w-none max-h-none cursor-zoom-out"
            )}
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            crossOrigin="anonymous"
            onClick={(e) => {
              e.stopPropagation();
              if (zoom === 1) setZoom(2);
              else if (zoom === 2) setZoom(3);
              else setZoom(1);
            }}
          />
        </div>

        {/* EXIF Panel: Bottom Drawer on Mobile, Side Panel on Desktop */}
        {showExif && (
          <div
            className="absolute bottom-16 left-3 right-3 md:static md:w-72 flex-shrink-0 bg-zinc-900/95 border border-white/20 rounded-2xl overflow-hidden self-end md:self-start max-h-[35vh] md:max-h-[85vh] overflow-y-auto z-50 text-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Photo EXIF Info</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setShowExif(false); }}
                className="p-1 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2 text-zinc-300">
              {exifLoading ? (
                <div className="text-center py-2"><Loader2 className="h-4 w-4 text-cyan-400 animate-spin mx-auto" /></div>
              ) : exifData ? (
                <>
                  {exifData.dateTime && (
                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Date/Time (EXIF)</p>
                      <p className="text-xs font-mono text-cyan-300">{exifData.dateTime}</p>
                    </div>
                  )}
                  {exifData.gps && (
                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">GPS Location</p>
                      <p className="text-xs font-mono text-emerald-400">{exifData.gps.latitude.toFixed(6)}, {exifData.gps.longitude.toFixed(6)}</p>
                      {exifData.address && <p className="text-[11px] text-zinc-300 mt-0.5">{exifData.address}</p>}
                      <a href={`https://www.google.com/maps?q=${exifData.gps.latitude},${exifData.gps.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 hover:underline mt-0.5 inline-block" onClick={(e) => e.stopPropagation()}>Open in Google Maps →</a>
                    </div>
                  )}
                  {exifData.make && (
                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Device</p>
                      <p className="text-xs text-zinc-200">{exifData.make} {exifData.model || ""}</p>
                    </div>
                  )}
                  {!exifData.gps && !exifData.dateTime && (
                    <p className="text-xs text-zinc-400 text-center py-2">No EXIF GPS metadata found in photo</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-2">Loading EXIF metadata...</p>
              )}
            </div>
          </div>
        )}

        {/* Prev button */}
        {onPrev && selectedIndex !== undefined && selectedIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/90 border border-white/20 shadow-xl backdrop-blur-md transition-colors z-30"
            title="Previous (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Next button */}
        {onNext && photos && selectedIndex !== undefined && selectedIndex < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/90 border border-white/20 shadow-xl backdrop-blur-md transition-colors z-30"
            title="Next (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 z-40">
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(Math.max(1, zoom - 0.5)); }}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-all disabled:opacity-30"
            disabled={zoom <= 1}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-black text-white w-10 text-center uppercase tracking-widest">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(Math.min(4, zoom + 0.5)); }}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-all disabled:opacity-30"
            disabled={zoom >= 4}
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(1); }}
            className="px-2 py-0.5 rounded-lg hover:bg-white/10 text-[10px] font-bold text-cyan-400 uppercase tracking-tighter"
          >
            Reset
          </button>
        </div>

        {/* Top Action Header (Positioned Safely Below Device Camera Notch) */}
        <div
          className={cn(
            "absolute flex items-center gap-2 z-50 transition-all duration-300",
            showExif ? "right-3 md:right-[308px]" : "right-3"
          )}
          style={{ top: "max(3.5rem, calc(env(safe-area-inset-top) + 0.75rem))" }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); downloadOriginal(); }}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 backdrop-blur-md transition-all text-xs font-bold disabled:opacity-40 shadow-lg"
            title="Download photo to phone/computer"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline uppercase tracking-wider">Save</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); downloadWithTimestamp(); }}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 backdrop-blur-md transition-all text-xs font-bold disabled:opacity-40 shadow-lg"
            title="Download with GPS & timestamp overlay"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden lg:inline uppercase tracking-wider">Timestamp</span>
          </button>

          {onEditPhoto && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditPhoto(photo.path || photo.url, photo.originalName || photo.name || "photo.jpg"); }}
              className="p-2 rounded-xl bg-black/70 text-white hover:bg-black/90 border border-white/20 shadow-lg backdrop-blur-md transition-all"
              title="Edit in Photo Editor"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}

          {onDeletePhoto && (
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                if (confirm("Are you sure you want to delete this photo?")) {
                  onDeletePhoto(photo.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all shadow-lg"
              title="Delete photo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowExif(!showExif); if (!exifData) loadExif(); }}
            className={cn(
              "p-2 rounded-xl border transition-all shadow-lg",
              showExif
                ? "bg-cyan-500 text-black font-bold border-cyan-400"
                : "bg-black/70 text-white hover:bg-black/90 border-white/20 backdrop-blur-md"
            )}
            title="Toggle Photo EXIF metadata"
          >
            <Info className="h-4 w-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-black/80 text-white hover:bg-black border border-white/20 shadow-lg backdrop-blur-md transition-all"
            title="Close viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bottom info label */}
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between z-20 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 max-w-[75%]">
            <p className="text-xs font-semibold text-white truncate">
              {photo.originalName || photo.name || "Photo"}
            </p>
            {photo.createdAt && (
              <p className="text-[10px] text-zinc-300 mt-0.5">
                {formatDateTime(photo.createdAt)}
              </p>
            )}
          </div>
          {photos && selectedIndex !== undefined && (
            <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-xl font-mono">
              {selectedIndex + 1} / {photos.length}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
