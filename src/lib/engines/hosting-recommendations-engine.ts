/**
 * Hosting Recommendations Engine
 *
 * Provides AI-powered hosting recommendations based on:
 * - Current infrastructure
 * - Technology stack
 * - Traffic patterns
 * - Budget considerations
 * - Performance requirements
 */

interface ScanData {
  hosting?: {
    originHost?: string;
    edgeProvider?: string;
    framework?: string;
  };
  dns?: Record<string, unknown>;
  ip?: Record<string, unknown>;
  tech?: {
    technologies?: Array<{
      name: string;
    }>;
  };
}

interface HostingRecommendation {
  provider: string;
  tier: "budget" | "mid" | "premium" | "enterprise";
  monthlyPrice: { min: number; max: number; typical: number };
  bestFor: string[];
  pros: string[];
  cons: string[];
  migrationDifficulty: "easy" | "moderate" | "complex";
  estimatedDowntime: string;
  confidence: number;
  reasoning: string;
}

interface RecommendationResult {
  currentSetup: {
    hosting: string;
    cdn: string;
    estimatedCost: number;
    tier: string;
  };
  recommendations: HostingRecommendation[];
  topPick: HostingRecommendation;
  insights: string[];
  migrationPath: {
    steps: string[];
    estimatedTime: string;
    riskLevel: "low" | "medium" | "high";
    backupStrategy: string;
  };
}

