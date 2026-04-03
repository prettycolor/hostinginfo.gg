import { Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Achievement {
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  xpReward: number;
}

const rarityColors = {
  common: {
    bg: "bg-gray-500",
    text: "text-gray-700",
    border: "border-gray-300",
  },
  uncommon: {
    bg: "bg-green-500",
    text: "text-green-700",
    border: "border-green-300",
  },
  rare: { bg: "bg-blue-500", text: "text-blue-700", border: "border-blue-300" },
  epic: {
    bg: "bg-purple-500",
    text: "text-purple-700",
    border: "border-purple-300",
  },
  legendary: {
    bg: "bg-amber-500",
    text: "text-amber-700",
    border: "border-amber-300",
  },
};

export function showAchievementToast(achievement: Achievement) {
  const colors = rarityColors[achievement.rarity];

  toast.custom(
    () => (
      <div
        className={`flex items-center gap-3 p-4 rounded-lg bg-card border-2 ${colors.border} shadow-lg animate-in slide-in-from-top-5 duration-500`}
      >
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-full ${colors.bg}/20`}
        >
          <span className="text-3xl">{achievement.icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-sm">Achievement Unlocked!</h4>
          </div>
          <p className="font-semibold text-sm">{achievement.title}</p>
          <p className="text-xs text-muted-foreground">
            {achievement.description}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs font-semibold text-primary">
              +{achievement.xpReward} XP
            </span>
          </div>
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: "top-center",
    },
  );
}

export function showLevelUpToast(newLevel: number, levelTitle: string) {
  toast.custom(
    () => (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-2 border-primary shadow-lg animate-in slide-in-from-top-5 duration-500">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/30 border-2 border-primary">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-lg">Level Up!</h4>
          <p className="font-semibold text-sm">You reached Level {newLevel}</p>
          <p className="text-xs text-muted-foreground">{levelTitle}</p>
        </div>
      </div>
    ),
    {
      duration: 6000,
      position: "top-center",
    },
  );
}

export function showXpToast(xpAmount: number, source: string) {
  toast.success(
    <div className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-primary" />
      <span className="font-semibold">+{xpAmount} XP</span>
      <span className="text-xs text-muted-foreground">from {source}</span>
    </div>,
    {
      duration: 3000,
      position: "bottom-right",
    },
  );
}
