"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone,
  Delete,
  Volume2,
  VolumeX,
  Bot,
  Sparkles,
  User,
  Copy,
  Plus,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
  "+": [941, 1336],
};

function playDtmfTone(char: string, volume = 0.08) {
  if (typeof window === "undefined") return;
  const freqs = DTMF_FREQS[char] || DTMF_FREQS["0"];
  if (!freqs) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.09);
    osc2.stop(ctx.currentTime + 0.09);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 150);
  } catch {}
}

const KEYPAD_KEYS = [
  { digit: "1", sub: "", color: "from-blue-500/15 to-cyan-500/10 hover:border-blue-400/50 hover:shadow-blue-500/20 active:bg-blue-500" },
  { digit: "2", sub: "ABC", color: "from-cyan-500/15 to-teal-500/10 hover:border-cyan-400/50 hover:shadow-cyan-500/20 active:bg-cyan-500" },
  { digit: "3", sub: "DEF", color: "from-teal-500/15 to-emerald-500/10 hover:border-emerald-400/50 hover:shadow-emerald-500/20 active:bg-emerald-500" },
  { digit: "4", sub: "GHI", color: "from-emerald-500/15 to-green-500/10 hover:border-green-400/50 hover:shadow-green-500/20 active:bg-green-500" },
  { digit: "5", sub: "JKL", color: "from-indigo-500/15 to-purple-500/10 hover:border-indigo-400/50 hover:shadow-indigo-500/20 active:bg-indigo-500" },
  { digit: "6", sub: "MNO", color: "from-purple-500/15 to-pink-500/10 hover:border-purple-400/50 hover:shadow-purple-500/20 active:bg-purple-500" },
  { digit: "7", sub: "PQRS", color: "from-pink-500/15 to-rose-500/10 hover:border-pink-400/50 hover:shadow-pink-500/20 active:bg-pink-500" },
  { digit: "8", sub: "TUV", color: "from-amber-500/15 to-orange-500/10 hover:border-amber-400/50 hover:shadow-amber-500/20 active:bg-amber-500" },
  { digit: "9", sub: "WXYZ", color: "from-orange-500/15 to-red-500/10 hover:border-orange-400/50 hover:shadow-orange-500/20 active:bg-orange-500" },
  { digit: "*", sub: "", color: "from-rose-500/15 to-pink-500/10 hover:border-rose-400/50 hover:shadow-rose-500/20 active:bg-rose-500" },
  { digit: "0", sub: "+", color: "from-cyan-500/15 to-blue-500/10 hover:border-cyan-400/50 hover:shadow-cyan-500/20 active:bg-cyan-500" },
  { digit: "#", sub: "", color: "from-violet-500/15 to-indigo-500/10 hover:border-violet-400/50 hover:shadow-violet-500/20 active:bg-violet-500" },
];

export interface SmartPhoneDialerProps {
  phoneNumber: string;
  onChangePhoneNumber: (phone: string) => void;
  recipientName?: string;
  onManualCall: (phone: string) => void;
  onAiCall: (phone: string) => void;
  isAiCalling?: boolean;
  isManualCalling?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SmartPhoneDialer({
  phoneNumber,
  onChangePhoneNumber,
  recipientName,
  onManualCall,
  onAiCall,
  isAiCalling = false,
  isManualCalling = false,
  disabled = false,
  className,
}: SmartPhoneDialerProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // Single reliable keypress handler (Fixed: Exactly one digit per click)
  const handleKeyPress = useCallback((char: string) => {
    if (disabled) return;
    if (soundEnabled) {
      playDtmfTone(char);
    }
    setPressedKey(char);
    setTimeout(() => setPressedKey(null), 120);
    onChangePhoneNumber(phoneNumber + char);
  }, [disabled, soundEnabled, phoneNumber, onChangePhoneNumber]);

  const handleBackspace = useCallback(() => {
    if (disabled || !phoneNumber) return;
    onChangePhoneNumber(phoneNumber.slice(0, -1));
  }, [disabled, phoneNumber, onChangePhoneNumber]);

  const handleClear = useCallback(() => {
    if (disabled || !phoneNumber) return;
    onChangePhoneNumber("");
  }, [disabled, phoneNumber, onChangePhoneNumber]);

  // Physical Desktop / Laptop Keyboard Listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      // Don't intercept if user is typing in name or purpose inputs
      if (target && (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && target.getAttribute("type") !== "tel"))) {
        return;
      }