// Hosting provider database
const HOSTING_PROVIDERS = {
  // Premium Cloud
  aws: {
    name: "AWS (Amazon Web Services)",
    tier: "premium" as const,
    monthlyPrice: { min: 50, max: 5000, typical: 150 },
    bestFor: [
      "High traffic sites",
      "Enterprise applications",
      "Scalable infrastructure",
      "Global reach",
    ],
    pros: [
      "Extremely scalable and reliable",
      "Global infrastructure with 30+ regions",
      "Comprehensive service ecosystem",
      "Industry-leading uptime (99.99%)",
      "Advanced security features",
    ],
    cons: [
      "Steep learning curve",
      "Complex pricing model",
      "Can be expensive for small sites",
      "Requires DevOps expertise",
    ],
    migrationDifficulty: "complex" as const,
    estimatedDowntime: "2-4 hours",
  },
  gcp: {
    name: "Google Cloud Platform",
    tier: "premium" as const,
    monthlyPrice: { min: 50, max: 5000, typical: 140 },
    bestFor: [
      "Data-intensive apps",
      "Machine learning",
      "Kubernetes workloads",
      "Modern architectures",
    ],
    pros: [
      "Excellent for containerized apps",
      "Strong AI/ML capabilities",
      "Competitive pricing",
      "Google's network infrastructure",
      "Great developer tools",
    ],
    cons: [
      "Smaller market share than AWS",
      "Complex for beginners",
      "Limited legacy support",
      "Requires technical expertise",
    ],
    migrationDifficulty: "complex" as const,
    estimatedDowntime: "2-4 hours",
  },
  azure: {
    name: "Microsoft Azure",
    tier: "premium" as const,
    monthlyPrice: { min: 50, max: 5000, typical: 160 },
    bestFor: [
      "Enterprise Windows apps",
      ".NET applications",
      "Hybrid cloud",
      "Microsoft ecosystem",
    ],
    pros: [
      "Best for Microsoft stack",
      "Strong enterprise support",
      "Hybrid cloud capabilities",
      "Active Directory integration",
      "Comprehensive compliance",
    ],
    cons: [
      "Can be expensive",
      "Complex pricing",
      "Steeper learning curve",
      "Less Linux-friendly than competitors",
    ],
    migrationDifficulty: "complex" as const,
    estimatedDowntime: "2-4 hours",
  },

  // Mid-Tier
  digitalocean: {
    name: "DigitalOcean",
    tier: "mid" as const,
    monthlyPrice: { min: 5, max: 200, typical: 40 },
    bestFor: [
      "Startups",
      "Small to medium sites",
      "Developer-friendly",
      "Simple deployments",
    ],
    pros: [
      "Simple and predictable pricing",
      "Easy to use interface",
      "Great documentation",
      "Developer-friendly",
      "Good performance for price",
    ],
    cons: [
      "Limited enterprise features",
      "Fewer regions than big cloud",
      "Less comprehensive than AWS/GCP",
      "Basic support on lower tiers",
    ],
    migrationDifficulty: "moderate" as const,
    estimatedDowntime: "1-2 hours",
  },
  linode: {
    name: "Linode (Akamai)",
    tier: "mid" as const,
    monthlyPrice: { min: 5, max: 200, typical: 35 },
    bestFor: [
      "Linux hosting",
      "VPS needs",
      "Cost-conscious developers",
      "Simple infrastructure",
    ],
    pros: [
      "Excellent value for money",
      "Simple pricing",
      "Strong Linux support",
      "Good performance",
      "Reliable uptime",
    ],
    cons: [
      "Fewer managed services",
      "Limited Windows support",
      "Smaller ecosystem",
      "Basic control panel",
    ],
    migrationDifficulty: "moderate" as const,
    estimatedDowntime: "1-2 hours",
  },
  vercel: {
    name: "Vercel",
    tier: "mid" as const,
    monthlyPrice: { min: 0, max: 400, typical: 20 },
    bestFor: [
      "Next.js apps",
      "Static sites",
      "JAMstack",
      "Frontend deployments",
    ],
    pros: [
      "Zero-config deployments",
      "Excellent Next.js support",
      "Global CDN included",
      "Automatic HTTPS",
      "Git integration",
    ],
    cons: [
      "Limited backend capabilities",
      "Vendor lock-in for Next.js",
      "Can get expensive at scale",
      "Not suitable for traditional apps",
    ],
    migrationDifficulty: "easy" as const,
    estimatedDowntime: "< 30 minutes",
  },
  netlify: {
    name: "Netlify",
    tier: "mid" as const,
    monthlyPrice: { min: 0, max: 300, typical: 19 },
    bestFor: [
      "Static sites",
      "JAMstack",
      "React/Vue apps",
      "Serverless functions",
    ],
    pros: [
      "Easy deployment from Git",
      "Built-in CDN",
      "Serverless functions",
      "Great developer experience",
      "Generous free tier",
    ],
    cons: [
      "Limited for dynamic sites",
      "Build time limitations",
      "Can be expensive for high traffic",
      "Not for traditional backends",
    ],
    migrationDifficulty: "easy" as const,
    estimatedDowntime: "< 30 minutes",
  },
  heroku: {
    name: "Heroku",
    tier: "mid" as const,
    monthlyPrice: { min: 7, max: 500, typical: 50 },
    bestFor: [
      "Ruby/Python apps",
      "Quick prototypes",
      "Startups",
      "Simple deployments",
    ],
    pros: [
      "Very easy to deploy",
      "Great for prototyping",
      "Add-ons marketplace",
      "Git-based deployment",
      "Managed infrastructure",
    ],
    cons: [
      "Can be expensive at scale",
      "Limited customization",
      "Dyno sleep on free tier",
      "Less control than VPS",
    ],
    migrationDifficulty: "easy" as const,
    estimatedDowntime: "< 1 hour",
  },

  // Budget
  hostinginfo: {
    name: "HostingInfo",
    tier: "budget" as const,
    monthlyPrice: { min: 3, max: 30, typical: 10 },
    bestFor: [
      "Small business sites",
      "WordPress blogs",
      "Basic websites",
      "Budget hosting",
    ],
    pros: [
      "Very affordable",
      "Easy cPanel interface",
      "Good for WordPress",
      "Domain + hosting bundles",
      "Phone support",
    ],
    cons: [
      "Shared hosting limitations",
      "Performance can be inconsistent",
      "Upselling tactics",
      "Limited scalability",
    ],
    migrationDifficulty: "easy" as const,
    estimatedDowntime: "< 1 hour",
  },
  bluehost: {
    name: "Bluehost",
    tier: "budget" as const,
    monthlyPrice: { min: 3, max: 25, typical: 8 },
    bestFor: [
      "WordPress sites",
      "Small businesses",
      "Blogs",
      "First-time site owners",
    ],
    pros: [
      "WordPress recommended",
      "Very affordable",
      "Easy setup",
      "Free domain first year",
      "Good support",
    ],
    cons: [
      "Shared hosting limitations",
      "Renewal prices increase",
      "Limited resources",
      "Performance issues under load",
    ],
    migrationDifficulty: "easy" as const,
    estimatedDowntime: "< 1 hour",
  },
  cloudflare_pages: {
    name: "Cloudflare Pages",
    tier: "budget" as const,
    monthlyPrice: { min: 0, max: 20, typical: 0 },
    bestFor: ["Static sites", "JAMstack", "Frontend apps", "Free hosting"],
    pros: [
      "Completely free for most sites",
      "Global CDN included",
      "Unlimited bandwidth",
      "Fast deployments",
      "Git integration",
    ],
    cons: [
      "Static sites only",
      "No traditional backend",
      "Build time limits",
      "Limited to 500 builds/month (free)",
    ],
    migrationDifficulty: "easy" as const,
    estimatedDowntime: "< 30 minutes",
  },
};

