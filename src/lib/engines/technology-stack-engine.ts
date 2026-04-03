/**
 * Technology Stack Analysis Engine
 *
 * Analyzes detected technologies and provides insights about the tech stack
 */

export interface TechnologyCategory {
  name: string;
  technologies: Array<{
    name: string;
    version?: string;
    confidence: number;
    category: string;
  }>;
  count: number;
}

export interface TechStackAnalysis {
  categories: TechnologyCategory[];
  totalTechnologies: number;
  complexity: "simple" | "moderate" | "complex" | "enterprise";
  modernityScore: number; // 0-100
  insights: string[];
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    type: "upgrade" | "replace" | "add" | "remove";
    title: string;
    description: string;
    reason: string;
  }>;
  securityConcerns: Array<{
    severity: "critical" | "high" | "medium" | "low";
    technology: string;
    issue: string;
    recommendation: string;
  }>;
}

interface DetectedTechnology {
  name: string;
  version?: string;
  confidence?: number;
  category?: string;
}

interface TechStackScanData {
  tech?: {
    technologies?: DetectedTechnology[];
  };
  hosting?: {
    edgeProvider?: string;
  };
}

export class TechnologyStackEngine {
  /**
   * Analyze technology stack
   */
  static analyzeTechStack(scanData: TechStackScanData): TechStackAnalysis {
    const technologies = scanData.tech?.technologies || [];
    const categories = this.categorizeTechnologies(technologies);
    const complexity = this.assessComplexity(technologies);
    const modernityScore = this.calculateModernityScore(technologies);
    const insights = this.generateInsights(
      technologies,
      complexity,
      modernityScore,
    );
    const recommendations = this.generateRecommendations(
      technologies,
      scanData,
    );
    const securityConcerns = this.identifySecurityConcerns(technologies);

    return {
      categories,
      totalTechnologies: technologies.length,
      complexity,
      modernityScore,
      insights,
      recommendations,
      securityConcerns,
    };
  }

  /**
   * Categorize technologies by type
   */
  private static categorizeTechnologies(
    technologies: DetectedTechnology[],
  ): TechnologyCategory[] {
    const categoryMap = new Map<string, TechnologyCategory["technologies"]>();

    technologies.forEach((tech: DetectedTechnology) => {
      const category = tech.category || "Other";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push({
        name: tech.name,
        version: tech.version,
        confidence: tech.confidence || 100,
        category,
      });
    });

    const categories: TechnologyCategory[] = [];
    categoryMap.forEach((techs, name) => {
      categories.push({
        name,
        technologies: techs,
        count: techs.length,
      });
    });

    // Sort by count (descending)
    return categories.sort((a, b) => b.count - a.count);
  }

  /**
   * Assess stack complexity
   */
  private static assessComplexity(
    technologies: DetectedTechnology[],
  ): "simple" | "moderate" | "complex" | "enterprise" {
    const count = technologies.length;

    if (count < 5) return "simple";
    if (count < 15) return "moderate";
    if (count < 30) return "complex";
    return "enterprise";
  }

