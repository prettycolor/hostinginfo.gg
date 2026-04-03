import { useEffect, useState } from "react";

/**
 * Detects if GPU acceleration is available and enabled
 * Uses multiple detection methods for accuracy
 *
 * @returns object with GPU detection results
 *
 * Usage:
 * ```tsx
 * const { hasGPU, isLowEnd } = useGPUDetection();
 *
 * return (
 *   <div className={hasGPU ? 'gpu-animations' : 'cpu-animations'}>
 *     Content
 *   </div>
 * );
 * ```
 */

interface GPUDetection {
  hasGPU: boolean;
  isLowEnd: boolean;
  canUseTransforms: boolean;
  canUseFilters: boolean;
}

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

export function useGPUDetection(): GPUDetection {
  const [detection, setDetection] = useState<GPUDetection>({
    hasGPU: true, // Assume GPU by default
    isLowEnd: false,
    canUseTransforms: true,
    canUseFilters: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Method 1: Check for WebGL support (indicates GPU)
    const hasWebGL = (() => {
      try {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        return !!gl;
      } catch {
        return false;
      }
    })();

    // Method 2: Check CSS support for GPU-accelerated properties
    const canUseTransforms = CSS.supports("transform", "translateZ(0)");
    const canUseFilters = CSS.supports("backdrop-filter", "blur(10px)");

    // Method 3: Check device memory (if available)
    const deviceMemory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
    const isLowEnd = deviceMemory ? deviceMemory < 4 : false;

    // Method 4: Check hardware concurrency (CPU cores)
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isLowEndCPU = hardwareConcurrency < 4;

    // Method 5: Check if running on mobile
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    // Combine all checks
    const hasGPU = hasWebGL && canUseTransforms;
    const finalIsLowEnd = isLowEnd || isLowEndCPU || (isMobile && !hasWebGL);

    setDetection({
      hasGPU,
      isLowEnd: finalIsLowEnd,
      canUseTransforms,
      canUseFilters,
    });
  }, []);

  return detection;
}
