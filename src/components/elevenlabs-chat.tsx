"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ElevenLabsChat() {
  const [isRemoved, setIsRemoved] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('elevenlabs-widget-removed');
    if (stored === 'true') setIsRemoved(true);
    
    const handleToggle = () => {
      setIsRemoved(prev => {
        const next = !prev;
        localStorage.setItem('elevenlabs-widget-removed', next ? 'true' : 'false');
        if (!next) setIsOpen(false);
        return next;
      });
    };
    window.addEventListener('toggle-ai-chat', handleToggle);
  return () => window.removeEventListener('toggle-ai-chat', handleToggle);
  }, []);

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

  const handleDragStart = (e: React.MouseEvent) => {
    if (isOpen) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleRemove = () => {
    setIsOpen(false);
    setIsRemoved(true);
    localStorage.setItem('elevenlabs-widget-removed', 'true');
  };


  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; timestamp: string }[]>([]);
  const [input, setInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasReceivedGreetingRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  function connectWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      hasReceivedGreetingRef.current = false;
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        resolve(socketRef.current);
        return;
      }

      setIsConnecting(true);

      const fetchAndConnect = async () => {
        try {
          let wsUrl = "";
          let retrievedAgentId = "";
          try {
            const response = await fetch("/api/chat/signed-url");
            if (response.ok) {
              const data = await response.json();
              wsUrl = data.signedUrl;
              retrievedAgentId = data.agentId;
            } else {
              try {
                const errorData = await response.json();
                console.warn("Signed URL generation failed. Details:", errorData.error || errorData);
                retrievedAgentId = errorData.agentId;
              } catch {}
            }
          } catch (err: any) {
            console.warn("Failed to fetch signed URL, trying fallback:", err.message);
          }

          if (!wsUrl) {
            const publicAgentId = retrievedAgentId || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
            if (!publicAgentId) {
              throw new Error("No ElevenLabs agent ID available.");
            }
            console.log("Connecting directly using public agent ID:", publicAgentId);
            wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${publicAgentId}`;
          }

          const socket = new WebSocket(wsUrl);
          socketRef.current = socket;

          socket.onopen = () => {
            setIsConnecting(false);
            resolve(socket);
          };

          socket.onmessage = (event) => {
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.type === "agent_response" && parsed.agent_response_event) {
                const agentReply = parsed.agent_response_event.agent_response;
                setIsThinking(false);

                // Filter out the initial welcome greeting if the user has already sent a message
                if (!hasReceivedGreetingRef.current) {
                  hasReceivedGreetingRef.current = true;
                  
                  let hasUserMessages = false;
                  setMessages((prev) => {
                    hasUserMessages = prev.some((m) => m.role === "user");
                    if (hasUserMessages) {
                      console.log("Discarded duplicate welcome greeting:", agentReply);
                      return prev;
                    }
                    return [
                      ...prev,
                      {
                        role: "assistant",
                        content: agentReply,
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }
                    ];
                  });
                  return;
                }

                // Append subsequent user-facing agent responses
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: agentReply,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  }
                ]);
              }
            } catch {}
          };

          socket.onerror = (err) => {
            setIsConnecting(false);
            reject(err);
          };

          socket.onclose = () => {
            setIsConnecting(false);
            socketRef.current = null;
            hasReceivedGreetingRef.current = false;
          };

        } catch (err) {
          setIsConnecting(false);
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Unable to connect to assistant. Please refresh the page.",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ]);
          reject(err);
        }
      };

      fetchAndConnect();
    });
  }

  function toggleWidget() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      connectWebSocket().catch((err) => console.error("Initial connect failed:", err));
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
    setIsThinking(true);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "user_message",
        text: text
      }));
    } else {
      // Reconnect and send
      connectWebSocket()
        .then((socket) => {
          socket.send(JSON.stringify({
            type: "user_message",
            text: text
          }));
        })
        .catch((err) => {
          console.error("WebSocket send message connection error:", err);
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Connection offline. Unable to send message.",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ]);
        });
    }
  }

  if (!mounted) return null;

  if (isRemoved) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onMouseDown={handleDragStart}
        onContextMenu={(e) => { e.preventDefault(); handleRemove(); }}
        title="Drag to move · Right click to remove"
        onClick={() => { if (!isDragging) toggleWidget(); }}
        style={{
          bottom: `calc(1.5rem - ${position.y}px)`,
          right: `calc(1.5rem - ${position.x}px)`,
        }}
        className={cn(
          "fixed z-[9999] h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-95",
          "hidden md:flex",
          isOpen 
            ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-white/10" 
            : "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white hover:scale-105 hover:shadow-cyan-500/30"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping pointer-events-none" />
        )}
      </button>

      {/* Chat window */}
      <div
        className={cn(
          "fixed z-[9998] bg-slate-950/85 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col transition-all duration-300 overflow-hidden",
          "bottom-24 right-6 w-[400px] h-[550px] rounded-2xl",
          "max-sm:bottom-0 max-sm:right-0 max-sm:w-full max-sm:h-full max-sm:rounded-none",
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm text-white">
              AI
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">AI Assistant</h3>
              <p className="text-[10px] text-slate-400">Always online</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10 flex flex-col">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.role === "user" ? "self-end ml-auto" : "self-start"
              )}
            >
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm shadow-md shadow-cyan-500/10"
                    : "bg-slate-900 text-slate-100 rounded-bl-sm border border-white/5"
                )}
              >
                {msg.content}
              </div>
              <span
                className={cn(
                  "text-[10px] text-slate-500 mt-1 px-1",
                  msg.role === "user" ? "text-right" : "text-left"
                )}
              >
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isThinking && (
            <div className="flex flex-col max-w-[80%] self-start">
              <div className="px-4 py-3 bg-slate-900 rounded-2xl rounded-bl-sm border border-white/5 flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span className="text-xs text-slate-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-white/10 bg-slate-950/90 flex gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-cyan-500/10"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
