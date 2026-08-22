"use client";

import { useState } from "react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-data";
import { Button, Card } from "@/components/ui";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  MessageSquare,
  ClipboardList,
  Receipt,
  LifeBuoy,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Flame,
  XCircle,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const { data, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<
    "all" | "unread" | "urgent" | "critical" | "rejection" | "overdue" | "field_complete"
  >("all");
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const filtered = notifications.filter((n: any) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "urgent") return n.priority === "URGENT";
    if (filter === "critical") return n.priority === "CRITICAL";
    if (filter === "rejection") return n.title?.toLowerCase().includes("reject") || n.message?.toLowerCase().includes("reject");
    if (filter === "overdue") return n.title?.toLowerCase().includes("overdue") || n.type === "OVERDUE";
    if (filter === "field_complete") return n.title?.toLowerCase().includes("field complete") || n.message?.toLowerCase().includes("field complete");
    return true;
  });

  function getIcon(type: string, priority?: string) {
    if (priority === "CRITICAL") return <Flame className="h-4 w-4 text-rose-400" />;
    if (priority === "URGENT") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    switch (type) {
      case "MESSAGE":
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case "WORK_ORDER":
        return <ClipboardList className="h-4 w-4 text-cyan-400" />;
      case "INVOICE":
        return <Receipt className="h-4 w-4 text-amber-400" />;
      case "TICKET":
        return <LifeBuoy className="h-4 w-4 text-red-400" />;
      case "OVERDUE":
      case "CANCELLED":
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      case "DUE":
        return <Clock className="h-4 w-4 text-orange-400" />;
      default:
        return <Bell className="h-4 w-4 text-text-muted" />;
    }
  }

  function getLink(n: any) {
    if (n.link) return n.link;
    if (n.workOrder) return `/dashboard/work-orders/${n.workOrderId}`;
    if (n.ticket) return `/dashboard/support/${n.ticketId}`;
    return "#";
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  async function handleAcknowledge(e: React.MouseEvent, notificationId: string) {
    e.preventDefault();
    e.stopPropagation();
    setAcknowledgingId(notificationId);
    try {
      const res = await fetch(`/api/notifications/${notificationId}/acknowledge`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Action acknowledged! Active escalations paused.");
        if (refetch) refetch();
      } else {
        toast.error("Failed to acknowledge notification");
      }
    } catch {
      toast.error("Error acknowledging notification");
    } finally {
      setAcknowledgingId(null);
    }
  }

  const urgentCount = notifications.filter((n: any) => n.priority === "URGENT" || n.priority === "CRITICAL").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">In-App Notification Center</h1>
            {urgentCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                {urgentCount} Urgent / Critical
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"} requiring attention`
              : "You're all caught up with automated alerts."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              loading={markAllRead.isPending}
              className="text-xs flex items-center gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-border-subtle overflow-x-auto gap-1 pb-1 scrollbar-none">
        {[
          { id: "all", label: "All", count: notifications.length },
          { id: "unread", label: "Unread", count: unreadCount },
          { id: "critical", label: "🔥 Critical", count: notifications.filter((n: any) => n.priority === "CRITICAL").length },
          { id: "urgent", label: "🚨 Urgent", count: notifications.filter((n: any) => n.priority === "URGENT").length },
          { id: "rejection", label: "❌ Rejections", count: notifications.filter((n: any) => n.title?.toLowerCase().includes("reject")).length },
          { id: "overdue", label: "⏰ Overdue", count: notifications.filter((n: any) => n.title?.toLowerCase().includes("overdue") || n.type === "OVERDUE").length },
          { id: "field_complete", label: "📋 Field Complete", count: notifications.filter((n: any) => n.title?.toLowerCase().includes("field complete")).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5",
              filter === tab.id
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                filter === tab.id ? "bg-white/20 text-white" : "bg-surface-hover text-text-dim"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <Card padding={false} className="overflow-hidden border border-border-subtle bg-surface">
        {isLoading ? (
          <div className="p-12 text-center text-text-muted">
            <div className="h-6 w-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <BellOff className="h-10 w-10 mx-auto mb-2 text-text-dim" />
            <p className="font-semibold text-sm text-text-secondary">No notifications found</p>
            <p className="text-xs text-text-dim mt-1">
              {filter === "unread" ? "No unread notifications." : "You're all clear!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered.map((n: any) => {
              const isUrgentOrCritical = n.priority === "URGENT" || n.priority === "CRITICAL";
              const isAcknowledged = !!n.acknowledgedAt;

              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors",
                    !n.isRead && "bg-cyan-500/[0.03]",
                    n.priority === "CRITICAL" && "bg-rose-500/[0.04] border-l-4 border-l-rose-500",
                    n.priority === "URGENT" && "bg-amber-500/[0.04] border-l-4 border-l-amber-500"
                  )}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-xl bg-surface-hover border border-border-subtle shrink-0 mt-0.5">
                      {getIcon(n.type, n.priority)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {n.priority && n.priority !== "NORMAL" && (
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase",
                            n.priority === "CRITICAL" ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          )}>
                            {n.priority}
                          </span>
                        )}

                        <p className={cn("text-xs", !n.isRead ? "font-bold text-text-primary" : "text-text-secondary")}>
                          {n.title}
                        </p>

                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-text-muted leading-relaxed">
                        {n.message}
                      </p>

                      {n.workOrder && (
                        <p className="text-[11px] font-medium text-cyan-400 flex items-center gap-1">
                          <span>{n.workOrder.title}</span>
                          <span className="text-text-dim">&bull;</span>
                          <span className="text-text-muted">{n.workOrder.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Timestamp */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Acknowledge Button for Action-Required or Urgent items */}
                    {(n.actionRequired || isUrgentOrCritical) && !isAcknowledged && (
                      <Button
                        size="sm"
                        onClick={(e) => handleAcknowledge(e, n.id)}
                        disabled={acknowledgingId === n.id}
                        className="text-[11px] h-7 px-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {acknowledgingId === n.id ? "Saving..." : "Acknowledge"}
                      </Button>
                    )}

                    {isAcknowledged && (
                      <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Acknowledged
                      </span>
                    )}

                    {/* View Work Order */}
                    <Link
                      href={getLink(n)}
                      onClick={async () => {
                        if (!n.isRead) await markRead.mutateAsync(n.id);
                      }}
                      className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      title="Open Work Order"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>

                    <span className="text-[10px] text-text-dim whitespace-nowrap min-w-[70px] text-right">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
