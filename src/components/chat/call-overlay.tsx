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
} from "lucide-react";
import { playRingtoneSound, playCallConnectSound, playCallEndSound } from "@/lib/sounds";
import { useRealtimeKitClient, useRealtimeKitSelector } from "@cloudflare/realtimekit-react";

type CallStatus = "ringing" | "connected" | "ended" | "declined";

interface CallParticipant {
  id: string;
  name: string;
  image?: string | null;
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

export function CallOverlay(props: CallOverlayProps) {
  if (!props.isOpen) return null;
  return <CallOverlayInternal {...props} />;
}

function CallOverlayInternal({
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
  const [elapsed, setElapsed] = useState(0);
  const ringIntervalRef = useRef<any>(null);

  const [cfToken, setCfToken] = useState<string>("");

  const [meeting, initMeeting] = useRealtimeKitClient();

  // 1. Initialize call session
  useEffect(() => {
    let isMounted = true;

    async function initCall() {
      if (!isIncomingAcceptor && !sessionId) {
        try {
          const res = await fetch("/api/chat/calls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channelId: channelId || "general",
              channelName: channelName || "Direct Call",
              targetUserId,
              targetUserName,
              callType,
            }),
          });
          const data = await res.json();
          if (data.call?.id && isMounted) {
            setSessionId(data.call.id);
          }
        } catch {}

        playRingtoneSound();
        ringIntervalRef.current = setInterval(() => {
          playRingtoneSound();
        }, 2500);
      } else {
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
  }, [callType, isIncomingAcceptor, targetUserId, targetUserName]);

  // 2. Poll call status
  useEffect(() => {
    if (!sessionId) return;
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
  }, [sessionId, status]);

  // 3. Fetch CF RealtimeKit Token when connected
  useEffect(() => {
    if (status === "connected" && sessionId && !cfToken) {
      let isMounted = true;
      fetch(`/api/chat/calls/${sessionId}/token`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && data.token) {
            setCfToken(data.token);
          }
        })
        .catch(err => console.error("Failed to fetch CF token", err));
        
      return () => { isMounted = false; };
    }
  }, [status, sessionId, cfToken]);

  // 4. Initialize CF RealtimeKit SDK
  useEffect(() => {
    if (cfToken && !meeting) {
      initMeeting({
        authToken: cfToken,
        defaults: {
          audio: true,
          video: callType === "video",
        },
      });
    }
  }, [cfToken, meeting, initMeeting, callType]);

  useEffect(() => {
    if (meeting) {
      meeting.join().catch(console.error);
    }
    return () => {
      if (meeting) {
        try { meeting.leave(); } catch (e) {}
      }
    }
  }, [meeting]);

  // 5. Timer counter when connected
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  async function handleEnd(notifyBackend = true) {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    playCallEndSound();
    setStatus("ended");

    if (meeting) {
      try { meeting.leave(); } catch (e) {}
    }

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

  return (
    <>
      <CallUI 
        status={status}
        elapsed={elapsed}
        formatTime={formatTime}
        participants={participants}
        channelName={channelName}
        callType={callType}
        handleEnd={() => handleEnd(true)}
        meeting={meeting}
      />
      {meeting && <RemoteAudioRenderer meeting={meeting} />}
    </>
  );
}

function RemoteParticipantAudio({ id }: { id: string }) {
  const audioTrack = useRealtimeKitSelector((m) => m?.participants?.joined?.get(id)?.audioTrack);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && audioTrack) {
      const stream = new MediaStream([audioTrack]);
      audioRef.current.srcObject = stream;
    }
  }, [audioTrack]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

function RemoteAudioRenderer({ meeting }: { meeting: any }) {
  const joinedIds = useRealtimeKitSelector((m) => {
    if (!m?.participants?.joined) return "";
    return Array.from(m.participants.joined.keys()).join(",");
  });

  const ids = joinedIds ? joinedIds.split(",") : [];

  return (
    <div className="hidden" style={{ display: 'none' }}>
      {ids.map((id) => (
        <RemoteParticipantAudio key={id} id={id} />
      ))}
    </div>
  );
}

