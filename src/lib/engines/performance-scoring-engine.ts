/**
 * Performance Scoring Engine
 *
 * Calculates comprehensive performance scores for domains based on:
 * - Security posture (SSL, headers, vulnerabilities)
 * - Technology stack quality (modern vs legacy)
 * - Hosting infrastructure (CDN, redundancy, provider reputation)
 * - Reliability indicators (uptime, response time)
 *
 * Scoring Scale: 0-100
 * - 90-100: Excellent
 * - 75-89: Good
 * - 60-74: Fair
 * - 40-59: Poor
 * - 0-39: Critical
 */

interface PerformanceScore {
  overall: number;
  security: number;
  technology: number;
  infrastructure: number;
  reliability: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  breakdown: {
    category: string;
    score: number;
    weight: number;
    factors: Array<{
      name: string;
      impact: "positive" | "negative" | "neutral";
      points: number;
      description: string;
    }>;
  }[];
  recommendations: Array<{
    priority: "critical" | "high" | "medium" | "low";
    category: string;
    issue: string;
    recommendation: string;
    potentialGain: number;
  }>;
}

type ScoreFactor = PerformanceScore["breakdown"][number]["factors"][number];

interface ScanData {
  hosting?: {
    edgeProvider?: string | null;
    originHost?: string | null;
    framework?: string | null;
    confidenceScore?: number;
  } | null;
  dns?: {
    authoritativeNameservers?: string[];
  } | null;
  ip?: {
    tlsCertData?: unknown;
    openPorts?: number[];
    httpResponses?: Record<string, string>;
  } | null;
  tech?: {
    technologies?: Array<{
      name: string;
      category?: string;
      confidence?: number;
    }>;
  } | null;
}

// Modern technology indicators
const MODERN_TECH = [
  "React",
  "Vue.js",
  "Angular",
  "Next.js",
  "Nuxt.js",
  "Svelte",
  "TypeScript",
  "GraphQL",
  "Webpack",
  "Vite",
  "Tailwind CSS",
  "Node.js",
  "Deno",
  "Go",
  "Rust",
  "Python 3",
];

// Legacy/outdated technology indicators
const LEGACY_TECH = [
  "jQuery",
  "PHP 5",
  "Python 2",
  "AngularJS",
  "Backbone.js",
  "Flash",
  "Silverlight",
  "Java Applet",
  "ActiveX",
];

// Premium hosting providers (high reliability)
const PREMIUM_HOSTS = [
  "AWS",
  "Google Cloud",
  "Azure",
  "Cloudflare",
  "Fastly",
  "Vercel",
  "Netlify",
  "DigitalOcean",
  "Heroku",
];

// Budget/shared hosting providers
const BUDGET_HOSTS = [
  "HostingInfo",
  "Bluehost",
  "HostGator",
  "DreamHost",
  "Namecheap",
];

export class PerformanceScoringEngine {
  /**
   * Calculate comprehensive performance score
   */
  static calculateScore(scanData: ScanData): PerformanceScore {
    const securityScore = this.calculateSecurityScore(scanData);
    const technologyScore = this.calculateTechnologyScore(scanData);
    const infrastructureScore = this.calculateInfrastructureScore(scanData);
    const reliabilityScore = this.calculateReliabilityScore(scanData);

    // Weighted average (security is most important)
    const weights = {
      security: 0.35,
      technology: 0.25,
      infrastructure: 0.25,
      reliability: 0.15,
    };

    const overall = Math.round(
      securityScore.score * weights.security +
        technologyScore.score * weights.technology +
        infrastructureScore.score * weights.infrastructure +
        reliabilityScore.score * weights.reliability,
    );

    const grade = this.calculateGrade(overall);
    const recommendations = this.generateRecommendations(scanData, {
      security: securityScore,
      technology: technologyScore,
      infrastructure: infrastructureScore,
      reliability: reliabilityScore,
    });

    return {
      overall,
      security: securityScore.score,
      technology: technologyScore.score,
      infrastructure: infrastructureScore.score,
      reliability: reliabilityScore.score,
      grade,
      breakdown: [
        { ...securityScore, weight: weights.security },
        { ...technologyScore, weight: weights.technology },
        { ...infrastructureScore, weight: weights.infrastructure },
        { ...reliabilityScore, weight: weights.reliability },
      ],
      recommendations,
    };
  }

