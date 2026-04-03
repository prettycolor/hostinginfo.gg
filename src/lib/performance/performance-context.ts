import { createContext, useContext } from "react";
import {
  type PerformanceMetrics,
  type BrowserInfo,
} from "./performance-monitor";

export interface PerformanceContextValue {
  metrics: PerformanceMetrics;
  browser: BrowserInfo;
  isLowPerformanceMode: boolean;
  deviceTier: "high" | "medium" | "low";
  enableLowPerformanceMode: () => void;
  disableLowPerformanceMode: () => void;
  togglePerformanceMode: () => void;
}

const PerformanceContext = createContext<PerformanceContextValue | undefined>(
  undefined,
);
export { PerformanceContext };
export type { PerformanceMetrics, BrowserInfo };

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error("usePerformance must be used within PerformanceProvider");
  }
  return context;
}

/**
 * Hook to conditionally disable animations based on performance
 */
export function useAnimations() {
  const { isLowPerformanceMode } = usePerformance();
  return {
    shouldAnimate: !isLowPerformanceMode,
    animationDuration: isLowPerformanceMode ? 0 : undefined,
    transition: isLowPerformanceMode ? "none" : undefined,
  };
}

/**
 * Hook to get optimized values based on device tier
 */
export function useOptimizedValues<T>(values: {
  high: T;
  medium: T;
  low: T;
}): T {
  const { deviceTier } = usePerformance();
  return values[deviceTier];
}
