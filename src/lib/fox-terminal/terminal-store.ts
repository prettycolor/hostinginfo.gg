import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TerminalStore {
  isOpen: boolean;
  commandHistory: string[];
  openTerminal: () => void;
  closeTerminal: () => void;
  toggleTerminal: () => void;
  addToHistory: (command: string) => void;
  clearHistory: () => void;
}

export const useTerminalStore = create<TerminalStore>()(  persist(
    (set) => ({
      isOpen: false,
      commandHistory: [],
      openTerminal: () => set({ isOpen: true }),
      closeTerminal: () => set({ isOpen: false }),
      toggleTerminal: () => set((state) => ({ isOpen: !state.isOpen })),
      addToHistory: (command) =>
        set((state) => ({
          commandHistory: [...state.commandHistory, command].slice(-50), // Keep last 50
        })),
      clearHistory: () => set({ commandHistory: [] }),
    }),
    {
      name: 'fox-terminal-storage',
      partialize: (state) => ({ commandHistory: state.commandHistory }),
    }
  )
);
