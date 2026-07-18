"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Phone, Bot, Loader2 } from "lucide-react";
import { useCallStore } from "@/hooks/use-call";
import toast from "react-hot-toast";

interface CallOptionModalProps {
  phoneNumber: string;
  contractorId?: string;
  workOrderId?: string;
  children: React.ReactNode;
}

export function CallOptionModal({ phoneNumber, contractorId, workOrderId, children }: CallOptionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAICalling, setIsAICalling] = useState(false);
  const { startCall } = useCallStore();

  const handleManualCall = () => {
    setIsOpen(false);
    startCall(phoneNumber, { contractorId, workOrderId });
  };

  const handleAICall = async () => {
    setIsAICalling(true);
    try {
      const response = await fetch("/api/ai/voice-agent/work-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          workOrderId,
          contractorId,
        }),
      });

      if (!response.ok) throw new Error("Failed to start AI call");
      
      toast.success("AI Voice Agent is now calling the contact");
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to trigger AI call. Please try again.");
    } finally {
      setIsAICalling(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        title="How would you like to call?"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <button
            onClick={handleManualCall}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border-subtle bg-surface hover:bg-surface-hover hover:border-cyan-500/50 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-text-primary mb-1">Manual Call</h4>
              <p className="text-xs text-text-muted">Call directly from your browser using Twilio Voice.</p>
            </div>
          </button>
          
          <button
            onClick={handleAICall}
            disabled={isAICalling}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border-subtle bg-surface hover:bg-surface-hover hover:border-violet-500/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              {isAICalling ? (
                <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
              ) : (
                <Bot className="h-6 w-6 text-violet-400" />
              )}
            </div>
            <div className="text-center">
              <h4 className="font-bold text-text-primary mb-1">AI Voice Agent</h4>
              <p className="text-xs text-text-muted">Let the AI assistant handle the call and gather updates.</p>
            </div>
          </button>
        </div>
      </Modal>
    </>
  );
}
