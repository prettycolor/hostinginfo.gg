/**
 * Cost Analysis Engine
 *
 * Estimates hosting costs and identifies optimization opportunities
 * Based on detected hosting providers, CDN usage, and infrastructure
 */

type HostingTier = "premium" | "mid" | "budget" | "unknown";
type CDNTier = "none" | "free" | "paid";

interface HostingCostProfile {
  min: number;
  max: number;
  typical: number;
  tier: HostingTier;
}

interface CDNCostProfile {
  min: number;
  max: number;
  typical: number;
  freeTier: boolean;
}

interface EstimatedCDNCost extends CDNCostProfile {
  tier: CDNTier;
}

interface HostingData {
  originHost?: string;
  edgeProvider?: string;
  framework?: string;
}

interface TechnologyData {
  name: string;
}

interface ScanData {
  hosting?: HostingData;
  dns?: Record<string, unknown>;
  ip?: Record<string, unknown>;
  tech?: {
    technologies?: TechnologyData[];
  };
}

// Hosting provider pricing (monthly estimates in USD)
const HOSTING_COSTS: Record<string, HostingCostProfile> = {
  // Premium Cloud Providers
  AWS: { min: 50, max: 500, typical: 150, tier: "premium" },
  "Google Cloud": { min: 50, max: 500, typical: 140, tier: "premium" },
  Azure: { min: 50, max: 500, typical: 160, tier: "premium" },
  DigitalOcean: { min: 5, max: 200, typical: 40, tier: "mid" },
  Heroku: { min: 7, max: 500, typical: 50, tier: "mid" },
  Vercel: { min: 0, max: 400, typical: 20, tier: "mid" },
  Netlify: { min: 0, max: 300, typical: 19, tier: "mid" },

  // Budget/Shared Hosting
  HostingInfo: { min: 3, max: 30, typical: 10, tier: "budget" },
  Bluehost: { min: 3, max: 25, typical: 8, tier: "budget" },
  HostGator: { min: 3, max: 30, typical: 9, tier: "budget" },
  DreamHost: { min: 3, max: 25, typical: 10, tier: "budget" },
  Namecheap: { min: 2, max: 20, typical: 7, tier: "budget" },

  // Default for unknown providers
  Unknown: { min: 10, max: 100, typical: 30, tier: "unknown" },
};

// CDN pricing (monthly estimates in USD)
const CDN_COSTS: Record<string, CDNCostProfile> = {
  Cloudflare: { min: 0, max: 200, typical: 20, freeTier: true },
  Fastly: { min: 50, max: 1000, typical: 200, freeTier: false },
  Akamai: { min: 100, max: 5000, typical: 500, freeTier: false },
  CloudFront: { min: 1, max: 500, typical: 50, freeTier: false },
  None: { min: 0, max: 0, typical: 0, freeTier: false },
};

interface CostEstimate {
  monthly: {
    hosting: { min: number; max: number; typical: number };
    cdn: { min: number; max: number; typical: number };
    total: { min: number; max: number; typical: number };
  };
  annual: {
    hosting: { min: number; max: number; typical: number };
    cdn: { min: number; max: number; typical: number };
    total: { min: number; max: number; typical: number };
  };
  breakdown: {
    category: string;
    provider: string;
    cost: number;
    tier: string;
  }[];
  optimizations: Array<{
    type: "cost_reduction" | "performance_improvement" | "feature_upgrade";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    currentCost: number;
    potentialCost: number;
    savings: number;
    savingsPercent: number;
  }>;
  insights: string[];
}

