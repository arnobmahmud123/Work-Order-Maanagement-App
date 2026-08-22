"use client";

import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  sidebarHidden: boolean;
  setSidebarHidden: (hidden: boolean) => void;
  topNavHidden: boolean;
  setTopNavHidden: (hidden: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  sidebarHidden: false,
  setSidebarHidden: (hidden) => set({ sidebarHidden: hidden }),
  topNavHidden: false,
  setTopNavHidden: (hidden) => set({ topNavHidden: hidden }),
}));
