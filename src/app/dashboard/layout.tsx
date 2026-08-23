"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AIChat } from "@/components/ai-chat";
import { SyncManager } from "@/components/sync-manager";
import { SoftphoneDialer } from "@/components/calls/softphone-dialer";
import { GlobalIncomingCallManager } from "@/components/chat/incoming-call-modal";
import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sidebarCollapsed, sidebarHidden } = useAppStore();

  return (
    <div className="flex min-h-screen bg-background text-text-primary" data-dashboard>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        data-sidebar="mobile"
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-72 bg-background transform transition-transform duration-300 ease-in-out lg:hidden border-r border-border-subtle pt-[env(safe-area-inset-top,0px)]",
          sidebarOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full"
        )}
      >
        <Sidebar onItemClick={() => setSidebarOpen(false)} />
      </div>

      {/* Desktop Sidebar */}
      <div
        data-sidebar="desktop"
        className={cn(
          "hidden lg:block transition-all duration-300 ease-in-out flex-shrink-0 z-50",
          sidebarHidden ? "w-0 overflow-hidden opacity-0" : sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden">
        {/* Advanced Background Elements - Multi-layered */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
          
          {/* Dynamic Light Orbs - More Vibrant */}
          <div className="absolute top-[-25%] left-[-15%] w-[65%] h-[55%] rounded-full bg-cyan-500/[0.07] blur-[120px] animate-glow" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full bg-purple-600/[0.06] blur-[120px] animate-glow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-[40%] left-[60%] w-[35%] h-[35%] rounded-full bg-pink-500/[0.04] blur-[100px] animate-glow" style={{ animationDelay: '3s' }} />
          
          {/* Edge Glows */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent opacity-60" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/15 to-transparent opacity-40" />
          
          {/* Corner Accent Glow */}
          <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-gradient-to-br from-cyan-500/[0.04] to-transparent rounded-full blur-[60px]" />
          <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-gradient-to-tl from-purple-500/[0.04] to-transparent rounded-full blur-[60px]" />
        </div>

        {/* Top Header */}
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Content Container - Optimized bottom padding for mobile bottom bar */}
        <main className="flex-1 overflow-y-auto p-3 pb-28 md:pb-4 lg:p-8 relative z-10 scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent">
          <div className="max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Floating AI Chat Overlay */}
      <div className="hidden md:block">
        <AIChat context={{ type: "general" }} />
      </div>

      {/* Sync Manager */}
      <SyncManager />
      <SoftphoneDialer />
      <GlobalIncomingCallManager />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
