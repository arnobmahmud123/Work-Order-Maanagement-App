"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useUnreadCounts } from "@/hooks/use-data";
import {
  LayoutDashboard,
  ClipboardList,
  LifeBuoy,
  Users,
  Building2,
  BarChart3,
  Settings,
  Wrench,
  Shield,
  Bell,
  Sparkles,
  Search,
  FileText,
  Camera,
  Mail,
  MessageSquare,
  GraduationCap,
  Truck,
  MapPin,
  Phone,
  CalendarClock,
  Hash,
  PanelLeftClose,
  PanelLeftOpen,
  FileSpreadsheet,
  Image,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Rss,
  Briefcase,
  Star,
  Target,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Work Orders", href: "/dashboard/work-orders", icon: ClipboardList },
  { label: "GPS Camera", href: "/dashboard/camera", icon: Camera },
  { label: "Assets", href: "/dashboard/assets", icon: Building2 },
  { label: "Chat", href: "/dashboard/chat", icon: Hash, badgeKey: "chat" as const },
  { label: "SMS Chat", href: "/dashboard/sms-chat", icon: MessageSquare },
  { label: "Email", href: "/dashboard/email", icon: Mail, badgeKey: "email" as const },
  { label: "AI Lead Finder", href: "/dashboard/lead-intelligence", icon: Target },
  { label: "Inspectors", href: "/dashboard/inspectors", icon: MapPin },
  { label: "Vendors", href: "/dashboard/vendors", icon: Wrench },
  { label: "Logistics", href: "/dashboard/logistics", icon: Truck },
  { label: "Training", href: "/dashboard/training", icon: GraduationCap },
  { label: "Performance", href: "/dashboard/performance", icon: BarChart3 },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Accounting", href: "/dashboard/accounting", icon: FileSpreadsheet },
  { label: "EXIF Tools", href: "/dashboard/exif-tools", icon: Image },
  { label: "Balance", href: "/dashboard/contractor/balance", icon: DollarSign },
  { label: "Disputes", href: "/dashboard/disputes", icon: AlertTriangle },
  { label: "Withdrawals", href: "/dashboard/withdrawals", icon: CreditCard },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badgeKey: "notifications" as const },
];

const networkItems = [
  { label: "Network Feed", href: "/dashboard/network", icon: Rss },
  { label: "Contractor Map", href: "/dashboard/network/map", icon: MapPin },
  { label: "Job Marketplace", href: "/dashboard/network/jobs", icon: Briefcase },
  { label: "Reputation", href: "/dashboard/network/reputation", icon: Star },
];

const aiItems = [
  { label: "AI Assistant", href: "/dashboard/ai/chat", icon: Sparkles },
  { label: "AI Calling", href: "/dashboard/ai/calling", icon: Phone },
  { label: "Contractor Finder", href: "/dashboard/ai/contractor-finder", icon: Search },
  { label: "Auto-Bid", href: "/dashboard/ai/auto-bid", icon: FileText },
  { label: "Image Search", href: "/dashboard/ai/image-search", icon: Camera },
];

