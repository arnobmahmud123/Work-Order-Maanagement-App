import { create } from "zustand";

interface CallState {
  activeNumber: string | null;
  workOrderId?: string;
  contractorId?: string;
  isDialing: boolean;
  startCall: (phone: string, context?: { workOrderId?: string, contractorId?: string }) => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeNumber: null,
  isDialing: false,
  startCall: (phone, context) => set({ activeNumber: phone, isDialing: true, ...context }),
  endCall: () => set({ activeNumber: null, isDialing: false, workOrderId: undefined, contractorId: undefined }),
}));