export class HostingRecommendationsEngine {
  /**
   * Generate hosting recommendations based on scan data
   */
  static generateRecommendations(scanData: ScanData): RecommendationResult {
    const currentSetup = this.analyzeCurrentSetup(scanData);
    const siteCharacteristics = this.analyzeSiteCharacteristics(scanData);
    const recommendations = this.selectRecommendations(
      siteCharacteristics,
      currentSetup,
    );
    const topPick = this.selectTopPick(recommendations, siteCharacteristics);
    const insights = this.generateInsights(
      currentSetup,
      siteCharacteristics,
      recommendations,
    );
    const migrationPath = this.generateMigrationPath(currentSetup, topPick);

    return {
      currentSetup,
      recommendations,
      topPick,
      insights,
      migrationPath,
    };
  }

  /**
   * Analyze current hosting setup
   */
  private static analyzeCurrentSetup(scanData: ScanData) {
    const hosting = scanData.hosting?.originHost || "Unknown";
    const cdn = scanData.hosting?.edgeProvider || "None";

    // Estimate current cost
    let estimatedCost = 30; // default
    let tier = "unknown";

    if (hosting.includes("AWS") || hosting.includes("Amazon")) {
      estimatedCost = 150;
      tier = "premium";
    } else if (hosting.includes("Google Cloud") || hosting.includes("GCP")) {
      estimatedCost = 140;
      tier = "premium";
    } else if (hosting.includes("Azure") || hosting.includes("Microsoft")) {
      estimatedCost = 160;
      tier = "premium";
    } else if (hosting.includes("DigitalOcean")) {
      estimatedCost = 40;
      tier = "mid";
    } else if (hosting.includes("Heroku")) {
      estimatedCost = 50;
      tier = "mid";
    } else if (hosting.includes("Vercel")) {
      estimatedCost = 20;
      tier = "mid";
    } else if (hosting.includes("Netlify")) {
      estimatedCost = 19;
      tier = "mid";
    } else if (
      hosting.includes("HostingInfo") ||
      hosting.includes("Bluehost") ||
      hosting.includes("HostGator")
    ) {
      estimatedCost = 10;
      tier = "budget";
    }

    return { hosting, cdn, estimatedCost, tier };
  }

  /**
   * Analyze site characteristics to determine needs
   */
  private static analyzeSiteCharacteristics(scanData: ScanData) {
    const technologies = scanData.tech?.technologies || [];
    const techNames = technologies.map((technology) =>
      technology.name.toLowerCase(),
    );
    const framework = scanData.hosting?.framework?.toLowerCase() || "";

    // Detect site type
    const isStatic =
      techNames.some((name: string) => name.includes("static")) ||
      (techNames.length < 3 && !framework);
    const isWordPress = techNames.some((name: string) =>
      name.includes("wordpress"),
    );
    const isNextJs =
      techNames.some((name: string) => name.includes("next.js")) ||
      framework.includes("next");
    const isReact = techNames.some((name: string) => name.includes("react"));
    const isVue = techNames.some((name: string) => name.includes("vue"));
    const isNode =
      techNames.some((name: string) => name.includes("node.js")) ||
      framework.includes("node");
    const isPython =
      techNames.some((name: string) => name.includes("python")) ||
      framework.includes("python");
    const isRuby =
      techNames.some((name: string) => name.includes("ruby")) ||
      framework.includes("ruby");
    const isDotNet =
      techNames.some((name: string) => name.includes(".net")) ||
      framework.includes(".net");

    // Estimate complexity
    const techCount = technologies.length;
    const complexity =
      techCount < 5 ? "simple" : techCount < 15 ? "moderate" : "complex";

    // Estimate traffic (based on infrastructure)
    const hasCDN = !!scanData.hosting?.edgeProvider;
    const isPremiumHosting =
      scanData.hosting?.originHost?.includes("AWS") ||
      scanData.hosting?.originHost?.includes("Google Cloud") ||
      scanData.hosting?.originHost?.includes("Azure");
    const traffic = isPremiumHosting ? "high" : hasCDN ? "medium" : "low";

    return {
      isStatic,
      isWordPress,
      isNextJs,
      isReact,
      isVue,
      isNode,
      isPython,
      isRuby,
      isDotNet,
      techCount,
      complexity,
      traffic,
      hasCDN,
    };
  }

