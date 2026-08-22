"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Card, Badge } from "@/components/ui";
import {
  Zap, Plus, Play, Pause, Trash2, Edit3, Copy, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, Mail, Bell, Shield, Filter, Search, ChevronRight,
  ExternalLink, Eye, ArrowRight, Layers, Tag, X, Check, FileText, Flame,
  HelpCircle, ChevronDown, ListChecks, History, Info
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// ─── Trigger Constants ────────────────────────────────────────────────────────
const TRIGGERS = [
  { id: "WO_CREATED", label: "New Work Order Created", category: "Work Orders" },
  { id: "WO_ASSIGNED", label: "Work Order Assigned", category: "Work Orders" },
  { id: "WO_REASSIGNED", label: "Work Order Reassigned", category: "Work Orders" },
  { id: "WO_STATUS_CHANGED", label: "Work Order Status Changed", category: "Work Orders" },
  { id: "WO_URGENT_FLAGGED", label: "Work Order Marked Urgent", category: "Work Orders" },
  { id: "WO_PRIORITY_CHANGED", label: "Priority Changed", category: "Work Orders" },
  { id: "WO_DUE_DATE_CHANGED", label: "Due Date Changed", category: "Work Orders" },
  { id: "WO_DUE_SOON", label: "Due Date Approaching (<24h)", category: "Deadlines" },
  { id: "WO_OVERDUE", label: "Work Order Overdue", category: "Deadlines" },
  { id: "WO_FIELD_COMPLETE", label: "Work Order Marked Field Complete", category: "Submissions" },
  { id: "WO_REJECTED", label: "Work Order Rejected by Client", category: "Quality & Review" },
  { id: "WO_RETURNED", label: "Work Order Returned", category: "Quality & Review" },
  { id: "WO_CANCELLED", label: "Work Order Cancelled", category: "Work Orders" },
  { id: "WO_CLOSED", label: "Work Order Closed / Completed", category: "Work Orders" },
  { id: "CLIENT_INSTRUCTION", label: "New Client Message / Instruction", category: "Communications" },
  { id: "CONTRACTOR_PHOTOS_UPLOADED", label: "Contractor Uploads Photos", category: "Contractors" },
  { id: "QC_COMMENT", label: "Quality Control Comment / Revision", category: "Quality & Review" },
  { id: "DAILY_DIGEST", label: "Daily Summary Digest Schedule", category: "Digests" },
];

const CONDITION_FIELDS = [
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority Level" },
  { id: "client", label: "Client Name" },
  { id: "serviceType", label: "Service / Work Type" },
  { id: "hasContractor", label: "Has Assigned Contractor" },
  { id: "hasPhotos", label: "Has Uploaded Photos" },
  { id: "unsubmittedHours", label: "Unsubmitted Hours (Field Complete)" },
  { id: "overdueHours", label: "Hours Overdue" },
  { id: "hoursBeforeDue", label: "Hours Remaining Before Due" },
  { id: "keywordMatch", label: "Matches Urgent Keyword" },
  { id: "isUnresolved", label: "Is Unresolved / Active" },
];

const OPERATORS = [
  { id: "equals", label: "Equals" },
  { id: "not_equals", label: "Does Not Equal" },
  { id: "contains", label: "Contains" },
  { id: "greater_than", label: "Greater Than (>)" },
  { id: "less_than", label: "Less Than (<)" },
  { id: "is_true", label: "Is True / Yes" },
  { id: "is_false", label: "Is False / No" },
  { id: "matches_keyword", label: "Matches Keyword" },
];

const RECIPIENT_ROLES = [
  { id: "ASSIGNED_USER", label: "Assigned User (Processor or Contractor)" },
  { id: "PROCESSOR", label: "Assigned Processor" },
  { id: "CONTRACTOR", label: "Assigned Contractor" },
  { id: "COORDINATOR", label: "Assigned Coordinator" },
  { id: "TEAM_LEAD", label: "Team Leads" },
  { id: "MANAGER", label: "Operations Managers" },
  { id: "ADMIN", label: "Admins & Super Admins" },
  { id: "CREATOR", label: "Work Order Creator" },
];

export default function AutomationRulesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"rules" | "keywords" | "executions" | "audit">("rules");
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testRuleData, setTestRuleData] = useState<any | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // New Keyword Modal
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ keyword: "", targetPriority: "URGENT", category: "general" });

  // Rule Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTrigger, setFormTrigger] = useState("WO_STATUS_CHANGED");
  const [formPriority, setFormPriority] = useState("NORMAL");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formConditions, setFormConditions] = useState<any[]>([]);
  const [formActions, setFormActions] = useState<any[]>([
    {
      type: "BOTH",
      targetRecipients: ["ASSIGNED_USER"],
      priority: "NORMAL",
      emailSubject: "Notification: WO #{{work_order_number}}",
      emailBody: "Hello {{assigned_user}},\n\nUpdate on WO #{{work_order_number}} at {{property_address}}.\n\nLink: {{work_order_link}}",
      notifTitle: "Work Order Alert",
      notifMessage: "Update on WO #{{work_order_number}}.",
    }
  ]);
  const [formEscalationTiers, setFormEscalationTiers] = useState<any[]>([]);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, kwRes, execRes] = await Promise.all([
        fetch("/api/automation/rules"),
        fetch("/api/automation/keywords"),
        fetch("/api/automation/executions"),
      ]);

      if (rulesRes.ok) {
        const d = await rulesRes.json();
        setRules(d.rules || []);
      }
      if (kwRes.ok) {
        const d = await kwRes.json();
        setKeywords(d.keywords || []);
      }
      if (execRes.ok) {
        const d = await execRes.json();
        setExecutions(d.executions || []);
        setAuditLogs(d.auditLogs || []);
      }
    } catch (err) {
      toast.error("Failed to load automation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Toggle Rule Active
  const handleToggleActive = async (rule: any) => {
    const newActive = !rule.isActive;
    try {
      const res = await fetch(`/api/automation/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: newActive } : r));
        toast.success(newActive ? "Rule enabled" : "Rule disabled");
      }
    } catch {
      toast.error("Failed to toggle rule");
    }
  };

  // Delete Rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation rule?")) return;
    try {
      const res = await fetch(`/api/automation/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== id));
        toast.success("Rule deleted");
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  // Duplicate Rule
  const handleDuplicateRule = async (rule: any) => {
    try {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${rule.name} (Copy)`,
          description: rule.description,
          trigger: rule.trigger,
          priority: rule.priority,
          isActive: false,
          conditions: rule.conditions,
          actions: rule.actions,
          escalationChain: rule.escalationChain,
        }),
      });
      if (res.ok) {
        toast.success("Rule duplicated");
        fetchData();
      }
    } catch {
      toast.error("Failed to duplicate rule");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setFormName(rule.name);
      setFormDescription(rule.description || "");
      setFormTrigger(rule.trigger);
      setFormPriority(rule.priority || "NORMAL");
      setFormIsActive(rule.isActive);
      setFormConditions(rule.conditions || []);
      setFormActions(rule.actions || []);
      setFormEscalationTiers(rule.escalationChain || []);
    } else {
      setEditingRule(null);
      setFormName("");
      setFormDescription("");
      setFormTrigger("WO_STATUS_CHANGED");
      setFormPriority("NORMAL");
      setFormIsActive(true);
      setFormConditions([]);
      setFormActions([
        {
          type: "BOTH",
          targetRecipients: ["ASSIGNED_USER"],
          priority: "NORMAL",
          emailSubject: "Notification: WO #{{work_order_number}}",
          emailBody: "Hello {{assigned_user}},\n\nUpdate on WO #{{work_order_number}} at {{property_address}}.\n\nLink: {{work_order_link}}",
          notifTitle: "Work Order Alert",
          notifMessage: "Update on WO #{{work_order_number}}.",
        }
      ]);
      setFormEscalationTiers([]);
    }
    setIsRuleModalOpen(true);
  };

  // Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Rule name is required");
      return;
    }

    const payload = {
      name: formName,
      description: formDescription,
      trigger: formTrigger,
      priority: formPriority,
      isActive: formIsActive,
      conditions: formConditions,
      actions: formActions,
      escalationChain: formEscalationTiers,
    };

    try {
      const url = editingRule ? `/api/automation/rules/${editingRule.id}` : "/api/automation/rules";
      const method = editingRule ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingRule ? "Rule updated" : "Rule created successfully");
        setIsRuleModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save rule");
      }
    } catch {
      toast.error("Error saving rule");
    }
  };

  // Run Test Evaluation Modal
  const handleOpenTest = (rule: any) => {
    setTestRuleData(rule);
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const handleExecuteTest = async () => {
    if (!testRuleData) return;
    setTestLoading(true);
    try {
      const res = await fetch(`/api/automation/rules/${testRuleData.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const d = await res.json();
        setTestResult(d);
      }
    } catch {
      toast.error("Test evaluation failed");
    } finally {
      setTestLoading(false);
    }
  };

  // Save Urgency Keyword
  const handleSaveKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.keyword.trim()) return;

    try {
      const res = await fetch("/api/automation/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKeyword),
      });
      if (res.ok) {
        toast.success("Keyword saved");
        setIsKeywordModalOpen(false);
        setNewKeyword({ keyword: "", targetPriority: "URGENT", category: "general" });
        fetchData();
      }
    } catch {
      toast.error("Failed to save keyword");
    }
  };

  // Delete Keyword
  const handleDeleteKeyword = async (id: string) => {
    try {
      const res = await fetch(`/api/automation/keywords?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Keyword removed");
        setKeywords(prev => prev.filter(k => k.id !== id));
      }
    } catch {
      toast.error("Failed to delete keyword");
    }
  };

  // Run Periodic Check Trigger (Manual sync)
  const handleRunPeriodicCheck = async () => {
    try {
      const res = await fetch("/api/automation/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runDigest: false }),
      });
      if (res.ok) {
        toast.success("Evaluation cycle completed");
        fetchData();
      }
    } catch {
      toast.error("Failed to run evaluation");
    }
  };

  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Automation Rules Engine</h1>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Automated internal email notifications, SLA monitoring, and multi-tier escalations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleRunPeriodicCheck} className="flex items-center gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Run Evaluation Check
          </Button>
          <Button onClick={() => handleOpenEdit()} className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Plus className="h-4 w-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("rules")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
            activeTab === "rules"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/[0.04]"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          <Layers className="h-4 w-4" />
          <span>Automation Rules</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-hover text-text-dim">
            {rules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("keywords")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
            activeTab === "keywords"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/[0.04]"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          <Flame className="h-4 w-4 text-amber-400" />
          <span>Urgency Keywords</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-hover text-text-dim">
            {keywords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("executions")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
            activeTab === "executions"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/[0.04]"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          <Clock className="h-4 w-4 text-blue-400" />
          <span>Active Escalations</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-hover text-text-dim">
            {executions.filter(e => e.status === "RUNNING" || e.status === "PENDING").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
            activeTab === "audit"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/[0.04]"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          <History className="h-4 w-4 text-purple-400" />
          <span>Audit Log & Trace</span>
        </button>
      </div>

      {/* ── TAB 1: AUTOMATION RULES ── */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 outline-none"
              />
            </div>
            <span className="text-xs text-text-muted">
              {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {filteredRules.map((rule) => {
              const triggerInfo = TRIGGERS.find(t => t.id === rule.trigger);
              const conditionsCount = (rule.conditions || []).length;
              const actionsCount = (rule.actions || []).length;
              const escalationCount = (rule.escalationChain || []).length;

              return (
                <div
                  key={rule.id}
                  className={cn(
                    "p-4.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                    rule.isActive
                      ? "bg-surface border-border-subtle hover:border-cyan-500/30 shadow-sm"
                      : "bg-surface/50 border-border-subtle/50 opacity-60"
                  )}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
                        rule.priority === "CRITICAL"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : rule.priority === "URGENT"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : rule.priority === "IMPORTANT"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-gray-500/10 text-text-secondary border-gray-500/20"
                      )}>
                        {rule.priority}
                      </span>

                      <h3 className="text-sm font-bold text-text-primary truncate">
                        {rule.name}
                      </h3>

                      {rule.isActive ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-500/10 text-text-muted border border-gray-500/20">
                          Disabled
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-text-muted line-clamp-1">
                      {rule.description || "No description provided."}
                    </p>

                    {/* Rule Structure Badge Pills */}
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-text-secondary flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                        <Zap className="h-3 w-3" /> WHEN: {triggerInfo?.label || rule.trigger}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium bg-surface-hover px-2 py-0.5 rounded-md border border-border-subtle">
                        <ListChecks className="h-3 w-3 text-text-muted" /> IF: {conditionsCount} condition{conditionsCount !== 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium bg-surface-hover px-2 py-0.5 rounded-md border border-border-subtle">
                        <Mail className="h-3 w-3 text-text-muted" /> THEN: {actionsCount} action{actionsCount !== 1 ? "s" : ""}
                      </span>
                      {escalationCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Clock className="h-3 w-3" /> {escalationCount} Escalation Tier{escalationCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={cn(
                        "p-2 rounded-xl text-xs font-semibold border transition-all",
                        rule.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-surface-hover text-text-muted border-border-subtle hover:bg-surface-hover/80"
                      )}
                      title={rule.isActive ? "Disable Rule" : "Enable Rule"}
                    >
                      {rule.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      onClick={() => handleOpenTest(rule)}
                      className="p-2 rounded-xl text-xs font-semibold bg-surface-hover text-cyan-400 border border-border-subtle hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all"
                      title="Test / Evaluate Rule"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(rule)}
                      className="p-2 rounded-xl text-xs font-semibold bg-surface-hover text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-surface-hover/80 transition-all"
                      title="Edit Rule"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDuplicateRule(rule)}
                      className="p-2 rounded-xl text-xs font-semibold bg-surface-hover text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-surface-hover/80 transition-all"
                      title="Duplicate Rule"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: URGENCY KEYWORDS ── */}
      {activeTab === "keywords" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              The engine automatically scans work order instructions, titles, and client messages against these keywords to flag urgent priorities.
            </p>
            <Button
              size="sm"
              onClick={() => setIsKeywordModalOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Keyword
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {keywords.map((kw) => (
              <div
                key={kw.id || kw.keyword}
                className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">"{kw.keyword}"</span>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase",
                      kw.targetPriority === "CRITICAL"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}>
                      {kw.targetPriority}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted capitalize">{kw.category || "general"}</span>
                </div>

                <button
                  onClick={() => handleDeleteKeyword(kw.id)}
                  className="p-1 rounded text-text-dim hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: ACTIVE ESCALATIONS ── */}
      {activeTab === "executions" && (
        <div className="space-y-3">
          {executions.length === 0 ? (
            <div className="text-center py-16 bg-surface rounded-2xl border border-border-subtle">
              <Clock className="h-10 w-10 text-text-dim mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-secondary">No active escalations running</p>
              <p className="text-xs text-text-muted mt-1">Pending escalation timers will appear here.</p>
            </div>
          ) : (
            <table className="w-full border-collapse bg-surface rounded-2xl border border-border-subtle overflow-hidden">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-hover/50 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Work Order</th>
                  <th className="px-4 py-3 text-left">Triggered Rule</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Current Step</th>
                  <th className="px-4 py-3 text-left">Next Run At</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {executions.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/work-orders/${e.workOrderId}`} className="font-mono text-cyan-400 font-bold hover:underline">
                        {e.workOrder?.title || e.workOrderId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-primary font-medium">{e.rule?.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        e.status === "RUNNING"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                          : e.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-gray-500/10 text-text-secondary border-gray-500/20"
                      )}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold">Tier {e.currentStep + 1}</td>
                    <td className="px-4 py-3 text-text-muted text-[11px]">
                      {e.nextRunAt ? new Date(e.nextRunAt).toLocaleTimeString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/dashboard/work-orders/${e.workOrderId}`} className="text-cyan-400 hover:text-cyan-300">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TAB 4: AUDIT LOG & TRACE ── */}
      {activeTab === "audit" && (
        <div className="space-y-3">
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">{log.ruleName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      {log.triggerEvent}
                    </span>
                    {log.workOrderNumber && (
                      <span className="text-[10px] font-mono text-text-muted">{log.workOrderNumber}</span>
                    )}
                  </div>
                  <p className="text-text-muted text-[11px]">{log.details}</p>
                </div>
                <span className="text-[10px] text-text-dim whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RULE BUILDER MODAL ── */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-surface border border-border-medium rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <h2 className="text-base font-bold text-text-primary">
                {editingRule ? "Edit Automation Rule" : "Create New Automation Rule"}
              </h2>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-primary mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Field Complete Submission Escalation"
                    className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-primary mb-1">Description</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Brief explanation of when and why this rule triggers"
                    className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Trigger Event (WHEN)</label>
                  <select
                    value={formTrigger}
                    onChange={e => setFormTrigger(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50"
                  >
                    {TRIGGERS.map(t => (
                      <option key={t.id} value={t.id}>{t.label} ({t.category})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none focus:border-cyan-500/50"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="IMPORTANT">IMPORTANT</option>
                    <option value="URGENT">URGENT</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              {/* Conditions Section (IF) */}
              <div className="p-4 rounded-xl bg-surface-hover/40 border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5" /> Conditions (IF)
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormConditions(prev => [...prev, { field: "status", operator: "equals", value: "" }])}
                    className="text-[11px] h-7"
                  >
                    + Add Condition
                  </Button>
                </div>

                {formConditions.length === 0 ? (
                  <p className="text-xs text-text-dim italic">No conditions specified (triggers for all occurrences).</p>
                ) : (
                  formConditions.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={c.field}
                        onChange={e => {
                          const val = e.target.value;
                          setFormConditions(prev => prev.map((item, i) => i === idx ? { ...item, field: val } : item));
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-surface border border-border-subtle rounded-lg text-xs text-text-primary outline-none"
                      >
                        {CONDITION_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>

                      <select
                        value={c.operator}
                        onChange={e => {
                          const val = e.target.value;
                          setFormConditions(prev => prev.map((item, i) => i === idx ? { ...item, operator: val } : item));
                        }}
                        className="w-32 px-2.5 py-1.5 bg-surface border border-border-subtle rounded-lg text-xs text-text-primary outline-none"
                      >
                        {OPERATORS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>

                      <input
                        type="text"
                        placeholder="Value..."
                        value={c.value}
                        onChange={e => {
                          const val = e.target.value;
                          setFormConditions(prev => prev.map((item, i) => i === idx ? { ...item, value: val } : item));
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-surface border border-border-subtle rounded-lg text-xs text-text-primary outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => setFormConditions(prev => prev.filter((_, i) => i !== idx))}
                        className="text-text-dim hover:text-rose-400 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Actions Section (THEN) */}
              <div className="p-4 rounded-xl bg-surface-hover/40 border border-border-subtle space-y-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Action & Message Template (THEN)
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Email Subject</label>
                    <input
                      type="text"
                      value={formActions[0]?.emailSubject || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setFormActions(prev => [{ ...prev[0], emailSubject: val }]);
                      }}
                      className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-lg text-xs text-text-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Email Body Template</label>
                    <textarea
                      rows={4}
                      value={formActions[0]?.emailBody || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setFormActions(prev => [{ ...prev[0], emailBody: val }]);
                      }}
                      className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-lg text-xs text-text-primary outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                <Button type="button" variant="ghost" onClick={() => setIsRuleModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">Save Rule</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TEST EVALUATION MODAL ── */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-surface border border-border-medium rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary">Test Rule Evaluation</h2>
              <button onClick={() => setIsTestModalOpen(false)}><X className="h-5 w-5 text-text-muted" /></button>
            </div>

            <p className="text-xs text-text-muted">
              Evaluating rule <strong>"{testRuleData?.name}"</strong> against active work orders in database.
            </p>

            <Button onClick={handleExecuteTest} disabled={testLoading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
              {testLoading ? "Evaluating..." : "Run Live Evaluation Test"}
            </Button>

            {testResult && (
              <div className={cn(
                "p-4 rounded-xl border text-xs space-y-2",
                testResult.matched ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              )}>
                <div className="font-bold flex items-center gap-1.5">
                  {testResult.matched ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-rose-400" />}
                  {testResult.matched ? "Conditions Matched (Actions would execute)" : "Conditions Did Not Match"}
                </div>
                <div className="space-y-1 text-text-secondary">
                  {testResult.reasons?.map((r: string, idx: number) => (
                    <div key={idx}>&bull; {r}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD KEYWORD MODAL ── */}
      {isKeywordModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-surface border border-border-medium rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary">Add Urgency Keyword</h2>
              <button onClick={() => setIsKeywordModalOpen(false)}><X className="h-5 w-5 text-text-muted" /></button>
            </div>

            <form onSubmit={handleSaveKeyword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Keyword / Phrase</label>
                <input
                  type="text"
                  required
                  value={newKeyword.keyword}
                  onChange={e => setNewKeyword(prev => ({ ...prev, keyword: e.target.value }))}
                  placeholder="e.g. Broken Pipe, Freeze Warning"
                  className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Target Priority</label>
                <select
                  value={newKeyword.targetPriority}
                  onChange={e => setNewKeyword(prev => ({ ...prev, targetPriority: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary outline-none"
                >
                  <option value="URGENT">URGENT</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="IMPORTANT">IMPORTANT</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsKeywordModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">Save Keyword</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
