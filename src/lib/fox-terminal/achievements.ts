import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface AchievementsStore {
  achievements: Record<string, Achievement>;
  unlockAchievement: (id: string) => void;
  getUnlockedCount: () => number;
  getTotalCount: () => number;
  isAllUnlocked: () => boolean;
}

const defaultAchievements: Record<string, Omit<Achievement, 'unlocked'>> = {
  // Coffee achievements
  'brew': { id: 'brew', name: 'Barista', description: 'Brewed your first coffee', icon: '☕' },
  'roast': { id: 'roast', name: 'Roaster', description: 'Roasted coffee beans', icon: '🔥' },
  'espresso': { id: 'espresso', name: 'Caffeine Rush', description: 'Made an espresso shot', icon: '⚡' },
  
  // Fox achievements
  'pet': { id: 'pet', name: 'Fox Friend', description: 'Pet the fox', icon: '🦊' },
  'dance': { id: 'dance', name: 'Dance Party', description: 'Made the fox dance', icon: '🕺' },
  'howl': { id: 'howl', name: 'Call of the Wild', description: 'Heard the fox howl', icon: '🌙' },
  
  // Hacker achievements
  'hack': { id: 'hack', name: 'Hacker', description: 'Attempted to hack', icon: '💻' },
  'matrix': { id: 'matrix', name: 'Neo', description: 'Entered the Matrix', icon: '💊' },
  'sudo': { id: 'sudo', name: 'Root Access', description: 'Used sudo command', icon: '🔐' },
  
  // Gaming achievements
  'konami': { id: 'konami', name: 'Konami Master', description: 'Entered the Konami code', icon: '🎮' },
  'ff7': { id: 'ff7', name: 'SOLDIER', description: 'Found Final Fantasy reference', icon: '⚔️' },
  'mario': { id: 'mario', name: 'Plumber', description: 'Found Mario reference', icon: '🍄' },
  'sonic': { id: 'sonic', name: 'Gotta Go Fast', description: 'Found Sonic reference', icon: '💨' },
  'crash': { id: 'crash', name: 'Bandicoot', description: 'Found Crash reference', icon: '🦊' },
  
  // Secret achievements
  'secret': { id: 'secret', name: 'Treasure Hunter', description: 'Found the secret', icon: '🎁' },
  'nyan': { id: 'nyan', name: 'Rainbow Rider', description: 'Summoned Nyan Cat', icon: '🌈' },
  'doge': { id: 'doge', name: 'Much Wow', description: 'Found Doge', icon: '🐕' },
  'rickroll': { id: 'rickroll', name: 'Never Gonna Give You Up', description: 'Got rickrolled', icon: '🎵' },
  
  // Master achievement
  'master': { id: 'master', name: 'Terminal Master', description: 'Unlocked all achievements', icon: '🏆' },
};

export const useAchievements = create<AchievementsStore>()(  persist(
    (set, get) => ({
      achievements: Object.fromEntries(
        Object.entries(defaultAchievements).map(([key, value]) => [
          key,
          { ...value, unlocked: false },
        ])
      ),
      unlockAchievement: (id) =>
        set((state) => {
          if (state.achievements[id]?.unlocked) return state;
          
          const newAchievements = {
            ...state.achievements,
            [id]: {
              ...state.achievements[id],
              unlocked: true,
              unlockedAt: new Date(),
            },
          };
          
          // Check if all achievements are unlocked
          const allUnlocked = Object.values(newAchievements)
            .filter(a => a.id !== 'master')
            .every(a => a.unlocked);
          
          if (allUnlocked && !newAchievements['master'].unlocked) {
            newAchievements['master'] = {
              ...newAchievements['master'],
              unlocked: true,
              unlockedAt: new Date(),
            };
          }
          
          return { achievements: newAchievements };
        }),
      getUnlockedCount: () => {
        const state = get();
        return Object.values(state.achievements).filter(a => a.unlocked).length;
      },
      getTotalCount: () => {
        const state = get();
        return Object.keys(state.achievements).length;
      },
      isAllUnlocked: () => {
        const state = get();
        return Object.values(state.achievements).every(a => a.unlocked);
      },
    }),
    {
      name: 'fox-terminal-achievements',
    }
  )
);
