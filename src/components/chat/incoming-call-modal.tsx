"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui";
import { Phone, PhoneOff, Video, Volume2, Sparkles, X } from "lucide-react";
import { playRingtoneSound, playCallConnectSound, playCallEndSound } from "@/lib/sounds";
import { CallOverlay } from "@/components/chat/call-overlay";

export function GlobalIncomingCallManager() {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallSession, setActiveCallSession] = useState<any>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const ringIntervalRef = useRef<any>(null);

  // Poll for incoming calls
  useEffect(() => {
    let isMounted = true;

    async function checkIncomingCalls() {
      if (activeCallSession) return; // Already in a call
      try {
        const res = await fetch("/api/chat/calls/active");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.incomingCall && data.incomingCall.status === "ringing") {
            setIncomingCall(data.incomingCall);
          } else {
            setIncomingCall(null);
          }
        }
      } catch {}
    }

    checkIncomingCalls();
    const interval = setInterval(checkIncomingCalls, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeCallSession]);

  // Handle ringing sounds
  useEffect(() => {
    if (incomingCall && !activeCallSession) {
      playRingtoneSound();
      ringIntervalRef.current = setInterval(() => {
        playRingtoneSound();
      }, 2500);
    } else {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    }

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [incomingCall, activeCallSession]);

  async function handleAccept() {
    if (!incomingCall) return;
    setIsAnswering(true);
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    playCallConnectSound();

    try {
      const res = await fetch(`/api/chat/calls/${incomingCall.id}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.call) {
        setActiveCallSession(data.call);
      }
    } catch {
      setActiveCallSession(incomingCall);
    } finally {
      setIsAnswering(false);
      setIncomingCall(null);
    }
  }

  async function handleDecline() {
    if (!incomingCall) return;
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    playCallEndSound();

    try {
      await fetch(`/api/chat/calls/${incomingCall.id}/decline`, {
        method: "POST",
      });
    } catch {}
    setIncomingCall(null);
  }

  return (
    <>
      {/* ── Incoming Call Dialog ── */}
      {incomingCall && !activeCallSession && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/85 backdrop-blur-lg animate-fade-in p-4">
          <div className="relative w-full max-w-md bg-surface border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-500/20 overflow-hidden p-7 text-center space-y-6">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-blue-500 animate-pulse" />

            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider">
                <Volume2 className="h-3.5 w-3.5 animate-bounce" />
                Incoming {incomingCall.callType === "video" ? "Video" : "Audio"} Call
              </span>
              <span className="bg-surface-hover px-2.5 py-0.5 rounded-full border border-border-subtle">
                #{incomingCall.channelName || "Direct"}
              </span>
            </div>

            {/* Caller Avatar */}
            <div className="relative inline-block my-2">
              <div className="absolute -inset-3 rounded-full bg-emerald-500/25 animate-ping" />
              <div className="relative ring-4 ring-emerald-500/40 rounded-full shadow-2xl shadow-emerald-500/30">
                <Avatar
                  src={incomingCall.callerImage}
                  name={incomingCall.callerName}
                  size="lg"
                  className="h-20 w-20 text-xl"
                />
              </div>
            </div>

            {/* Caller Info */}
            <div className="space-y-1">
              <h3 className="text-xl font-black text-text-primary tracking-tight">
                {incomingCall.callerName}
              </h3>
              <p className="text-xs text-text-muted">
                is calling you on PropPreserve Voice Network
              </p>
            </div>

            {/* Accept / Decline Action Buttons */}
            <div className="flex items-center justify-center gap-6 pt-2">
              {/* Decline */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleDecline}
                  className="h-16 w-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
                  title="Decline Call"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
                <span className="text-xs font-bold text-rose-400">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleAccept}
                  disabled={isAnswering}
                  className="h-16 w-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 hover:opacity-95 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 transition-all hover:scale-105 active:scale-95 animate-pulse"
                  title="Accept Call"
                >
                  {incomingCall.callType === "video" ? (
                    <Video className="h-7 w-7" />
                  ) : (
                    <Phone className="h-7 w-7" />
                  )}
                </button>
                <span className="text-xs font-bold text-emerald-400">Accept Call</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Connected Call Overlay ── */}
      {activeCallSession && (
        <CallOverlay
          isOpen={!!activeCallSession}
          onClose={() => setActiveCallSession(null)}
          callType={activeCallSession.callType || "audio"}
          callSessionId={activeCallSession.id}
          isIncomingAcceptor={true}
          participants={[
            {
              id: activeCallSession.callerId,
              name: activeCallSession.callerName,
              image: activeCallSession.callerImage,
            },
          ]}
          channelName={activeCallSession.channelName}
        />
      )}
    </>
  );
}
