"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUnreadCounts } from "@/hooks/use-data";
import {
  LayoutDashboard,
  ClipboardList,
  Camera,
  MessageSquare,
  Settings,
} from "lucide-react";

const bottomNavItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/dashboard/work-orders", icon: ClipboardList },
  { label: "Camera", href: "/dashboard/camera", icon: Camera },
  { label: "SMS", href: "/dashboard/sms-chat", icon: MessageSquare, badgeKey: "chat" as const },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: unreadCounts } = useUnreadCounts();

  const chatUnread = unreadCounts?.chat || 0;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[60] md:hidden bg-background/80 backdrop-blur-xl border-t border-border-subtle flex items-center justify-around px-2 py-2.5 pb-[env(safe-area-inset-bottom,12px)] shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
      {bottomNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const badgeCount = item.badgeKey === "chat" ? chatUnread : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl relative transition-all duration-300 active:scale-95",
              isActive ? "text-cyan-400" : "text-text-muted"
            )}
          >
            {/* Active Indicator Dot Glow */}
            {isActive && (
              <span className="absolute -top-1 w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}

            <item.icon className={cn(
              "h-5 w-5 transition-transform duration-200",
              isActive ? "scale-110" : "hover:text-text-primary"
            )} />
            
            <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>

            {/* Notification Badge */}
            {badgeCount > 0 && (
              <span className="absolute top-0 right-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-[8px] font-bold text-white shadow-md shadow-rose-500/20">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
