import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SoundEffectsStore {
  enabled: boolean;
  volume: number;
  toggleSound: () => void;
  setVolume: (volume: number) => void;
  playSound: (sound: string) => void;
}

// Sound effect URLs (using Web Audio API beeps for now)
const sounds: Record<string, () => void> = {
  type: () => playBeep(800, 0.05, 0.1),
  open: () => playBeep(600, 0.1, 0.2),
  close: () => playBeep(400, 0.1, 0.2),
  achievement: () => {
    playBeep(523, 0.1, 0.1);
    setTimeout(() => playBeep(659, 0.1, 0.1), 100);
    setTimeout(() => playBeep(784, 0.1, 0.2), 200);
  },
  error: () => playBeep(200, 0.2, 0.3),
};

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function playBeep(frequency: number, volume: number, duration: number) {
  try {
    const audioContextConstructor =
      window.AudioContext ||
      (window as WindowWithWebkitAudioContext).webkitAudioContext;
    if (!audioContextConstructor) {
      return;
    }

    const audioContext = new audioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Silent fail if Web Audio API is not supported
    console.warn("Web Audio API not supported");
  }
}

export const useSoundEffects = create<SoundEffectsStore>()(
  persist(
    (set, get) => ({
      enabled: true,
      volume: 0.5,
      toggleSound: () => set((state) => ({ enabled: !state.enabled })),
      setVolume: (volume) => set({ volume }),
      playSound: (sound) => {
        const state = get();
        if (state.enabled && sounds[sound]) {
          sounds[sound]();
        }
      },
    }),
    {
      name: "fox-terminal-sound",
    },
  ),
);
