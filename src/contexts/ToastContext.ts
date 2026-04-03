import { createContext, useContext } from "react";

export interface Toast {
  id: string;
  type: "xp" | "levelup" | "achievement" | "success" | "error" | "info";
  title: string;
  description: string;
  icon?: string;
  xpAmount?: number;
  duration?: number; // milliseconds, default 5000
}

export interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
export { ToastContext };

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
