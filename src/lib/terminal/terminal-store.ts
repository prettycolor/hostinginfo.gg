import { create } from 'zustand';

/**
 * Terminal Store - Simple state management for terminal visibility
 */
interface TerminalStore {
  isOpen: boolean;
  openTerminal: () => void;
  closeTerminal: () => void;
  toggleTerminal: () => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  isOpen: false,
  openTerminal: () => set({ isOpen: true }),
  closeTerminal: () => set({ isOpen: false }),
  toggleTerminal: () => set((state) => ({ isOpen: !state.isOpen })),
}));
