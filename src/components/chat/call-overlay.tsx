"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Phone, PhoneOff, Video, Mic, MicOff } from "lucide-react";
import {
  playRingtoneSound,
  playCallConnectSound,
  playCallEndSound,
} from "@/lib/sounds";

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
  const [micEnabled, setMicEnabled] = useState(true);

  const ringIntervalRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalPollRef = useRef<any>(null);
  const lastSignalTsRef = useRef<number>(0);
  const offerSentRef = useRef(false);
  // Buffer ICE candidates that arrive before remote description is set
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // ── Mount hidden remote audio element ────────────────────────────────────
  useEffect(() => {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    (audio as any).playsInline = true;
    audio.setAttribute("data-call-remote", "true");
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;
    return () => {
      audio.srcObject = null;
      audio.remove();
      remoteAudioRef.current = null;
    };
  }, []);

  // ── Init call session (caller side) ──────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function initCall() {
      if (!isIncomingAcceptor) {
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
          if (data.call?.id && isMounted) setSessionId(data.call.id);
        } catch {}
        playRingtoneSound();
        ringIntervalRef.current = setInterval(() => playRingtoneSound(), 2500);
      } else {
        playCallConnectSound();
      }
    }
    initCall();
    return () => {
      isMounted = false;
      clearInterval(ringIntervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll call status (caller waits for accept) ───────────────────────────
  useEffect(() => {
    if (!sessionId || isIncomingAcceptor) return;
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/calls/${sessionId}/status`);
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        if (data.status === "connected" && status === "ringing") {
          clearInterval(ringIntervalRef.current);
          setStatus("connected");
          playCallConnectSound();
        } else if (data.status === "declined" || data.status === "ended") {
          doEnd(false);
        }
      } catch {}
    }, 1200);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start WebRTC once call is connected ──────────────────────────────────
  useEffect(() => {
    if (status !== "connected" || !sessionId) return;
    startWebRTC(sessionId);
    return () => stopWebRTC();
  }, [status, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Elapsed timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "connected") return;
    const i = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [status]);

  // ── WebRTC ────────────────────────────────────────────────────────────────
  async function fetchIceServers(): Promise<RTCIceServer[]> {
    try {
      const res = await fetch("/api/chat/calls/ice-servers");
      if (res.ok) {
        const data = await res.json();
        if (data.iceServers?.length) {
          console.log("[CallOverlay] ICE servers fetched:", data.iceServers.length);
          return data.iceServers;
        }
      }
    } catch (e) {
      console.warn("[CallOverlay] Failed to fetch ICE servers:", e);
    }
    // Fallback to Google STUN only
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
  }

  async function addBufferedCandidates(pc: RTCPeerConnection) {
    const buffered = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const candidate of buffered) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  }

  async function startWebRTC(callId: string) {
    try {
      // Get TURN + STUN servers
      const iceServers = await fetchIceServers();

      // Request mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
        video: false,
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Add local audio
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Play remote audio
      pc.ontrack = (event) => {
        console.log("[CallOverlay] Remote track received:", event.track.kind);
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(console.warn);
        }
      };

      // Send ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(callId, "candidate", event.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[CallOverlay] Connection state:", pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[CallOverlay] ICE state:", pc.iceConnectionState);
      };

      if (!isIncomingAcceptor) {
        // ── CALLER: create and send offer ──────────────────────────────
        if (offerSentRef.current) return;
        offerSentRef.current = true;

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await sendSignal(callId, "offer", { sdp: offer.sdp, type: offer.type });

        // Poll for answer + candidates from acceptor
        startSignalPoll(callId, async (signal: any) => {
          if (signal.type === "answer" && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: signal.data.sdp })
            );
            await addBufferedCandidates(pc);
          }
          if (signal.type === "candidate") {
            if (pc.remoteDescription) {
              try { await pc.addIceCandidate(new RTCIceCandidate(signal.data)); } catch {}
            } else {
              pendingCandidatesRef.current.push(signal.data);
            }
          }
        });
      } else {
        // ── ACCEPTOR: wait for offer, then send answer ─────────────────
        startSignalPoll(callId, async (signal: any) => {
          if (signal.type === "offer" && pc.signalingState === "stable") {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: "offer", sdp: signal.data.sdp })
            );
            // Apply any ICE candidates that arrived before the offer
            await addBufferedCandidates(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(callId, "answer", { sdp: answer.sdp, type: answer.type });
          }
          if (signal.type === "candidate") {
            if (pc.remoteDescription) {
              try { await pc.addIceCandidate(new RTCIceCandidate(signal.data)); } catch {}
            } else {
              pendingCandidatesRef.current.push(signal.data);
            }
          }
        });
      }
    } catch (err) {
      console.error("[CallOverlay] WebRTC failed:", err);
    }
  }

  function stopWebRTC() {
    clearInterval(signalPollRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    pendingCandidatesRef.current = [];
  }

  async function sendSignal(
    callId: string,
    type: "offer" | "answer" | "candidate",
    data: any
  ) {
    try {
      await fetch(`/api/chat/calls/${callId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
    } catch {}
  }

  function startSignalPoll(callId: string, onSignal: (s: any) => Promise<void>) {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/chat/calls/${callId}/signal?since=${lastSignalTsRef.current}`
        );
        if (!res.ok) return;
        const { signals } = await res.json();
        for (const signal of signals ?? []) {
          if (signal.timestamp > lastSignalTsRef.current) {
            lastSignalTsRef.current = signal.timestamp;
          }
          await onSignal(signal);
        }
      } catch {}
    };
    poll();
    signalPollRef.current = setInterval(poll, 800);
  }

  async function doEnd(notifyBackend = true) {
    clearInterval(ringIntervalRef.current);
    clearInterval(signalPollRef.current);
    stopWebRTC();
    playCallEndSound();
    setStatus("ended");
    if (notifyBackend && sessionId) {
      try {
        await fetch(`/api/chat/calls/${sessionId}/end`, { method: "POST" });
      } catch {}
    }
    setTimeout(onClose, 1200);
  }

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const newEnabled = !micEnabled;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = newEnabled; });
    setMicEnabled(newEnabled);
  }, [micEnabled]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  // ── UI ────────────────────────────────────────────────────────────────────
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

          {/* Main */}
          <div className="relative p-8 flex flex-col items-center justify-center min-h-[320px] bg-gradient-to-b from-surface to-background">
            <div className="relative mb-6">
              <div
                className={cn(
                  "h-28 w-28 rounded-full flex items-center justify-center relative z-10 bg-surface border-4 border-background shadow-xl overflow-hidden",
                  status === "ringing" && "animate-pulse"
                )}
              >
                {participants[0]?.image ? (
                  <img src={participants[0].image} alt="Caller" className="h-full w-full object-cover" />
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
                  status === "connected" ? "bg-emerald-500/20 text-emerald-400"
                    : status === "ended" || status === "declined" ? "bg-rose-500/20 text-rose-400"
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

            {status === "connected" && (
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
                disabled={status !== "connected"}
                className={cn(
                  "h-14 w-14 rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 border",
                  !micEnabled
                    ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
                    : "bg-surface text-text-secondary hover:bg-surface-hover hover:text-cyan-400 border-border-subtle"
                )}
              >
                {!micEnabled ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              {callType === "video" && (
                <Button
                  variant="ghost"
                  size="lg"
                  disabled={status !== "connected"}
                  className="h-14 w-14 rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 border bg-surface text-text-secondary hover:bg-surface-hover hover:text-cyan-400 border-border-subtle"
                >
                  <Video className="h-6 w-6" />
                </Button>
              )}

              <Button
                variant="danger"
                size="lg"
                onClick={() => doEnd(true)}
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
