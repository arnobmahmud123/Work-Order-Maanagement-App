"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  ArrowLeft,
  X,
  Check,
  Crop,
  PenTool,
  RotateCw,
  RotateCcw,
  Undo,
  Trash2,
  Type,
  Square,
  ArrowRight,
  Sun,
  Palette,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
} from "lucide-react";
import { compressImageToTarget } from "@/lib/image-compression";

interface PhotoEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (editedBlob: Blob) => void | Promise<void>;
}

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

const COLOR_OPTIONS = [
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
];

const STROKE_SIZES = [
  { label: "Thin", size: 3 },
  { label: "Med", size: 6 },
  { label: "Thick", size: 12 },
];

const ASPECT_RATIOS = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, pixelCrop.width);
  canvas.height = Math.max(1, pixelCrop.height);
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      resolve(URL.createObjectURL(blob));
    }, "image/jpeg", 0.95);
  });
}

export function PhotoEditor({ imageUrl, onClose, onSave }: PhotoEditorProps) {
  const [currentImage, setCurrentImage] = useState(imageUrl);
  const [mode, setMode] = useState<"draw" | "crop" | "text" | "adjust">("draw");
  const [toolType, setToolType] = useState<"pen" | "arrow" | "rect">("pen");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [textValue, setTextValue] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Crop State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Draw & Moveable Text State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<any[]>([]);
  const [currentElement, setCurrentElement] = useState<any>(null);

  // Draggable Text Overlays
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw base image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // 2. Apply Brightness & Contrast direct pixel manipulation (works on 100% of mobile browsers!)
    if (brightness !== 100 || contrast !== 100) {
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const b = (brightness - 100) * 2.55;
        const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, cFactor * (data[i] + b - 128) + 128));
          data[i + 1] = Math.min(255, Math.max(0, cFactor * (data[i + 1] + b - 128) + 128));
          data[i + 2] = Math.min(255, Math.max(0, cFactor * (data[i + 2] + b - 128) + 128));
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        console.warn("Pixel contrast filter fallback:", err);
      }
    }

    // 3. Draw saved vector elements (pen, rect, arrow)
    elements.forEach((elem) => {
      ctx.strokeStyle = elem.color;
      ctx.fillStyle = elem.color;
      ctx.lineWidth = elem.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (elem.type === "pen" && elem.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(elem.points[0].x, elem.points[0].y);
        for (let i = 1; i < elem.points.length; i++) {
          ctx.lineTo(elem.points[i].x, elem.points[i].y);
        }
        ctx.stroke();
      } else if (elem.type === "rect") {
        const width = elem.end.x - elem.start.x;
        const height = elem.end.y - elem.start.y;
        ctx.strokeRect(elem.start.x, elem.start.y, width, height);
      } else if (elem.type === "arrow") {
        drawArrow(ctx, elem.start.x, elem.start.y, elem.end.x, elem.end.y, elem.strokeWidth);
      }
    });

    // 4. Draw active stroke element
    if (currentElement) {
      ctx.strokeStyle = currentElement.color;
      ctx.fillStyle = currentElement.color;
      ctx.lineWidth = currentElement.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (currentElement.type === "pen" && currentElement.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(currentElement.points[0].x, currentElement.points[0].y);
        for (let i = 1; i < currentElement.points.length; i++) {
          ctx.lineTo(currentElement.points[i].x, currentElement.points[i].y);
        }
        ctx.stroke();
      } else if (currentElement.type === "rect" && currentElement.start && currentElement.end) {
        const width = currentElement.end.x - currentElement.start.x;
        const height = currentElement.end.y - currentElement.start.y;
        ctx.strokeRect(currentElement.start.x, currentElement.start.y, width, height);
      } else if (currentElement.type === "arrow" && currentElement.start && currentElement.end) {
        drawArrow(ctx, currentElement.start.x, currentElement.start.y, currentElement.end.x, currentElement.end.y, currentElement.strokeWidth);
      }
    }

    // 5. Draw Draggable Text Items
    textItems.forEach((item) => {
      ctx.font = `bold ${item.fontSize}px sans-serif`;
      ctx.fillStyle = item.color;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = Math.max(3, item.fontSize / 6);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.strokeText(item.text, item.x, item.y);
      ctx.fillText(item.text, item.x, item.y);

      // Selection box indicator when active/selected
      if (activeTextId === item.id) {
        const metrics = ctx.measureText(item.text);
        const w = metrics.width + 24;
        const h = item.fontSize + 16;
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(item.x - w / 2, item.y - h / 2, w, h);
        ctx.setLineDash([]);
      }
    });
  }, [elements, currentElement, textItems, activeTextId, brightness, contrast]);

  function drawArrow(ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, width: number) {
    const headlen = Math.max(12, width * 2.5);
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  // Load Image onto Canvas
  useEffect(() => {
    if (mode === "crop") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage;
    img.onload = () => {
      imageRef.current = img;

      const containerWidth = window.innerWidth - 32;
      const containerHeight = window.innerHeight - 240;

      const ratio = Math.min(containerWidth / img.width, containerHeight / img.height);
      const newWidth = Math.round(img.width * ratio);
      const newHeight = Math.round(img.height * ratio);

      canvas.width = newWidth;
      canvas.height = newHeight;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;

      redrawCanvas();
    };
  }, [currentImage, mode, redrawCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);

    // Check if user tapped near an existing text item to drag it
    const canvas = canvasRef.current;
    if (canvas && textItems.length > 0) {
      const hitText = textItems.find((item) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;
        ctx.font = `bold ${item.fontSize}px sans-serif`;
        const metrics = ctx.measureText(item.text);
        const halfW = metrics.width / 2 + 20;
        const halfH = item.fontSize / 2 + 15;
        return (
          coords.x >= item.x - halfW &&
          coords.x <= item.x + halfW &&
          coords.y >= item.y - halfH &&
          coords.y <= item.y + halfH
        );
      });

      if (hitText) {
        setActiveTextId(hitText.id);
        setIsDraggingText(true);
        redrawCanvas();
        return;
      }
    }

    setActiveTextId(null);

    if (mode !== "draw") return;
    setIsDrawing(true);

    if (toolType === "pen") {
      setCurrentElement({
        type: "pen",
        color,
        strokeWidth,
        points: [coords],
      });
    } else {
      setCurrentElement({
        type: toolType,
        color,
        strokeWidth,
        start: coords,
        end: coords,
      });
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);

    // If dragging a text item over the photo
    if (isDraggingText && activeTextId) {
      e.preventDefault();
      setTextItems((prev) =>
        prev.map((item) => (item.id === activeTextId ? { ...item, x: coords.x, y: coords.y } : item))
      );
      return;
    }

    if (!isDrawing || mode !== "draw" || !currentElement) return;
    e.preventDefault();

    if (currentElement.type === "pen") {
      setCurrentElement((prev: any) => ({
        ...prev,
        points: [...prev.points, coords],
      }));
    } else {
      setCurrentElement((prev: any) => ({
        ...prev,
        end: coords,
      }));
    }
  };

  const stopDrawing = () => {
    if (isDraggingText) {
      setIsDraggingText(false);
      redrawCanvas();
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentElement) {
      setElements((prev) => [...prev, currentElement]);
      setCurrentElement(null);
    }
  };

  // Rotate canvas 90 deg
  const handleRotate = (deg: number) => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    if (Math.abs(deg) === 90 || Math.abs(deg) === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const rotatedUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCurrentImage(rotatedUrl);
    setElements([]);
    setTextItems([]);
  };

  const handleAddText = () => {
    if (!textValue.trim()) return;
    const canvas = canvasRef.current;
    const canvasW = canvas?.width || 300;
    const canvasH = canvas?.height || 300;

    const newText: TextItem = {
      id: Date.now().toString(),
      text: textValue.trim(),
      x: Math.round(canvasW / 2),
      y: Math.round(canvasH / 2),
      color: color,
      fontSize: Math.max(18, Math.round(canvasH * 0.045)),
    };

    setTextItems((prev) => [...prev, newText]);
    setActiveTextId(newText.id);
    setTextValue("");
    setMode("draw");
  };

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(currentImage, croppedAreaPixels);
      setCurrentImage(croppedImage);
      setMode("draw");
      setElements([]);
      setTextItems([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (mode === "crop") {
      await handleApplyCrop();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Deselect active text box indicator before saving blob
    setActiveTextId(null);
    redrawCanvas();

    setIsSaving(true);
    canvas.toBlob(async (blob) => {
      if (blob) {
        const compressedFile = await compressImageToTarget(blob, {
          maxSizeBytes: 200 * 1024,
          maxDimension: 1600,
          initialQuality: 0.72,
        });
        await onSave(compressedFile);
      }
      setIsSaving(false);
      onClose();
    }, "image/jpeg", 0.75);
  };

  return (
    <div
      className="fixed inset-0 bg-black text-white flex flex-col touch-none select-none"
      style={{ zIndex: 2147483647, paddingTop: "max(3.25rem, calc(env(safe-area-inset-top) + 0.5rem))" }}
    >
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 backdrop-blur-md border-b border-white/10 z-20">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="font-semibold text-xs text-white uppercase tracking-wider">
          {mode === "crop"
            ? "Crop Photo"
            : mode === "text"
            ? "Add Text Label"
            : mode === "adjust"
            ? "Brightness & Contrast"
            : "Markup & Edit"}
        </span>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{mode === "crop" ? "Apply Crop" : "Save"}</span>
        </button>
      </div>

      {/* Main Canvas / Crop Display */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-2">
        {mode === "crop" ? (
          <div className="absolute inset-0">
            <Cropper
              image={currentImage}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
        ) : (
          <div className="relative overflow-hidden w-full h-full flex flex-col items-center justify-center">
            {textItems.length > 0 && (
              <p className="text-[10px] text-cyan-400 font-medium mb-1 animate-pulse flex items-center gap-1">
                <Move className="h-3 w-3" /> Touch and drag text to move it over photo
              </p>
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="touch-none bg-zinc-950 shadow-2xl rounded-lg ring-1 ring-white/10"
              style={{ objectFit: "contain" }}
            />
          </div>
        )}
      </div>

      {/* CROP MODE TOOLBAR (Aspect Ratio Presets + Zoom Slider for Mobile Box Scaling) */}
      {mode === "crop" && (
        <div className="px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 space-y-2">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Aspect Ratio:</span>
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.label}
                onClick={() => setAspect(r.value)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                  aspect === r.value
                    ? "bg-cyan-500 text-black border-cyan-400 shadow-md"
                    : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Mobile Zoom / Crop Box Resizing Slider */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.2))}
              className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-48 accent-cyan-400 cursor-pointer"
            />
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.2))}
              className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono font-bold text-cyan-400 w-12 text-right">{zoom.toFixed(1)}x</span>
          </div>
        </div>
      )}

      {/* DRAWING TOOL SETTINGS (Color & Stroke Size) */}
      {mode === "draw" && (
        <div className="px-4 py-2 bg-zinc-950/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-2 overflow-x-auto">
          {/* Tool types: Pen, Arrow, Rectangle */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setToolType("pen")}
              className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
                toolType === "pen" ? "bg-cyan-500 text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
              title="Freehand Draw"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setToolType("arrow")}
              className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
                toolType === "arrow" ? "bg-cyan-500 text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
              title="Draw Arrow"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setToolType("rect")}
              className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
                toolType === "rect" ? "bg-cyan-500 text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
              title="Draw Box / Frame"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color options */}
          <div className="flex items-center gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`w-6 h-6 rounded-full border transition-all ${
                  color === c.value ? "scale-125 ring-2 ring-cyan-400 border-white" : "border-white/20 opacity-80"
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          {/* Stroke width */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
            {STROKE_SIZES.map((s) => (
              <button
                key={s.size}
                onClick={() => setStrokeWidth(s.size)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  strokeWidth === s.size ? "bg-white/20 text-cyan-300" : "text-zinc-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TEXT OVERLAY CREATOR (Add Moveable Text Label) */}
      {mode === "text" && (
        <div className="p-3 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddText();
            }}
            placeholder="Type text overlay (e.g. WATER DAMAGE)..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleAddText}
            disabled={!textValue.trim()}
            className="px-3.5 py-2 bg-cyan-500 text-black font-bold text-xs rounded-xl disabled:opacity-40"
          >
            Add Text
          </button>
        </div>
      )}

      {/* BRIGHTNESS & CONTRAST ADJUSTMENT SLIDERS */}
      {mode === "adjust" && (
        <div className="p-4 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Brightness: {brightness}%</span>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-48 accent-cyan-400 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Contrast: {contrast}%</span>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-48 accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Bottom Main Tool Bar */}
      <div
        className="p-3 bg-zinc-900/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around gap-2"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => setMode("draw")}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-colors ${
            mode === "draw" ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <PenTool className="w-5 h-5" />
          <span>Markup</span>
        </button>

        <button
          onClick={() => setMode("crop")}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-colors ${
            mode === "crop" ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Crop className="w-5 h-5" />
          <span>Crop</span>
        </button>

        <button
          onClick={() => handleRotate(90)}
          className="flex flex-col items-center gap-1 p-2 text-zinc-400 hover:text-white text-xs transition-colors"
        >
          <RotateCw className="w-5 h-5" />
          <span>Rotate</span>
        </button>

        <button
          onClick={() => setMode("text")}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-colors ${
            mode === "text" ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Type className="w-5 h-5" />
          <span>Text</span>
        </button>

        <button
          onClick={() => setMode("adjust")}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-colors ${
            mode === "adjust" ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Sun className="w-5 h-5" />
          <span>Adjust</span>
        </button>

        <button
          onClick={() => {
            if (textItems.length > 0) {
              setTextItems((prev) => prev.slice(0, -1));
            } else if (elements.length > 0) {
              setElements((prev) => prev.slice(0, -1));
            }
          }}
          disabled={elements.length === 0 && textItems.length === 0}
          className="flex flex-col items-center gap-1 p-2 text-zinc-400 hover:text-white disabled:opacity-30 text-xs transition-colors"
        >
          <Undo className="w-5 h-5" />
          <span>Undo</span>
        </button>

        <button
          onClick={() => {
            setElements([]);
            setTextItems([]);
            setBrightness(100);
            setContrast(100);
          }}
          className="flex flex-col items-center gap-1 p-2 text-rose-400 hover:text-rose-300 text-xs transition-colors"
        >
          <Trash2 className="w-5 h-5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
