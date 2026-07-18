"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, Check, Crop, PenTool, Undo, Trash2 } from "lucide-react";

interface PhotoEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (editedBlob: Blob) => void | Promise<void>;
}

// Utility to extract cropped image
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
    }, "image/jpeg");
  });
}

export function PhotoEditor({ imageUrl, onClose, onSave }: PhotoEditorProps) {
  const [currentImage, setCurrentImage] = useState(imageUrl);
  const [mode, setMode] = useState<"draw" | "crop">("draw");
  const [isSaving, setIsSaving] = useState(false);

  // Crop State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Draw State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageRef.current) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw saved paths
    paths.forEach(path => {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    });

    // Draw current path
    if (currentPath.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
  }, [paths, currentPath]);

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
      
      // Calculate responsive dimensions while maintaining aspect ratio
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight - 150; // leave room for toolbars
      
      const ratio = Math.min(containerWidth / img.width, containerHeight / img.height);
      const newWidth = img.width * ratio;
      const newHeight = img.height * ratio;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      
      redrawCanvas();
    };
  }, [currentImage, mode, redrawCanvas]);

  // Drawing Handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    // Scale coordinates based on canvas display size vs actual size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== "draw") return;
    setIsDrawing(true);
    setCurrentPath([getCoordinates(e)]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== "draw") return;
    e.preventDefault(); // prevent scrolling while drawing
    const coords = getCoordinates(e);
    setCurrentPath(prev => [...prev, coords]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 0) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath([]);
    }
  };

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(currentImage, croppedAreaPixels);
      setCurrentImage(croppedImage);
      setMode("draw");
      setPaths([]); // clear drawings since image changed
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
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col touch-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/90 backdrop-blur-sm border-b border-white/10 z-10">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
          <X className="w-5 h-5" />
        </button>
        <span className="font-medium text-sm">
          {mode === "crop" ? "Crop Photo" : "Markup Photo"}
        </span>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full font-medium text-sm flex items-center gap-2"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {mode === "crop" ? "Apply" : "Save"}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {mode === "crop" ? (
          <div className="absolute inset-0">
            <Cropper
              image={currentImage}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
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
              className="touch-none bg-zinc-900 shadow-2xl ring-1 ring-white/10"
              style={{ objectFit: 'contain' }}
            />
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="p-6 bg-zinc-900/90 backdrop-blur-sm border-t border-white/10 flex justify-center gap-6 pb-safe">
        {mode === "draw" ? (
          <>
            <button 
              onClick={() => setMode("crop")}
              className="flex flex-col items-center gap-1.5 p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                <Crop className="w-5 h-5" />
              </div>
              <span className="text-xs">Crop</span>
            </button>
            <button 
              className="flex flex-col items-center gap-1.5 p-2 text-blue-400"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
              <span className="text-xs">Draw</span>
            </button>
            <button 
              onClick={() => setPaths(prev => prev.slice(0, -1))}
              disabled={paths.length === 0}
              className="flex flex-col items-center gap-1.5 p-2 text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"
            >
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                <Undo className="w-5 h-5" />
              </div>
              <span className="text-xs">Undo</span>
            </button>
            <button 
              onClick={() => setPaths([])}
              disabled={paths.length === 0}
              className="flex flex-col items-center gap-1.5 p-2 text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="text-xs">Clear</span>
            </button>
          </>
        ) : (
          <button 
            onClick={() => setMode("draw")}
            className="flex flex-col items-center gap-1.5 p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
              <X className="w-5 h-5" />
            </div>
            <span className="text-xs">Cancel Crop</span>
          </button>
        )}
      </div>
    </div>
  );
}