export function Sidebar({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: unreadCounts } = useUnreadCounts();
  const role = (session?.user as any)?.role;
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const [branding, setBranding] = useState<{ name: string; logo: string | null } | null>(null);

  useEffect(() => {
    async function loadBranding() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.companyRef) {
            setBranding({
              name: data.user.companyRef.name,
              logo: data.user.companyRef.logo,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load branding:", err);
      }
    }
    if (session) {
      loadBranding();
    }
  }, [session]);

  const isAdmin = role === "ADMIN";
  const isAccountant = role === "ACCOUNTANT";
  const isContractor = role === "CONTRACTOR";
  const collapsed = sidebarCollapsed;

  const chatUnread = unreadCounts?.chat || 0;
  const emailUnread = unreadCounts?.email || 0;
  const notifUnread = unreadCounts?.notifications || 0;

  const visibleNavItems = navItems.filter((item) => {
    if (isContractor) {
      if (["/dashboard/vendors", "/dashboard/logistics", "/dashboard/accounting", "/dashboard/performance", "/dashboard/sms-chat"].includes(item.href)) return false;
    }
    if (item.href === "/dashboard/accounting" && !isAdmin && !isAccountant) return false;
    return true;
  });

  if (role === "SUPER_ADMIN") {
    visibleNavItems.unshift({
      label: "Super Admin",
      href: "/dashboard/super-admin",
      icon: Shield,
    });
  }

  if (isAdmin || role === "SUPER_ADMIN" || isAccountant) {
    visibleNavItems.push({
      label: "Profit & Loss",
      href: "/dashboard/admin/reports/profit-loss",
      icon: BarChart3,
    });
  }

  if (isAdmin || role === "SUPER_ADMIN") {
    visibleNavItems.push({
      label: "Company Settings",
      href: "/dashboard/admin/company-settings",
      icon: Settings,
    });
  }

  const visibleNetworkItems = networkItems.filter((item) => {
    if (isContractor && item.href === "/dashboard/network/map") return false;
    return true;
  });

  const showAI = !isContractor;

  return (
    <aside
      className={cn(
        "flex flex-col bg-background border-r border-border-subtle h-screen sticky top-0 transition-all duration-300 z-50 relative",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Subtle gradient overlay on sidebar */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />

      {/* Brand Logo Section */}
      <div className={cn(
        "h-16 flex items-center px-4 border-b border-border-subtle relative z-10",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
              {branding?.logo ? (
                <img src={branding.logo} alt={branding.name} className="h-9 w-9 rounded-xl object-contain" />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 group-hover:scale-105 transition-all flex-shrink-0">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="text-[13px] font-bold text-text-primary tracking-tight truncate">
                {branding?.name || "PropPreserve"}
              </span>
            </Link>
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-cyan-400 transition-all group/toggle flex-shrink-0"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="h-4.5 w-4.5 group-hover/toggle:scale-110 transition-transform" />
            </button>
          </>
        ) : (
          <button 
            onClick={toggleSidebar}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/8 border border-cyan-500/25 flex items-center justify-center text-cyan-400 hover:scale-110 transition-all shadow-lg shadow-cyan-500/10 flex-shrink-0"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Content */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-none hover:scrollbar-thin scrollbar-thumb-white/[0.1] scrollbar-track-transparent relative z-10">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const badgeCount = item.badgeKey === "chat" ? chatUnread : item.badgeKey === "email" ? emailUnread : item.badgeKey === "notifications" ? notifUnread : 0;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 group relative",
                collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2.5",
                isActive 
                  ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/5 text-text-primary shadow-sm border border-cyan-500/15" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent"
              )}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] transition-all duration-200 group-hover:scale-110",
                isActive ? "text-cyan-400" : "text-text-muted"
              )} />
              {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-r-full shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
              )}
              
              {badgeCount > 0 && (
                <div className={cn(
                  "flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold rounded-full border-2 border-background shadow-lg shadow-rose-500/20",
                  collapsed ? "absolute -top-1 -right-1 h-4 w-4 text-[9px]" : "ml-auto h-5 min-w-[20px] px-1 text-[10px]"
                )}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </div>
              )}
            </Link>
          );
        })}

        {/* Network Section */}
        {visibleNetworkItems.length > 0 && (
          <div className="pt-6 pb-2">
            {!collapsed && (
              <div className="flex items-center gap-2 px-4 mb-1">
                <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-[0.2em]">Network</p>
                <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/20 to-transparent" />
              </div>
            )}
            {collapsed && <div className="h-px bg-emerald-500/15 mx-4" />}
          </div>
        )}

        {visibleNetworkItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard/network" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 group relative",
                collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-400 border border-emerald-500/15"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent"
              )}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px]",
                isActive ? "text-emerald-400" : "text-text-muted group-hover:text-emerald-500/70"
              )} />
              {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-r-full shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
              )}
            </Link>
          );
        })}

        {/* AI Section */}
        {showAI && (
          <div className="pt-6 pb-2">
            {!collapsed && (
              <div className="flex items-center gap-2 px-4 mb-1">
                <div className="h-px flex-1 bg-gradient-to-r from-purple-500/20 to-transparent" />
                <p className="text-[10px] font-bold text-purple-500/60 uppercase tracking-[0.2em]">AI Intelligence</p>
                <div className="h-px flex-1 bg-gradient-to-l from-purple-500/20 to-transparent" />
              </div>
            )}
            {collapsed && <div className="h-px bg-purple-500/15 mx-4" />}
          </div>
        )}

        {showAI && aiItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 group relative",
                collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2.5",
                isActive 
                  ? "bg-gradient-to-r from-purple-500/10 to-pink-500/5 text-purple-400 border border-purple-500/15" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent"
              )}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px]",
                isActive ? "text-purple-400" : "text-text-muted group-hover:text-purple-500/70"
              )} />
              {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-gradient-to-b from-purple-400 to-pink-500 rounded-r-full shadow-[0_0_12px_rgba(167,139,250,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings Footer */}
      <div className="p-3 mt-auto border-t border-border-subtle relative z-10">
        <Link
          href="/dashboard/settings"
          onClick={onItemClick}
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 group",
            collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2.5",
            pathname === "/dashboard/settings" 
              ? "bg-surface-hover text-text-primary border border-border-subtle" 
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent"
          )}
        >
          <Settings className="h-[18px] w-[18px] transition-transform group-hover:rotate-90 duration-500" />
          {!collapsed && <span className="text-[13px] font-medium">Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
