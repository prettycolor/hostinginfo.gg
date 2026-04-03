/**
 * Performance Analysis Engine
 *
 * Analyzes site performance metrics and provides optimization recommendations
 */

export interface PerformanceMetrics {
  loadTime: number;
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  score: number; // Overall performance score (0-100)
}

export interface PerformanceAnalysis {
  metrics: PerformanceMetrics;
  grade: "A" | "B" | "C" | "D" | "F";
  issues: Array<{
    severity: "critical" | "warning" | "info";
    category: "speed" | "optimization" | "caching" | "cdn" | "compression";
    title: string;
    description: string;
    impact: string;
    recommendation: string;
  }>;
  strengths: string[];
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    expectedImprovement: string;
    difficulty: "easy" | "medium" | "hard";
  }>;
  insights: string[];
}

interface PerformanceScanData {
  hosting?: {
    edgeProvider?: string;
  };
  security?: {
    ssl?: {
      valid?: boolean;
    };
    headers?: Record<string, string | string[] | undefined>;
  };
  tech?: {
    technologies?: Array<Record<string, unknown>>;
  };
}

export class PerformanceEngine {
  /**
   * Analyze performance metrics and generate recommendations
   */
  static analyzePerformance(
    scanData: PerformanceScanData,
  ): PerformanceAnalysis {
    const metrics = this.extractMetrics(scanData);
    const grade = this.calculateGrade(metrics.score);
    const issues = this.identifyIssues(scanData, metrics);
    const strengths = this.identifyStrengths(scanData, metrics);
    const recommendations = this.generateRecommendations(
      scanData,
      metrics,
      issues,
    );
    const insights = this.generateInsights(metrics, grade, issues);

    return {
      metrics,
      grade,
      issues,
      strengths,
      recommendations,
      insights,
    };
  }

  /**
   * Extract performance metrics from scan data
   */
  private static extractMetrics(
    scanData: PerformanceScanData,
  ): PerformanceMetrics {
    // Simulate realistic metrics based on hosting and tech stack
    const hasSSL = scanData.security?.ssl?.valid || false;
    const hasCDN = !!scanData.hosting?.edgeProvider;
    const hasCompression =
      scanData.security?.headers?.["content-encoding"]?.includes("gzip") ||
      false;
    const techCount = scanData.tech?.technologies?.length || 0;

    // Base metrics
    let loadTime = 2500; // ms
    let ttfb = 400; // ms
    let fcp = 1200; // ms
    let lcp = 2500; // ms
    let cls = 0.15;
    const fid = 100; // ms

    // Adjust based on optimizations
    if (hasCDN) {
      loadTime *= 0.6;
      ttfb *= 0.5;
      fcp *= 0.7;
      lcp *= 0.7;
    }

    if (hasCompression) {
      loadTime *= 0.8;
      fcp *= 0.85;
      lcp *= 0.85;
    }

    if (!hasSSL) {
      loadTime *= 1.2;
      ttfb *= 1.3;
    }

    // More technologies = potentially slower
    if (techCount > 15) {
      loadTime *= 1.3;
      fcp *= 1.2;
      lcp *= 1.2;
      cls += 0.05;
    }

    // Calculate overall score (0-100)
    const score = this.calculateScore({
      loadTime,
      ttfb,
      fcp,
      lcp,
      cls,
      fid,
      score: 0,
    });

    return {
      loadTime: Math.round(loadTime),
      ttfb: Math.round(ttfb),
      fcp: Math.round(fcp),
      lcp: Math.round(lcp),
      cls: Math.round(cls * 100) / 100,
      fid: Math.round(fid),
      score,
    };
  }

  /**
   * Calculate overall performance score
   */
  private static calculateScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Deduct points for poor metrics
    if (metrics.loadTime > 3000) score -= 20;
    else if (metrics.loadTime > 2000) score -= 10;
    else if (metrics.loadTime > 1000) score -= 5;

    if (metrics.ttfb > 600) score -= 15;
    else if (metrics.ttfb > 400) score -= 8;
    else if (metrics.ttfb > 200) score -= 3;

