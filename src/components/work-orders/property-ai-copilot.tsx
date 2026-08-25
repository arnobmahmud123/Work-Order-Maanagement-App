"use client";

import { useState } from "react";
import {
  Brain,
  Sparkles,
  Send,
  Snowflake,
  Home,
  Key,
  History,
  Droplet,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Building,
} from "lucide-react";
import { Card, CardHeader, CardTitle, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface PropertyAiCopilotProps {
  workOrderId?: string;
  propertyId?: string;
  propertyAddress?: string;
}

const QUICK_PROMPTS = [
  {
    label: "Check Freeze Damage",
    icon: Snowflake,
    prompt: "Was there freeze damage, frozen pipes, or plumbing line leaks reported before on this property?",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    label: "Roof & Structural History",
    icon: Home,
    prompt: "Show all previous roof leaks, tarping work orders, shingles damage, or structural repairs.",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  {
    label: "Lockbox & Keycode History",
    icon: Key,
    prompt: "What is the complete lockbox code and keycode history used across past work orders?",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    label: "Plumbing & Utilities",
    icon: Droplet,
    prompt: "What is the history of water, electric, and gas utility status and past winterization records?",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  {
    label: "Full Historical Summary",
    icon: History,
    prompt: "Provide a chronological condition timeline across all past completed work orders for this property.",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
];

export function PropertyAiCopilot({
  workOrderId,
  propertyId,
  propertyAddress,
}: PropertyAiCopilotProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; metrics?: any }>>([
    {
      role: "assistant",
      content: `👋 **Property Intelligence AI Copilot is Ready.**\n\nI have indexed all historical work orders, PCR completion forms, contractor repair notes, bids, invoices, and photo inspections for this property across the company database.\n\n*Ask me anything about past damages, winterization history, lock codes, or structural repairs!*`,
    },
  ]);

  const handleSendQuery = async (customText?: string) => {
    const textToSend = customText || query;
    if (!textToSend.trim()) return;

    const userMsg = textToSend.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/property-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMsg,
          workOrderId,
          propertyId,
          propertyAddress,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            metrics: {
              totalOrdersAnalyzed: data.totalOrdersAnalyzed,
              matchedRecordCount: data.matchedRecordCount,
            },
          },
        ]);
      } else {
        toast.error(data.error || "Failed to query property intelligence");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Could not complete query: ${data.error || "Please try again."}`,
          },
        ]);
      }
    } catch (err) {
      toast.error("Network error querying intelligence engine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-surface border-border-subtle overflow-hidden">
      <CardHeader className="border-b border-border-subtle bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-slate-950 shadow-md">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-black flex items-center gap-1.5">
                Deep Property & System Intelligence AI
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Universal Search
                </span>
              </CardTitle>
              <p className="text-[11px] text-text-muted mt-0.5">
                Reads 100% of historical work orders, PCR completion forms, bids, invoices & inspection notes
              </p>
            </div>
          </div>
        </div>

        {/* Quick Intelligence Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 scrollbar-none">
          {QUICK_PROMPTS.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendQuery(qp.prompt)}
                disabled={loading}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all whitespace-nowrap hover:scale-105 active:scale-95",
                  qp.color
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {qp.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      {/* Chat Messages Timeline */}
      <div className="p-4 sm:p-5 space-y-4 max-h-[440px] overflow-y-auto bg-surface/50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-3 max-w-2xl",
              msg.role === "user" ? "ml-auto justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="h-4 w-4" />
              </div>
            )}

            <div
              className={cn(
                "p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed space-y-2",
                msg.role === "user"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md"
                  : "bg-surface-hover/80 border border-border-medium text-text-primary shadow-sm"
              )}
            >
              <div className="whitespace-pre-wrap font-sans space-y-2">
                {msg.content}
              </div>

              {msg.metrics && (
                <div className="pt-2 border-t border-border-subtle/60 flex items-center gap-3 text-[10px] text-text-dim">
                  <span>📊 {msg.metrics.totalOrdersAnalyzed} historical orders scanned</span>
                  {msg.metrics.matchedRecordCount > 0 && (
                    <span>• 🎯 {msg.metrics.matchedRecordCount} exact matches</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 max-w-md">
            <div className="h-7 w-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center animate-spin">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-surface-hover border border-border-subtle text-xs text-text-muted flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              Scanning all historical work orders, PCRs, and damage logs across system...
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-3 sm:p-4 border-t border-border-subtle bg-surface flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendQuery();
            }
          }}
          placeholder="Ask AI anything (e.g. 'Was there freeze damage before?', 'List all roof bids', 'Show lock codes')..."
          className="flex-1 bg-surface-hover text-xs"
        />
        <Button
          onClick={() => handleSendQuery()}
          disabled={loading || !query.trim()}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4"
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
