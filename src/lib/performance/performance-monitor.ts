/**
 * Performance Monitor - Cross-Browser Performance Detection
 * Automatically detects struggling devices and enables low-performance mode
 */

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  cpuLoad: number;
  isLowPerformance: boolean;
  hasHardwareAcceleration: boolean;
  deviceTier: "high" | "medium" | "low";
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  os: string;
  isMobile: boolean;
  supportsWebGL: boolean;
  supportsWebGL2: boolean;
}

interface PerformanceMemoryStats {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemoryStats;
}

class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private fpsHistory: number[] = [];
  private isMonitoring = false;
  private animationFrameId: number | null = null;
  private listeners: Set<(metrics: PerformanceMetrics) => void> = new Set();

  /**
   * Detect browser information
   */
  detectBrowser(): BrowserInfo {
    try {
      const ua = navigator.userAgent;
      const platform = navigator.platform;

      // Detect browser name and version
      let name = "Unknown";
      let version = "Unknown";
      let engine = "Unknown";

      // Chrome/Chromium
      if (ua.includes("Chrome") && !ua.includes("Edg")) {
        name = "Chrome";
        const match = ua.match(/Chrome\/(\d+)/);
        version = match ? match[1] : "Unknown";
        engine = "Blink";
      }
      // Edge
      else if (ua.includes("Edg")) {
        name = "Edge";
        const match = ua.match(/Edg\/(\d+)/);
        version = match ? match[1] : "Unknown";
        engine = "Blink";
      }
      // Firefox
      else if (ua.includes("Firefox")) {
        name = "Firefox";
        const match = ua.match(/Firefox\/(\d+)/);
        version = match ? match[1] : "Unknown";
        engine = "Gecko";
      }
      // Safari
      else if (ua.includes("Safari") && !ua.includes("Chrome")) {
        name = "Safari";
        const match = ua.match(/Version\/(\d+)/);
        version = match ? match[1] : "Unknown";
        engine = "WebKit";
      }
      // Opera
      else if (ua.includes("OPR") || ua.includes("Opera")) {
        name = "Opera";
        const match = ua.match(/(?:OPR|Opera)\/(\d+)/);
        version = match ? match[1] : "Unknown";
        engine = "Blink";
      }

      // Detect OS
      let os = "Unknown";
      if (platform.includes("Win")) os = "Windows";
      else if (platform.includes("Mac")) os = "macOS";
      else if (platform.includes("Linux")) os = "Linux";
      else if (ua.includes("Android")) os = "Android";
      else if (
        ua.includes("iOS") ||
        ua.includes("iPhone") ||
        ua.includes("iPad")
      )
        os = "iOS";

      // Detect mobile
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          ua,
        );

      // Detect WebGL support (with error handling)
      let supportsWebGL = false;
      let supportsWebGL2 = false;

      try {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        const gl2 = canvas.getContext("webgl2");
        supportsWebGL = !!gl;
        supportsWebGL2 = !!gl2;
      } catch (webglError) {
        console.warn(
          "[PerformanceMonitor] WebGL detection failed:",
          webglError,
        );
      }

      return {
        name,
        version,
        engine,
        os,
        isMobile,
        supportsWebGL,
        supportsWebGL2,
      };
    } catch (error) {
      console.error("[PerformanceMonitor] Browser detection failed:", error);
      // Return safe defaults
      return {
        name: "Unknown",
        version: "Unknown",
        engine: "Unknown",
        os: "Unknown",
        isMobile: false,
        supportsWebGL: false,
        supportsWebGL2: false,
      };
    }
  }

  /**
   * Check if hardware acceleration is available
   */
  checkHardwareAcceleration(): boolean {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

      if (!gl) {
        console.warn(
          "[PerformanceMonitor] WebGL not available for hardware acceleration check",
        );
        return false;
      }

      // Use standard WebGL renderer string only.
      // Avoid WEBGL_debug_renderer_info because Firefox deprecates it.
      let renderer = "";
      try {
        renderer = String(
          (gl as WebGLRenderingContext).getParameter(
            (gl as WebGLRenderingContext).RENDERER,
          ) || "",
        );
      } catch {
        renderer = "";
      }

      if (renderer) {
        // Software renderers indicate no hardware acceleration
        if (
          renderer.includes("SwiftShader") ||
          renderer.includes("llvmpipe") ||
          renderer.includes("Software")
        ) {
          console.warn(
            "[PerformanceMonitor] Software renderer detected:",
            renderer,
          );
          return false;
        }
      }

      return true;
    } catch (e) {
      console.warn(
        "[PerformanceMonitor] Hardware acceleration check failed:",
        e,
      );
      return false;
    }
  }

  /**
   * Measure current FPS
   */
  private measureFPS = () => {
    const currentTime = performance.now();
    const delta = currentTime - this.lastTime;

    this.frameCount++;

    // Update FPS every second
    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.fpsHistory.push(this.fps);

      // Keep only last 10 seconds of history
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }

      this.frameCount = 0;
      this.lastTime = currentTime;

      // Notify listeners
      this.notifyListeners();
    }

    if (this.isMonitoring) {
      this.animationFrameId = requestAnimationFrame(this.measureFPS);
    }
  };

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    const performanceWithMemory = performance as PerformanceWithMemory;
    if ("memory" in performanceWithMemory && performanceWithMemory.memory) {
      const memory = performanceWithMemory.memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return 0;
  }

  /**
   * Estimate CPU load based on FPS stability
   */
  private estimateCPULoad(): number {
    if (this.fpsHistory.length < 3) return 0;

    const avgFPS =
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    const variance =
      this.fpsHistory.reduce((sum, fps) => sum + Math.pow(fps - avgFPS, 2), 0) /
      this.fpsHistory.length;
    const stdDev = Math.sqrt(variance);

    // High variance = unstable FPS = high CPU load
    const load = Math.min(100, (stdDev / avgFPS) * 100 + (60 - avgFPS));
    return Math.max(0, load);
  }

  /**
   * Determine device tier
   */
  private determineDeviceTier(): "high" | "medium" | "low" {
    const avgFPS =
      this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        : 60;

    const hasHardwareAccel = this.checkHardwareAcceleration();
    const browserInfo = this.detectBrowser();

    // Low tier: Low FPS, no hardware accel, or mobile
    if (
      avgFPS < 30 ||
      !hasHardwareAccel ||
      (browserInfo.isMobile && avgFPS < 45)
    ) {
      return "low";
    }

    // Medium tier: Moderate FPS or mobile with good FPS
    if (avgFPS < 50 || browserInfo.isMobile) {
      return "medium";
    }

    // High tier: Good FPS and hardware accel
    return "high";
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const avgFPS =
      this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        : this.fps;

    const memoryUsage = this.getMemoryUsage();
    const cpuLoad = this.estimateCPULoad();
    const hasHardwareAcceleration = this.checkHardwareAcceleration();
    const deviceTier = this.determineDeviceTier();
    const isLowPerformance =
      deviceTier === "low" || avgFPS < 30 || !hasHardwareAcceleration;

    return {
      fps: avgFPS,
      memoryUsage,
      cpuLoad,
      isLowPerformance,
      hasHardwareAcceleration,
      deviceTier,
    };
  }

  /**
   * Start monitoring performance
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.animationFrameId = requestAnimationFrame(this.measureFPS);

    console.log("[PerformanceMonitor] Started monitoring");
  }

  /**
   * Stop monitoring performance
   */
  stopMonitoring() {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log("[PerformanceMonitor] Stopped monitoring");
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    const metrics = this.getMetrics();
    this.listeners.forEach((callback) => callback(metrics));
  }

  /**
   * Log browser and performance info
   */
  logInfo() {
    const browser = this.detectBrowser();
    const metrics = this.getMetrics();

    console.group("[PerformanceMonitor] System Info");
    console.log("Browser:", `${browser.name} ${browser.version}`);
    console.log("Engine:", browser.engine);
    console.log("OS:", browser.os);
    console.log("Mobile:", browser.isMobile);
    console.log("WebGL:", browser.supportsWebGL);
    console.log("WebGL2:", browser.supportsWebGL2);
    console.log("Hardware Acceleration:", metrics.hasHardwareAcceleration);
    console.log("Device Tier:", metrics.deviceTier);
    console.log("FPS:", metrics.fps.toFixed(1));
    console.log("Memory Usage:", metrics.memoryUsage.toFixed(1) + "%");
    console.log("CPU Load:", metrics.cpuLoad.toFixed(1) + "%");
    console.log("Low Performance Mode:", metrics.isLowPerformance);
    console.groupEnd();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
