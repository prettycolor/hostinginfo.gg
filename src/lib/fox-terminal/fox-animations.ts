import { create } from 'zustand';

type AnimationType = 'idle' | 'dance' | 'spin' | 'shake' | 'howl';

interface FoxAnimationsStore {
  currentAnimation: AnimationType;
  setAnimation: (animation: AnimationType) => void;
}

export const useFoxAnimations = create<FoxAnimationsStore>((set) => ({
  currentAnimation: 'idle',
  setAnimation: (animation) => set({ currentAnimation: animation }),
}));