export class CostAnalysisEngine {
  /**
   * Analyze hosting costs and identify optimizations
   */
  static analyzeCosts(scanData: ScanData): CostEstimate {
    const hostingCost = this.estimateHostingCost(scanData);
    const cdnCost = this.estimateCDNCost(scanData);

    const monthlyTotal = {
      min: hostingCost.min + cdnCost.min,
      max: hostingCost.max + cdnCost.max,
      typical: hostingCost.typical + cdnCost.typical,
    };

    const annualTotal = {
      min: monthlyTotal.min * 12,
      max: monthlyTotal.max * 12,
      typical: monthlyTotal.typical * 12,
    };

    const breakdown = [
      {
        category: "Hosting",
        provider: scanData.hosting?.originHost || "Unknown",
        cost: hostingCost.typical,
        tier: hostingCost.tier,
      },
      {
        category: "CDN",
        provider: scanData.hosting?.edgeProvider || "None",
        cost: cdnCost.typical,
        tier: cdnCost.tier,
      },
    ];

    const optimizations = this.identifyOptimizations(
      scanData,
      hostingCost,
      cdnCost,
    );
    const insights = this.generateInsights(scanData, hostingCost, cdnCost);

    return {
      monthly: {
        hosting: hostingCost,
        cdn: cdnCost,
        total: monthlyTotal,
      },
      annual: {
        hosting: {
          min: hostingCost.min * 12,
          max: hostingCost.max * 12,
          typical: hostingCost.typical * 12,
        },
        cdn: {
          min: cdnCost.min * 12,
          max: cdnCost.max * 12,
          typical: cdnCost.typical * 12,
        },
        total: annualTotal,
      },
      breakdown,
      optimizations,
      insights,
    };
  }

  /**
   * Estimate hosting costs based on provider
   */
  private static estimateHostingCost(scanData: ScanData): HostingCostProfile {
    const originHost = scanData.hosting?.originHost || "Unknown";

    // Find matching provider
    for (const [provider, costs] of Object.entries(HOSTING_COSTS)) {
      if (originHost.includes(provider)) {
        return { ...costs };
      }
    }

    return { ...HOSTING_COSTS["Unknown"] };
  }

  /**
   * Estimate CDN costs based on provider
   */
  private static estimateCDNCost(scanData: ScanData): EstimatedCDNCost {
    const edgeProvider = scanData.hosting?.edgeProvider;

    if (!edgeProvider) {
      return { ...CDN_COSTS["None"], tier: "none" };
    }

    // Find matching CDN
    for (const [provider, costs] of Object.entries(CDN_COSTS)) {
      if (edgeProvider.includes(provider)) {
        return { ...costs, tier: costs.freeTier ? "free" : "paid" };
      }
    }

    // Default CDN cost
    return { min: 20, max: 200, typical: 50, freeTier: false, tier: "paid" };
  }