  /**
   * Security Score (0-100)
   * Based on SSL, security headers, open ports, vulnerabilities
   */
  private static calculateSecurityScore(scanData: ScanData) {
    let score = 100;
    const factors: ScoreFactor[] = [];

    // SSL/TLS Certificate
    if (scanData.ip?.tlsCertData) {
      factors.push({
        name: "Valid SSL Certificate",
        impact: "positive",
        points: 0,
        description: "Domain has a valid SSL/TLS certificate",
      });
    } else {
      score -= 30;
      factors.push({
        name: "Missing SSL Certificate",
        impact: "negative",
        points: -30,
        description:
          "No valid SSL certificate detected - critical security issue",
      });
    }

    // Open Ports Analysis
    const openPorts = scanData.ip?.openPorts || [];
    const dangerousPorts = openPorts.filter(
      (p: number) => [21, 23, 3389, 5900].includes(p), // FTP, Telnet, RDP, VNC
    );

    if (dangerousPorts.length > 0) {
      score -= dangerousPorts.length * 10;
      factors.push({
        name: "Dangerous Ports Open",
        impact: "negative",
        points: -dangerousPorts.length * 10,
        description: `Insecure ports detected: ${dangerousPorts.join(", ")}`,
      });
    }

    // HTTP Security Headers (check service banners)
    const httpResponse =
      scanData.ip?.httpResponses?.["80"] || scanData.ip?.httpResponses?.["443"];
    if (httpResponse) {
      const hasSecurityHeaders =
        httpResponse.includes("Strict-Transport-Security") ||
        httpResponse.includes("X-Frame-Options") ||
        httpResponse.includes("X-Content-Type-Options");

      if (hasSecurityHeaders) {
        score += 5;
        factors.push({
          name: "Security Headers Present",
          impact: "positive",
          points: 5,
          description: "HTTP security headers detected",
        });
      } else {
        score -= 10;
        factors.push({
          name: "Missing Security Headers",
          impact: "negative",
          points: -10,
          description: "No HTTP security headers detected",
        });
      }
    }

    // CDN Usage (security benefit)
    if (scanData.hosting?.edgeProvider) {
      score += 10;
      factors.push({
        name: "CDN Protection",
        impact: "positive",
        points: 10,
        description: `Protected by ${scanData.hosting.edgeProvider} CDN`,
      });
    }

    return {
      category: "Security",
      score: Math.max(0, Math.min(100, score)),
      factors,
    };
  }

