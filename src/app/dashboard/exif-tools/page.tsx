"use client";

import { useState, useRef, useCallback } from "react";
import { Download, Upload, Trash2, Calendar, Clock, Image as ImageIcon, MapPin } from "lucide-react";
import JSZip from "jszip";
import * as piexif from "piexifjs";
import { readEXIF, generatePhotoWithOverlay, GPSData } from "@/lib/exif";
import { TopNav } from "@/components/layout/top-nav";

interface ProcessedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  exifData: {
    dateTime?: Date;
    gps?: GPSData;
    make?: string;
    model?: string;
  } | null;
  selected: boolean;
}

export default function ExifToolsPage() {
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [downloadMode, setDownloadMode] = useState<"date" | "datetime" | "custom">("datetime");
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [printTimestamp, setPrintTimestamp] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [isDragging, setIsDragging] = useState(false);

  const processFiles = async (files: File[]) => {
    const newPhotos: ProcessedPhoto[] = [];
    
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      let exifData = null;
      try {
        const exif = readEXIF(buffer);
        let parsedDate: Date | undefined;
        if (exif.dateTime) {
          // EXIF dateTime format is usually "YYYY:MM:DD HH:MM:SS"
          const match = exif.dateTime.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
          if (match) {
            parsedDate = new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3]),
              parseInt(match[4]),
              parseInt(match[5]),
              parseInt(match[6])
            );
          } else {
            parsedDate = new Date(exif.dateTime.replace(/:/g, "/")); // fallback
          }
        }
        
        exifData = {
          dateTime: parsedDate,
          gps: exif.gps,
          make: exif.make,
          model: exif.model
        };
      } catch (err) {
        console.warn(`Could not read EXIF for ${file.name}`, err);
      }
      
      newPhotos.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        exifData,
        selected: true
      });
    }
    
    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processFiles(Array.from(e.target.files));
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        await processFiles(files);
      }
    }
  }, []);

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const toggleSelect = (id: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const toggleSelectAll = () => {
    const allSelected = photos.every(p => p.selected);
    setPhotos(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const getEffectiveDateTime = (photo: ProcessedPhoto): Date => {
    if (downloadMode === "custom" && customDate) {
      const d = new Date(customDate);
      if (customTime) {
        const [hours, minutes] = customTime.split(":");
        d.setHours(parseInt(hours), parseInt(minutes));
      }
      return d;
    }
    return photo.exifData?.dateTime || new Date(photo.file.lastModified);
  };

  const processAndDownload = async (onlySelected: boolean) => {
    const targetPhotos = onlySelected ? photos.filter(p => p.selected) : photos;
    if (targetPhotos.length === 0) return;
    
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < targetPhotos.length; i++) {
        const p = targetPhotos[i];
        const img = new Image();
        img.src = p.previewUrl;
        
        await new Promise((resolve) => { img.onload = resolve; });
        
        const effectiveDate = getEffectiveDateTime(p);
        
        const canvas = generatePhotoWithOverlay(img, {
          dateTime: effectiveDate,
          gps: p.exifData?.gps // we don't stamp GPS by default in this tool, but passing it just in case
        }, {
          showDate: printTimestamp && (downloadMode !== "custom" || !!customDate),
          showTime: printTimestamp && (downloadMode === "datetime" || (downloadMode === "custom" && !!customTime)),
          showGPS: false,
          showAddress: false,
          position: "bottom-right",
          fontColor: "#FFFF00", // Standard yellow for property preservation
          backgroundColor: "rgba(0,0,0,0)", // Transparent background
          fontSize: Math.max(24, Math.floor(img.naturalWidth * 0.03)), // Scale font size based on image width
          dateFormat: "MM/DD/YYYY",
          format: "12h"
        });
        
        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        let finalBlob: Blob | null = null;
        
        try {
          // Format date for EXIF (YYYY:MM:DD HH:MM:SS)
          const pad = (n: number) => n.toString().padStart(2, "0");
          const exifDateStr = `${effectiveDate.getFullYear()}:${pad(effectiveDate.getMonth() + 1)}:${pad(effectiveDate.getDate())} ${pad(effectiveDate.getHours())}:${pad(effectiveDate.getMinutes())}:${pad(effectiveDate.getSeconds())}`;
          
          const zeroth = { [piexif.ImageIFD.DateTime]: exifDateStr };
          const exif = {
            [piexif.ExifIFD.DateTimeOriginal]: exifDateStr,
            [piexif.ExifIFD.DateTimeDigitized]: exifDateStr
          };
          
          const exifObj = { "0th": zeroth, "Exif": exif, "GPS": {} };
          const exifBytes = piexif.dump(exifObj);
          
          const newJpegDataUrl = piexif.insert(exifBytes, jpegDataUrl);
          
          // Convert data URI back to Blob
          const byteString = atob(newJpegDataUrl.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let k = 0; k < byteString.length; k++) {
            ia[k] = byteString.charCodeAt(k);
          }
          finalBlob = new Blob([ab], { type: "image/jpeg" });
        } catch (e) {
          console.warn("Could not inject EXIF data", e);
          // Fallback if piexif fails
          finalBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        }
        
        if (finalBlob) {
          // Generate a filename based on original or index
          const originalName = p.file.name.replace(/\.[^/.]+$/, "");
          const ext = "jpg";
          zip.file(`${originalName}_stamped.${ext}`, finalBlob);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Bulk_Photos_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
    } catch (err) {
      console.error("Error processing photos", err);
      alert("An error occurred while processing the photos.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <div 
          className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative transition-colors ${isDragging ? 'bg-cyan-500/5' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-cyan-500 rounded-3xl m-4 md:m-6 lg:m-8 pointer-events-none">
              <Upload className="h-12 w-12 text-cyan-500 mb-4 animate-bounce" />
              <h2 className="text-2xl font-black text-cyan-500 tracking-tight">Drop photos here</h2>
              <p className="text-text-secondary mt-2 font-medium">Release to add to EXIF tools</p>
            </div>
          )}
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-6 rounded-2xl border border-border-medium shadow-sm">
              <div>
                <h1 className="text-2xl font-black text-text-primary tracking-tight">Bulk Photo EXIF Tools</h1>
                <p className="text-sm text-text-secondary mt-1">Upload photos to extract EXIF data and apply industry-standard yellow timestamps.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold hover:bg-cyan-500/20 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Select Photos
                </button>
              </div>
            </div>

            {/* Controls Area */}
            {photos.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Sidebar Controls */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-surface p-5 rounded-2xl border border-border-medium shadow-sm space-y-5 sticky top-4">
                    <div>
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-3">Timestamp Settings</h3>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle cursor-pointer hover:bg-surface-hover transition-colors">
                          <input type="radio" name="mode" checked={downloadMode === "date"} onChange={() => setDownloadMode("date")} className="text-cyan-500 focus:ring-cyan-500" />
                          <span className="text-sm font-medium text-text-primary">EXIF Date Only</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle cursor-pointer hover:bg-surface-hover transition-colors">
                          <input type="radio" name="mode" checked={downloadMode === "datetime"} onChange={() => setDownloadMode("datetime")} className="text-cyan-500 focus:ring-cyan-500" />
                          <span className="text-sm font-medium text-text-primary">EXIF Date & Time</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle cursor-pointer hover:bg-surface-hover transition-colors">
                          <input type="radio" name="mode" checked={downloadMode === "custom"} onChange={() => setDownloadMode("custom")} className="text-cyan-500 focus:ring-cyan-500" />
                          <span className="text-sm font-medium text-text-primary">Custom Date/Time</span>
                        </label>
                      </div>
                    </div>
                    
                    {downloadMode === "custom" && (
                      <div className="space-y-3 p-4 bg-background rounded-xl border border-border-subtle">
                        <div>
                          <label className="block text-xs font-bold text-text-secondary mb-1">Date</label>
                          <input 
                            type="date" 
                            value={customDate} 
                            onChange={(e) => setCustomDate(e.target.value)}
                            className="w-full px-3 py-2 bg-surface rounded-lg border border-border-medium text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-text-secondary mb-1">Time (Optional)</label>
                          <input 
                            type="time" 
                            value={customTime} 
                            onChange={(e) => setCustomTime(e.target.value)}
                            className="w-full px-3 py-2 bg-surface rounded-lg border border-border-medium text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                          />
                        </div>
                      </div>
                    )}
                    
                    
                    <div className="pt-4 border-t border-border-subtle space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={printTimestamp}
                          onChange={(e) => setPrintTimestamp(e.target.checked)}
                          className="rounded border-border-medium text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-sm font-medium text-text-primary group-hover:text-cyan-600 transition-colors">
                          Print visible timestamp on photo
                        </span>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-border-subtle">
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-3">Download</h3>
                      <button
                        onClick={() => processAndDownload(true)}
                        disabled={isProcessing || !photos.some(p => p.selected)}
                        className="w-full mb-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-black tracking-wide hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
                      >
                        {isProcessing ? "Processing..." : "Download Selected"}
                      </button>
                      <button
                        onClick={() => processAndDownload(false)}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-hover text-text-primary border border-border-medium text-sm font-bold hover:bg-background transition-all"
                      >
                        <Download className="h-4 w-4" />
                        Download All ({photos.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Photo Grid */}
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-text-primary tracking-tight">Photos ({photos.length})</h2>
                    <button onClick={toggleSelectAll} className="text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:underline">
                      {photos.every(p => p.selected) ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((photo) => {
                      const effDate = getEffectiveDateTime(photo);
                      return (
                        <div 
                          key={photo.id} 
                          className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                            photo.selected ? 'border-cyan-500 shadow-md shadow-cyan-500/20' : 'border-border-medium hover:border-cyan-500/50'
                          }`}
                          onClick={() => toggleSelect(photo.id)}
                        >
                          <img src={photo.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          
                          {/* Selection Indicator */}
                          <div className="absolute top-2 left-2 w-5 h-5 rounded-md border-2 border-white bg-black/40 flex items-center justify-center backdrop-blur-sm">
                            {photo.selected && <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />}
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-rose-400 hover:bg-black/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          {/* Metadata Overlay Preview */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-8">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300">
                                <Calendar className="h-3 w-3" />
                                {effDate ? effDate.toLocaleDateString() : "No Date"}
                              </div>
                              {downloadMode !== "date" && (
                                <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300/80">
                                  <Clock className="h-3 w-3" />
                                  {effDate ? effDate.toLocaleTimeString([], { hour12: false }) : "--:--"}
                                </div>
                              )}
                              {photo.exifData?.gps && (
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/80 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  GPS Found
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
              </div>
            )}
            
            {photos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-4 bg-surface rounded-2xl border border-dashed border-border-medium">
                <div className="h-16 w-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
                  <ImageIcon className="h-8 w-8 text-cyan-500" />
                </div>
                <h3 className="text-lg font-black text-text-primary tracking-tight mb-2">No photos selected</h3>
                <p className="text-sm text-text-secondary text-center max-w-md mb-6">
                  Select multiple photos from your device to extract their EXIF data and apply industry-standard timestamps for bulk download.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-black tracking-wide hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
                >
                  Browse Photos
                </button>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
