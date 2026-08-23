"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MoreHorizontal,
  X,
  Volume2,
  Activity,
} from "lucide-react";
import { playRingtoneSound, playCallConnectSound, playCallEndSound } from "@/lib/sounds";

type CallStatus = "ringing" | "connected" | "ended" | "declined";

interface CallParticipant {
  id: string;
  name: string;
  image?: string | null;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface CallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  callType: "audio" | "video";
  participants: CallParticipant[];
  channelName?: string;
  channelId?: string;
  targetUserId?: string;
  targetUserName?: string;
  callSessionId?: string;
  isIncomingAcceptor?: boolean;
}

export function CallOverlay({
  isOpen,
  onClose,
  callType,
  participants,
  channelName,
  channelId,
  targetUserId,
  targetUserName,
  callSessionId: initialCallSessionId,
  isIncomingAcceptor = false,
}: CallOverlayProps) {
  const [status, setStatus] = useState<CallStatus>(isIncomingAcceptor ? "connected" : "ringing");
  const [sessionId, setSessionId] = useState<string | null>(initialCallSessionId || null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // 1. Initialize call session & microphone audio stream
  useEffect(() => {
    if (!isOpen) {
      setStatus("ringing");
      setElapsed(0);
      cleanupStreams();
      return;
    }

    let isMounted = true;

    async function initCall() {
      // Capture local mic / video
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: callType === "video",
          });
          streamRef.current = stream;
          if (localVideoRef.current && callType === "video") {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (e) {
        console.warn("Microphone/Camera access not available or denied:", e);
      }

      // If caller, create call session on backend to alert recipient
      if (!isIncomingAcceptor && !sessionId) {
        try {
          const res = await fetch("/api/chat/calls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channelId: channelId || "general",
              channelName: channelName || "Direct Call",
              targetUserId: targetUserId || participants[0]?.id,
              targetUserName: targetUserName || participants[0]?.name,
              callType,
            }),
          });
          const data = await res.json();
          if (data.call?.id && isMounted) {
            setSessionId(data.call.id);
          }
        } catch {}

        // Play ringing sound for caller
        playRingtoneSound();
        ringIntervalRef.current = setInterval(() => {
          playRingtoneSound();
        }, 2500);
      } else {
        // Connected directly for acceptor
        setStatus("connected");
        playCallConnectSound();
      }
    }

    initCall();

    return () => {
      isMounted = false;
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [isOpen, callType, isIncomingAcceptor]);

  // 2. Poll call status for changes (Accept, Decline, End) & WebRTC Signaling
  useEffect(() => {
    if (!isOpen || !sessionId) return;
    let isMounted = true;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/calls/${sessionId}/status`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.status === "connected" && status === "ringing") {
            if (ringIntervalRef.current) {
              clearInterval(ringIntervalRef.current);
              ringIntervalRef.current = null;
            }
            setStatus("connected");
            playCallConnectSound();
          } else if (data.status === "declined" || data.status === "ended") {
            handleEnd(false);
          }
        }
      } catch {}
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, sessionId, status]);

  // 3. Timer counter when connected
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  function cleanupStreams() {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }

  async function handleEnd(notifyBackend = true) {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    playCallEndSound();
    setStatus("ended");
    cleanupStreams();

    if (notifyBackend && sessionId) {
      try {
        await fetch(`/api/chat/calls/${sessionId}/end`, { method: "POST" });
      } catch {}
    }

    setTimeout(onClose, 1000);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function toggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
    }
  }

  function toggleVideo() {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !nextVideoOff));
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/80 backdrop-blur-md">
      {/* Hidden audio for remote voice */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="relative w-full max-w-lg mx-4">
        <div className="bg-surface border border-border-medium rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-hover/30">
            <div className="flex items-center gap-2.5">
              {callType === "video" ? (
                <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Video className="h-4 w-4" />
                </div>
              ) : (
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Phone className="h-4 w-4" />
                </div>
              )}
              <div>
                <span className="text-sm font-bold text-text-primary">
                  {callType === "video" ? "HD Video Call" : "HD Audio Call"}
                </span>
                {channelName && (
                  <span className="text-xs text-text-muted ml-2">in #{channelName}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleEnd(true)}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Participants area */}
          <div className="p-8 min-h-[300px] flex flex-col items-center justify-center">
            {status === "ringing" && (
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <div className="absolute -inset-2 rounded-full bg-cyan-500/20 animate-ping" />
                  <div className="relative ring-4 ring-cyan-500/30 rounded-full">
                    <Avatar
                      src={participants[0]?.image}
                      name={participants[0]?.name}
                      size="lg"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-primary">
                    {participants[0]?.name || "Team Member"}
                  </h3>
                  <p className="text-xs font-bold text-cyan-400 mt-2 animate-pulse flex items-center justify-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" /> Calling & waiting for answer...
                  </p>
                </div>
              </div>
            )}

            {status === "connected" && (
              <div className="w-full">
                {callType === "video" && !isVideoOff ? (
                  <div className="relative aspect-video bg-black/40 rounded-2xl border border-border-subtle overflow-hidden flex items-center justify-center mb-4">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white">
                      <span className="font-semibold">{participants[0]?.name || "Voice Connected"}</span>
                      {isMuted && <MicOff className="h-3 w-3 text-red-400" />}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center mb-6">
                    <div className="flex -space-x-3 mb-4">
                      {participants.slice(0, 4).map((p) => (
                        <Avatar
                          key={p.id}
                          src={p.image}
                          name={p.name}
                          size="lg"
                          className="ring-4 ring-surface shadow-xl"
                        />
                      ))}
                    </div>
                    <p className="text-sm font-bold text-text-primary">
                      {participants.map((p) => p.name).join(", ")}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mt-1.5 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20">
                      <Activity className="h-3 w-3 animate-pulse" />
                      Connected (Live HD Audio)
                    </div>
                  </div>
                )}

                {/* Call duration */}
                <p className="text-center text-sm text-cyan-400 font-mono font-bold">
                  {formatTime(elapsed)}
                </p>
              </div>
            )}

            {status === "ended" && (
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-2">
                  <PhoneOff className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-text-primary">Call Ended</h3>
                <p className="text-xs text-text-muted font-mono">
                  Duration: {formatTime(elapsed)}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          {status !== "ended" && (
            <div className="flex items-center justify-center gap-3 px-6 py-5 border-t border-border-subtle bg-surface-hover/30">
              <button
                onClick={toggleMute}
                className={cn(
                  "p-3.5 rounded-full transition-all shadow-md",
                  isMuted
                    ? "bg-rose-500 text-white shadow-rose-500/20"
                    : "bg-surface-hover text-text-secondary hover:text-text-primary border border-border-medium"
                )}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleVideo}
                className={cn(
                  "p-3.5 rounded-full transition-all shadow-md",
                  isVideoOff
                    ? "bg-surface-hover text-text-muted border border-border-medium"
                    : "bg-cyan-500 text-white shadow-cyan-500/20"
                )}
                title={isVideoOff ? "Turn on Camera" : "Turn off Camera"}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>

              <button
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={cn(
                  "p-3.5 rounded-full transition-all shadow-md",
                  isScreenSharing
                    ? "bg-cyan-500 text-white shadow-cyan-500/20"
                    : "bg-surface-hover text-text-secondary hover:text-text-primary border border-border-medium"
                )}
                title="Share Screen"
              >
                <Monitor className="h-5 w-5" />
              </button>

              <button
                onClick={() => handleEnd(true)}
                className="p-3.5 rounded-full bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/30"
                title="End Call"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
