"use client";

import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  topNavHidden: boolean;
  setTopNavHidden: (hidden: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  topNavHidden: false,
  setTopNavHidden: (hidden) => set({ topNavHidden: hidden }),
}));