function CallUI({ 
  status, elapsed, formatTime, participants, channelName, callType, handleEnd, meeting 
}: any) {
  
  // RealtimeKit selector for checking if audio is enabled
  const audioEnabled = useRealtimeKitSelector((m) => m?.self?.audioEnabled ?? false);
  const [micEnabled, setMicEnabled] = useState(true);

  useEffect(() => {
    if (meeting) {
      setMicEnabled(audioEnabled);
    }
  }, [audioEnabled, meeting]);

  const toggleMic = () => {
    if (meeting?.self) {
      if (micEnabled) {
        meeting.self.disableAudio();
      } else {
        meeting.self.enableAudio();
      }
      setMicEnabled(!micEnabled);
    }
  };

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg mx-4">
        <div className="bg-surface border border-border-medium rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-hover/30">
            <div className="flex items-center gap-2.5">
              {callType === "video" ? (
                <Video className="h-5 w-5 text-cyan-400" />
              ) : (
                <Phone className="h-5 w-5 text-emerald-400" />
              )}
              <h3 className="font-semibold text-text-primary">
                {callType === "video" ? "Video Call" : "Audio Call"}
              </h3>
            </div>
            {status === "connected" && (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-inner">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold tracking-widest">{formatTime(elapsed)}</span>
              </div>
            )}
          </div>

          {/* Main Area */}
          <div className="relative p-8 flex flex-col items-center justify-center min-h-[320px] bg-gradient-to-b from-surface to-background">
            <div className="relative mb-6">
              <div className={cn(
                "h-28 w-28 rounded-full flex items-center justify-center relative z-10 bg-surface border-4 border-background shadow-xl overflow-hidden",
                status === "ringing" && "animate-pulse"
              )}>
                {participants[0]?.image ? (
                  <img src={participants[0]?.image} alt="Caller" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white uppercase shadow-inner">
                    {(participants[0]?.name || "U")[0]}
                  </div>
                )}
              </div>
              
              {status === "ringing" && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <div className="absolute inset-[-20px] rounded-full border-2 border-emerald-500/10 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] delay-300" />
                  <div className="absolute inset-[-40px] rounded-full border-2 border-emerald-500/5 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] delay-700" />
                </>
              )}

              <div className={cn(
                "absolute -bottom-2 -right-2 px-3 py-1 rounded-xl border border-border-subtle backdrop-blur-md shadow-lg z-20 font-medium text-[11px] uppercase tracking-wider",
                status === "connected" ? "bg-emerald-500/20 text-emerald-400" :
                status === "ended" || status === "declined" ? "bg-rose-500/20 text-rose-400" :
                "bg-cyan-500/20 text-cyan-400"
              )}>
                {status}
              </div>
            </div>

            <h2 className="text-2xl font-black text-text-primary tracking-tight text-center mb-1 drop-shadow-md">
              {participants.length > 0 ? participants[0].name : channelName}
            </h2>
            <p className="text-text-muted text-sm text-center max-w-[250px] mx-auto opacity-80 truncate">
              {channelName || "Direct Call"}
            </p>

            {status === "connected" && meeting && (
              <div className="mt-8 flex items-center gap-1.5 h-8">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-emerald-500/50 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    style={{
                      height: `${Math.random() * 100 + 20}%`,
                      animationDuration: `${Math.random() * 0.5 + 0.5}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-surface-hover/50 border-t border-border-subtle p-6 backdrop-blur-xl">
            <div className="flex items-center justify-center gap-6">
              
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleMic}
                disabled={!meeting || status !== "connected"}
                className={cn(
                  "h-14 w-14 rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 border",
                  !micEnabled
                    ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20 shadow-rose-500/5"
                    : "bg-surface text-text-secondary hover:bg-surface-hover hover:text-cyan-400 border-border-subtle"
                )}
              >
                {!micEnabled ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              {callType === "video" && (
                <Button
                  variant="ghost"
                  size="lg"
                  disabled={!meeting || status !== "connected"}
                  className="h-14 w-14 rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 border bg-surface text-text-secondary hover:bg-surface-hover hover:text-cyan-400 border-border-subtle"
                >
                  <Video className="h-6 w-6" />
                </Button>
              )}

              <Button
                variant="danger"
                size="lg"
                onClick={handleEnd}
                className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all border border-rose-400/20"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
