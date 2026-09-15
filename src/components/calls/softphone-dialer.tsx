"use client";

import { useEffect, useState, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useCallStore } from "@/hooks/use-call";
import { Phone as PhoneIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import { SmartPhoneDialer } from "./smart-phone-dialer";

export function SoftphoneDialer() {
  const { activeNumber, isDialing, endCall } = useCallStore();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "ringing" | "in-progress" | "ended">("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(activeNumber || "");
  const [isOpen, setIsOpen] = useState(false);
  
  // Keep local phone number in sync if it changes externally
  useEffect(() => {
    if (activeNumber) {
      setPhoneNumber(activeNumber);
      setIsOpen(true);
    }
  }, [activeNumber]);

  // Global toggle listener
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("toggle-softphone", handleToggle);
    return () => window.removeEventListener("toggle-softphone", handleToggle);
  }, []);

  // Initialize device only once
  useEffect(() => {
    async function initDevice() {
      try {
        const res = await fetch("/api/twilio/token");
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch Twilio token");
        }
        
        const newDevice = new Device(data.token, {
          logLevel: 1,
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        });
        
        await newDevice.register();
        setDevice(newDevice);
      } catch (err: any) {
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

  const initiateCall = async (phone: string) => {
    if (!device) {
      toast.error("Phone system not connected. Try again in a moment.");
      return;
    }
    if (!phone) {
      toast.error("Please enter a phone number");
      return;
    }
    
    setCallStatus("connecting");
    setIsOpen(true);
    try {
      const call = await device.connect({
        params: {
          To: phone,
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

  if (!isOpen && !activeCall) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5">
      <div className="relative">
        <button
          onClick={() => {
            if (activeCall) {
              toast("Can't close dialer while on an active call", { icon: "📞" });
              return;
            }
            setIsOpen(false);
          }}
          className="absolute -top-3 -right-3 h-8 w-8 bg-surface border border-border-subtle rounded-full flex items-center justify-center text-text-muted hover:text-rose-400 hover:border-rose-400/50 shadow-lg shadow-black/20 z-10 transition-all cursor-pointer z-50"
          title="Close Phone"
        >
          <X className="h-4 w-4" />
        </button>
        
        <SmartPhoneDialer
          phoneNumber={phoneNumber}
          onChangePhoneNumber={setPhoneNumber}
          onManualCall={callStatus === "idle" ? initiateCall : handleHangup}
          onAiCall={() => toast.error("AI Calling requires a voice profile setup from the AI Calling page.")}
          isManualCalling={callStatus === "connecting" || callStatus === "ringing" || callStatus === "in-progress"}
          disabled={callStatus !== "idle" && callStatus !== "ended"}
          className="shadow-2xl shadow-cyan-500/10 border-cyan-500/40"
        />
        
        {/* Active Call Overlay Banner embedded on top of dialer */}
        {callStatus !== "idle" && callStatus !== "ended" && (
          <div className="absolute top-12 left-4 right-4 bg-cyan-950/90 backdrop-blur-md rounded-xl p-3 border border-cyan-500/50 shadow-inner flex items-center justify-between z-20">
             <div className="flex flex-col">
               <span className="text-[10px] uppercase font-black text-cyan-400 tracking-wider">
                 {callStatus}
               </span>
               <span className="text-sm font-mono font-bold text-white">
                 {phoneNumber}
               </span>
             </div>
             <button
               onClick={handleHangup}
               className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
             >
               End
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