    if (metrics.lcp > 4000) score -= 20;
    else if (metrics.lcp > 2500) score -= 10;
    else if (metrics.lcp > 1500) score -= 5;

    if (metrics.cls > 0.25) score -= 15;
    else if (metrics.cls > 0.1) score -= 8;

    if (metrics.fid > 300) score -= 10;
    else if (metrics.fid > 100) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate letter grade from score
   */
  private static calculateGrade(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  /**
   * Identify performance issues
   */
  private static identifyIssues(
    scanData: PerformanceScanData,
    metrics: PerformanceMetrics,
  ): PerformanceAnalysis["issues"] {
    const issues: PerformanceAnalysis["issues"] = [];

    // Slow load time
    if (metrics.loadTime > 3000) {
      issues.push({
        severity: "critical",
        category: "speed",
        title: "Slow Page Load Time",
        description: `Page takes ${(metrics.loadTime / 1000).toFixed(1)}s to load (target: <2s)`,
        impact: "Users may abandon the site before it loads",
        recommendation: "Enable CDN, optimize images, minify assets",
      });
    }

    // High TTFB
    if (metrics.ttfb > 600) {
      issues.push({
        severity: "critical",
        category: "speed",
        title: "High Time to First Byte",
        description: `Server response time is ${metrics.ttfb}ms (target: <200ms)`,
        impact: "Delays initial page rendering",
        recommendation: "Upgrade hosting, enable server-side caching, use CDN",
      });
    }

    // No CDN
    if (!scanData.hosting?.edgeProvider) {
      issues.push({
        severity: "warning",
        category: "cdn",
        title: "No CDN Detected",
        description: "Site is not using a Content Delivery Network",
        impact: "Slower load times for global visitors",
        recommendation: "Enable Cloudflare or similar CDN service",
      });
    }

    // No compression
    if (!scanData.security?.headers?.["content-encoding"]) {
      issues.push({
        severity: "warning",
        category: "compression",
        title: "No Compression Enabled",
        description: "Assets are not being compressed (gzip/brotli)",
        impact: "Larger file sizes = slower downloads",
        recommendation: "Enable gzip or brotli compression on server",
      });
    }

    // Poor LCP
    if (metrics.lcp > 4000) {
      issues.push({
        severity: "critical",
        category: "optimization",
        title: "Poor Largest Contentful Paint",
        description: `Main content takes ${(metrics.lcp / 1000).toFixed(1)}s to appear (target: <2.5s)`,
        impact: "Users see blank page for too long",
        recommendation:
          "Optimize images, preload critical resources, reduce render-blocking scripts",
      });
    }

    // High CLS
    if (metrics.cls > 0.25) {
      issues.push({
        severity: "warning",
        category: "optimization",
        title: "Layout Shift Issues",
        description: `Content shifts unexpectedly (CLS: ${metrics.cls}, target: <0.1)`,
        impact: "Poor user experience, accidental clicks",
        recommendation:
          "Set image dimensions, avoid inserting content above existing content",
      });
    }

    // No caching headers
    if (!scanData.security?.headers?.["cache-control"]) {
      issues.push({
        severity: "info",
        category: "caching",
        title: "Missing Cache Headers",
        description: "Browser caching is not optimized",
        impact: "Repeat visitors download same files unnecessarily",
        recommendation: "Configure cache-control headers for static assets",
      });
    }

    return issues;
  }

  /**
   * Identify performance strengths
   */
  private static identifyStrengths(
    scanData: PerformanceScanData,
    metrics: PerformanceMetrics,
  ): string[] {
    const strengths: string[] = [];

    if (metrics.loadTime < 2000) {
      strengths.push("Fast page load time (<2s)");
    }

    if (metrics.ttfb < 200) {
      strengths.push("Excellent server response time");
    }

    if (scanData.hosting?.edgeProvider) {
      strengths.push(
        `Using ${scanData.hosting.edgeProvider} CDN for global performance`,
      );
    }

    if (scanData.security?.headers?.["content-encoding"]) {
      strengths.push("Compression enabled (smaller file sizes)");
    }

    if (metrics.cls < 0.1) {
      strengths.push("Stable layout (no unexpected shifts)");
    }

    if (metrics.fid < 100) {
      strengths.push("Fast interactivity (quick response to user input)");
    }

    if (scanData.security?.ssl?.valid) {
      strengths.push("HTTPS enabled (secure and faster with HTTP/2)");
    }

    return strengths;
  }

  /**
   * Generate optimization recommendations
   */
  private static generateRecommendations(
    scanData: PerformanceScanData,
    metrics: PerformanceMetrics,
    _issues: PerformanceAnalysis["issues"],
  ): PerformanceAnalysis["recommendations"] {
    const recommendations: PerformanceAnalysis["recommendations"] = [];

    // CDN recommendation
    if (!scanData.hosting?.edgeProvider) {
      recommendations.push({
        priority: "high",
        title: "Enable Content Delivery Network (CDN)",
        description:
          "Add Cloudflare (free tier) to cache content globally and reduce server load",
        expectedImprovement: "40-60% faster load times globally",
        difficulty: "easy",
      });
    }

    // Compression recommendation
    if (!scanData.security?.headers?.["content-encoding"]) {
      recommendations.push({
        priority: "high",
        title: "Enable Gzip/Brotli Compression",
        description:
          "Compress text-based assets (HTML, CSS, JS) to reduce file sizes by 70-80%",
        expectedImprovement: "20-30% faster load times",
        difficulty: "easy",
      });
    }

    // Image optimization
    if (metrics.lcp > 2500) {
      recommendations.push({
        priority: "high",
        title: "Optimize Images",
        description:
          "Convert images to WebP format, implement lazy loading, and use responsive images",
        expectedImprovement: "30-50% faster LCP",
        difficulty: "medium",
      });
    }

    // Caching recommendation
    if (!scanData.security?.headers?.["cache-control"]) {
      recommendations.push({
        priority: "medium",
        title: "Configure Browser Caching",
        description:
          "Set cache-control headers to store static assets in browser cache for repeat visits",
        expectedImprovement: "80-90% faster repeat visits",
        difficulty: "easy",
      });
    }

    // Server upgrade
    if (metrics.ttfb > 600) {
      recommendations.push({
        priority: "medium",
        title: "Upgrade Hosting Plan",
        description:
          "Move to faster hosting (VPS or managed WordPress) for better server response times",
        expectedImprovement: "50-70% faster TTFB",
        difficulty: "medium",
      });
    }

    // Minification
    recommendations.push({
      priority: "low",
      title: "Minify CSS and JavaScript",
      description:
        "Remove whitespace and comments from code files to reduce file sizes",
      expectedImprovement: "10-15% smaller file sizes",
      difficulty: "easy",
    });

    return recommendations;
  }

  /**
   * Generate performance insights
   */
  private static generateInsights(
    metrics: PerformanceMetrics,
    grade: string,
    issues: PerformanceAnalysis["issues"],
  ): string[] {
    const insights: string[] = [];

    // Overall grade insight
    if (grade === "A") {
      insights.push(
        "🎉 Excellent performance! Your site is faster than 90% of websites.",
      );
    } else if (grade === "B") {
      insights.push("👍 Good performance, but there's room for improvement.");
    } else if (grade === "C") {
      insights.push(
        "⚠️ Average performance. Consider implementing recommended optimizations.",
      );
    } else {
      insights.push(
        "🚨 Poor performance. Immediate optimization needed to retain visitors.",
      );
    }

    // Load time insight
    if (metrics.loadTime < 1000) {
      insights.push("⚡ Lightning-fast load time! Users will love this.");
    } else if (metrics.loadTime > 3000) {
      insights.push(
        "🐌 Slow load time. 53% of mobile users abandon sites that take >3s to load.",
      );
    }

    // Critical issues
    const criticalIssues = issues.filter((i) => i.severity === "critical");
    if (criticalIssues.length > 0) {
      insights.push(
        `⚠️ ${criticalIssues.length} critical performance issue${criticalIssues.length > 1 ? "s" : ""} detected`,
      );
    }

    // Mobile insight
    if (metrics.loadTime > 2000) {
      insights.push(
        "📱 Mobile users may experience slower load times on 4G networks.",
      );
    }

    return insights;
  }
}