  /**
   * Technology Score (0-100)
   * Based on modern vs legacy tech, framework quality
   */
  private static calculateTechnologyScore(scanData: ScanData) {
    let score = 70; // Start at neutral
    const factors: ScoreFactor[] = [];

    const technologies = scanData.tech?.technologies || [];
    const techNames = technologies.map((t) => t.name);

    // Modern technology bonus
    const modernCount = techNames.filter((name: string) =>
      MODERN_TECH.some((modern) => name.includes(modern)),
    ).length;

    if (modernCount > 0) {
      const bonus = Math.min(20, modernCount * 5);
      score += bonus;
      factors.push({
        name: "Modern Technology Stack",
        impact: "positive",
        points: bonus,
        description: `Using ${modernCount} modern technologies`,
      });
    }

    // Legacy technology penalty
    const legacyCount = techNames.filter((name: string) =>
      LEGACY_TECH.some((legacy) => name.includes(legacy)),
    ).length;

    if (legacyCount > 0) {
      const penalty = legacyCount * 10;
      score -= penalty;
      factors.push({
        name: "Legacy Technology Detected",
        impact: "negative",
        points: -penalty,
        description: `Using ${legacyCount} outdated technologies`,
      });
    }

    // Framework detection
    if (scanData.hosting?.framework) {
      score += 10;
      factors.push({
        name: "Framework Detected",
        impact: "positive",
        points: 10,
        description: `Using ${scanData.hosting.framework} framework`,
      });
    }

    // Technology diversity (not too few, not too many)
    const techCount = technologies.length;
    if (techCount >= 5 && techCount <= 20) {
      score += 5;
      factors.push({
        name: "Balanced Tech Stack",
        impact: "positive",
        points: 5,
        description: `${techCount} technologies - good balance`,
      });
    } else if (techCount > 30) {
      score -= 5;
      factors.push({
        name: "Bloated Tech Stack",
        impact: "negative",
        points: -5,
        description: `${techCount} technologies - may be over-engineered`,
      });
    }

    return {
      category: "Technology",
      score: Math.max(0, Math.min(100, score)),
      factors,
    };
  }

  /**
   * Infrastructure Score (0-100)
   * Based on hosting provider, CDN, redundancy
   */
  private static calculateInfrastructureScore(scanData: ScanData) {
    let score = 60; // Start at neutral
    const factors: ScoreFactor[] = [];

    // Origin hosting provider quality
    const originHost = scanData.hosting?.originHost;
    if (originHost) {
      if (PREMIUM_HOSTS.some((host) => originHost.includes(host))) {
        score += 20;
        factors.push({
          name: "Premium Hosting Provider",
          impact: "positive",
          points: 20,
          description: `Hosted on ${originHost} - enterprise-grade infrastructure`,
        });
      } else if (BUDGET_HOSTS.some((host) => originHost.includes(host))) {
        score -= 10;
        factors.push({
          name: "Budget Hosting Provider",
          impact: "negative",
          points: -10,
          description: `Hosted on ${originHost} - shared hosting limitations`,
        });
      }
    }

    // CDN/Edge provider
    const edgeProvider = scanData.hosting?.edgeProvider;
    if (edgeProvider) {
      score += 15;
      factors.push({
        name: "CDN Enabled",
        impact: "positive",
        points: 15,
        description: `Using ${edgeProvider} for global content delivery`,
      });
    } else {
      score -= 10;
      factors.push({
        name: "No CDN Detected",
        impact: "negative",
        points: -10,
        description: "No CDN - slower global performance",
      });
    }

    // DNS infrastructure
    const nameservers = scanData.dns?.authoritativeNameservers || [];
    if (nameservers.length >= 2) {
      score += 10;
      factors.push({
        name: "Redundant DNS",
        impact: "positive",
        points: 10,
        description: `${nameservers.length} nameservers for redundancy`,
      });
    }

    // Confidence score (indicates detection quality)
    const confidence = scanData.hosting?.confidenceScore || 0;
    if (confidence >= 80) {
      score += 5;
      factors.push({
        name: "Clear Infrastructure",
        impact: "positive",
        points: 5,
        description: "Well-configured and easily identifiable setup",
      });
    }

    return {
      category: "Infrastructure",
      score: Math.max(0, Math.min(100, score)),
      factors,
    };
  }

