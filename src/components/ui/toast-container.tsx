import { AnimatePresence } from 'motion/react';
import { ToastNotificationDiscord } from './toast-notification-discord';

interface Toast {
  id: string;
  type: 'xp' | 'levelup' | 'achievement' | 'success' | 'error' | 'info';
  title: string;
  description: string;
  icon?: string;
  xpAmount?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastNotificationDiscord
              {...toast}
              onDismiss={() => onDismiss(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
