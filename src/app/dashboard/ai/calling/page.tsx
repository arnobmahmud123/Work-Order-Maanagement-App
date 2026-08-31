"use client";

import { useSession } from "next-auth/react";

import { useState, useEffect } from "react";
import {
  useCalls,
  useInitiateCall,
  useVoiceProfiles,
  useCreateVoiceProfile,
  useWorkOrders,
} from "@/hooks/use-data";
import { useCallStore } from "@/hooks/use-call";
import { SmartPhoneDialer } from "@/components/calls/smart-phone-dialer";
import { Card, CardHeader, CardTitle, Button, Badge, Avatar, Modal } from "@/components/ui";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  Clock,
  FileText,
  User,
  Plus,
  Settings2,
  Radio,
  Waves,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Bot,
  Star,
  Sparkles,
} from "lucide-react";
import { cn, formatRelativeTime, formatDateTime, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const CALL_STATUS_COLORS: Record<string, string> = {
  QUEUED: "bg-surface-hover text-text-dim",
  RINGING: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  FAILED: "bg-red-100 text-red-700",
  NO_ANSWER: "bg-orange-100 text-orange-700",
  BUSY: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-surface-hover text-text-muted",
};

const CALL_STATUS_ICONS: Record<string, any> = {
  QUEUED: Clock,
  RINGING: Phone,
  IN_PROGRESS: PhoneCall,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  NO_ANSWER: PhoneOff,
  BUSY: PhoneOff,
  CANCELLED: XCircle,
};

export default function AICallingPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  if (role === "CONTRACTOR") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Phone className="h-16 w-16 text-text-dim mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
          <p className="text-text-muted">Contractors do not have access to AI features.</p>
        </div>
      </div>
    );
  }

  const [tab, setTab] = useState<"calls" | "profiles" | "dialer">("calls");
  const [callStatusFilter, setCallStatusFilter] = useState("");
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callTimer, setCallTimer] = useState(0);

  const { data: callsData, isLoading: callsLoading } = useCalls(
    callStatusFilter ? { status: callStatusFilter } : undefined
  );
  const { data: profilesData, isLoading: profilesLoading } = useVoiceProfiles();

  const calls = callsData?.calls || [];
  const profiles = profilesData?.profiles || [];

  // Simulate call timer
  useEffect(() => {
    if (!activeCall || activeCall.status !== "IN_PROGRESS") return;
    const interval = setInterval(() => setCallTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Poll for call status updates
  useEffect(() => {
    if (!activeCall || activeCall.status === "COMPLETED" || activeCall.status === "FAILED") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/${activeCall.id}`);
        if (res.ok) {
          const updated = await res.json();
          setActiveCall(updated);
          if (updated.status === "COMPLETED") {
            setCallTimer(updated.duration || 0);
            toast.success("Call completed");
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeCall?.id, activeCall?.status]);

  function formatTimer(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Calling</h1>
          <p className="text-text-muted mt-1">
            Make calls with coordinator voice cloning powered by AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-medium overflow-hidden">
            {(["calls", "profiles", "dialer"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2 text-sm font-medium capitalize",
                  tab === t
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-surface-hover text-text-dim hover:bg-surface-hover"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Call Banner */}
      {activeCall && activeCall.status !== "COMPLETED" && activeCall.status !== "FAILED" && (
        <Card className="border-green-200 bg-green-50 overflow-hidden" padding={false}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white/50 border-b border-green-100">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center animate-pulse shadow-lg shadow-green-500/30">
                  <Phone className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-green-900">
                  {activeCall.status === "RINGING" ? "Calling..." : "In Progress"}
                </p>
                <p className="text-sm text-green-700">
                  {activeCall.recipientName || activeCall.recipientPhone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-mono font-bold text-green-900">
                {formatTimer(callTimer)}
              </div>
              {activeCall.voiceProfile && (
                <Badge className="bg-green-200 text-green-800">
                  🎙️ {activeCall.voiceProfile.name}
                </Badge>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  await fetch(`/api/calls/${activeCall.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "COMPLETED", endedAt: new Date().toISOString() }),
                  });
                  setActiveCall(null);
                  setCallTimer(0);
                }}
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                End Call
              </Button>
            </div>
          </div>
          
          {/* Live Transcription & Recording Indicator */}
          {activeCall.status === "IN_PROGRESS" && (
            <div className="p-4 bg-green-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600 font-medium text-sm animate-pulse bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                  <div className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                  Recording Call...
                </div>
                <Badge variant="outline" className="text-green-700 border-green-200 bg-white">
                  <FileText className="h-3 w-3 mr-1" />
                  Live Transcript
                </Badge>
              </div>
              
              <div className="bg-white rounded-xl border border-green-100 p-5 h-48 overflow-y-auto space-y-4 shadow-inner">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="bg-indigo-50/50 p-3 rounded-2xl rounded-tl-sm border border-indigo-100/50">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">AI Agent</p>
                    <p className="text-sm text-text-primary leading-relaxed">Hello, this is {activeCall.voiceProfile?.name?.split(' ')[0] || "Sarah"} calling from the coordinator desk. I'm following up on the latest work order assigned to you.</p>
                  </div>
                </div>
                <div className="flex gap-3 flex-row-reverse">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl rounded-tr-sm border border-slate-100 text-right">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Contractor</p>
                    <p className="text-sm text-text-primary leading-relaxed">Hi! Yes, I was just looking at that.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="bg-indigo-50/50 p-3 rounded-2xl rounded-tl-sm border border-indigo-100/50 flex items-center gap-2">
                    <p className="text-xs font-semibold text-indigo-700">AI Agent</p>
                    <span className="flex gap-1 items-center">
                      <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Calls Tab */}
      {tab === "calls" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={callStatusFilter}
              onChange={(e) => setCallStatusFilter(e.target.value)}
              className="rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.keys(CALL_STATUS_COLORS).map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <Card padding={false}>
            {callsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 text-text-muted animate-spin mx-auto" />
                <p className="text-sm text-text-muted mt-2">Loading calls...</p>
              </div>
            ) : calls.length === 0 ? (
              <div className="p-8 text-center">
                <Phone className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <p className="font-medium text-text-primary">No calls yet</p>
                <p className="text-sm text-text-muted mt-1">
                  Use the dialer to make your first AI-powered call
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {calls.map((call: any) => {
                  const StatusIcon = CALL_STATUS_ICONS[call.status] || Phone;
                  return (
                    <div key={call.id} className="p-4 hover:bg-surface-hover">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", CALL_STATUS_COLORS[call.status])}>
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {call.recipientName || call.recipientPhone}
                            </p>
                            <p className="text-xs text-text-muted">
                              {call.initiator?.name} • {formatRelativeTime(call.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {call.voiceProfile && (
                            <Badge className="bg-purple-100 text-purple-700">
                              🎙️ {call.voiceProfile.name}
                            </Badge>
                          )}
                          <Badge className={CALL_STATUS_COLORS[call.status]}>
                            {call.status.replace("_", " ")}
                          </Badge>
                          {call.duration && (
                            <span className="text-xs text-text-muted">
                              {Math.floor(call.duration / 60)}m {call.duration % 60}s
                            </span>
                          )}
                        </div>
                      </div>
                      {call.transcription && (
                        <div className="mt-3 p-3 bg-surface-hover rounded-lg">
                          <p className="text-xs font-medium text-text-muted mb-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Transcription
                          </p>
                          <p className="text-sm text-text-dim">{call.transcription}</p>
                        </div>
                      )}
                      {call.summary && (
                        <div className="mt-2 p-3 bg-cyan-500/[0.06] rounded-lg">
                          <p className="text-xs font-medium text-indigo-500 mb-1">AI Summary</p>
                          <p className="text-sm text-cyan-400">{call.summary}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Voice Profiles Tab */}
      {tab === "profiles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Voice profiles are cloned from coordinator voices using AI
            </p>
            <Button onClick={() => setShowNewProfile(true)}>
              <Plus className="h-4 w-4" />
              New Voice Profile
            </Button>
          </div>

          {profilesLoading ? (
            <Card>
              <div className="animate-pulse space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-surface-hover rounded-lg" />
                ))}
              </div>
            </Card>
          ) : profiles.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Waves className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <p className="font-medium text-text-primary">No voice profiles</p>
                <p className="text-sm text-text-muted mt-1 mb-4">
                  Create a voice profile to use AI-powered calling
                </p>
                <Button onClick={() => setShowNewProfile(true)}>
                  <Plus className="h-4 w-4" />
                  Create Voice Profile
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile: any) => (
                <Card key={profile.id}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Volume2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary">{profile.name}</h3>
                      <p className="text-sm text-text-muted">{profile.user?.name}</p>
                      {profile.description && (
                        <p className="text-xs text-text-muted mt-1">{profile.description}</p>
                      )}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">Stability</span>
                          <div className="w-32 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${(profile.stability || 0) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">Clarity</span>
                          <div className="w-32 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(profile.clarity || 0) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">Style</span>
                          <div className="w-32 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(profile.style || 0) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className="bg-purple-100 text-purple-700">
                          {profile._count?.callLogs || 0} calls
                        </Badge>
                        {profile.isActive && (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <NewVoiceProfileModal
            isOpen={showNewProfile}
            onClose={() => setShowNewProfile(false)}
          />
        </div>
      )}

      {/* Dialer Tab */}
      {tab === "dialer" && (
        <DialerTab
          profiles={profiles}
          activeCall={activeCall}
          setActiveCall={setActiveCall}
          setCallTimer={setCallTimer}
        />
      )}
    </div>
  );
}

function DialerTab({
  profiles,
  activeCall,
  setActiveCall,
  setCallTimer,
}: {
  profiles: any[];
  activeCall: any;
  setActiveCall: (call: any) => void;
  setCallTimer: (t: number) => void;
}) {
  const initiateCall = useInitiateCall();
  const startCall = useCallStore((s) => s.startCall);
  const { data: workOrdersData } = useWorkOrders();
  const workOrders = workOrdersData?.workOrders || [];

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState("");
  const [loadingWorkOrder, setLoadingWorkOrder] = useState(false);
  const [callMode, setCallMode] = useState<"ai" | "manual">("ai");

  const [configStatus, setConfigStatus] = useState({
    configured: false,
    provider: "Mock Simulation",
    twilioStatus: "Connected",
    elevenLabsStatus: "Using Mock Fallback",
  });

  useEffect(() => {
    // Load general config
    fetch("/api/calls/config")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to load config");
      })
      .then((data) => {
        if (data) {
          setConfigStatus({
            configured: data.configured,
            provider: data.provider,
            twilioStatus: data.twilioStatus || "Connected",
            elevenLabsStatus: data.elevenLabsStatus,
          });
        }
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    recipientPhone: "",
    recipientName: "",
    purpose: "",
    voiceProfileId: "",
    recipientId: "",
  });

  async function handleWorkOrderChange(woId: string) {
    setSelectedWorkOrderId(woId);
    if (!woId) {
      setForm((prev) => ({
        ...prev,
        recipientPhone: "",
        recipientName: "",
        recipientId: "",
        purpose: "",
      }));
      return;
    }

    setLoadingWorkOrder(true);
    try {
      const res = await fetch(`/api/work-orders/${woId}`);
      if (res.ok) {
        const wo = await res.json();
        setForm((prev) => ({
          ...prev,
          recipientPhone: wo.contractor?.phone || "",
          recipientName: wo.contractor?.name || "",
          recipientId: wo.contractor?.id || "",
          purpose: `Follow up on work order: ${wo.title}`,
        }));
        if (wo.contractor) {
          if (!wo.contractor.phone) {
            toast.error("Contractor has no phone number in database.");
          } else {
            toast.success(`Selected contractor: ${wo.contractor.name}`);
          }
        } else {
          toast.error("This work order is not assigned to a contractor.");
        }
      }
    } catch {
      toast.error("Failed to load work order contractor details.");
    } finally {
      setLoadingWorkOrder(false);
    }
  }

  const handleManualCall = (targetPhone?: string) => {
    const phoneToCall = targetPhone || form.recipientPhone;
    if (!phoneToCall) {
      toast.error("Phone number is required to place a call");
      return;
    }
    startCall(phoneToCall, {
      workOrderId: selectedWorkOrderId || undefined,
      contractorId: form.recipientId || undefined,
    });
  };

  const handleAiCall = async (targetPhone?: string) => {
    const phoneToCall = targetPhone || form.recipientPhone;
    if (!phoneToCall) {
      toast.error("Phone number is required to place a call");
      return;
    }

    try {
      setCallTimer(0);

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneToCall,
          contractorName: form.recipientName || undefined,
          workOrderId: selectedWorkOrderId || undefined,
          purpose: form.purpose || undefined,
          recipientId: form.recipientId || undefined,
          voiceProfileId: form.voiceProfileId || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to initiate call");
      }

      const call = await response.json();
      setActiveCall(call);

      toast.success(
        configStatus.configured
          ? "Outbound call triggered via ElevenLabs"
          : "Mock call initiated"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate call");
    }
  };

  async function handleCall(e: React.FormEvent) {
    e.preventDefault();
    if (callMode === "manual") {
      handleManualCall();
    } else {
      await handleAiCall();
    }
  }

  // Find quick contractor speed dials from assigned work orders
  const speedDialContractors = workOrders
    .filter((wo: any) => wo.contractor && wo.contractor.phone)
    .reduce((acc: any[], wo: any) => {
      if (!acc.some((item) => item.phone === wo.contractor.phone)) {
        acc.push({
          id: wo.contractor.id,
          name: wo.contractor.name,
          phone: wo.contractor.phone,
          workOrderTitle: wo.title,
          workOrderId: wo.id,
        });
      }
      return acc;
    }, [])
    .slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Call Details & Parameters Form */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-5 w-5 text-cyan-500" />
                    <span>Call Details & Setup</span>
                  </div>
                  
                  <div className="flex items-center bg-surface-hover rounded-xl p-1 border border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setCallMode("ai")}
                      className={cn(
                        "px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                        callMode === "ai"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                          : "text-text-muted hover:text-text-primary"
                      )}
                    >
                      AI Voice
                    </button>
                    <button
                      type="button"
                      onClick={() => setCallMode("manual")}
                      className={cn(
                        "px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                        callMode === "manual"
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                          : "text-text-muted hover:text-text-primary"
                      )}
                    >
                      Manual
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>

              <form onSubmit={handleCall} className="space-y-3.5 px-6 pb-2">
                <div>
                  <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-1">
                    Select Work Order (Optional)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedWorkOrderId}
                      onChange={(e) => handleWorkOrderChange(e.target.value)}
                      disabled={loadingWorkOrder}
                      className="block w-full rounded-xl border border-border-medium px-3.5 py-2 text-sm bg-surface text-text-primary focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all shadow-inner"
                    >
                      <option value="">-- No Work Order Selected --</option>
                      {workOrders.map((wo: any) => (
                        <option key={wo.id} value={wo.id}>
                          {wo.title} ({wo.status}) — {wo.address}
                        </option>
                      ))}
                    </select>
                    {loadingWorkOrder && (
                      <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-1">
                      Recipient Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.recipientPhone}
                      onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="block w-full rounded-xl border border-border-medium px-3.5 py-2 text-sm bg-surface text-text-primary focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all shadow-inner font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={form.recipientName}
                      onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                      placeholder="John Doe"
                      className="block w-full rounded-xl border border-border-medium px-3.5 py-2 text-sm bg-surface text-text-primary focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                {callMode === "ai" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-1">
                        Voice Profile
                      </label>
                      <select
                        value={form.voiceProfileId}
                        onChange={(e) => setForm({ ...form, voiceProfileId: e.target.value })}
                        className="block w-full rounded-xl border border-border-medium px-3.5 py-2 text-sm bg-surface text-text-primary focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all shadow-inner"
                      >
                        <option value="">Default (System Coordinator Voice)</option>
                        {profiles.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            🎙️ {p.name} — {p.user?.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-dim uppercase tracking-wider mb-1">
                        Purpose / Instructions
                      </label>
                      <input
                        type="text"
                        value={form.purpose}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                        placeholder="Schedule inspection, follow up on work order..."
                        className="block w-full rounded-xl border border-border-medium px-3.5 py-2 text-sm bg-surface text-text-primary focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    className={cn(
                      "w-full h-11 rounded-xl font-bold shadow-md transition-all cursor-pointer",
                      callMode === "manual"
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                        : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                    )}
                    size="lg"
                    loading={initiateCall.isPending}
                    disabled={!!activeCall && activeCall.status !== "COMPLETED" && activeCall.status !== "FAILED"}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {callMode === "manual"
                      ? "Start Manual Direct Call"
                      : activeCall && activeCall.status !== "COMPLETED" && activeCall.status !== "FAILED"
                      ? "Call in Progress..."
                      : "Launch AI Auto Call"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Speed Dial Mini Bar */}
            {speedDialContractors.length > 0 && (
              <div className="p-4 mx-6 mb-4 rounded-xl bg-surface-hover/70 border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-text-dim uppercase tracking-wider flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" /> Speed Dial
                  </span>
                  <span className="text-[9px] text-text-muted">Click to populate</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {speedDialContractors.slice(0, 2).map((c: any) => (
                    <button
                      key={c.id + c.phone}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          recipientPhone: c.phone,
                          recipientName: c.name,
                          recipientId: c.id,
                          purpose: `Follow up on work order: ${c.workOrderTitle}`,
                        }));
                        setSelectedWorkOrderId(c.workOrderId);
                        toast.success(`Loaded ${c.name}`);
                      }}
                      className="p-2 rounded-lg border border-border-subtle bg-surface hover:border-cyan-500/40 text-left flex items-center justify-between transition-all group cursor-pointer"
                    >
                      <div className="min-w-0 pr-1">
                        <p className="text-[11px] font-bold text-text-primary truncate group-hover:text-cyan-400">
                          {c.name}
                        </p>
                        <p className="text-[10px] font-mono text-text-muted">{c.phone}</p>
                      </div>
                      <Phone className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Dashing Smart Phone Keypad Dialer */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between h-full">
          <div className="w-full flex flex-col items-center justify-between h-full">
            <div className="mb-2 text-center">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Interactive Mobile Dialer
              </h3>
              <p className="text-[11px] text-text-muted">
                Tap keys or type with laptop keyboard
              </p>
            </div>

            <SmartPhoneDialer
              phoneNumber={form.recipientPhone}
              onChangePhoneNumber={(newPhone) => setForm((prev) => ({ ...prev, recipientPhone: newPhone }))}
              recipientName={form.recipientName}
              onManualCall={(phone) => handleManualCall(phone)}
              onAiCall={(phone) => handleAiCall(phone)}
              isAiCalling={initiateCall.isPending}
              isManualCalling={false}
              disabled={!!activeCall && activeCall.status !== "COMPLETED" && activeCall.status !== "FAILED"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NewVoiceProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const createProfile = useCreateVoiceProfile();
  const [form, setForm] = useState({
    name: "",
    description: "",
    stability: 0.5,
    clarity: 0.75,
    style: 0,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createProfile.mutateAsync(form);
      toast.success("Voice profile created");
      onClose();
      setForm({ name: "", description: "", stability: 0.5, clarity: 0.75, style: 0 });
    } catch {
      toast.error("Failed to create voice profile");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Voice Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Profile Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Sarah's Voice"
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the voice..."
            rows={2}
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        {[
          { key: "stability", label: "Stability", desc: "Higher = more consistent, lower = more expressive" },
          { key: "clarity", label: "Clarity", desc: "Higher = clearer pronunciation" },
          { key: "style", label: "Style", desc: "Higher = more stylized speaking" },
        ].map((param) => (
          <div key={param.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-text-dim">{param.label}</label>
              <span className="text-xs text-text-muted">
                {(form[param.key as keyof typeof form] as number).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={form[param.key as keyof typeof form] as number}
              onChange={(e) => setForm({ ...form, [param.key]: parseFloat(e.target.value) })}
              className="w-full h-2 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-xs text-text-muted mt-1">{param.desc}</p>
          </div>
        ))}

        <p className="text-xs text-text-muted">
          🎙️ In production, this would upload a voice sample to ElevenLabs for cloning.
          This is a mock implementation.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createProfile.isPending}>
            Create Profile
          </Button>
        </div>
      </form>
    </Modal>
  );
}
