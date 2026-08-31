"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone,
  PhoneCall,
  Delete,
  Volume2,
  VolumeX,
  Bot,
  Sparkles,
  User,
  Hash,
  Star,
  Copy,
  Check,
  Radio,
  ArrowRight,
  Clock,
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
};

function playDtmfTone(char: string, volume = 0.08) {
  if (typeof window === "undefined") return;
  const freqs = DTMF_FREQS[char];
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
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "*", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" },
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
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyPress = useCallback((char: string) => {
    if (disabled) return;
    if (soundEnabled) {
      playDtmfTone(char);
    }
    setPressedKey(char);
    setTimeout(() => setPressedKey(null), 150);
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

  const handleZeroTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (soundEnabled) playDtmfTone("0");
      onChangePhoneNumber(phoneNumber + "+");
      longPressTimerRef.current = null;
    }, 550);
  };

  const handleZeroTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      handleKeyPress("0");
    }
  };

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

  return (
    <div className={cn(
      "w-full max-w-[340px] mx-auto rounded-[32px] p-5 relative overflow-hidden select-none border transition-all duration-300",
      "bg-gradient-to-b from-slate-900 via-zinc-900 to-black text-white",
      "border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.12)]",
      className
    )}>
      {/* Top Phone Chrome / Speaker notch */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">HD VoLTE</span>
        </div>
        
        {/* Speaker Slot */}
        <div className="h-1.5 w-12 rounded-full bg-zinc-800/80 border border-white/5" />

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            "p-1.5 rounded-lg transition-all text-xs cursor-pointer",
            soundEnabled ? "text-cyan-400 hover:bg-cyan-500/10" : "text-zinc-600 hover:bg-zinc-800"
          )}
          title={soundEnabled ? "Keypad Sound On" : "Keypad Sound Muted"}
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Recipient Badge if available */}
      {recipientName && (
        <div className="flex items-center justify-center gap-1.5 mb-2 py-1 px-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold max-w-full truncate animate-fade-in">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{recipientName}</span>
        </div>
      )}

      {/* Number Display Screen */}
      <div className="relative mb-5 bg-zinc-950/70 border border-white/10 rounded-2xl p-4 min-h-[72px] flex items-center justify-center shadow-inner group">
        <div className="w-full text-center overflow-x-auto scrollbar-none px-2">
          {phoneNumber ? (
            <span className="text-2xl sm:text-3xl font-mono font-black tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {phoneNumber}
            </span>
          ) : (
            <span className="text-sm font-medium text-zinc-500 italic">
              Tap keys or dial number...
            </span>
          )}
        </div>

        {/* Action icons on display: Copy / Paste / Backspace */}
        {phoneNumber ? (
          <div className="absolute right-3 flex items-center gap-1">
            <button
              type="button"
              onClick={handleBackspace}
              onContextMenu={(e) => {
                e.preventDefault();
                handleClear();
              }}
              className="p-1.5 text-zinc-400 hover:text-rose-400 active:scale-90 transition-all rounded-lg hover:bg-white/5 cursor-pointer"
              title="Delete (Hold to clear)"
            >
              <Delete className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="absolute right-3">
            <button
              type="button"
              onClick={handlePaste}
              className="p-1.5 text-zinc-500 hover:text-cyan-400 active:scale-90 transition-all rounded-lg hover:bg-white/5 text-[10px] flex items-center gap-1 font-bold cursor-pointer"
              title="Paste number from clipboard"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Keypad Grid (12 Keys) */}
      <div className="grid grid-cols-3 gap-3 mb-6 px-1">
        {KEYPAD_KEYS.map(({ digit, sub }) => {
          const isZero = digit === "0";
          const isStarOrHash = digit === "*" || digit === "#";
          const isPressed = pressedKey === digit;

          return (
            <button
              key={digit}
              type="button"
              disabled={disabled}
              onClick={() => !isZero && handleKeyPress(digit)}
              onTouchStart={isZero ? handleZeroTouchStart : undefined}
              onTouchEnd={isZero ? handleZeroTouchEnd : undefined}
              onMouseDown={isZero ? handleZeroTouchStart : undefined}
              onMouseUp={isZero ? handleZeroTouchEnd : undefined}
              className={cn(
                "h-14 sm:h-16 rounded-full flex flex-col items-center justify-center transition-all duration-150 relative select-none cursor-pointer",
                "bg-zinc-800/60 hover:bg-zinc-700/80 active:bg-cyan-500 active:text-white border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                "hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] active:scale-95",
                isPressed && "bg-cyan-500 text-white border-cyan-400 scale-95 shadow-[0_0_20px_rgba(6,182,212,0.6)]"
              )}
            >
              <span className={cn(
                "font-black tracking-tight leading-none text-white",
                isStarOrHash ? "text-2xl pt-1 text-slate-400" : "text-xl sm:text-2xl"
              )}>
                {digit}
              </span>
              {sub && (
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5 opacity-80">
                  {sub}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dual Call Action Buttons */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {/* Manual Live Direct Call Button */}
        <button
          type="button"
          disabled={disabled || !phoneNumber || isManualCalling}
          onClick={() => onManualCall(phoneNumber)}
          className={cn(
            "h-13 py-3 px-2 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden group shadow-lg active:scale-95 cursor-pointer",
            "bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black",
            "shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]",
            (!phoneNumber || disabled || isManualCalling) && "opacity-50 pointer-events-none grayscale"
          )}
          title="Direct Manual Call via Twilio Softphone"
        >
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
            <Phone className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            <span>Direct Call</span>
          </div>
          <span className="text-[9px] font-bold text-emerald-100/80 tracking-wide mt-0.5">
            {isManualCalling ? "Connecting..." : "Live Manual"}
          </span>
        </button>

        {/* AI Auto Voice Call Button */}
        <button
          type="button"
          disabled={disabled || !phoneNumber || isAiCalling}
          onClick={() => onAiCall(phoneNumber)}
          className={cn(
            "h-13 py-3 px-2 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden group shadow-lg active:scale-95 cursor-pointer",
            "bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-black",
            "shadow-[0_4px_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]",
            (!phoneNumber || disabled || isAiCalling) && "opacity-50 pointer-events-none grayscale"
          )}
          title="AI Automated Voice Call with cloned voice"
        >
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
            <Bot className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span>AI Call</span>
          </div>
          <span className="text-[9px] font-bold text-cyan-100/80 tracking-wide mt-0.5">
            {isAiCalling ? "Calling..." : "Voice Cloned"}
          </span>
        </button>
      </div>

      {/* Bottom Subtle Status */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-semibold px-2">
        <div className="flex items-center gap-1">
          <Radio className="h-3 w-3 text-cyan-400" />
          <span>Smart Twilio & ElevenLabs</span>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={!phoneNumber}
          className="hover:text-zinc-300 disabled:opacity-0 transition-opacity uppercase font-bold cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
