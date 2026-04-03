import { useEffect, useState, type ReactNode } from "react";
import {
  PerformanceContext,
  type BrowserInfo,
  type PerformanceMetrics,
} from "./performance-context";
import { performanceMonitor } from "./performance-monitor";

interface PerformanceProviderProps {
  children: ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    cpuLoad: 0,
    isLowPerformance: false,
    hasHardwareAcceleration: true,
    deviceTier: "high",
  });

  const [browser] = useState<BrowserInfo>(() =>
    performanceMonitor.detectBrowser(),
  );
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  // Determine if low performance mode should be enabled
  const isLowPerformanceMode =
    manualOverride !== null ? manualOverride : metrics.isLowPerformance;

  useEffect(() => {
    // Log browser info on mount
    performanceMonitor.logInfo();

    // Start monitoring
    performanceMonitor.startMonitoring();

    // Subscribe to performance updates
    const unsubscribe = performanceMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);

      // Auto-enable low performance mode if device is struggling
      if (newMetrics.isLowPerformance && manualOverride === null) {
        console.warn("[PerformanceMode] Auto-enabling low performance mode");
        console.log("Reason:", {
          fps: newMetrics.fps,
          hasHardwareAccel: newMetrics.hasHardwareAcceleration,
          deviceTier: newMetrics.deviceTier,
        });
      }
    });

    return () => {
      unsubscribe();
      performanceMonitor.stopMonitoring();
    };
  }, [manualOverride]);

  const enableLowPerformanceMode = () => {
    setManualOverride(true);
    console.log("[PerformanceMode] Manually enabled low performance mode");
  };

  const disableLowPerformanceMode = () => {
    setManualOverride(false);
    console.log("[PerformanceMode] Manually disabled low performance mode");
  };

  const togglePerformanceMode = () => {
    setManualOverride((prev) => {
      const newValue = prev === null ? !metrics.isLowPerformance : !prev;
      console.log("[PerformanceMode] Toggled to:", newValue ? "low" : "high");
      return newValue;
    });
  };

  const value = {
    metrics,
    browser,
    isLowPerformanceMode,
    deviceTier: metrics.deviceTier,
    enableLowPerformanceMode,
    disableLowPerformanceMode,
    togglePerformanceMode,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}
