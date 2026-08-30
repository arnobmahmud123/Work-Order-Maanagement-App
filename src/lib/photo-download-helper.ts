// Photo Download & Stamping Engine
// Supports: Date & Time, Date Only, Date+Time+EXIF, Custom Timestamp, and Raw (no stamp)
import { optimizePhotoForDownload } from "@/lib/image-compression";
import { triggerFileDownload } from "@/lib/download-helper";
import toast from "react-hot-toast";

export type PhotoStampMode = "datetime" | "date" | "datetimeExif" | "custom" | "none";

export interface PhotoDownloadItem {
  id?: string;
  url?: string;
  path?: string;
  name?: string;
  originalName?: string;
  category?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  latitude?: number;
  longitude?: number;
  camera?: string;
  uploader?: { name?: string };
}

export interface PhotoDownloadOptions {
  mode: PhotoStampMode;
  customDateTime?: string;
  zipFilename?: string;
  onProgress?: (current: number, total: number) => void;
}

// ─── Fast In-Memory ZIP Builder ──────────────────────────────────────────────

export type ZipFileInput = { name: string; blob: Blob };

function zipCrc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function zipDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear()) - 1980;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const dosDate = (year << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  return { dosDate, dosTime };
}

export async function createStoredZip(files: ZipFileInput[]): Promise<Blob> {
  const enc = new TextEncoder();
  const fileEntries: {
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    offset: number;
    dosDate: number;
    dosTime: number;
  }[] = [];

  const now = zipDateTime();
  let offset = 0;
  const blobParts: BlobPart[] = [];

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = zipCrc32(data);
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true); // Stored
    view.setUint16(10, now.dosTime, true);
    view.setUint16(12, now.dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    blobParts.push(header, data);
    fileEntries.push({ nameBytes, data, crc, offset, dosDate: now.dosDate, dosTime: now.dosTime });
    offset += header.length + data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, entry.dosTime, true);
    view.setUint16(14, entry.dosDate, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);
    cdHeader.set(entry.nameBytes, 46);

    blobParts.push(cdHeader);
    cdSize += cdHeader.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, fileEntries.length, true);
  eocdView.setUint16(10, fileEntries.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdOffset, true);
  eocdView.setUint16(20, 0, true);
  blobParts.push(eocd);

  return new Blob(blobParts, { type: "application/zip" });
}

// ─── Image Loading & Stamping ────────────────────────────────────────────────

export function safeFileName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "photo";
}

export function getPhotoDate(photo: PhotoDownloadItem, mode: PhotoStampMode, customValue?: string): Date {
  const raw = mode === "custom" && customValue ? customValue : photo.timestamp || photo.createdAt || photo.updatedAt || photo.date;
  const parsed = raw ? new Date(raw) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getStampText(photo: PhotoDownloadItem, mode: PhotoStampMode, customValue?: string): string {
  const date = getPhotoDate(photo, mode, customValue);
  if (mode === "date") return date.toLocaleDateString();
  if (mode === "datetime" || mode === "custom") return date.toLocaleString();
  if (mode === "datetimeExif") {
    const exifParts = [
      photo.category ? `Category: ${photo.category}` : null,
      photo.latitude && photo.longitude ? `GPS: ${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}` : null,
      photo.camera ? `Camera: ${photo.camera}` : null,
      photo.uploader?.name ? `By: ${photo.uploader.name}` : null,
    ].filter(Boolean);
    return `${date.toLocaleString()}${exifParts.length ? ` | ${exifParts.join(" | ")}` : " | EXIF Preserved"}`;
  }
  return "";
}

async function loadDownloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function processPhotoForDownload(
  photo: PhotoDownloadItem,
  customName: string,
  mode: PhotoStampMode,
  customDateTime?: string
): Promise<ZipFileInput | null> {
  const src = photo.url || photo.path;
  if (!src) return null;

  try {
    if (mode === "none") {
      const res = await fetch(src);
      if (!res.ok) throw new Error("Fetch failed");
      const rawBlob = await res.blob();
      const optimizedBlob = await optimizePhotoForDownload(rawBlob, { maxSizeBytes: 200 * 1024, maxDimension: 1600 });
      return { name: `${customName}.jpg`, blob: optimizedBlob };
    }

    const img = await loadDownloadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);

    const fontSize = Math.max(22, Math.floor(canvas.width / 42));
    const pad = Math.floor(fontSize * 0.7);
    const stamp = getStampText(photo, mode, customDateTime);

    ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, -apple-system, sans-serif`;
    const textWidth = ctx.measureText(stamp).width;

    // Draw solid translucent banner for perfect readability
    const bgHeight = fontSize + pad * 1.5;
    const bgWidth = textWidth + pad * 2.5;
    const bgY = canvas.height - bgHeight - pad;
    const bgX = pad;

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 8);
    ctx.fill();

    // Category accent bar if present
    if (photo.category) {
      ctx.fillStyle = photo.category === "BEFORE" ? "#f59e0b" : photo.category === "AFTER" ? "#10b981" : "#06b6d4";
      ctx.fillRect(bgX, bgY, 6, bgHeight);
    }

    // Text with soft shadow in industry-standard yellow
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#FFFF00";
    ctx.fillText(stamp, bgX + pad * 1.2, bgY + fontSize + (pad * 0.2));

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return null;

    const optimizedBlob = await optimizePhotoForDownload(blob, { maxSizeBytes: 200 * 1024, maxDimension: 1600 });
    return { name: `${customName}-${mode}.jpg`, blob: optimizedBlob };
  } catch (err) {
    console.error(`Failed to stamp/process photo:`, err);
    // Fallback: raw fetch
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      return { name: `${customName}.jpg`, blob };
    } catch {
      return null;
    }
  }
}

// ─── Bulk & Single Download Trigger ──────────────────────────────────────────

export async function downloadPhotosBatch(
  photos: PhotoDownloadItem[],
  options: PhotoDownloadOptions
): Promise<boolean> {
  if (!photos.length) {
    toast.error("No photos selected to download");
    return false;
  }

  const { mode, customDateTime, zipFilename = `photos-${new Date().toISOString().slice(0, 10)}.zip`, onProgress } = options;

  try {
    const files: ZipFileInput[] = [];
    let completed = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const baseName = safeFileName(photo.name || photo.originalName || `photo-${i + 1}`);
      const file = await processPhotoForDownload(photo, `${String(i + 1).padStart(2, "0")}-${baseName}`, mode, customDateTime);
      if (file) files.push(file);

      completed++;
      onProgress?.(completed, photos.length);
    }

    if (!files.length) {
      toast.error("Could not download any photos. Please check your network connection.");
      return false;
    }

    if (files.length === 1) {
      // Single photo: download direct image file
      await triggerFileDownload(files[0].blob, files[0].name);
      toast.success("Photo downloaded successfully");
      return true;
    }

    // Multiple photos: zip and download
    const zipBlob = await createStoredZip(files);
    await triggerFileDownload(zipBlob, zipFilename);
    toast.success(`Downloaded ${files.length} photos archive`);
    return true;
  } catch (err: any) {
    console.error("Batch download error:", err);
    toast.error("Failed to package photos for download");
    return false;
  }
}
