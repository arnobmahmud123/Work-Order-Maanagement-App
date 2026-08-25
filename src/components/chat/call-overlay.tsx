"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Phone, PhoneOff, Video, Mic, MicOff } from "lucide-react";
import { playRingtoneSound, playCallConnectSound, playCallEndSound } from "@/lib/sounds";
import {
  useRealtimeKitClient,
  useRealtimeKitSelector,
  RealtimeKitProvider,
} from "@cloudflare/realtimekit-react";

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
  const [status, setStatus] = useState<CallStatus>(
    isIncomingAcceptor ? "connected" : "ringing"
  );
  const [sessionId, setSessionId] = useState<string | null>(
    initialCallSessionId || null
  );
  const [elapsed, setElapsed] = useState(0);
  const ringIntervalRef = useRef<any>(null);
  const [cfToken, setCfToken] = useState<string>("");
  const [micEnabled, setMicEnabled] = useState(true);
  const [meeting, initMeeting] = useRealtimeKitClient();

  // ── 1. Init call session & ring ──────────────────────────────────────────
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
        ringIntervalRef.current = setInterval(() => playRingtoneSound(), 2500);
      } else {
        setStatus("connected");
        playCallConnectSound();
      }
    }

    initCall();
    return () => {
      isMounted = false;
      clearInterval(ringIntervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Poll call status ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let isMounted = true;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/calls/${sessionId}/status`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.status === "connected" && status === "ringing") {
            clearInterval(ringIntervalRef.current);
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
  }, [sessionId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Fetch CF token once connected ────────────────────────────────────
  useEffect(() => {
    if (status !== "connected" || !sessionId || cfToken) return;
    let isMounted = true;
    fetch(`/api/chat/calls/${sessionId}/token`)
      .then((r) => r.json())
      .then((d) => { if (isMounted && d.token) setCfToken(d.token); })
      .catch(console.error);
    return () => { isMounted = false; };
  }, [status, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Initialize RealtimeKit SDK ────────────────────────────────────────
  useEffect(() => {
    if (!cfToken || meeting) return;

    // Explicitly request mic permission first so the browser shows the prompt
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(() => {
        initMeeting({
          authToken: cfToken,
          defaults: { audio: true, video: callType === "video" },
        });
      })
      .catch((err) => {
        console.warn("[CallOverlay] Mic permission denied:", err);
        // Still try to init without mic
        initMeeting({
          authToken: cfToken,
          defaults: { audio: false, video: callType === "video" },
        });
      });
  }, [cfToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 5. Join meeting & wire up remote audio ───────────────────────────────
  useEffect(() => {
    if (!meeting) return;

    meeting
      .join()
      .then(() => {
        // Ensure local mic is publishing
        if (meeting.self) {
          meeting.self.enableAudio().catch(console.warn);
        }

        // Wire up remote audio for all already-joined participants
        attachAllRemoteAudio(meeting);

        // Wire up remote audio for future participants
        meeting.participants?.joined?.on?.(
          "participantJoined",
          (participant: any) => attachRemoteAudio(participant)
        );
      })
      .catch(console.error);

    return () => {
      // Remove all injected audio elements
      document
        .querySelectorAll("audio[data-call-audio]")
        .forEach((el) => el.remove());
      try {
        meeting.leave();
      } catch {}
    };
  }, [meeting]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 6. Elapsed timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "connected") return;
    const i = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [status]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function attachRemoteAudio(participant: any) {
    if (!participant) return;

    function bindTrack(track: MediaStreamTrack | null | undefined) {
      if (!track) return;
      const id = `call-audio-${participant.id}`;
      let audio = document.getElementById(id) as HTMLAudioElement | null;
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = id;
        audio.setAttribute("data-call-audio", "true");
        audio.autoplay = true;
        (audio as any).playsInline = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = new MediaStream([track]);
      audio.play().catch(() => {});
    }

    // Bind existing track immediately
    if (participant.audioTrack) {
      bindTrack(participant.audioTrack);
    }

    // Listen for future track updates
    participant.on?.("audioUpdate", ({ audioTrack }: any) => {
      if (audioTrack) bindTrack(audioTrack);
    });
  }

  function attachAllRemoteAudio(mtg: any) {
    try {
      mtg.participants?.joined?.forEach?.((participant: any) => {
        attachRemoteAudio(participant);
      });
    } catch {}
  }

  async function handleEnd(notifyBackend = true) {
    clearInterval(ringIntervalRef.current);
    playCallEndSound();
    setStatus("ended");

    // Remove injected audio elements
    document
      .querySelectorAll("audio[data-call-audio]")
      .forEach((el) => el.remove());

    if (meeting) {
      try { meeting.leave(); } catch {}
    }
    if (notifyBackend && sessionId) {
      try { await fetch(`/api/chat/calls/${sessionId}/end`, { method: "POST" }); } catch {}
    }
    setTimeout(onClose, 1000);
  }

  const toggleMic = useCallback(() => {
    if (!meeting?.self) return;
    if (micEnabled) {
      meeting.self.disableAudio();
    } else {
      meeting.self.enableAudio();
    }
    setMicEnabled((v) => !v);
  }, [meeting, micEnabled]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

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
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold tracking-widest">
                  {formatTime(elapsed)}
                </span>
              </div>
            )}
          </div>

          {/* Main Area */}
          <div className="relative p-8 flex flex-col items-center justify-center min-h-[320px] bg-gradient-to-b from-surface to-background">
            <div className="relative mb-6">
              <div
                className={cn(
                  "h-28 w-28 rounded-full flex items-center justify-center relative z-10 bg-surface border-4 border-background shadow-xl overflow-hidden",
                  status === "ringing" && "animate-pulse"
                )}
              >
                {participants[0]?.image ? (
                  <img
                    src={participants[0].image}
                    alt="Caller"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white uppercase">
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

              <div
                className={cn(
                  "absolute -bottom-2 -right-2 px-3 py-1 rounded-xl border border-border-subtle backdrop-blur-md shadow-lg z-20 font-medium text-[11px] uppercase tracking-wider",
                  status === "connected"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : status === "ended" || status === "declined"
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-cyan-500/20 text-cyan-400"
                )}
              >
                {status}
              </div>
            </div>

            <h2 className="text-2xl font-black text-text-primary tracking-tight text-center mb-1">
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
                      height: `${20 + ((i * 13) % 80)}%`,
                      animationDuration: `${0.5 + (i % 3) * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-surface-hover/50 border-t border-border-subtle p-6">
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleMic}
                disabled={!meeting || status !== "connected"}
                className={cn(
                  "h-14 w-14 rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 border",
                  !micEnabled
                    ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
                    : "bg-surface text-text-secondary hover:bg-surface-hover hover:text-cyan-400 border-border-subtle"
                )}
              >
                {!micEnabled ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
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
                onClick={() => handleEnd(true)}
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