  /**
   * Reliability Score (0-100)
   * Based on response time, uptime indicators, redundancy
   */
  private static calculateReliabilityScore(scanData: ScanData) {
    let score = 75; // Start at good baseline
    const factors: ScoreFactor[] = [];

    // Multiple nameservers (redundancy)
    const nameservers = scanData.dns?.authoritativeNameservers || [];
    if (nameservers.length >= 3) {
      score += 10;
      factors.push({
        name: "High DNS Redundancy",
        impact: "positive",
        points: 10,
        description: `${nameservers.length} nameservers for maximum uptime`,
      });
    } else if (nameservers.length < 2) {
      score -= 15;
      factors.push({
        name: "Low DNS Redundancy",
        impact: "negative",
        points: -15,
        description: "Single point of failure in DNS",
      });
    }

    // CDN presence (improves reliability)
    if (scanData.hosting?.edgeProvider) {
      score += 10;
      factors.push({
        name: "CDN Redundancy",
        impact: "positive",
        points: 10,
        description: "CDN provides automatic failover",
      });
    }

    // Premium hosting (better uptime SLAs)
    const originHost = scanData.hosting?.originHost;
    if (originHost && PREMIUM_HOSTS.some((host) => originHost.includes(host))) {
      score += 10;
      factors.push({
        name: "Enterprise SLA",
        impact: "positive",
        points: 10,
        description: "Premium host with 99.9%+ uptime guarantee",
      });
    }

    // Open ports (too many can indicate poor security/reliability)
    const openPorts = scanData.ip?.openPorts || [];
    if (openPorts.length > 10) {
      score -= 5;
      factors.push({
        name: "Excessive Open Ports",
        impact: "negative",
        points: -5,
        description: "Many open ports may indicate configuration issues",
      });
    }

    return {
      category: "Reliability",
      score: Math.max(0, Math.min(100, score)),
      factors,
    };
  }

  /**
   * Convert numeric score to letter grade
   */
  private static calculateGrade(
    score: number,
  ): "A+" | "A" | "B" | "C" | "D" | "F" {
    if (score >= 95) return "A+";
    if (score >= 85) return "A";
    if (score >= 75) return "B";
    if (score >= 65) return "C";
    if (score >= 50) return "D";
    return "F";
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    scanData: ScanData,
    _scores: unknown,
  ): PerformanceScore["recommendations"] {
    const recommendations: PerformanceScore["recommendations"] = [];

    // Security recommendations
    if (!scanData.ip?.tlsCertData) {
      recommendations.push({
        priority: "critical",
        category: "Security",
        issue: "Missing SSL Certificate",
        recommendation:
          "Install a valid SSL/TLS certificate (free with Let's Encrypt)",
        potentialGain: 30,
      });
    }

    if (!scanData.hosting?.edgeProvider) {
      recommendations.push({
        priority: "high",
        category: "Infrastructure",
        issue: "No CDN Detected",
        recommendation:
          "Enable a CDN like Cloudflare or Fastly for better performance and security",
        potentialGain: 25,
      });
    }

    // Technology recommendations
    const technologies = scanData.tech?.technologies || [];
    const techNames = technologies.map((t) => t.name);
    const hasLegacy = techNames.some((name: string) =>
      LEGACY_TECH.some((legacy) => name.includes(legacy)),
    );

    if (hasLegacy) {
      recommendations.push({
        priority: "medium",
        category: "Technology",
        issue: "Legacy Technology Detected",
        recommendation:
          "Upgrade to modern frameworks and libraries for better performance and security",
        potentialGain: 15,
      });
    }

    // Infrastructure recommendations
    const originHost = scanData.hosting?.originHost;
    if (originHost && BUDGET_HOSTS.some((host) => originHost.includes(host))) {
      recommendations.push({
        priority: "medium",
        category: "Infrastructure",
        issue: "Budget Hosting Provider",
        recommendation:
          "Consider upgrading to a premium hosting provider for better performance and reliability",
        potentialGain: 20,
      });
    }

    // DNS recommendations
    const nameservers = scanData.dns?.authoritativeNameservers || [];
    if (nameservers.length < 2) {
      recommendations.push({
        priority: "high",
        category: "Reliability",
        issue: "Single DNS Nameserver",
        recommendation:
          "Add redundant nameservers to prevent DNS-related downtime",
        potentialGain: 15,
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return recommendations;
  }
}