  /**
   * Select appropriate hosting recommendations
   */
  private static selectRecommendations(
    characteristics: ReturnType<typeof this.analyzeSiteCharacteristics>,
    currentSetup: ReturnType<typeof this.analyzeCurrentSetup>,
  ): HostingRecommendation[] {
    const recommendations: HostingRecommendation[] = [];

    // Static sites
    if (characteristics.isStatic) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.cloudflare_pages,
          95,
          "Perfect for static sites - free, fast, and globally distributed",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.netlify,
          90,
          "Excellent for static sites with great developer experience",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.vercel,
          85,
          "Great for static sites, especially if you might add Next.js later",
        ),
      );
    }

    // Next.js sites
    if (characteristics.isNextJs) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.vercel,
          98,
          "Built by the creators of Next.js - zero-config deployment",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.netlify,
          85,
          "Good Next.js support with serverless functions",
        ),
      );
    }

    // WordPress sites
    if (characteristics.isWordPress) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.bluehost,
          90,
          "WordPress recommended hosting - optimized for WP",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.digitalocean,
          85,
          "Better performance than shared hosting, still affordable",
        ),
      );
    }

    // Node.js apps
    if (characteristics.isNode) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.heroku,
          90,
          "Easy Node.js deployment with great developer experience",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.digitalocean,
          85,
          "Good balance of control and simplicity for Node.js",
        ),
      );
      if (characteristics.traffic === "high") {
        recommendations.push(
          this.createRecommendation(
            HOSTING_PROVIDERS.aws,
            95,
            "Best for high-traffic Node.js apps with scaling needs",
          ),
        );
      }
    }

    // Python apps
    if (characteristics.isPython) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.heroku,
          92,
          "Excellent Python support with easy deployment",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.digitalocean,
          88,
          "Good for Python apps with more control",
        ),
      );
      if (characteristics.traffic === "high") {
        recommendations.push(
          this.createRecommendation(
            HOSTING_PROVIDERS.gcp,
            95,
            "Great for Python apps, especially with ML/data needs",
          ),
        );
      }
    }

    // .NET apps
    if (characteristics.isDotNet) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.azure,
          98,
          "Best platform for .NET applications - native Microsoft support",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.aws,
          85,
          "Good .NET support with more flexibility",
        ),
      );
    }

    // High traffic sites
    if (characteristics.traffic === "high" && recommendations.length < 3) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.aws,
          95,
          "Industry leader for high-traffic, scalable applications",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.gcp,
          92,
          "Excellent performance and competitive pricing for scale",
        ),
      );
    }

    // Budget-conscious
    if (currentSetup.tier === "budget" && recommendations.length < 3) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.digitalocean,
          90,
          "Best value upgrade from shared hosting",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.linode,
          88,
          "Excellent performance for the price",
        ),
      );
    }

    // Default recommendations if none matched
    if (recommendations.length === 0) {
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.digitalocean,
          85,
          "Versatile and developer-friendly for most use cases",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.netlify,
          80,
          "Great for modern web apps with static frontend",
        ),
      );
      recommendations.push(
        this.createRecommendation(
          HOSTING_PROVIDERS.heroku,
          75,
          "Easy deployment for various backend frameworks",
        ),
      );
    }

    // Sort by confidence and return top 3
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Create a recommendation object
   */
  private static createRecommendation(
    provider: (typeof HOSTING_PROVIDERS)[keyof typeof HOSTING_PROVIDERS],
    confidence: number,
    reasoning: string,
  ): HostingRecommendation {
    return {
      provider: provider.name,
      tier: provider.tier,
      monthlyPrice: provider.monthlyPrice,
      bestFor: provider.bestFor,
      pros: provider.pros,
      cons: provider.cons,
      migrationDifficulty: provider.migrationDifficulty,
      estimatedDowntime: provider.estimatedDowntime,
      confidence,
      reasoning,
    };
  }

  /**
   * Select the top recommendation
   */
  private static selectTopPick(
    recommendations: HostingRecommendation[],
    _characteristics: ReturnType<typeof this.analyzeSiteCharacteristics>,
  ): HostingRecommendation {
    return recommendations[0];
  }

  /**
   * Generate insights about hosting recommendations
   */
  private static generateInsights(
    currentSetup: ReturnType<typeof this.analyzeCurrentSetup>,
    characteristics: ReturnType<typeof this.analyzeSiteCharacteristics>,
    recommendations: HostingRecommendation[],
  ): string[] {
    const insights: string[] = [];

    // Current setup insight
    if (
      currentSetup.tier === "budget" &&
      characteristics.complexity !== "simple"
    ) {
      insights.push(
        "💡 Your site complexity suggests upgrading from shared hosting for better performance",
      );
    } else if (
      currentSetup.tier === "premium" &&
      characteristics.complexity === "simple"
    ) {
      insights.push(
        "💰 You may be over-provisioned - simpler hosting could save money",
      );
    } else {
      insights.push(
        "✅ Your current hosting tier matches your site complexity",
      );
    }

    // CDN insight
    if (!characteristics.hasCDN) {
      insights.push(
        "⚡ Adding a CDN could improve global performance by 40-60%",
      );
    }

    // Cost savings insight
    const topPick = recommendations[0];
    const potentialSavings =
      currentSetup.estimatedCost - topPick.monthlyPrice.typical;
    if (potentialSavings > 20) {
      insights.push(
        `💵 Switching to ${topPick.provider} could save ~$${Math.round(potentialSavings)}/month`,
      );
    } else if (potentialSavings < -20) {
      insights.push(
        `📈 Upgrading to ${topPick.provider} would cost ~$${Math.abs(Math.round(potentialSavings))}/month more but improve performance`,
      );
    }

    // Migration insight
    if (topPick.migrationDifficulty === "easy") {
      insights.push(
        "🚀 Migration to recommended hosting is straightforward (< 2 hours)",
      );
    } else if (topPick.migrationDifficulty === "complex") {
      insights.push(
        "⚠️ Migration requires careful planning and technical expertise",
      );
    }

    // Technology-specific insight
    if (characteristics.isStatic) {
      insights.push(
        "📄 Static sites can be hosted free on Cloudflare Pages, Netlify, or Vercel",
      );
    } else if (characteristics.isNextJs) {
      insights.push("⚛️ Next.js apps deploy best on Vercel (zero-config)");
    } else if (characteristics.isWordPress) {
      insights.push("📝 WordPress sites benefit from specialized WP hosting");
    }

    return insights;
  }

  /**
   * Generate migration path
   */
  private static generateMigrationPath(
    currentSetup: ReturnType<typeof this.analyzeCurrentSetup>,
    topPick: HostingRecommendation,
  ) {
    const steps: string[] = [];
    let estimatedTime = "2-4 hours";
    let riskLevel: "low" | "medium" | "high" = "medium";

    if (topPick.migrationDifficulty === "easy") {
      steps.push("1. Sign up for " + topPick.provider);
      steps.push("2. Connect your Git repository");
      steps.push("3. Configure build settings");
      steps.push("4. Deploy and test");
      steps.push("5. Update DNS to point to new host");
      steps.push("6. Monitor for 24-48 hours");
      estimatedTime = "1-2 hours";
      riskLevel = "low";
    } else if (topPick.migrationDifficulty === "moderate") {
      steps.push("1. Create account on " + topPick.provider);
      steps.push("2. Provision server/instance");
      steps.push("3. Install required software stack");
      steps.push("4. Export database from current host");
      steps.push("5. Transfer files via SFTP/rsync");
      steps.push("6. Import database to new host");
      steps.push("7. Update configuration files");
      steps.push("8. Test thoroughly on new host");
      steps.push("9. Update DNS records");
      steps.push("10. Monitor and verify");
      estimatedTime = "3-6 hours";
      riskLevel = "medium";
    } else {
      steps.push("1. Plan migration strategy with team");
      steps.push(
        "2. Set up " + topPick.provider + " account and infrastructure",
      );
      steps.push("3. Configure networking, security groups, load balancers");
      steps.push("4. Set up CI/CD pipeline");
      steps.push("5. Create staging environment");
      steps.push("6. Migrate database with replication");
      steps.push("7. Deploy application to staging");
      steps.push("8. Run comprehensive tests");
      steps.push("9. Plan maintenance window");
      steps.push("10. Execute production cutover");
      steps.push("11. Monitor closely for 48 hours");
      steps.push("12. Optimize and tune performance");
      estimatedTime = "1-2 weeks";
      riskLevel = "high";
    }

    const backupStrategy =
      riskLevel === "low"
        ? "Keep current hosting active for 7 days as backup"
        : riskLevel === "medium"
          ? "Full backup before migration, keep current hosting for 14 days"
          : "Multiple backups, staged rollout, keep current hosting for 30 days";

    return {
      steps,
      estimatedTime,
      riskLevel,
      backupStrategy,
    };
  }
}