      const key = e.key;
      if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "+"].includes(key)) {
        e.preventDefault();
        handleKeyPress(key);
      } else if (key === "Backspace") {
        if (!target || target.getAttribute("type") !== "tel") {
          e.preventDefault();
          handleBackspace();
        }
      } else if (key === "Enter" && phoneNumber) {
        e.preventDefault();
        onManualCall(phoneNumber);
      } else if (key === "Escape") {
        e.preventDefault();
        handleClear();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress, handleBackspace, handleClear, onManualCall, phoneNumber]);

  const handleCopy = () => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    toast.success("Phone number copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.replace(/[^\d+*#()-\s]/g, "");
      if (cleaned) {
        onChangePhoneNumber(cleaned);
        toast.success("Pasted number");
      }
    } catch {
      toast.error("Could not access clipboard");
    }
  };

  const handleAddPlus = () => {
    if (disabled) return;
    if (soundEnabled) playDtmfTone("0");
    onChangePhoneNumber(phoneNumber + "+");
  };

  return (
    <div className={cn(
      "w-full max-w-[320px] mx-auto rounded-[28px] p-4 relative overflow-hidden select-none border transition-all duration-300 flex flex-col justify-between",
      "bg-gradient-to-b from-slate-900 via-indigo-950/70 to-slate-950 text-white",
      "border-cyan-500/30 shadow-[0_15px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(6,182,212,0.18)] backdrop-blur-xl",
      className
    )}>
      {/* Top Phone Chrome / Speaker notch */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span className="text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              HD VoLTE • 5G
            </span>
          </div>
          
          {/* Speaker Slot */}
          <div className="h-1.5 w-10 rounded-full bg-slate-800 border border-white/10" />

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "p-1 rounded-lg transition-all text-xs cursor-pointer",
              soundEnabled ? "text-cyan-400 hover:bg-cyan-500/20" : "text-slate-500 hover:bg-slate-800"
            )}
            title={soundEnabled ? "Keypad Sound On" : "Keypad Sound Muted"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Recipient Badge if available */}
        {recipientName && (
          <div className="flex items-center justify-center gap-1.5 mb-2 py-0.5 px-2.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-200 text-[11px] font-bold max-w-full truncate animate-fade-in">
            <User className="h-3 w-3 flex-shrink-0 text-cyan-400" />
            <span className="truncate">{recipientName}</span>
          </div>
        )}

        {/* Number Display Screen */}
        <div className="relative mb-3.5 bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-2.5 min-h-[58px] flex items-center justify-center shadow-inner group">
          <div className="w-full text-center overflow-x-auto scrollbar-none px-2">
            {phoneNumber ? (
              <span className="text-xl sm:text-2xl font-mono font-black tracking-wider text-transparent bg-gradient-to-r from-cyan-200 via-white to-emerald-200 bg-clip-text drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                {phoneNumber}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 italic">
                Tap keys or use laptop keyboard...
              </span>
            )}
          </div>

          {/* Quick Actions inside Display Screen */}
          <div className="absolute right-2 flex items-center gap-1">
            {phoneNumber ? (
              <button
                type="button"
                onClick={handleBackspace}
                className="p-1 text-slate-400 hover:text-rose-400 active:scale-90 transition-all rounded-lg hover:bg-white/10 cursor-pointer"
                title="Backspace"
              >
                <Delete className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="p-1 text-slate-500 hover:text-cyan-400 active:scale-90 transition-all rounded-lg hover:bg-white/10 text-[9px] flex items-center gap-1 font-bold cursor-pointer"
                title="Paste number from clipboard"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Keypad Grid (12 Keys) - Colorful & Compact */}
      <div className="grid grid-cols-3 gap-2 mb-3 px-0.5">
        {KEYPAD_KEYS.map(({ digit, sub, color }) => {
          const isStarOrHash = digit === "*" || digit === "#";
          const isPressed = pressedKey === digit;

          return (
            <button
              key={digit}
              type="button"
              disabled={disabled}
              onClick={() => handleKeyPress(digit)}
              className={cn(
                "h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-100 relative select-none cursor-pointer",
                "bg-gradient-to-b border border-white/10 shadow-sm",
                color,
                "hover:scale-[1.03] active:scale-95",
                isPressed && "scale-95 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8)] text-white"
              )}
            >
              <span className={cn(
                "font-black tracking-tight leading-none text-white",
                isStarOrHash ? "text-lg text-slate-300" : "text-base sm:text-lg"
              )}>
                {digit}
              </span>
              {sub && (
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-cyan-200/70 mt-0.5 leading-none">
                  {sub}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dual Call Action Buttons */}
      <div>
        <div className="grid grid-cols-2 gap-2 px-0.5 mb-2">
          {/* Manual Live Direct Call Button */}
          <button
            type="button"
            disabled={disabled || !phoneNumber || isManualCalling}
            onClick={() => onManualCall(phoneNumber)}
            className={cn(
              "h-11 py-2 px-1.5 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden group shadow-md active:scale-95 cursor-pointer",
              "bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black",
              "shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.7)]",
              (!phoneNumber || disabled || isManualCalling) && "opacity-50 pointer-events-none grayscale"
            )}
            title="Direct Manual Call via Twilio Softphone"
          >
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider">
              <Phone className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
              <span>Direct Call</span>
            </div>
            <span className="text-[8px] font-bold text-emerald-100/90 tracking-wide leading-none mt-0.5">
              {isManualCalling ? "Connecting..." : "Live Manual"}
            </span>
          </button>

          {/* AI Auto Voice Call Button */}
          <button
            type="button"
            disabled={disabled || !phoneNumber || isAiCalling}
            onClick={() => onAiCall(phoneNumber)}
            className={cn(
              "h-11 py-2 px-1.5 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden group shadow-md active:scale-95 cursor-pointer",
              "bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:via-blue-500 hover:to-purple-500 text-white font-black",
              "shadow-[0_4px_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.7)]",
              (!phoneNumber || disabled || isAiCalling) && "opacity-50 pointer-events-none grayscale"
            )}
            title="AI Automated Voice Call with cloned voice"
          >
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider">
              <Bot className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span>AI Call</span>
            </div>
            <span className="text-[8px] font-bold text-cyan-100/90 tracking-wide leading-none mt-0.5">
              {isAiCalling ? "Calling..." : "Voice Cloned"}
            </span>
          </button>
        </div>

        {/* Bottom Quick Tools */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400 font-semibold px-1">
          <button
            type="button"
            onClick={handleAddPlus}
            className="hover:text-cyan-300 flex items-center gap-0.5 font-bold uppercase transition-colors cursor-pointer"
            title="Insert international + prefix"
          >
            <Plus className="h-2.5 w-2.5" /> Plus (+)
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!phoneNumber}
            className="hover:text-cyan-300 disabled:opacity-0 transition-opacity uppercase font-bold cursor-pointer"
          >
            Copy
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!phoneNumber}
            className="hover:text-rose-400 disabled:opacity-0 transition-opacity uppercase font-bold cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
