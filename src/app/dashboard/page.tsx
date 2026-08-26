"use client";

import { useSession } from "next-auth/react";
import {
  useDashboardStats,
  useDashboardMetrics,
  useInvoices,
  useNotifications,
  useChatChannels,
  useWorkOrders,
  useLiveStats,
} from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, CardDescription, Badge, Avatar, Button } from "@/components/ui";
import {
  DonutChart,
  BarChart,
  Sparkline,
  ProgressRing,
  HorizontalBar,
  StatCard,
} from "@/components/ui/charts";
import {
  ClipboardList,
  CheckCircle2,
  Receipt,
  LifeBuoy,
  Clock,
  AlertTriangle,
  Users,
  DollarSign,
  Camera,
  MapPin,
  MessageSquare,
  Activity,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Bell,
  Flame,
  Target,
  Gauge,
  Globe,
  Layers,
  Radio,
  Eye,
} from "lucide-react";
import Link from "next/link";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  cn,
  formatRelativeTime,
  formatCurrency,
  SERVICE_TYPE_LABELS,
} from "@/lib/utils";

const sparkOrders = [12, 18, 14, 22, 19, 25, 28, 24, 30, 27, 32, 35];
const sparkRevenue = [4200, 5100, 4800, 6200, 5900, 7100, 6800, 7500, 8200, 7800, 8500, 9200];
const sparkCompletion = [85, 88, 82, 90, 87, 92, 89, 94, 91, 95, 93, 96];
const sparkTickets = [3, 5, 2, 4, 6, 3, 2, 4, 1, 3, 2, 1];

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: invoicesData } = useInvoices();
  const { data: notifData } = useNotifications();
  const { data: channelsData } = useChatChannels();
  const { data: recentOrdersData } = useWorkOrders({});
  const { data: liveStats } = useLiveStats();

  const userName = session?.user?.name?.split(" ")[0] || "there";

  const statusData = stats?.statusBreakdown
    ? Object.entries(stats.statusBreakdown)
        .filter(([, v]) => (v as number) > 0)
        .map(([status, count]) => ({
          label: STATUS_LABELS[status] || status,
          value: count as number,
          color: getStatusColor(status),
        }))
    : [];

  const serviceData = stats?.serviceBreakdown
    ? Object.entries(stats.serviceBreakdown)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 6)
        .map(([type, count]) => ({
          label: SERVICE_TYPE_LABELS[type] || type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
          value: count as number,
        }))
    : [];

  const invoices = invoicesData?.invoices || [];
  const totalRevenue = invoices.filter((i: any) => i.status === "PAID").reduce((s: number, i: any) => s + (i.total || 0), 0);
  const pendingRevenue = invoices.filter((i: any) => i.status === "SENT" || i.status === "OVERDUE").reduce((s: number, i: any) => s + (i.total || 0), 0);

  const completionRate = stats?.totalWorkOrders > 0 ? Math.round(((stats.completedThisMonth || 0) / stats.totalWorkOrders) * 100) : 0;
  const recentNotifs = notifData?.notifications?.slice(0, 4) || [];
  const channels = channelsData?.channels || [];
  const recentChannels = channels.filter((c: any) => c.lastMessage).sort((a: any, b: any) => new Date(b.lastMessage?.createdAt).getTime() - new Date(a.lastMessage?.createdAt).getTime()).slice(0, 4);
  const recentOrders = recentOrdersData?.workOrders?.slice(0, 4) || [];
  const activityItems = recentNotifs.length > 0 ? recentNotifs : recentOrders.map((wo: any) => ({
    id: wo.id,
    type: "WORK_ORDER",
    title: wo.title,
    message: `${wo.address} — ${STATUS_LABELS[wo.status] || wo.status}`,
    createdAt: wo.updatedAt || wo.createdAt,
    isRead: true,
    workOrderId: wo.id,
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Welcome Header with Gradient Banner ─────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-r from-cyan-500/30 via-purple-500/20 to-pink-500/30">
        <div className="relative rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-surface via-surface to-surface-hover p-6 md:p-8 overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute top-[-40%] right-[-10%] w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[80px] animate-glow pointer-events-none" />
          <div className="absolute bottom-[-30%] left-[20%] w-[200px] h-[200px] rounded-full bg-purple-500/6 blur-[60px] animate-glow pointer-events-none" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-[10%] right-[30%] w-[150px] h-[150px] rounded-full bg-pink-500/5 blur-[50px] animate-glow pointer-events-none" style={{ animationDelay: '3s' }} />
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="cyan" size="sm" className="animate-pulse">
                    <Radio className="h-2.5 w-2.5 mr-1" />
                    LIVE
                  </Badge>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                <span className="text-text-primary">{greeting}, </span>
                <span className="text-gradient brand-accent">{userName}</span>
              </h1>
              <p className="text-text-secondary mt-2 text-sm font-medium max-w-md">
                PropPreserve is monitoring your entire property portfolio in real-time. Everything looks great.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-3">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">System Health</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
                  <span className="text-sm font-bold text-emerald-400">All Systems Operational</span>
                </div>
              </div>
              <Link href="/dashboard/performance">
                <Button variant="primary" size="sm" className="shadow-cyan-500/20 shadow-lg">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance Report
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Grid with Colorful Stat Cards ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="animate-slide-up stagger-1">
          <StatCard
            label="Total Work Orders"
            value={isLoading ? "..." : String(stats?.totalWorkOrders || 0)}
            change={12}
            icon={ClipboardList}
            color="bg-cyan-500/15 text-cyan-400 border-cyan-500/25"
            sparkData={sparkOrders}
          />
        </div>
        <div className="animate-slide-up stagger-2">
          <StatCard
            label="Active Jobs"
            value={isLoading ? "..." : String(stats?.activeWorkOrders || 0)}
            change={5}
            icon={Zap}
            color="bg-violet-500/15 text-violet-400 border-violet-500/25"
            sparkData={sparkCompletion}
          />
        </div>
        <div className="animate-slide-up stagger-3">
          <StatCard
            label="Monthly Revenue"
            value={formatCurrency(totalRevenue)}
            change={18}
            icon={DollarSign}
            color="bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
            sparkData={sparkRevenue}
          />
        </div>
        <div className="animate-slide-up stagger-4">
          <StatCard
            label="Open Tickets"
            value={isLoading ? "..." : String(stats?.openTickets || 0)}
            change={-15}
            icon={LifeBuoy}
            color="bg-rose-500/15 text-rose-400 border-rose-500/25"
            sparkData={sparkTickets}
          />
        </div>
      </div>

      {/* ── Analytics Row with Vibrant Charts ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution - Enhanced Donut */}
        <Card variant="glass" className="flex flex-col h-full group">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center border border-cyan-500/20">
                <Target className="h-4.5 w-4.5 text-cyan-400" />
              </div>
              <div>
                <CardTitle>Pipeline Status</CardTitle>
                <CardDescription>Live breakdown of all active jobs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 flex flex-col justify-center py-4">
            {statusData.length > 0 ? (
              <DonutChart data={statusData} size={170} thickness={22} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <Activity className="h-10 w-10 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No Active Data</p>
              </div>
            )}
          </div>
        </Card>

        {/* Service Popularity + Efficiency Index — compact side-by-side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Service Popularity - Compact */}
          <Card variant="glass" className="group flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center border border-purple-500/20">
                  <Layers className="h-4.5 w-4.5 text-purple-400" />
                </div>
                <div>
                  <CardTitle>Service Demand</CardTitle>
                  <CardDescription>Top categories</CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="flex-1 flex items-center justify-center py-2">
              {serviceData.length > 0 ? (
                <BarChart data={serviceData} height={42} />
              ) : (
                <div className="h-10 flex items-center justify-center opacity-30 italic text-xs">Awaiting data...</div>
              )}
            </div>
          </Card>

          {/* Efficiency Index - Compact */}
          <Card variant="glass" className="group flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Gauge className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div>
                  <CardTitle>Efficiency Index</CardTitle>
                  <CardDescription>KPI benchmarks</CardDescription>
                </div>
              </div>
              <Badge variant="emerald" size="sm" className="shadow-emerald-500/10 shadow-md">{completionRate}%</Badge>
            </CardHeader>
            <div className="flex-1 flex flex-col justify-center py-2 space-y-2">
              <div className="flex justify-center">
                <ProgressRing value={completionRate} size={44} thickness={6} color="#34d399">
                  <div className="text-center">
                    <span className="text-xs font-black text-emerald-400">{completionRate}%</span>
                  </div>
                </ProgressRing>
              </div>
              <div className="space-y-1.5">
                <HorizontalBar label="On-time" value={stats?.onTimeCount || 0} maxValue={stats?.totalWorkOrders || 1} color="from-cyan-400 to-blue-500" />
                <HorizontalBar label="Satisfaction" value={94} maxValue={100} color="from-purple-400 to-pink-500" suffix="%" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Workforce & Client Row - Bottom 2 Cards ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Contractor Utilization */}
        <Card variant="glass" className="group relative overflow-hidden">
          {/* Subtle gradient accent */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500/8 to-transparent rounded-bl-full pointer-events-none" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 flex items-center justify-center border border-violet-500/20">
                <Users className="h-4.5 w-4.5 text-violet-400" />
              </div>
              <div>
                <CardTitle>Contractor Utilization</CardTitle>
                <CardDescription>Workforce distribution & status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="flex items-center gap-5 pt-1 relative z-10">
            <ProgressRing 
              value={stats?.totalContractors ? Math.round(((stats.activeContractors || 0) / stats.totalContractors) * 100) : 0} 
              size={64} 
              thickness={7} 
              color="#a78bfa"
            >
              <div className="text-center">
                <span className="text-sm font-black text-violet-400">{stats?.activeContractors || 0}</span>
              </div>
            </ProgressRing>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-text-secondary font-medium">Active</span>
                <span className="font-black text-emerald-400">{stats?.activeContractors || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <span className="text-text-secondary font-medium">Idle</span>
                <span className="font-black text-amber-400">{Math.max((stats?.totalContractors || 0) - (stats?.activeContractors || 0), 0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                <span className="text-text-secondary font-medium">Total</span>
                <span className="font-black text-cyan-400">{stats?.totalContractors || 0}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Client Satisfaction */}
        <Card variant="glass" className="group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-500/8 to-transparent rounded-bl-full pointer-events-none" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center border border-amber-500/20">
                <Eye className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <div>
                <CardTitle>Client Satisfaction</CardTitle>
                <CardDescription>Ratings & feedback trends</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="flex items-center gap-5 pt-1 relative z-10">
            <ProgressRing value={94} size={64} thickness={7} color="#fbbf24">
              <div className="text-center">
                <span className="text-sm font-black text-amber-400">4.7</span>
              </div>
            </ProgressRing>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <span className="text-text-secondary font-medium">This Month</span>
                <span className="font-black text-amber-400">4.7 / 5.0</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface-hover border border-border-subtle">
                <span className="text-text-secondary font-medium">Last Month</span>
                <span className="font-black text-text-muted">4.5 / 5.0</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 px-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+0.2 month-over-month improvement</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Revenue & Team Row - Bold Visuals ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Revenue Snapshot */}
        <Card variant="glass" className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-emerald-500/20">
                <DollarSign className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <div>
                <CardTitle>Revenue Snapshot</CardTitle>
                <CardDescription>Current month financial overview</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="space-y-4 pt-1 relative z-10">
            <div className="text-center p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 border border-emerald-500/10">
              <p className="text-3xl font-black text-gradient">{formatCurrency(totalRevenue)}</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1.5">Total Monthly Revenue</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-text-secondary font-medium">Paid</span>
                </div>
                <span className="text-sm font-black text-emerald-400">{formatCurrency(stats?.paidRevenue || 0)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-text-secondary font-medium">Pending</span>
                </div>
                <span className="text-sm font-black text-amber-400">{formatCurrency(stats?.pendingRevenue || 0)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="text-xs text-text-secondary font-medium">Overdue</span>
                </div>
                <span className="text-sm font-black text-rose-400">{formatCurrency(stats?.overdueRevenue || 0)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Team Activity */}
        <Card variant="glass" className="group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center border border-cyan-500/20">
                <Activity className="h-4.5 w-4.5 text-cyan-400" />
              </div>
              <div>
                <CardTitle>Team Activity</CardTitle>
                <CardDescription>Real-time workforce engagement</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="space-y-4 pt-1 relative z-10">
            <div className="text-center p-4 rounded-2xl bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-violet-500/5 border border-cyan-500/10">
              <p className="text-3xl font-black text-gradient-cool">{stats?.activeContractors || 0}</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1.5">Active Contractors Online</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="text-xs text-text-secondary font-medium">Total Orders</span>
                </div>
                <span className="text-sm font-black text-cyan-400">{stats?.totalWorkOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-text-secondary font-medium">Completed</span>
                </div>
                <span className="text-sm font-black text-emerald-400">{stats?.completedWorkOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="text-xs text-text-secondary font-medium">Open Tickets</span>
                </div>
                <span className="text-sm font-black text-rose-400">{stats?.openTickets || 0}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Order Pipeline - Colorful Grid ───────────────────────────────── */}
      {stats?.statusBreakdown && (
        <Card variant="glass" className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center border border-indigo-500/20">
                <Globe className="h-4.5 w-4.5 text-indigo-400" />
              </div>
              <div>
                <CardTitle>Order Pipeline</CardTitle>
                <CardDescription>Complete numeric breakdown of current inventory status</CardDescription>
              </div>
            </div>
            <Link href="/dashboard/work-orders">
              <Button variant="ghost" size="xs" className="text-cyan-400 font-bold hover:text-cyan-300">MANAGE INVENTORY →</Button>
            </Link>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-11 gap-2.5">
            {Object.entries(stats.statusBreakdown)
              .filter(([, v]) => (v as number) > 0)
              .map(([status, count], i) => (
                <Link
                  key={status}
                  href={`/dashboard/work-orders?status=${status}`}
                  className={cn(
                    "p-4 rounded-2xl border hover:border-cyan-500/30 hover:bg-cyan-500/[0.06] transition-all text-center group flex flex-col items-center justify-center relative overflow-hidden",
                    "bg-surface-hover border-border-subtle"
                  )}
                >
                  {/* Top gradient accent bar */}
                  <div className={cn("absolute top-0 inset-x-0 h-1 rounded-t-2xl opacity-40 group-hover:opacity-80 transition-opacity", getStatusGradient(status))} />
                  <p className="text-xl font-black text-text-primary group-hover:text-cyan-400 transition-colors tabular-nums">
                    {count as number}
                  </p>
                  <p className="text-[8px] font-bold text-text-muted uppercase tracking-tighter mt-1 group-hover:text-text-secondary leading-tight">
                    {STATUS_LABELS[status] || status}
                  </p>
                </Link>
              ))}
          </div>
        </Card>
      )}

      {/* ── Communications & Activity Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Recent Activity Feed */}
        <Card variant="glass" className="xl:col-span-2 group">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center border border-blue-500/20">
                <Radio className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
              </div>
              <div>
                <CardTitle>Real-time Activity</CardTitle>
                <CardDescription>Latest updates across your portfolio</CardDescription>
              </div>
            </div>
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="xs" className="text-cyan-400 font-bold">View All</Button>
            </Link>
          </CardHeader>
          <div className="space-y-1.5 mt-2">
            {activityItems.map((n: any, i: number) => (
              <Link
                key={n.id}
                href={n.workOrderId ? `/dashboard/work-orders/${n.workOrderId}` : "/dashboard/notifications"}
                className={cn(
                  "flex items-center gap-4 p-3.5 rounded-2xl hover:bg-surface-hover transition-all group/item",
                  "animate-slide-up",
                  `stagger-${i + 1}`
                )}
              >
                <div className={cn(
                  "h-11 w-11 rounded-2xl flex items-center justify-center border shadow-sm",
                  getNotifColor(n.type)
                )}>
                  {getNotifIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary group-hover/item:text-cyan-400 transition-colors truncate">{n.title}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{n.message}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold text-text-dim uppercase">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Unread Conversations */}
        <Card variant="glass" className="xl:col-span-2 group">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 flex items-center justify-center border border-pink-500/20">
                <MessageSquare className="h-4.5 w-4.5 text-pink-400" />
              </div>
              <div>
                <CardTitle>Active Chats</CardTitle>
                <CardDescription>Direct messages and team channels</CardDescription>
              </div>
            </div>
            <Link href="/dashboard/chat">
              <Button variant="secondary" size="xs">Open Inbox</Button>
            </Link>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {recentChannels.map((ch: any) => (
              <Link
                key={ch.id}
                href="/dashboard/chat"
                className="flex items-center gap-4 p-4 rounded-2xl bg-surface-hover border border-border-subtle hover:border-pink-500/20 hover:bg-pink-500/[0.03] transition-all relative overflow-hidden group/chat"
              >
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/chat:opacity-100 transition-opacity">
                  <ArrowUpRight className="h-4 w-4 text-pink-400" />
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/15 flex items-center justify-center flex-shrink-0 relative">
                  <MessageSquare className="h-5 w-5 text-pink-400" />
                  {ch.unreadCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 border-2 border-surface flex items-center justify-center text-[9px] font-black text-white shadow-lg shadow-rose-500/30">
                      {ch.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate tracking-tight">{ch.name}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5 font-medium">
                    {ch.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Live Network Pulse - Rainbow Stats Strip ─────────────────────── */}
      <Card variant="surface" className="border-cyan-500/10 overflow-hidden">
        <div className="relative">
          {/* Animated gradient border top */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-gradient-shift opacity-60" />
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center border border-cyan-500/20">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              Live Network Pulse
            </h3>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
              <Badge variant="cyan" size="sm">Active Now</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 divide-x divide-border-subtle">
            {[
              { label: "Active Users", value: liveStats?.activeUsers ?? "—", icon: Users, color: "text-cyan-400", bg: "hover:bg-cyan-500/5", glow: "group-hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]" },
              { label: "GPS Pings", value: liveStats?.onlineNow ?? "—", icon: Activity, color: "text-emerald-400", bg: "hover:bg-emerald-500/5", glow: "group-hover:shadow-[0_0_20px_rgba(52,211,153,0.1)]" },
              { label: "Photos Logged", value: liveStats?.photosToday ?? "—", icon: Camera, color: "text-purple-400", bg: "hover:bg-purple-500/5", glow: "group-hover:shadow-[0_0_20px_rgba(167,139,250,0.1)]" },
              { label: "Live Chats", value: liveStats?.messagesSent ?? "—", icon: MessageSquare, color: "text-pink-400", bg: "hover:bg-pink-500/5", glow: "group-hover:shadow-[0_0_20px_rgba(244,114,182,0.1)]" },
              { label: "Tasks Done", value: liveStats?.tasksDone ?? "—", icon: CheckCircle2, color: "text-teal-400", bg: "hover:bg-teal-500/5", glow: "group-hover:shadow-[0_0_20px_rgba(45,212,191,0.1)]" },
              { label: "Bids Submitted", value: liveStats?.bidsSubmitted ?? "—", icon: DollarSign, color: "text-amber-400", bg: "hover:bg-amber-500/5", glow: "group-hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]" },
              { label: "Inspections", value: liveStats?.inspections ?? "—", icon: MapPin, color: "text-rose-400", bg: "hover:bg-rose-500/5", glow: "group-hover:shadow-[0_0_20px_rgba(251,113,133,0.1)]" },
              { label: "Avg Response", value: liveStats?.avgResponseTime ?? "—", icon: Clock, color: "text-orange-400", bg: "hover:bg-orange-500/5", glow: "group-hover:shadow-[0_0_20px_rgba(251,146,60,0.1)]" },
            ].map((stat) => (
              <div key={stat.label} className={cn("p-6 flex flex-col items-center text-center group transition-all cursor-default", stat.bg, stat.glow)}>
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center mb-3 bg-surface-hover border border-border-subtle group-hover:scale-110 transition-all", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black text-text-primary tabular-nums">{stat.value}</p>
                <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.15em] mt-1.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: "#60a5fa", UNASSIGNED: "#94a3b8", PENDING: "#fbbf24", ASSIGNED: "#a78bfa", IN_PROGRESS: "#22d3ee",
    FIELD_COMPLETE: "#2dd4bf", QC_REVIEW: "#fb923c", PENDING_REVIEW: "#fbbf24",
    READY_FOR_CLIENT: "#38bdf8", SENT_TO_CLIENT: "#818cf8",
    REVISIONS_NEEDED: "#fb7185", OFFICE_COMPLETE: "#34d399", CLOSED: "#94a3b8", CANCELLED: "#f43f5e",
    ASSETS: "#2dd4bf",
  };
  return colors[status] || "#60a5fa";
}

function getStatusGradient(status: string): string {
  const gradients: Record<string, string> = {
    NEW: "bg-gradient-to-r from-blue-500 to-blue-400",
    UNASSIGNED: "bg-gradient-to-r from-slate-500 to-slate-400",
    PENDING: "bg-gradient-to-r from-amber-500 to-yellow-400",
    ASSIGNED: "bg-gradient-to-r from-violet-500 to-purple-400",
    IN_PROGRESS: "bg-gradient-to-r from-cyan-500 to-teal-400",
    FIELD_COMPLETE: "bg-gradient-to-r from-teal-500 to-emerald-400",
    QC_REVIEW: "bg-gradient-to-r from-orange-500 to-amber-400",
    PENDING_REVIEW: "bg-gradient-to-r from-amber-500 to-orange-400",
    READY_FOR_CLIENT: "bg-gradient-to-r from-sky-500 to-cyan-400",
    SENT_TO_CLIENT: "bg-gradient-to-r from-indigo-500 to-violet-400",
    REVISIONS_NEEDED: "bg-gradient-to-r from-rose-500 to-pink-400",
    OFFICE_COMPLETE: "bg-gradient-to-r from-emerald-500 to-green-400",
    CLOSED: "bg-gradient-to-r from-purple-500 to-violet-400",
    CANCELLED: "bg-gradient-to-r from-rose-600 to-red-400",
    ASSETS: "bg-gradient-to-r from-teal-500 to-emerald-400",
  };
  return gradients[status] || "bg-gradient-to-r from-cyan-500 to-blue-400";
}

function getNotifIcon(type: string) {
  switch (type) {
    case "MESSAGE": return <MessageSquare className="h-4.5 w-4.5" />;
    case "WORK_ORDER":
    case "DUE":
    case "OVERDUE":
    case "CANCELLED": return <ClipboardList className="h-4.5 w-4.5" />;
    default: return <Bell className="h-4.5 w-4.5" />;
  }
}

function getNotifColor(type: string) {
  switch (type) {
    case "MESSAGE": return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    case "WORK_ORDER": return "text-violet-400 bg-violet-500/10 border-violet-500/20";
    case "OVERDUE":
    case "CANCELLED": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    case "DUE": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    default: return "text-text-secondary bg-surface-hover border-border-subtle";
  }
}
