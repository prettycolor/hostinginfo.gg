import { createContext, useContext } from "react";

export interface UnlockNotification {
  id: string;
  type: "achievement" | "item" | "levelup" | "xp" | "vehicle";
  title: string;
  description: string;
  icon?: string; // URL to image
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  xpReward?: number;
  imageUrl?: string;
  timestamp: number;
}

export interface UnlockNotificationContextType {
  addNotification: (
    notification: Omit<UnlockNotification, "id" | "timestamp">,
  ) => void;
  notifications: UnlockNotification[];
}

const UnlockNotificationContext = createContext<
  UnlockNotificationContextType | undefined
>(undefined);
export { UnlockNotificationContext };

export const useUnlockNotifications = () => {
  const context = useContext(UnlockNotificationContext);
  if (!context) {
    throw new Error(
      "useUnlockNotifications must be used within UnlockNotificationProvider",
    );
  }
  return context;
};
