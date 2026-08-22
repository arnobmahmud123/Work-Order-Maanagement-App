"use client";

import { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Avatar, Badge } from "@/components/ui";
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  ClipboardList,
  Building2,
  Search,
  MessageSquare,
  Loader2,
  Brain,
  Zap,
  BarChart3,
  Users,
  MapPin,
  DollarSign,
  AlertTriangle,
  Star,
  Briefcase,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIChatProps {
  context?: {
    type: "work_order" | "property" | "general" | "contractor_search";
    id?: string;
    title?: string;
  };
  embedded?: boolean;
  className?: string;
}

export function AIChat({ context, embedded = false, className }: AIChatProps) {
  const { data: session } = useSession();
  const chatMutation = useAIChat();
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; timestamp: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(embedded);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('ai-widget-removed');
    if (stored === 'true') setIsRemoved(true);
    
    const handleToggle = () => {
      setIsRemoved(prev => {
        const next = !prev;
        localStorage.setItem('ai-widget-removed', next ? 'true' : 'false');
        if (!next) setIsOpen(false);
        return next;
      });
    };
    window.addEventListener('toggle-ai-chat', handleToggle);
    return () => window.removeEventListener('toggle-ai-chat', handleToggle);
  }, []);

  const handleRemove = () => {
    setIsOpen(false);
    setIsRemoved(true);
    localStorage.setItem('ai-widget-removed', 'true');
  };
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      const result = await chatMutation.mutateAsync({
        message: userMessage,
        context: context
          ? { type: context.type, id: context.id }
          : undefined,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          timestamp: result.timestamp,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I encountered an error processing your request. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }

  function handleQuickAction(prompt: string) {
    setInput(prompt);
  }

  const quickActions = [
    { icon: ClipboardList, label: "Work Orders", prompt: "Give me a complete overview of all work orders — statuses, overdue items, and recent activity" },
    { icon: Users, label: "Contractors", prompt: "Show me all contractors — who's available, their ratings, skills, and current job assignments" },
    { icon: DollarSign, label: "Revenue", prompt: "What's our financial status? Show revenue, pending invoices, and payment overview" },
    { icon: AlertTriangle, label: "Issues", prompt: "What needs my attention? Show overdue items, open disputes, and urgent tickets" },
    { icon: MapPin, label: "Properties", prompt: "Summarize my property portfolio — locations, work order counts, and status" },
    { icon: Star, label: "Ratings", prompt: "Show contractor ratings and reputation leaderboard" },
    { icon: Briefcase, label: "Jobs", prompt: "What's on the job marketplace? Show open coverage requests and opportunities" },
    { icon: MessageSquare, label: "Messages", prompt: "What are the latest team conversations and updates?" },
  ];

  // Embedded mode (inline in pages)
  if (embedded) {
    return (
      <div className={cn("flex flex-col", className)}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center text-text-muted py-6">
              <div className="h-12 w-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-bold text-text-primary">Gemini AI Assistant</p>
              <p className="text-xs mt-1">
                Ask me anything about{" "}
                {context?.type === "work_order"
                  ? "this work order"
                  : context?.type === "property"
                    ? "this property"
                    : "your entire platform"}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Brain className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                    msg.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-sm"
                      : "bg-surface-hover text-text-primary rounded-tl-sm border border-border-subtle"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{renderMarkdown(msg.content)}</div>
                </div>
              </div>
            ))
          )}
          {chatMutation.isPending && (
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Brain className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="px-3 py-2 bg-surface-hover rounded-xl rounded-tl-sm border border-border-subtle">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  <span className="text-xs text-text-muted">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 p-3 border-t border-border-subtle"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your platform..."
            className="flex-1 px-3 py-2 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
          />
          <Button
            type="submit"
            size="sm"
            loading={chatMutation.isPending}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }

  // Drag handlers for the floating button
  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }

  useEffect(() => {
    if (!isDragging) return;
    function handleMove(e: MouseEvent) {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    }
    function handleUp() {
      setIsDragging(false);
      dragStartRef.current = null;
    }
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  if (isRemoved) return null;
  if (!embedded && isMobile) return null;

  // Floating button mode
  return (
    <>
      {/* Floating button (draggable) */}
      {!isOpen && (
        <button
          onMouseDown={handleDragStart}
          onClick={() => {
            if (!isDragging) setIsOpen(true);
          }}
          className="fixed z-50 h-14 w-14 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white rounded-full shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all hover:scale-105 flex items-center justify-center select-none cursor-grab active:cursor-grabbing group"
          style={{
            bottom: `calc(${isMobile ? "6.5rem" : "1.5rem"} - ${position.y}px)`,
            right: `calc(1.5rem - ${position.x}px)`,
          }}
          title="Drag to move · Click to open AI Assistant"
          onContextMenu={(e) => {
            e.preventDefault();
            handleRemove();
          }}
          data-floating-chat
        >
          <Brain className="h-6 w-6 group-hover:scale-110 transition-transform" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 bg-surface rounded-2xl shadow-2xl border border-border-subtle flex flex-col transition-all overflow-hidden",
            isMinimized 
              ? (isMobile ? "w-[calc(100vw-2rem)] h-14" : "w-80 h-14") 
              : (isMobile ? "w-[calc(100vw-2rem)] h-[calc(100vh-140px)]" : "w-[440px] h-[36rem]")
          )}
          style={{
            bottom: `calc(${isMobile ? "5.5rem" : "1.5rem"} - ${position.y}px)`,
            right: `calc(1.5rem - ${position.x}px)`,
            maxHeight: isMobile ? "calc(100vh - 120px)" : undefined,
          }}
          data-floating-chat
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-indigo-500/5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold text-text-primary">Gemini AI</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                  <span className="text-[10px] text-text-muted">Powered by Google Gemini</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-secondary transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="h-3.5 w-3.5" />
                ) : (
                  <Minimize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  handleRemove();
                }}
                className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-secondary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-text-muted py-6">
                    <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                    <p className="text-base font-bold text-text-primary">Gemini AI Assistant</p>
                    <p className="text-xs mt-1.5 max-w-xs mx-auto">
                      I have full access to your platform data. Ask me anything about work orders, contractors, properties, finances, and more.
                    </p>
                    
                    {/* Quick action grid */}
                    <div className="grid grid-cols-2 gap-2 mt-5">
                      {quickActions.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => handleQuickAction(item.prompt)}
                          className="p-2.5 border border-border-subtle rounded-xl hover:bg-surface-hover hover:border-cyan-500/20 text-left transition-all group"
                        >
                          <item.icon className="h-4 w-4 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
                          <p className="text-xs font-semibold text-text-secondary">{item.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
                        msg.role === "user" ? "flex-row-reverse" : ""
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mt-0.5">
                          <Brain className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm",
                          msg.role === "user"
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-md"
                            : "bg-surface-hover text-text-primary rounded-tl-md border border-border-subtle"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words leading-relaxed">{renderMarkdown(msg.content)}</div>
                      </div>
                    </div>
                  ))
                )}
                {chatMutation.isPending && (
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Brain className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="px-3.5 py-2.5 bg-surface-hover rounded-2xl rounded-tl-md border border-border-subtle">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-text-muted">Analyzing your data...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 p-3 border-t border-border-subtle bg-surface"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about work orders, contractors, revenue..."
                  className="flex-1 px-3.5 py-2.5 border border-border-medium rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none bg-surface-hover"
                />
                <Button
                  type="submit"
                  size="sm"
                  loading={chatMutation.isPending}
                  disabled={!input.trim()}
                  className="shadow-cyan-500/20 shadow-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ─── Simple Markdown Renderer ────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  
  // Split into lines for processing
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-sm font-bold text-text-primary mt-3 mb-1">{line.slice(4)}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-text-primary mt-3 mb-1">{line.slice(3)}</h3>);
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-text-primary mt-3 mb-1">{line.slice(2)}</h2>);
      continue;
    }
    
    // Bold text with **
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>');
    
    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-cyan-400 mt-1.5 text-[8px]">●</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
        </div>
      );
      continue;
    }
    
    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-cyan-400 font-bold text-xs mt-0.5 min-w-[16px]">{numMatch[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: numMatch[2] }} />
        </div>
      );
      continue;
    }
    
    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }
    
    // Regular line
    elements.push(<div key={i} dangerouslySetInnerHTML={{ __html: line }} />);
  }
  
  return <>{elements}</>;
}
