"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Card, Avatar, Badge, Button } from "@/components/ui";
import {
  Search,
  Send,
  MessageSquare,
  RefreshCw,
  Phone,
  User,
  Loader2,
  Clock,
  Plus,
  X,
  FileText,
  ChevronDown,
  ChevronLeft,
  Paperclip,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SmsThread {
  phone: string;
  lastMessage: string;
  lastMessageAt: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  contactName: string | null;
  contactRole: string | null;
}

interface SmsMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  type: "SMS" | "NOTE";
  authorName: string | null;
  mediaUrl: string | null;
  createdAt: string;
}

interface ContactMetadata {
  name: string | null;
  role: string | null;
  image: string | null;
}

const TEMPLATES = [
  { label: "Job Assignment", text: "Hello, we have assigned you to Work Order. Please check your dashboard for details." },
  { label: "Inspection Reminder", text: "Hi, this is a reminder that you have an upcoming property inspection scheduled for tomorrow." },
  { label: "Invoice Request", text: "Hello, please upload completion photos and submit your invoice on the dashboard." },
  { label: "General Check-in", text: "Hi, just checking in on the progress of your assigned work order. Let us know if you need anything." }
];

export default function SmsChatDashboard() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [activeContact, setActiveContact] = useState<ContactMetadata | null>(null);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  
  // Interactive Tab State: SMS (Standard Outbound Text) vs NOTE (Internal Staff Comments)
  const [activeTab, setActiveTab] = useState<"SMS" | "NOTE">("SMS");

  // File Attachment States for Active Conversation Composer
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Attachment States for New Conversation Modal
  const [modalAttachmentUrl, setModalAttachmentUrl] = useState<string | null>(null);
  const [modalAttachmentName, setModalAttachmentName] = useState<string | null>(null);
  const [uploadingModalAttachment, setUploadingModalAttachment] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Image Viewer Modal State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // "New Conversation" Modal states
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newBody, setNewBody] = useState("");
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);

  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingNew, setSendingNew] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads list
  async function fetchThreads(silent = false) {
    if (!silent) setLoadingThreads(true);
    try {
      const res = await fetch("/api/sms");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      } else {
        toast.error("Failed to load SMS threads");
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoadingThreads(false);
    }
  }

  // Fetch message history for selected phone
  async function fetchMessages(phone: string, silent = false) {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/sms/${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveContact(data.contact || null);
      } else {
        toast.error("Failed to load message history");
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }

  // Periodic polling to keep the chat live
  useEffect(() => {
    fetchThreads();

    const interval = setInterval(() => {
      fetchThreads(true);
      if (activePhone) {
        fetchMessages(activePhone, true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activePhone]);

  // Scroll to bottom of message list on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat history when selected thread changes
  const handleSelectThread = (phone: string) => {
    setActivePhone(phone);
    fetchMessages(phone);
    setAttachmentUrl(null);
    setAttachmentName(null);
  };

  // Upload attachment file for Main Composer
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (max 5MB)");
      return;
    }

    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAttachmentUrl(data.url);
        setAttachmentName(data.filename);
        toast.success("Attachment uploaded successfully");
      } else {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error uploading attachment");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Upload attachment file for Modal Composer
  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (max 5MB)");
      return;
    }

    setUploadingModalAttachment(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setModalAttachmentUrl(data.url);
        setModalAttachmentName(data.filename);
        toast.success("Attachment uploaded successfully");
      } else {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error uploading attachment");
    } finally {
      setUploadingModalAttachment(false);
      if (modalFileInputRef.current) modalFileInputRef.current.value = "";
    }
  };

  // Submit manual reply or note
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePhone || (!replyText.trim() && !attachmentUrl) || sending) return;

    const text = replyText.trim();
    const media = attachmentUrl;
    setReplyText("");
    setAttachmentUrl(null);
    setAttachmentName(null);
    setSending(true);

    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: activePhone,
          body: text || (media ? "[Attachment]" : ""),
          type: activeTab,
          authorName: session?.user?.name || "Staff Member",
          mediaUrl: media
        })
      });

      if (res.ok) {
        toast.success(activeTab === "NOTE" ? "Internal note saved" : "SMS reply sent");
        fetchMessages(activePhone, true);
        fetchThreads(true);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to submit response");
        setReplyText(text);
        setAttachmentUrl(media);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error sending response");
      setReplyText(text);
      setAttachmentUrl(media);
    } finally {
      setSending(false);
    }
  };

  // Submit New Conversation initiation
  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || (!newBody.trim() && !modalAttachmentUrl) || sendingNew) return;

    let formattedPhone = newPhone.trim();
    if (!formattedPhone.startsWith("+")) {
      const digitsOnly = formattedPhone.replace(/\D/g, "");
      if (digitsOnly.length === 10) {
        formattedPhone = `+1${digitsOnly}`;
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
        formattedPhone = `+${digitsOnly}`;
      }
    }

    setSendingNew(true);

    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to: formattedPhone, 
          body: newBody.trim() || (modalAttachmentUrl ? "[Attachment]" : ""),
          mediaUrl: modalAttachmentUrl
        })
      });

      if (res.ok) {
        toast.success("Text thread initiated successfully");
        setShowNewModal(false);
        setNewPhone("");
        setNewBody("");
        setModalAttachmentUrl(null);
        setModalAttachmentName(null);
        setActivePhone(formattedPhone);
        fetchThreads();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to initiate conversation");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error initiating conversation");
    } finally {
      setSendingNew(false);
    }
  };

  // Apply template text to active message composer
  const handleApplyTemplate = (text: string) => {
    setReplyText(text);
    setShowTemplatesDropdown(false);
  };

  // Apply template text to new conversation composer
  const handleApplyTemplateNew = (text: string) => {
    setNewBody(text);
    setShowTemplatesDropdown(false);
  };

  const filteredThreads = threads.filter((t) => {
    const s = search.toLowerCase();
    return (
      t.phone.toLowerCase().includes(s) ||
      t.contactName?.toLowerCase().includes(s) ||
      t.lastMessage.toLowerCase().includes(s)
    );
  });

  const activeThread = threads.find((t) => t.phone === activePhone);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[500px]">
        {/* Thread Sidebar Panel */}
        <div className={cn(
          "lg:col-span-4 flex flex-col bg-surface/60 border border-border-subtle rounded-2xl overflow-hidden backdrop-blur-xl",
          activePhone ? "hidden lg:flex" : "flex"
        )}>
          {/* Compact Sidebar Header */}
          <div className="p-3 border-b border-border-subtle bg-surface-hover/30 flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none transition-all"
              />
            </div>
            
            {/* New Text Trigger */}
            <button
              onClick={() => {
                setModalAttachmentUrl(null);
                setModalAttachmentName(null);
                setShowNewModal(true);
              }}
              className="p-1.5 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-md shadow-cyan-500/10 shrink-0 flex items-center justify-center"
              title="Start New Conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
            
            {/* Refresh Trigger */}
            <button
              onClick={() => {
                fetchThreads();
                if (activePhone) fetchMessages(activePhone);
              }}
              className="p-1.5 bg-surface border border-border-subtle hover:bg-surface-hover text-text-secondary rounded-xl shrink-0 flex items-center justify-center"
              title="Refresh Logs"
            >
              <RefreshCw className="h-4 w-4 text-cyan-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
            {loadingThreads && threads.length === 0 ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-3" />
                <p className="text-text-muted text-xs">Loading SMS conversations...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="h-10 w-10 text-text-dim mx-auto mb-3" />
                <p className="text-text-muted text-sm font-semibold">No threads found</p>
                <p className="text-text-dim text-xs mt-1">Click the '+' button to start a thread with a contact.</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = thread.phone === activePhone;
                const formattedTime = new Date(thread.lastMessageAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <button
                    key={thread.phone}
                    onClick={() => handleSelectThread(thread.phone)}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 transition-colors text-left",
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border-l-2 border-cyan-500"
                        : "hover:bg-surface-hover/30"
                    )}
                  >
                    <Avatar
                      name={thread.contactName || "Contractor"}
                      className="bg-gradient-to-br from-cyan-500/20 to-blue-600/10 text-cyan-400 font-bold border border-cyan-500/20"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-text-primary truncate">
                          {thread.contactName || thread.phone}
                        </span>
                        <span className="text-[10px] text-text-dim shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formattedTime}
                        </span>
                      </div>
                      
                      {thread.contactName && (
                        <div className="text-[10px] text-cyan-400 font-semibold mb-1">
                          {thread.phone} • {thread.contactRole || "CONTRACTOR"}
                        </div>
                      )}

                      <p className="text-xs text-text-muted truncate mt-0.5 leading-relaxed">
                        {thread.direction === "OUTBOUND" ? "You: " : thread.direction === "INTERNAL" ? "Note: " : ""}
                        {thread.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Conversation Window */}
        <div className={cn(
          "lg:col-span-8 flex flex-col bg-surface/60 border border-border-subtle rounded-2xl overflow-hidden backdrop-blur-xl",
          activePhone ? "flex" : "hidden lg:flex"
        )}>
          {activePhone ? (
            <>
              {/* Active Header */}
              <div className="px-5 py-4 border-b border-border-subtle bg-surface-hover/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActivePhone(null)}
                    className="lg:hidden p-1.5 hover:bg-surface-hover rounded-xl text-cyan-400 mr-1 shrink-0 flex items-center justify-center border border-border-subtle/50 bg-surface"
                    title="Back to Threads"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </button>

                  <Avatar
                    src={activeContact?.image}
                    name={activeThread?.contactName || "Contractor"}
                    className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {activeThread?.contactName || "Mobile User"}
                    </h3>
                    <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5 text-cyan-400" />
                      {activePhone}
                    </p>
                  </div>
                </div>
                
                {activeThread?.contactName && (
                  <Badge variant="cyan" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    {activeThread.contactRole || "CONTRACTOR"}
                  </Badge>
                )}
              </div>

              {/* Message History list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                {loadingMessages && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                  </div>
                ) : (
                  messages.map((msg) => {
                    const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    // Render Internal Note
                    if (msg.type === "NOTE") {
                      return (
                        <div key={msg.id} className="flex flex-col w-full items-center my-3 animate-in fade-in zoom-in-95 duration-200">
                          <div className="px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-400 max-w-[85%] text-left relative group">
                            <span className="font-semibold text-amber-300 block mb-0.5 flex items-center gap-1.5">
                              📌 Internal Note • {msg.authorName || "Staff Member"}
                            </span>
                            {msg.body}
                            
                            {msg.mediaUrl && (
                              <div className="mt-2 rounded-xl overflow-hidden max-w-[200px] border border-amber-500/30">
                                {msg.mediaUrl.startsWith("data:image/") || msg.mediaUrl.includes("http") ? (
                                  <img
                                    src={msg.mediaUrl}
                                    alt="Internal Attachment"
                                    className="w-full h-auto max-h-36 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setLightboxUrl(msg.mediaUrl)}
                                  />
                                ) : (
                                  <a
                                    href={msg.mediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 flex items-center gap-1.5 hover:bg-white/5 transition-colors text-[10px] text-amber-400 font-semibold"
                                  >
                                    <FileText className="h-3 w-3 shrink-0" />
                                    <span className="truncate flex-1">View File</span>
                                  </a>
                                )}
                              </div>
                            )}

                            <span className="block text-[9px] text-amber-500/60 mt-1 text-right">
                              {formattedTime}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const isOutbound = msg.direction === "OUTBOUND";

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-end gap-2.5 max-w-[75%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                          isOutbound ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
                        )}
                      >
                        <Avatar
                          src={isOutbound ? session?.user?.image : activeContact?.image}
                          name={isOutbound ? (session?.user?.name || "Admin") : (activeContact?.name || activePhone)}
                          size="xs"
                          className="h-7 w-7 rounded-full shrink-0 border border-white/5"
                        />

                        <div className={cn("flex flex-col", isOutbound ? "items-end" : "items-start")}>
                          <div
                            className={cn(
                              "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                              isOutbound
                                ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm shadow-md shadow-cyan-500/5"
                                : "bg-surface border border-border-subtle text-text-primary rounded-bl-sm"
                            )}
                          >
                            {msg.body !== "[Attachment]" && msg.body}

                            {/* Render MMS attachments */}
                            {msg.mediaUrl && (
                              <div className={cn(
                                "mt-2 rounded-xl overflow-hidden border bg-black/20",
                                isOutbound ? "border-white/10" : "border-border-subtle",
                                msg.body !== "[Attachment]" ? "max-w-[200px]" : "max-w-[240px]"
                              )}>
                                {msg.mediaUrl.startsWith("data:image/") || msg.mediaUrl.includes("http") ? (
                                  <img
                                    src={msg.mediaUrl}
                                    alt="SMS Attachment"
                                    className="w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setLightboxUrl(msg.mediaUrl)}
                                  />
                                ) : (
                                  <a
                                    href={msg.mediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                      "p-3 flex items-center gap-2 hover:bg-white/5 transition-colors text-xs font-semibold",
                                      isOutbound ? "text-cyan-200" : "text-cyan-400"
                                    )}
                                  >
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <span className="truncate flex-1">View File</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] text-text-dim mt-1.5 px-1 flex items-center gap-1">
                            {formattedTime}
                            {isOutbound && (
                              <span className="text-emerald-500/80 font-medium font-mono text-[8px] bg-emerald-500/5 px-1 rounded">
                                delivered via twilio
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview */}
              {attachmentUrl && (
                <div className="px-5 py-2.5 border-t border-border-subtle bg-surface-hover/30 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2">
                    {attachmentUrl.startsWith("data:image/") ? (
                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-border-subtle bg-black/10 shrink-0">
                        <img src={attachmentUrl} alt="Thumbnail Preview" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg border border-border-subtle bg-surface flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-cyan-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate max-w-xs">{attachmentName || "Attached file"}</p>
                      <p className="text-[10px] text-text-dim">Ready to send</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentUrl(null);
                      setAttachmentName(null);
                    }}
                    className="p-1 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Message Mode Switcher & Template Picker */}
              <div className="px-4 pt-3 flex items-center justify-between border-t border-border-subtle bg-surface-hover/10">
                {/* Tabs switcher */}
                <div className="flex bg-surface-hover p-1 rounded-xl border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setActiveTab("SMS")}
                    className={cn(
                      "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      activeTab === "SMS"
                        ? "bg-cyan-500/20 border border-cyan-500/25 text-cyan-400 shadow-inner"
                        : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    Send SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("NOTE")}
                    className={cn(
                      "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      activeTab === "NOTE"
                        ? "bg-amber-500/20 border border-amber-500/25 text-amber-400 shadow-inner"
                        : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    Internal Note
                  </button>
                </div>

                {/* Templates drop-down */}
                <div className="relative flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                    className="flex items-center text-xs text-text-secondary hover:text-cyan-400 transition-all font-medium py-1.5 px-3 bg-surface-hover border border-border-subtle rounded-xl"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                    Templates
                    <ChevronDown className="h-3.5 w-3.5 ml-1 text-text-dim" />
                  </button>
                  {showTemplatesDropdown && (
                    <div className="absolute right-0 bottom-full mb-2 w-72 bg-surface border border-border-subtle rounded-xl shadow-2xl z-50 p-2 divide-y divide-border-subtle/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-text-dim tracking-wider">
                        Insert SMS Template
                      </div>
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.label}
                          type="button"
                          onClick={() => handleApplyTemplate(t.text)}
                          className="w-full text-left p-2.5 hover:bg-surface-hover rounded-lg transition-all text-xs font-medium"
                        >
                          <div className="text-cyan-400 font-semibold mb-0.5">{t.label}</div>
                          <div className="text-text-muted truncate text-[10px]">{t.text}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Input Response Box */}
              <form onSubmit={handleSendReply} className="p-4 bg-surface-hover/20 flex gap-3 relative items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment || sending}
                  className={cn(
                    "p-3 rounded-xl border border-border-subtle bg-surface hover:bg-surface-hover transition-colors shrink-0 text-text-secondary hover:text-cyan-400 flex items-center justify-center",
                    uploadingAttachment && "animate-pulse"
                  )}
                  title="Attach Photo or Document"
                >
                  {uploadingAttachment ? (
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </button>

                <input
                  type="text"
                  placeholder={
                    activeTab === "SMS"
                      ? `Send SMS text to ${activeThread?.contactName || activePhone}...`
                      : `Save private internal staff note on this thread (visible to team only)...`
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className={cn(
                    "flex-1 px-4 py-3 bg-surface border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all",
                    activeTab === "NOTE"
                      ? "border-amber-500/30 focus:border-amber-500/60 focus:ring-4 focus:ring-amber-500/10"
                      : "border-border-subtle focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10"
                  )}
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={sending || (!replyText.trim() && !attachmentUrl)}
                  className={cn(
                    "px-5 rounded-xl flex items-center justify-center transition-all shadow-md self-stretch",
                    activeTab === "NOTE"
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/10"
                      : "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/10"
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : activeTab === "NOTE" ? (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Save Note
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send SMS
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/5 border border-cyan-500/15 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/5 animate-pulse">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">No Active Conversation</h3>
              <p className="text-xs text-text-muted mt-1 max-w-xs leading-relaxed">
                Select a thread from the sidebar, or click the '+' button to initiate a new Twilio SMS conversation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* NEW CONVERSATION INITIATION MODAL Overlay */}
      {showNewModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg bg-surface/90 border border-border-subtle shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-surface-hover/30">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-text-primary">New Text Conversation</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalAttachmentUrl(null);
                  setModalAttachmentName(null);
                  setShowNewModal(false);
                }}
                className="p-1 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-cyan-400 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStartConversation} className="p-6 space-y-4">
              {/* Recipient Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Recipient Mobile Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. (555) 000-1234 or +15550001234"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Message Composer & Template Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-secondary">
                    Initial SMS Text Message
                  </label>
                  
                  {/* Template Picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                      className="flex items-center text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition-all py-1 px-2.5 bg-surface border border-border-subtle rounded-lg"
                    >
                      Use Template
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </button>
                    {showTemplatesDropdown && (
                      <div className="absolute right-0 mt-1 w-72 bg-surface border border-border-subtle rounded-xl shadow-2xl z-50 p-2 divide-y divide-border-subtle/50 animate-in fade-in zoom-in-95 duration-200">
                        {TEMPLATES.map((t) => (
                          <button
                            key={t.label}
                            type="button"
                            onClick={() => handleApplyTemplateNew(t.text)}
                            className="w-full text-left p-2 hover:bg-surface-hover rounded-lg transition-all text-xs font-medium"
                          >
                            <div className="text-cyan-400 font-semibold mb-0.5">{t.label}</div>
                            <div className="text-text-muted truncate text-[10px]">{t.text}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <textarea
                  required={!modalAttachmentUrl}
                  rows={4}
                  placeholder="Type the message to send to the recipient's mobile..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Modal Attachment Preview */}
              {modalAttachmentUrl && (
                <div className="p-3 border border-border-subtle bg-surface-hover/20 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2">
                    {modalAttachmentUrl.startsWith("data:image/") ? (
                      <div className="h-8 w-8 rounded-lg overflow-hidden border border-border-subtle bg-black/10 shrink-0">
                        <img src={modalAttachmentUrl} alt="Thumbnail Preview" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-lg border border-border-subtle bg-surface flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-cyan-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-text-primary truncate max-w-[200px]">{modalAttachmentName || "Attached file"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalAttachmentUrl(null);
                      setModalAttachmentName(null);
                    }}
                    className="p-1 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Modal Attachment Controls */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="file"
                  ref={modalFileInputRef}
                  onChange={handleModalFileChange}
                  className="hidden"
                  accept="image/*,application/pdf"
                />
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  disabled={uploadingModalAttachment || sendingNew}
                  className={cn(
                    "flex items-center text-xs text-text-secondary hover:text-cyan-400 font-medium py-1.5 px-3 bg-surface border border-border-subtle rounded-xl transition-colors",
                    uploadingModalAttachment && "animate-pulse"
                  )}
                >
                  {uploadingModalAttachment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-cyan-400" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                  )}
                  Attach File
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setModalAttachmentUrl(null);
                    setModalAttachmentName(null);
                    setShowNewModal(false);
                  }}
                  className="bg-surface hover:bg-surface-hover text-text-secondary border border-border-subtle rounded-xl px-5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={sendingNew || uploadingModalAttachment}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 rounded-xl px-5 flex items-center"
                >
                  {sendingNew ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Initial SMS
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL OVERLAY */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/95 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all shadow-lg backdrop-blur-md border border-white/10 cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="SMS Attachment Lightbox View"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl animate-in zoom-in-95 duration-300 border border-white/5 cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
