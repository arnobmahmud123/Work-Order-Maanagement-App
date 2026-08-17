"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Download, Upload, Trash2, Calendar, Clock, Image as ImageIcon, MapPin, Crop, Maximize2, Sliders } from "lucide-react";
import JSZip from "jszip";
import * as piexif from "piexifjs";
import { readEXIF, generatePhotoWithOverlay, GPSData } from "@/lib/exif";
import { buildContinuousPhotoTimeline, formatTimelineMinute, formatTimelineMinute12h } from "@/lib/photo-timeline";
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
  category: "before" | "during" | "after" | "none";
}

function parseTimeToMinutes(time: string): number {
  if (!time) return -1;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function cropAndResizeImage(
  img: HTMLImageElement,
  cropRatio: "none" | "4:3" | "16:9" | "1:1",
  maxDimension: "none" | "1200" | "1600" | "1920"
): HTMLCanvasElement {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  
  let srcX = 0;
  let srcY = 0;
  let srcWidth = W;
  let srcHeight = H;

  // 1. Calculate Crop
  if (cropRatio !== "none") {
    let ratio = 1;
    if (cropRatio === "4:3") ratio = 4 / 3;
    else if (cropRatio === "16:9") ratio = 16 / 9;
    else if (cropRatio === "1:1") ratio = 1;

    const currentRatio = W / H;
    if (currentRatio > ratio) {
      // Image is wider than target ratio: crop sides
      srcWidth = H * ratio;
      srcHeight = H;
      srcX = (W - srcWidth) / 2;
      srcY = 0;
    } else if (currentRatio < ratio) {
      // Image is taller than target ratio: crop top/bottom
      srcWidth = W;
      srcHeight = W / ratio;
      srcX = 0;
      srcY = (H - srcHeight) / 2;
    }
  }

  // 2. Calculate Resize
  let destWidth = srcWidth;
  let destHeight = srcHeight;
  if (maxDimension !== "none") {
    const maxDim = Number(maxDimension);
    if (srcWidth > maxDim || srcHeight > maxDim) {
      const scale = Math.min(maxDim / srcWidth, maxDim / srcHeight);
      destWidth = Math.round(srcWidth * scale);
      destHeight = Math.round(srcHeight * scale);
    }
  }

  // 3. Render on Canvas
  const canvas = document.createElement("canvas");
  canvas.width = destWidth;
  canvas.height = destHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, destWidth, destHeight);
  }
  return canvas;
}

