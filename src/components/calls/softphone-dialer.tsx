"use client";

import { useEffect, useState, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useCallStore } from "@/hooks/use-call";
import { Mic, MicOff, PhoneOff, Phone as PhoneIcon, Loader2, Volume2 } from "lucide-react";
import toast from "react-hot-toast";

export function SoftphoneDialer() {
  const { activeNumber, isDialing, endCall } = useCallStore();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "ringing" | "in-progress" | "ended">("idle");
  const [isMuted, setIsMuted] = useState(false);
  
  // Initialize device only once
  useEffect(() => {
    async function initDevice() {
      try {
        const res = await fetch("/api/twilio/token");
        if (!res.ok) throw new Error("Failed to fetch Twilio token");
        
        const data = await res.json();
        
        const newDevice = new Device(data.token, {
          logLevel: 1,
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        });
        
        await newDevice.register();
        setDevice(newDevice);
      } catch (err) {
        console.error("Twilio Device initialization error:", err);
      }
    }
    
    initDevice();
    
    return () => {
      device?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for new outbound call requests from the store
  useEffect(() => {
    if (activeNumber && isDialing && device && callStatus === "idle") {
      initiateCall(activeNumber);
    }
  }, [activeNumber, isDialing, device]);

  const initiateCall = async (phoneNumber: string) => {
    if (!device) return;
    
    setCallStatus("connecting");
    try {
      const call = await device.connect({
        params: {
          To: phoneNumber,
        },
      });
      
      setActiveCall(call);
      
      call.on("ringing", () => setCallStatus("ringing"));
      call.on("accept", () => setCallStatus("in-progress"));
      call.on("disconnect", () => {
        setCallStatus("ended");
        setTimeout(handleClose, 2000);
      });
      call.on("error", (error) => {
        console.error("Call error:", error);
        toast.error("Call dropped: " + error.message);
        handleClose();
      });
      
    } catch (error) {
      console.error("Failed to make call", error);
      toast.error("Could not place call.");
      handleClose();
    }
  };

  const handleMute = () => {
    if (!activeCall) return;
    const currentlyMuted = activeCall.isMuted();
    activeCall.mute(!currentlyMuted);
    setIsMuted(!currentlyMuted);
  };

  const handleHangup = () => {
    if (activeCall) {
      activeCall.disconnect();
    }
    handleClose();
  };

  const handleClose = () => {
    setCallStatus("idle");
    setActiveCall(null);
    setIsMuted(false);
    endCall();
  };

  if (!activeNumber && callStatus === "idle") return null;

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl overflow-hidden z-[9999] animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="bg-cyan-900/40 p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <PhoneIcon className="h-5 w-5 text-cyan-400" />
            </div>
            {callStatus === "in-progress" && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{activeNumber}</h3>
            <p className="text-xs text-cyan-400 font-medium capitalize">
              {callStatus}
              {callStatus === "connecting" && "..."}
            </p>
          </div>
        </div>
      </div>
      
      {/* Visualizer & Controls */}
      <div className="p-6 flex flex-col items-center">
        {/* Status indicator */}
        <div className="h-16 flex items-center justify-center mb-4 text-zinc-500">
          {callStatus === "connecting" || callStatus === "ringing" ? (
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500/50" />
          ) : callStatus === "in-progress" ? (
            <div className="flex gap-1 items-center h-8">
              <div className="w-1.5 bg-cyan-400 animate-[bounce_1s_infinite] h-4 rounded-full" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 bg-cyan-400 animate-[bounce_1s_infinite] h-8 rounded-full" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 bg-cyan-400 animate-[bounce_1s_infinite] h-6 rounded-full" style={{ animationDelay: '300ms' }} />
              <div className="w-1.5 bg-cyan-400 animate-[bounce_1s_infinite] h-8 rounded-full" style={{ animationDelay: '450ms' }} />
              <div className="w-1.5 bg-cyan-400 animate-[bounce_1s_infinite] h-4 rounded-full" style={{ animationDelay: '600ms' }} />
            </div>
          ) : (
            <Volume2 className="h-8 w-8 opacity-20" />
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-6 w-full justify-center">
          <button
            onClick={handleMute}
            disabled={callStatus !== "in-progress"}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          
          <button
            onClick={handleHangup}
            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/20 transition-all hover:scale-105"
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
