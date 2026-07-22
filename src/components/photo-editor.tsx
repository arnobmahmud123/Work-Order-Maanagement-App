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
} from "lucide-react";

interface PhotoEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (editedBlob: Blob) => void | Promise<void>;
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
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
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
    }, "image/jpeg", 0.92);
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
  const [textOverlay, setTextOverlay] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Crop State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Draw State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<any[]>([]);
  const [currentElement, setCurrentElement] = useState<any>(null);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply brightness/contrast filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none"; // reset filter for drawing overlays

    // Draw saved elements
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

    // Draw current active drawing element
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

    // Render Text Overlay if exists
    if (textOverlay) {
      const fontSize = Math.max(16, Math.round(canvas.height * 0.04));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 4;
      
      const padding = 16;
      const x = padding;
      const y = canvas.height - padding - 10;
      
      ctx.strokeText(textOverlay, x, y);
      ctx.fillText(textOverlay, x, y);
    }
  }, [elements, currentElement, color, brightness, contrast, textOverlay]);

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

      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight - 200; // room for top & bottom toolbars

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
    if (mode !== "draw") return;
    const coords = getCoordinates(e);
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
    if (!isDrawing || mode !== "draw" || !currentElement) return;
    e.preventDefault();
    const coords = getCoordinates(e);

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
    setElements([]); // clear overlays on rotation
  };

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(currentImage, croppedAreaPixels);
      setCurrentImage(croppedImage);
      setMode("draw");
      setElements([]);
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

    setIsSaving(true);
    canvas.toBlob(async (blob) => {
      if (blob) {
        await onSave(blob);
      }
      setIsSaving(false);
      onClose();
    }, "image/jpeg", 0.92);
  };

  return (
    <div
      className="fixed inset-0 bg-black text-white flex flex-col touch-none select-none"
      style={{ zIndex: 2147483647, paddingTop: "max(1rem, env(safe-area-inset-top))" }}
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
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{mode === "crop" ? "Apply" : "Save"}</span>
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
              aspect={4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
        ) : (
          <div className="relative overflow-hidden w-full h-full flex items-center justify-center">
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

      {/* Drawing Tool Settings (Color & Stroke Size & Text Input) */}
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

      {mode === "text" && (
        <div className="p-3 bg-zinc-950/90 backdrop-blur-md border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Type text overlay (e.g. WATER DAMAGE)..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={() => {
              if (textValue.trim()) {
                setTextOverlay(textValue.trim());
                setMode("draw");
              }
            }}
            className="px-3 py-2 bg-cyan-500 text-black font-bold text-xs rounded-xl"
          >
            Apply Text
          </button>
        </div>
      )}

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
              className="w-48 accent-cyan-400"
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
              className="w-48 accent-cyan-400"
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
          onClick={() => setElements((prev) => prev.slice(0, -1))}
          disabled={elements.length === 0}
          className="flex flex-col items-center gap-1 p-2 text-zinc-400 hover:text-white disabled:opacity-30 text-xs transition-colors"
        >
          <Undo className="w-5 h-5" />
          <span>Undo</span>
        </button>

        <button
          onClick={() => {
            setElements([]);
            setTextOverlay(null);
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