export default function ExifToolsPage() {
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [downloadMode, setDownloadMode] = useState<"date" | "datetime" | "custom">("datetime");
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [customTimeStart, setCustomTimeStart] = useState("");
  const [customTimeEnd, setCustomTimeEnd] = useState("");
  
  const [printTimestamp, setPrintTimestamp] = useState(true);
  const [cropRatio, setCropRatio] = useState<"none" | "4:3" | "16:9" | "1:1">("none");
  const [maxDimension, setMaxDimension] = useState<"none" | "1200" | "1600" | "1920">("1600");
  const [compressionQuality, setCompressionQuality] = useState<number>(50);
  
  const [overrideGPS, setOverrideGPS] = useState(false);
  const [customLatitude, setCustomLatitude] = useState("");
  const [customLongitude, setCustomLongitude] = useState("");
  const [stripEXIF, setStripEXIF] = useState(false);

  const updatePhotoCategory = (id: string, category: "before" | "during" | "after") => {
    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        const nextCat = p.category === category ? "none" : category;
        return { ...p, category: nextCat };
      }
      return p;
    }));
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Pre-populate GPS fields if one of the uploaded photos contains GPS data
  useEffect(() => {
    if (photos.length > 0 && !customLatitude && !customLongitude) {
      const photoWithGps = photos.find(p => p.exifData?.gps);
      if (photoWithGps?.exifData?.gps) {
        setCustomLatitude(photoWithGps.exifData.gps.latitude.toString());
        setCustomLongitude(photoWithGps.exifData.gps.longitude.toString());
        setOverrideGPS(true);
      }
    }
  }, [photos, customLatitude, customLongitude]);

  const getEffectiveGPS = (photo: ProcessedPhoto): GPSData | undefined => {
    if (overrideGPS && customLatitude && customLongitude) {
      const lat = parseFloat(customLatitude);
      const lng = parseFloat(customLongitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    return photo.exifData?.gps || undefined;
  };

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
        selected: true,
        category: "none"
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

  const photoTimeline = useMemo(() => {
    return buildContinuousPhotoTimeline(
      photos.map((photo) => ({
        id: photo.id,
        category: photo.category,
        sortValue: photo.file.lastModified,
      })),
      {
        startTimeMinutes: parseTimeToMinutes(customTimeStart),
        endTimeMinutes: customTimeEnd ? parseTimeToMinutes(customTimeEnd) : undefined,
      }
    );
  }, [photos, customTimeStart, customTimeEnd]);

  const getEffectiveDateTime = (photo: ProcessedPhoto): Date => {
    const defaultDate = photo.exifData?.dateTime || new Date(photo.file.lastModified);

    // ── Parse custom date ────────────────────────────────────────────────────
    let year: number, month: number, day: number;
    if (customDate && customDate.includes("-")) {
      const parts = customDate.split("-").map(Number);
      year = parts[0]; month = parts[1]; day = parts[2];
    } else {
      year = defaultDate.getFullYear();
      month = defaultDate.getMonth() + 1;
      day = defaultDate.getDate();
    }

    // Build a JS Date from absolute minutes (handles one or more midnight crossings).
    const buildDate = (absMins: number): Date => {
      const roundedMinutes = Math.round(absMins);
      const dayOffset = Math.floor(roundedMinutes / 1440);
      const clamped = ((roundedMinutes % 1440) + 1440) % 1440;
      const h = Math.floor(clamped / 60);
      const m = clamped % 60;
      return new Date(year, month - 1, day + dayOffset, h, m, 0, 0);
    };

    const assignedMinute = photoTimeline.photoMinutes.get(photo.id);
    if (assignedMinute !== undefined) {
      return buildDate(assignedMinute);
    }

    return defaultDate;
  };

  const processAndDownload = async (onlySelected: boolean) => {
    const targetOrdered = onlySelected 
      ? photoTimeline.orderedPhotos.filter(tp => {
          const original = photos.find(o => o.id === tp.id);
          return original?.selected;
        })
      : photoTimeline.orderedPhotos;
      
    if (targetOrdered.length === 0) return;
    
    setIsProcessing(true);
    try {
      // 1. Prepare Ordered Photos with strictly computed timestamps
      const timelineItems = targetOrdered.map((tp, index) => {
        const photoObj = photos.find(p => p.id === tp.id)!;
        const effectiveDate = getEffectiveDateTime(photoObj);
        return {
          photo: photoObj,
          index,
          category: photoObj.category,
          filename: photoObj.file.name,
          timestamp: effectiveDate,
        };
      });

      // 2. REQUIRED HARD VALIDATION (Rule 10 & 11)
      for (let i = 1; i < timelineItems.length; i++) {
        const prev = timelineItems[i - 1];
        const curr = timelineItems[i];
        if (curr.timestamp.getTime() <= prev.timestamp.getTime()) {
          throw new Error(
            `INVALID TIMELINE: Photo #${curr.index + 1} ${curr.filename} (${curr.timestamp.toLocaleTimeString()}) must be strictly later than Photo #${prev.index + 1} ${prev.filename} (${prev.timestamp.toLocaleTimeString()})`
          );
        }
      }

      // 3. REQUIRED DEBUG LOG OUTPUT (Rule 15)
      console.log("=================== TIMELINE ===================");
      timelineItems.forEach(({ index, category, filename, timestamp }) => {
        const idxStr = (index + 1).toString().padStart(2, "0");
        const catStr = category.toUpperCase().padEnd(7, " ");
        const timeStr = timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        console.log(`${idxStr} | ${catStr} | ${filename} | ${timeStr}`);
      });
      console.log("================================================");

      const zip = new JSZip();
      
      for (let i = 0; i < timelineItems.length; i++) {
        const item = timelineItems[i];
        const p = item.photo;
        const effectiveDate = item.timestamp;
        const effectiveGPS = getEffectiveGPS(p);
        
        const img = new Image();
        img.src = p.previewUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        
        // 1. Crop and Resize first
        const croppedCanvas = cropAndResizeImage(img, cropRatio, maxDimension);
        
        // 2. Generate yellow timestamp overlay on top of the cropped & resized canvas
        const canvas = generatePhotoWithOverlay(croppedCanvas, {
          dateTime: effectiveDate,
          gps: effectiveGPS
        }, {
          showDate: printTimestamp,
          showTime: printTimestamp,
          showGPS: false,
          showAddress: false,
          position: "bottom-right",
          fontColor: "#FFFF00", // Standard yellow for property preservation
          backgroundColor: "rgba(0,0,0,0)", // Transparent background
          fontSize: Math.max(20, Math.floor(croppedCanvas.width * 0.03)),
          dateFormat: "MM/DD/YYYY",
          format: "12h"
        });
        
        // 3. Compress with the specified quality setting
        const qualityDecimal = compressionQuality / 100;
        const jpegDataUrl = canvas.toDataURL("image/jpeg", qualityDecimal);
        let finalBlob: Blob | null = null;
        
        // 4. Load original EXIF to preserve GPS & camera hardware tags
        let exifObj: any = { "0th": {}, "Exif": {}, "GPS": {} };
        try {
          const originalDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(p.file);
          });
          exifObj = piexif.load(originalDataUrl);
        } catch (e) {
          console.warn("Could not load original EXIF, creating fresh structure", e);
        }
        
        let finalJpegDataUrl = jpegDataUrl;
        
        if (!stripEXIF) {
          // Format date for standard EXIF (YYYY:MM:DD HH:MM:SS)
          const pad = (n: number) => n.toString().padStart(2, "0");
          const exifDateStr = `${effectiveDate.getFullYear()}:${pad(effectiveDate.getMonth() + 1)}:${pad(effectiveDate.getDate())} ${pad(effectiveDate.getHours())}:${pad(effectiveDate.getMinutes())}:${pad(effectiveDate.getSeconds())}`;
          
          if (!exifObj["0th"]) exifObj["0th"] = {};
          if (!exifObj["Exif"]) exifObj["Exif"] = {};
          if (!exifObj["GPS"]) exifObj["GPS"] = {};
          
          // Clean unhandled / proprietary tags that cause piexif.dump to crash
          delete exifObj["thumbnail"];
          delete exifObj["1st"];
          if (exifObj["Exif"]) {
            delete exifObj["Exif"][37500]; // MakerNote
            delete exifObj["Exif"][37510]; // UserComment
          }
          
          // Strict EXIF capture timestamps
          exifObj["0th"][piexif.ImageIFD.DateTime] = exifDateStr;
          exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = exifDateStr;
          exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized] = exifDateStr;
          
          if (effectiveGPS) {
            const latRef = effectiveGPS.latitude >= 0 ? "N" : "S";
            const lngRef = effectiveGPS.longitude >= 0 ? "E" : "W";
            
            const absLat = Math.abs(effectiveGPS.latitude);
            const latD = Math.floor(absLat);
            const latM = Math.floor((absLat - latD) * 60);
            const latS = Math.round((absLat - latD - latM / 60) * 3600 * 100);
            
            const absLng = Math.abs(effectiveGPS.longitude);
            const lngD = Math.floor(absLng);
            const lngM = Math.floor((absLng - lngD) * 60);
            const lngS = Math.round((absLng - lngD - lngM / 60) * 3600 * 100);
            
            exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latRef;
            exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = [[latD, 1], [latM, 1], [latS, 100]];
            exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lngRef;
            exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = [[lngD, 1], [lngM, 1], [lngS, 100]];
            exifObj["GPS"][piexif.GPSIFD.GPSDateStamp] = `${effectiveDate.getFullYear()}:${pad(effectiveDate.getMonth() + 1)}:${pad(effectiveDate.getDate())}`;
            exifObj["GPS"][piexif.GPSIFD.GPSTimeStamp] = [[effectiveDate.getHours(), 1], [effectiveDate.getMinutes(), 1], [effectiveDate.getSeconds(), 1]];
          }
          
          let exifBytes: string;
          try {
            exifBytes = piexif.dump(exifObj);
          } catch (dumpErr) {
            console.warn("Merged EXIF dump failed, creating clean standard EXIF", dumpErr);
            const cleanExif: any = {
              "0th": {
                [piexif.ImageIFD.DateTime]: exifDateStr,
                [piexif.ImageIFD.Orientation]: 1,
                [piexif.ImageIFD.Software]: "PropertyPreserve App",
              },
              "Exif": {
                [piexif.ExifIFD.DateTimeOriginal]: exifDateStr,
                [piexif.ExifIFD.DateTimeDigitized]: exifDateStr,
                [piexif.ExifIFD.ExifVersion]: "0232",
              },
              "GPS": exifObj["GPS"] || {}
            };
            if (exifObj["0th"]?.[piexif.ImageIFD.Make]) cleanExif["0th"][piexif.ImageIFD.Make] = exifObj["0th"][piexif.ImageIFD.Make];
            if (exifObj["0th"]?.[piexif.ImageIFD.Model]) cleanExif["0th"][piexif.ImageIFD.Model] = exifObj["0th"][piexif.ImageIFD.Model];
            
            exifBytes = piexif.dump(cleanExif);
          }
          
          try {
            finalJpegDataUrl = piexif.insert(exifBytes, jpegDataUrl);
            
            // Post-write EXIF Verification (Rule 12)
            const verifyExif = piexif.load(finalJpegDataUrl);
            const writtenDate = verifyExif["Exif"]?.[piexif.ExifIFD.DateTimeOriginal];
            if (writtenDate !== exifDateStr) {
              console.warn(`EXIF post-validation mismatch for ${p.file.name}: expected ${exifDateStr}, got ${writtenDate}`);
            }
          } catch (insertErr) {
            console.warn("piexif.insert failed, using canvas output", insertErr);
          }
        }
        
        // Convert data URI back to Blob
        const byteString = atob(finalJpegDataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let k = 0; k < byteString.length; k++) {
          ia[k] = byteString.charCodeAt(k);
        }
        finalBlob = new Blob([ab], { type: "image/jpeg" });
        
        if (finalBlob) {
          const originalName = p.file.name.replace(/\.[^/.]+$/, "");
          zip.file(`${originalName}_stamped.jpg`, finalBlob, { date: effectiveDate });
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `WorkOrder_Photos_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
    } catch (err: any) {
      console.error("Error processing photos", err);
      alert(err?.message || "An error occurred while processing the photos.");
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
                      <div className="space-y-4 p-4 bg-background rounded-xl border border-border-subtle">
                        <div>
                          <label className="block text-xs font-bold text-text-secondary mb-1">Date</label>
                          <input 
                            type="date" 
                            value={customDate} 
                            onChange={(e) => setCustomDate(e.target.value)}
                            className="w-full px-3 py-2 bg-surface rounded-lg border border-border-medium text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                          />
                        </div>

                        {/* Continuous Job Timeline Range */}
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Continuous Job Time Range</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[9px] text-text-secondary block mb-0.5">Start Time</span>
                                <input 
                                  type="time" 
                                  value={customTimeStart} 
                                  onChange={(e) => setCustomTimeStart(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-surface rounded-lg border border-border-medium text-xs focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                                />
                              </div>
                              <div>
                                <span className="text-[9px] text-text-secondary block mb-0.5">End Time (Optional)</span>
                                <input 
                                  type="time" 
                                  value={customTimeEnd} 
                                  onChange={(e) => setCustomTimeEnd(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-surface rounded-lg border border-border-medium text-xs focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                                />
                              </div>
                            </div>
                            <p className="text-[9px] text-text-secondary mt-1.5 leading-tight">
                              Distributes photos seamlessly across one continuous timeline from Start to End.
                            </p>
                          </div>

                          {/* Live Timeline Section Breakdown */}
                          {photos.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-border-subtle/50">
                              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                                <span>Timeline Sequence</span>
                                <span className="text-[9px] text-emerald-400 font-mono">1 Clock</span>
                              </div>

                              <div className="space-y-1.5 text-xs font-mono">
                                {photoTimeline.sections.before && (
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                                    <span className="font-bold uppercase text-[10px]">1. Before ({photoTimeline.sections.before.count})</span>
                                    <span>{formatTimelineMinute12h(photoTimeline.sections.before.start)} – {formatTimelineMinute12h(photoTimeline.sections.before.end)}</span>
                                  </div>
                                )}

                                {photoTimeline.sections.during && (
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                    <span className="font-bold uppercase text-[10px]">2. During ({photoTimeline.sections.during.count})</span>
                                    <span>{formatTimelineMinute12h(photoTimeline.sections.during.start)} – {formatTimelineMinute12h(photoTimeline.sections.during.end)}</span>
                                  </div>
                                )}

                                {photoTimeline.sections.after && (
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                    <span className="font-bold uppercase text-[10px]">3. After ({photoTimeline.sections.after.count})</span>
                                    <span>{formatTimelineMinute12h(photoTimeline.sections.after.start)} – {formatTimelineMinute12h(photoTimeline.sections.after.end)}</span>
                                  </div>
                                )}

                                {photoTimeline.sections.none && (
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border-medium text-text-secondary">
                                    <span className="font-bold uppercase text-[10px]">Other ({photoTimeline.sections.none.count})</span>
                                    <span>{formatTimelineMinute12h(photoTimeline.sections.none.start)} – {formatTimelineMinute12h(photoTimeline.sections.none.end)}</span>
                                  </div>
                                )}
                              </div>

                              <p className="text-[9px] text-cyan-500/90 font-medium leading-normal bg-cyan-500/5 p-2 rounded-lg border border-cyan-500/10">
                                ⚡ <strong>Strict Continuous Flow</strong>: Before → During → After. Each next photo timestamp is strictly later than the previous photo with zero overlaps.
                              </p>
                            </div>
                          )}
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

                    {/* GPS Coordinates Override */}
                    <div className="pt-4 border-t border-border-subtle space-y-4">
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer group mb-1.5">
                          <input 
                            type="checkbox" 
                            checked={overrideGPS}
                            onChange={(e) => setOverrideGPS(e.target.checked)}
                            className="rounded border-border-medium text-cyan-500 focus:ring-cyan-500"
                          />
                          <span className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5 group-hover:text-cyan-600 transition-colors">
                            <MapPin className="h-4 w-4 text-cyan-500" />
                            GPS Override
                          </span>
                        </label>
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          Bulk overwrite/inject custom coordinates on all photo downloads.
                        </p>
                      </div>

                      {overrideGPS && (
                        <div className="space-y-3 p-4 bg-background rounded-xl border border-border-subtle">
                          <div>
                            <label className="block text-xs font-bold text-text-secondary mb-1">Latitude</label>
                            <input 
                              type="text" 
                              placeholder="e.g. 37.7749"
                              value={customLatitude} 
                              onChange={(e) => setCustomLatitude(e.target.value)}
                              className="w-full px-3 py-2 bg-surface rounded-lg border border-border-medium text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-text-secondary mb-1">Longitude</label>
                            <input 
                              type="text" 
                              placeholder="e.g. -122.4194"
                              value={customLongitude} 
                              onChange={(e) => setCustomLongitude(e.target.value)}
                              className="w-full px-3 py-2 bg-surface rounded-lg border border-border-medium text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Strip EXIF Settings */}
                    <div className="pt-4 border-t border-border-subtle space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={stripEXIF}
                          onChange={(e) => setStripEXIF(e.target.checked)}
                          className="rounded border-border-medium text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-sm font-black text-text-primary uppercase tracking-widest group-hover:text-cyan-600 transition-colors">
                          Strip EXIF Metadata
                        </span>
                      </label>
                      <p className="text-[10px] text-text-secondary leading-relaxed">
                        Removes all GPS, Timestamps, and Camera details from the downloaded files to resolve privacy concerns.
                      </p>
                    </div>

                    {/* Crop & Scale Settings */}
                    <div className="pt-4 border-t border-border-subtle space-y-4">
                      <div>
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Crop className="h-4 w-4 text-cyan-500" />
                          Crop Aspect Ratio
                        </h3>
                        <select
                          value={cropRatio}
                          onChange={(e) => setCropRatio(e.target.value as any)}
                          className="w-full px-3 py-2 bg-background rounded-xl border border-border-medium text-sm font-medium focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                        >
                          <option value="none">Original (No Crop)</option>
                          <option value="4:3">4:3 Ratio (Standard)</option>
                          <option value="16:9">16:9 Ratio (Widescreen)</option>
                          <option value="1:1">1:1 Ratio (Square)</option>
                        </select>
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Maximize2 className="h-4 w-4 text-cyan-500" />
                          Resolution Limit
                        </h3>
                        <select
                          value={maxDimension}
                          onChange={(e) => setMaxDimension(e.target.value as any)}
                          className="w-full px-3 py-2 bg-background rounded-xl border border-border-medium text-sm font-medium focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
                        >
                          <option value="none">Original Resolution</option>
                          <option value="1920">Max 1920px (Full HD)</option>
                          <option value="1600">Max 1600px (Recommended)</option>
                          <option value="1200">Max 1200px (Standard)</option>
                        </select>
                      </div>
                    </div>

                    {/* Compression Settings */}
                    <div className="pt-4 border-t border-border-subtle space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-1.5">
                          <Sliders className="h-4 w-4 text-cyan-500" />
                          Compression Quality
                        </h3>
                        <span className="text-xs font-bold text-cyan-500">{compressionQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={compressionQuality}
                        onChange={(e) => setCompressionQuality(Number(e.target.value))}
                        className="w-full h-1.5 bg-border-medium rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <p className="text-[10px] text-text-secondary leading-relaxed">
                        80%–85% is visually indistinguishable but reduces file sizes by up to 80% to prevent upload errors.
                      </p>
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
                    {photoTimeline.orderedPhotos.map((tp, index) => {
                      const photo = photos.find(p => p.id === tp.id);
                      if (!photo) return null;
                      const effDate = getEffectiveDateTime(photo);
                      const effGPS = getEffectiveGPS(photo);
                      return (
                        <div 
                          key={photo.id} 
                          className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                            photo.selected ? 'border-cyan-500 shadow-md shadow-cyan-500/20' : 'border-border-medium hover:border-cyan-500/50'
                          }`}
                          onClick={() => toggleSelect(photo.id)}
                        >
                          <img src={photo.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          
                          {/* Selection Indicator & Timeline Sequence Index */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
                            <div className="w-5 h-5 rounded-md border-2 border-white bg-black/40 flex items-center justify-center backdrop-blur-sm">
                              {photo.selected && <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />}
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-black/70 border border-white/20 text-[10px] font-mono font-bold text-white shadow backdrop-blur-sm">
                              #{index + 1}
                            </span>
                          </div>
 
                          {/* Category Toggles (Before/During/After) */}
                          <div className="absolute top-10 left-2 flex flex-col items-center gap-1 bg-black/60 rounded-lg p-0.5 border border-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all z-20">
                            <button
                              type="button"
                              title="Mark as Before"
                              onClick={(e) => { e.stopPropagation(); updatePhotoCategory(photo.id, "before"); }}
                              className={`w-5 h-5 flex items-center justify-center text-[9px] font-black uppercase rounded transition-colors ${
                                photo.category === "before" 
                                  ? "bg-cyan-500 text-white shadow-sm" 
                                  : "text-white/60 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              B
                            </button>
                            <button
                              type="button"
                              title="Mark as During"
                              onClick={(e) => { e.stopPropagation(); updatePhotoCategory(photo.id, "during"); }}
                              className={`w-5 h-5 flex items-center justify-center text-[9px] font-black uppercase rounded transition-colors ${
                                photo.category === "during" 
                                  ? "bg-amber-500 text-white shadow-sm" 
                                  : "text-white/60 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              D
                            </button>
                            <button
                              type="button"
                              title="Mark as After"
                              onClick={(e) => { e.stopPropagation(); updatePhotoCategory(photo.id, "after"); }}
                              className={`w-5 h-5 flex items-center justify-center text-[9px] font-black uppercase rounded transition-colors ${
                                photo.category === "after" 
                                  ? "bg-emerald-500 text-white shadow-sm" 
                                  : "text-white/60 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              A
                            </button>
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
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300">
                                  <Calendar className="h-3 w-3" />
                                  {effDate ? effDate.toLocaleDateString() : "No Date"}
                                </div>
                                {photo.category && photo.category !== "none" && (
                                  <div className={`px-1 rounded text-[8px] font-black uppercase tracking-wider text-white border ${
                                    photo.category === "before"
                                      ? "bg-cyan-600/80 border-cyan-400/40"
                                      : photo.category === "during"
                                      ? "bg-amber-600/80 border-amber-400/40"
                                      : "bg-emerald-600/80 border-emerald-400/40"
                                  }`}>
                                    {photo.category}
                                  </div>
                                )}
                              </div>
                              {downloadMode !== "date" && (
                                <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300/80">
                                  <Clock className="h-3 w-3" />
                                  {effDate ? effDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : "--:--"}
                                </div>
                              )}
                              {effGPS ? (
                                <div className="flex flex-col gap-0.5 text-[10px] font-mono text-emerald-400/80 mt-1">
                                  <div className="flex items-center gap-1.5" title={`${effGPS.latitude}, ${effGPS.longitude}`}>
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span>Lat: {effGPS.latitude.toFixed(5)}</span>
                                  </div>
                                  <div className="pl-[18px]">
                                    <span>Lng: {effGPS.longitude.toFixed(5)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[10px] font-mono text-text-secondary/60 mt-1">
                                  No GPS data
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
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