  /**
   * Calculate modernity score (0-100)
   */
  private static calculateModernityScore(
    technologies: DetectedTechnology[],
  ): number {
    let score = 50; // Base score

    const techNames = technologies.map((t) => t.name.toLowerCase());

    // Modern frameworks (+points)
    if (techNames.some((n) => n.includes("react"))) score += 10;
    if (techNames.some((n) => n.includes("vue"))) score += 10;
    if (techNames.some((n) => n.includes("next.js"))) score += 15;
    if (techNames.some((n) => n.includes("nuxt"))) score += 15;
    if (techNames.some((n) => n.includes("svelte"))) score += 12;

    // Modern build tools (+points)
    if (techNames.some((n) => n.includes("webpack"))) score += 5;
    if (techNames.some((n) => n.includes("vite"))) score += 8;
    if (techNames.some((n) => n.includes("turbopack"))) score += 10;

    // Modern CSS (+points)
    if (techNames.some((n) => n.includes("tailwind"))) score += 8;
    if (techNames.some((n) => n.includes("styled-components"))) score += 5;

    // Legacy technologies (-points)
    if (techNames.some((n) => n.includes("jquery"))) score -= 10;
    if (techNames.some((n) => n.includes("angular.js"))) score -= 15; // AngularJS (old)
    if (techNames.some((n) => n.includes("backbone"))) score -= 12;
    if (techNames.some((n) => n.includes("prototype"))) score -= 15;

    // Old CMS (-points)
    if (techNames.some((n) => n.includes("drupal 7"))) score -= 10;
    if (techNames.some((n) => n.includes("joomla"))) score -= 8;

    // HTTP/2 and modern protocols (+points)
    const hasHTTP2 = technologies.some((t) =>
      t.name.toLowerCase().includes("http/2"),
    );
    if (hasHTTP2) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate insights about the tech stack
   */
  private static generateInsights(
    technologies: DetectedTechnology[],
    complexity: TechStackAnalysis["complexity"],
    modernityScore: number,
  ): string[] {
    const insights: string[] = [];
    const techNames = technologies.map((t) => t.name.toLowerCase());

    // Complexity insight
    if (complexity === "simple") {
      insights.push("🎯 Simple tech stack - easy to maintain and fast to load");
    } else if (complexity === "moderate") {
      insights.push(
        "⚖️ Moderate complexity - good balance of features and maintainability",
      );
    } else if (complexity === "complex") {
      insights.push("🔧 Complex stack - may require specialized developers");
    } else {
      insights.push(
        "🏢 Enterprise-grade stack - requires dedicated development team",
      );
    }

    // Modernity insight
    if (modernityScore >= 80) {
      insights.push("✨ Modern tech stack - using current best practices");
    } else if (modernityScore >= 60) {
      insights.push("📊 Reasonably modern stack - some room for updates");
    } else if (modernityScore >= 40) {
      insights.push("⚠️ Aging tech stack - consider modernization");
    } else {
      insights.push("🚨 Legacy tech stack - modernization highly recommended");
    }

    // Framework insights
    if (techNames.some((n) => n.includes("wordpress"))) {
      insights.push(
        "📝 WordPress detected - most popular CMS, great plugin ecosystem",
      );
    }
    if (techNames.some((n) => n.includes("shopify"))) {
      insights.push("🛍️ Shopify platform - excellent for e-commerce");
    }
    if (techNames.some((n) => n.includes("react"))) {
      insights.push(
        "⚛️ React framework - modern, component-based architecture",
      );
    }
    if (techNames.some((n) => n.includes("vue"))) {
      insights.push("💚 Vue.js framework - progressive and developer-friendly");
    }

    // jQuery insight
    if (techNames.some((n) => n.includes("jquery"))) {
      insights.push(
        "⚠️ jQuery detected - consider migrating to modern JavaScript",
      );
    }

    // Analytics insight
    const hasAnalytics = techNames.some(
      (n) => n.includes("analytics") || n.includes("google tag manager"),
    );
    if (hasAnalytics) {
      insights.push(
        "📊 Analytics tracking enabled - good for data-driven decisions",
      );
    } else {
      insights.push("📊 No analytics detected - consider adding tracking");
    }

    return insights;
  }

  /**
   * Generate technology recommendations
   */
  private static generateRecommendations(
    technologies: DetectedTechnology[],
    scanData: TechStackScanData,
  ): TechStackAnalysis["recommendations"] {
    const recommendations: TechStackAnalysis["recommendations"] = [];
    const techNames = technologies.map((t) => t.name.toLowerCase());

    // jQuery replacement
    if (techNames.some((n) => n.includes("jquery"))) {
      recommendations.push({
        priority: "medium",
        type: "replace",
        title: "Replace jQuery with Modern JavaScript",
        description:
          "Modern browsers support all jQuery features natively. Removing jQuery reduces bundle size by ~30KB.",
        reason: "Improved performance and maintainability",
      });
    }

    // Add CDN if missing
    if (!scanData.hosting?.edgeProvider) {
      recommendations.push({
        priority: "high",
        type: "add",
        title: "Add Content Delivery Network",
        description: "Enable Cloudflare to cache static assets globally",
        reason: "Faster load times for global visitors",
      });
    }

    // Add analytics if missing
    const hasAnalytics = techNames.some(
      (n) => n.includes("analytics") || n.includes("google tag"),
    );
    if (!hasAnalytics) {
      recommendations.push({
        priority: "low",
        type: "add",
        title: "Add Analytics Tracking",
        description:
          "Install Google Analytics or similar to track visitor behavior",
        reason: "Data-driven decision making",
      });
    }

    // Upgrade old WordPress
    const wpVersion = technologies.find((t) =>
      t.name.toLowerCase().includes("wordpress"),
    );
    if (wpVersion && wpVersion.version) {
      const version = parseFloat(wpVersion.version);
      if (version < 6.0) {
        recommendations.push({
          priority: "high",
          type: "upgrade",
          title: "Upgrade WordPress",
          description: `Current version ${wpVersion.version} is outdated. Upgrade to latest version.`,
          reason: "Security patches and new features",
        });
      }
    }

    // Remove unused technologies
    if (technologies.length > 30) {
      recommendations.push({
        priority: "medium",
        type: "remove",
        title: "Audit and Remove Unused Technologies",
        description: `${technologies.length} technologies detected - some may be unused`,
        reason: "Reduce complexity and improve performance",
      });
    }

    return recommendations;
  }

  /**
   * Identify security concerns in tech stack
   */
  private static identifySecurityConcerns(
    technologies: DetectedTechnology[],
  ): TechStackAnalysis["securityConcerns"] {
    const concerns: TechStackAnalysis["securityConcerns"] = [];

    technologies.forEach((tech) => {
      const name = tech.name.toLowerCase();
      const version = tech.version;

      // Old jQuery versions
      if (name.includes("jquery") && version) {
        const versionNum = parseFloat(version);
        if (versionNum < 3.0) {
          concerns.push({
            severity: "high",
            technology: `jQuery ${version}`,
            issue: "Known XSS vulnerabilities in versions < 3.0",
            recommendation: "Upgrade to jQuery 3.x or remove jQuery entirely",
          });
        }
      }

      // Old WordPress
      if (name.includes("wordpress") && version) {
        const versionNum = parseFloat(version);
        if (versionNum < 5.0) {
          concerns.push({
            severity: "critical",
            technology: `WordPress ${version}`,
            issue:
              "Severely outdated WordPress version with known vulnerabilities",
            recommendation: "Upgrade to latest WordPress version immediately",
          });
        } else if (versionNum < 6.0) {
          concerns.push({
            severity: "high",
            technology: `WordPress ${version}`,
            issue: "Outdated WordPress version",
            recommendation: "Upgrade to WordPress 6.x for security patches",
          });
        }
      }

      // Old PHP
      if (name.includes("php") && version) {
        const versionNum = parseFloat(version);
        if (versionNum < 7.4) {
          concerns.push({
            severity: "critical",
            technology: `PHP ${version}`,
            issue: "End-of-life PHP version with no security updates",
            recommendation: "Upgrade to PHP 8.0+ immediately",
          });
        } else if (versionNum < 8.0) {
          concerns.push({
            severity: "medium",
            technology: `PHP ${version}`,
            issue: "PHP 7.4 reaches end-of-life soon",
            recommendation: "Plan upgrade to PHP 8.0+",
          });
        }
      }

      // Old Angular.js (not Angular)
      if (name === "angularjs" || name === "angular.js") {
        concerns.push({
          severity: "high",
          technology: "AngularJS",
          issue: "AngularJS reached end-of-life in 2022",
          recommendation: "Migrate to modern Angular or another framework",
        });
      }
    });

    return concerns;
  }
}