  /**
   * Identify cost optimization opportunities
   */
  private static identifyOptimizations(
    scanData: ScanData,
    hostingCost: HostingCostProfile,
    cdnCost: EstimatedCDNCost,
  ): CostEstimate["optimizations"] {
    const optimizations: CostEstimate["optimizations"] = [];

    // No CDN optimization
    if (!scanData.hosting?.edgeProvider) {
      optimizations.push({
        type: "performance_improvement",
        priority: "high",
        title: "Add CDN for Better Performance",
        description:
          "Enable Cloudflare (free tier) to improve global performance and add DDoS protection",
        currentCost: 0,
        potentialCost: 0,
        savings: 0,
        savingsPercent: 0,
      });
    }

    // Budget hosting with high traffic
    if (
      hostingCost.tier === "budget" &&
      scanData.tech?.technologies?.length > 10
    ) {
      const currentCost = hostingCost.typical;
      const upgradeCost = 40; // DigitalOcean typical
      optimizations.push({
        type: "performance_improvement",
        priority: "medium",
        title: "Upgrade from Shared Hosting",
        description:
          "Move to VPS (DigitalOcean/Linode) for better performance and scalability",
        currentCost,
        potentialCost: upgradeCost,
        savings: 0,
        savingsPercent: 0,
      });
    }

    // Premium hosting without CDN
    if (hostingCost.tier === "premium" && !scanData.hosting?.edgeProvider) {
      optimizations.push({
        type: "cost_reduction",
        priority: "medium",
        title: "Add CDN to Reduce Bandwidth Costs",
        description:
          "Cloudflare CDN can reduce origin bandwidth by 60-80%, lowering cloud provider costs",
        currentCost: hostingCost.typical,
        potentialCost: hostingCost.typical * 0.7 + 20,
        savings: hostingCost.typical * 0.3 - 20,
        savingsPercent: 20,
      });
    }

    // Expensive CDN
    if (
      cdnCost.typical > 100 &&
      scanData.hosting?.edgeProvider?.includes("Fastly")
    ) {
      optimizations.push({
        type: "cost_reduction",
        priority: "high",
        title: "Switch to More Cost-Effective CDN",
        description:
          "Cloudflare offers similar performance at a fraction of the cost for most use cases",
        currentCost: cdnCost.typical,
        potentialCost: 20,
        savings: cdnCost.typical - 20,
        savingsPercent: Math.round(
          ((cdnCost.typical - 20) / cdnCost.typical) * 100,
        ),
      });
    }

    // Over-provisioned infrastructure
    if (
      hostingCost.typical > 200 &&
      scanData.tech?.technologies?.length < 5 &&
      !scanData.hosting?.framework
    ) {
      optimizations.push({
        type: "cost_reduction",
        priority: "medium",
        title: "Right-Size Infrastructure",
        description:
          "Simple site may not need premium hosting - consider mid-tier alternatives",
        currentCost: hostingCost.typical,
        potentialCost: 40,
        savings: hostingCost.typical - 40,
        savingsPercent: Math.round(
          ((hostingCost.typical - 40) / hostingCost.typical) * 100,
        ),
      });
    }

    // Static site on expensive hosting
    const technologies = scanData.tech?.technologies || [];
    const techNames = technologies.map((technology) => technology.name);
    const isStatic =
      techNames.some((name: string) => name.includes("Static")) ||
      (techNames.length < 3 && !scanData.hosting?.framework);

    if (isStatic && hostingCost.typical > 20) {
      optimizations.push({
        type: "cost_reduction",
        priority: "high",
        title: "Move Static Site to Free Hosting",
        description:
          "Static sites can be hosted free on Vercel, Netlify, or Cloudflare Pages",
        currentCost: hostingCost.typical,
        potentialCost: 0,
        savings: hostingCost.typical,
        savingsPercent: 100,
      });
    }

    return optimizations;
  }

  /**
   * Generate cost insights
   */
  private static generateInsights(
    scanData: ScanData,
    hostingCost: HostingCostProfile,
    cdnCost: EstimatedCDNCost,
  ): string[] {
    const insights: string[] = [];

    const totalCost = hostingCost.typical + cdnCost.typical;

    // Cost tier insight
    if (totalCost < 20) {
      insights.push(
        "💰 Budget-friendly setup - great for small sites and startups",
      );
    } else if (totalCost < 100) {
      insights.push(
        "💼 Mid-tier infrastructure - suitable for growing businesses",
      );
    } else {
      insights.push(
        "🏢 Enterprise-grade infrastructure - high performance and reliability",
      );
    }

    // CDN insight
    if (!scanData.hosting?.edgeProvider) {
      insights.push(
        "⚠️ No CDN detected - adding one could improve performance by 40-60% globally",
      );
    } else if (cdnCost.freeTier) {
      insights.push("✅ Using free CDN tier - excellent cost optimization");
    }

    // Hosting tier insight
    if (hostingCost.tier === "budget") {
      insights.push(
        "📊 Shared hosting detected - consider VPS if experiencing performance issues",
      );
    } else if (hostingCost.tier === "premium") {
      insights.push("🚀 Premium cloud hosting - scalable and highly reliable");
    }

    // Annual cost insight
    const annualCost = totalCost * 12;
    insights.push(
      `📅 Estimated annual cost: $${annualCost.toLocaleString()} (${totalCost.toLocaleString()}/month)`,
    );

    // Optimization potential
    const optimizations = this.identifyOptimizations(
      scanData,
      hostingCost,
      cdnCost,
    );
    const totalSavings = optimizations.reduce(
      (sum, opt) => sum + opt.savings,
      0,
    );
    if (totalSavings > 0) {
      insights.push(
        `💡 Potential savings: $${Math.round(totalSavings)}/month ($${Math.round(totalSavings * 12)}/year)`,
      );
    }

    return insights;
  }
}
