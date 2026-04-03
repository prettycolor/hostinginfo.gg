/**
 * Performance detection utilities
 * Detects device capabilities and adjusts app behavior accordingly
 */

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

/**
 * Detects if the browser has GPU acceleration enabled
 */
export function hasGPUAcceleration(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * Detects if the device is low-end based on multiple factors
 */
export function isLowEndDevice(): boolean {
  if (typeof window === "undefined") return false;

  // Check device memory (Chrome only)
  const deviceMemory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
  if (deviceMemory && deviceMemory < 4) return true;

  // Check CPU cores
  const cores = navigator.hardwareConcurrency || 4;
  if (cores < 4) return true;

  // Check if mobile with no GPU
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  if (isMobile && !hasGPUAcceleration()) return true;

  return false;
}

/**
 * Detects if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mediaQuery.matches;
}

/**
 * Gets recommended animation duration based on device capabilities
 */
export function getAnimationDuration(): number {
  if (prefersReducedMotion()) return 0;
  if (isLowEndDevice()) return 100; // Shorter animations on low-end
  return 200; // Standard duration
}

/**
 * Checks if CSS property is supported
 */
export function supportsCSS(property: string, value: string): boolean {
  if (typeof CSS === "undefined" || !CSS.supports) return false;
  return CSS.supports(property, value);
}

/**
 * Gets optimal shadow configuration based on device
 */
export function getOptimalShadow(): string {
  if (isLowEndDevice()) {
    // Simple shadow for low-end devices
    return "0 1px 2px rgba(0, 0, 0, 0.05)";
  }
  // Full shadow for capable devices
  return "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)";
}

/**
 * Applies performance class to document based on capabilities
 */
export function applyPerformanceClass(): void {
  if (typeof document === "undefined") return;

  const classes: string[] = [];

  if (!hasGPUAcceleration()) {
    classes.push("no-gpu");
  }

  if (isLowEndDevice()) {
    classes.push("low-end");
  }

  if (prefersReducedMotion()) {
    classes.push("reduced-motion");
  }

  if (classes.length > 0) {
    document.documentElement.classList.add(...classes);
  }
}
