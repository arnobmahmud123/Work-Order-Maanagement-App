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
} from "lucide-react";
import { playRingtoneSound, playCallConnectSound, playCallEndSound } from "@/lib/sounds";

type CallStatus = "ringing" | "connected" | "ended";

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
}

export function CallOverlay({
  isOpen,
  onClose,
  callType,
  participants,
  channelName,
}: CallOverlayProps) {
  const [status, setStatus] = useState<CallStatus>("ringing");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatus("ringing");
      setElapsed(0);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }

    // Play ringtone on dial
    playRingtoneSound();
    const ringInterval = setInterval(() => {
      playRingtoneSound();
    }, 2500);

    // Auto-connect after 2.5s
    const connectTimer = setTimeout(() => {
      clearInterval(ringInterval);
      setStatus("connected");
      playCallConnectSound();

      // Attempt to access local mic / camera
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true, video: callType === "video" })
          .then((stream) => {
            streamRef.current = stream;
            if (localVideoRef.current && callType === "video") {
              localVideoRef.current.srcObject = stream;
            }
          })
          .catch(() => {
            // Safe fallback if browser permissions denied
          });
      }
    }, 2500);

    return () => {
      clearInterval(ringInterval);
      clearTimeout(connectTimer);
    };
  }, [isOpen, callType]);

  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function handleEnd() {
    playCallEndSound();
    setStatus("ended");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTimeout(onClose, 1000);
  }

  function toggleMute() {
    setIsMuted(!isMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    }
  }

  function toggleVideo() {
    setIsVideoOff(!isVideoOff);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg mx-4">
        {/* Main call container */}
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
                  {callType === "video" ? "HD Video Call" : "Internal Voice Call"}
                </span>
                {channelName && (
                  <span className="text-xs text-text-muted ml-2">in #{channelName}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleEnd}
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
                  {participants.length > 1 && (
                    <p className="text-xs text-text-muted mt-0.5">
                      +{participants.length - 1} team participants
                    </p>
                  )}
                  <p className="text-xs font-bold text-cyan-400 mt-2 animate-pulse flex items-center justify-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" /> Calling team member...
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
                      <span className="font-semibold">{participants[0]?.name || "Local Video"}</span>
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
                    <span className="text-[11px] text-emerald-400 font-semibold mt-1">
                      ● Connected (HD Audio)
                    </span>
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
                onClick={handleEnd}
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
