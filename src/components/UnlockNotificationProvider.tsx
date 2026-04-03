import { useState, useCallback, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { ToastNotificationDiscord } from "./ui/toast-notification-discord";
import { isLevelingEnabled } from "@/config/features";
import {
  UnlockNotificationContext,
  type UnlockNotification,
} from "@/components/UnlockNotificationSystem";

// Convert UnlockNotification to Discord toast format
function convertToDiscordToast(notification: UnlockNotification) {
  const { type, title, description, xpReward } = notification;

  // Map unlock notification types to Discord toast types
  let toastType:
    | "xp"
    | "levelup"
    | "achievement"
    | "success"
    | "error"
    | "info"
    | "warning";

  switch (type) {
    case "xp":
      toastType = "xp";
      break;
    case "levelup":
      toastType = "levelup";
      break;
    case "achievement":
      toastType = "achievement";
      break;
    case "item":
    case "vehicle":
      toastType = "achievement"; // Use achievement style for items/vehicles
      break;
    default:
      toastType = "info";
  }

  return {
    id: notification.id,
    type: toastType,
    title,
    description,
    xpAmount: xpReward,
    duration: type === "levelup" ? 8000 : type === "achievement" ? 6000 : 5000,
  };
}

interface UnlockNotificationProviderProps {
  children: ReactNode;
}

export function UnlockNotificationProvider({
  children,
}: UnlockNotificationProviderProps) {
  const [notifications, setNotifications] = useState<UnlockNotification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<UnlockNotification, "id" | "timestamp">) => {
      // Check if leveling system is enabled
      if (!isLevelingEnabled()) {
        console.log(
          "[Leveling System] Feature disabled - notification not shown:",
          notification.title,
        );
        return;
      }

      const newNotification: UnlockNotification = {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };

      setNotifications((prev) => {
        // Keep max 5 notifications visible
        const updated = [...prev, newNotification];
        return updated.slice(-5);
      });
    },
    [],
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <UnlockNotificationContext.Provider
      value={{ addNotification, notifications }}
    >
      {children}

      {/* Discord-style Notification Container - Only render if leveling is enabled */}
      {isLevelingEnabled() && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification) => {
              const discordToast = convertToDiscordToast(notification);
              return (
                <div key={notification.id} className="pointer-events-auto">
                  <ToastNotificationDiscord
                    {...discordToast}
                    onDismiss={() => dismissNotification(notification.id)}
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </UnlockNotificationContext.Provider>
  );
}
