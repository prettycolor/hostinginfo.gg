import type { Request, Response } from "express";
import { enhanceInsightsWithGPT, canUseGPT } from "../gpt-analyzer.js";
import { getSecret } from "#secrets";

interface AIInsight {
  id: string;
  type:
    | "security"
    | "performance"
    | "optimization"
    | "prediction"
    | "explanation";
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: {
    score?: number;
    metric?: string;
    business?: string;
  };
  recommendation: {
    summary: string;
    steps?: string[];
    timeEstimate?: string;
    difficulty?: "easy" | "medium" | "hard";
    codeSnippet?: string;
    learnMoreUrl?: string;
  };
  relatedTab?: string;
  dependencies?: string[]; // IDs of insights that should be completed first
  sequenceOrder?: number; // Order in action plan
}

interface ScanData {
  technologyData: {
    wordpress?: {
      detected?: boolean;
      version?: string;
      plugins?: string[];
    };
    ecommerce?: {
      platform?: string;
      detected?: boolean;
    };
  };
  dnsData: {
    records?: Array<{ value?: string }>;
  };
  securityData: {
    ssl?: {
      grade?: string;
      mixedContent?: boolean;
      protocols?: string[];
    };
    securityHeaders?: Record<string, unknown>;
  };
  performanceData: {
    mobile?: {
      score?: number;
      metrics?: {
        ttfb?: {
          value?: number;
        };
      };
    };
    desktop?: {
      score?: number;
    };
  };
  emailData: {
    spf?: { valid?: boolean };
    dkim?: { valid?: boolean };
    dmarc?: { valid?: boolean };
  };
  geolocationData: Record<string, unknown>;
  providerData: {
    category?: string;
    provider?: string;
    cdn?: unknown;
  };
  whoisData: Record<string, unknown>;
  malwareData?: Record<string, unknown>;
}

// ============================================================================
// CROSS-TAB INTELLIGENCE ENGINE
// ============================================================================

class CrossTabAnalyzer {
  private data: ScanData;

  constructor(data: ScanData) {
    this.data = data;
  }

  // Detect if hosting provider is limiting performance
  detectHostingBottleneck(): AIInsight | null {
    const { providerData, performanceData, technologyData } = this.data;

    if (!providerData || !performanceData) return null;

    const isSharedHosting = providerData.category
      ?.toLowerCase()
      .includes("shared");
    const mobileScore = performanceData.mobile?.score || 0;
    const isWordPress = technologyData.wordpress?.detected;

    if (isSharedHosting && mobileScore < 60) {
      const provider = providerData.provider || "your hosting provider";

      return {
        id: "cross-hosting-bottleneck",
        type: "optimization",
        priority: "high",
        category: "Infrastructure",
        title: `Shared Hosting (${provider}) is Limiting Performance`,
        description: `Your site is on shared hosting with ${provider}, which is causing your mobile performance score of ${mobileScore}/100. Shared hosting shares resources with hundreds of other sites, creating unpredictable slowdowns.`,
        impact: {
          score: 20,
          metric: "Performance Score",
          business: `Shared hosting typically limits CPU to 1-2% and RAM to 512MB. Your site competes with 200-500 other sites on the same server. Upgrading to VPS or managed hosting could improve your score to 75-85/100, reducing bounce rate by 25-40%.`,
        },
        recommendation: {
          summary: isWordPress
            ? "Migrate to managed WordPress hosting for instant performance boost"
            : "Upgrade to VPS hosting or add Cloudflare CDN as immediate fix",
          steps: isWordPress
            ? [
                "Option A (Best): Migrate to managed WordPress hosting (Kinsta, WP Engine, Cloudways)",
                "Expected improvement: 60 → 85 performance score",
                "Cost: $30-50/month, Migration time: 2-4 hours",
                "Option B (Quick Fix): Add Cloudflare CDN (free tier)",
                "Expected improvement: 60 → 70 performance score",
                "Cost: $0/month, Setup time: 30 minutes",
                "Cloudflare offloads 60-80% of requests from your slow server",
              ]
            : [
                "Option A: Upgrade to VPS hosting (DigitalOcean, Linode, Vultr)",
                "Cost: $12-20/month for 2GB RAM, 1 CPU core",
                "Expected improvement: +20-25 performance points",
                "Option B: Add Cloudflare CDN (free) as immediate fix",
                "Setup takes 30 minutes, improves score by 10-15 points",
                "Cloudflare caches static assets globally, reducing server load",
              ],
          timeEstimate: isWordPress
            ? "30 mins (CDN) or 2-4 hours (migration)"
            : "30 mins (CDN) or 1 day (VPS setup)",
          difficulty: "medium",
        },
        relatedTab: "performance",
        sequenceOrder: 1, // Do this FIRST - it affects everything else
      };
    }

    return null;
  }

  // Detect if missing CDN is causing performance issues
  detectCDNOpportunity(): AIInsight | null {
    const { providerData, performanceData, dnsData } = this.data;

    if (!performanceData) return null;

    const hasCDN =
      providerData?.cdn ||
      dnsData?.records?.some(
        (record) =>
          record.value?.includes("cloudflare") ||
          record.value?.includes("cloudfront") ||
          record.value?.includes("fastly"),
      );

    const mobileScore = performanceData.mobile?.score || 0;

    if (!hasCDN && mobileScore < 70) {
      const ttfb = performanceData.mobile?.metrics?.ttfb?.value || 0;
      const slowTTFB = ttfb > 600; // Over 600ms is slow

      return {
        id: "cross-no-cdn",
        type: "optimization",
        priority: slowTTFB ? "high" : "medium",
        category: "Infrastructure",
        title: "No CDN Detected - Missing 40-60% Performance Boost",
        description: `Your site is not using a Content Delivery Network (CDN). ${slowTTFB ? `Your Time to First Byte is ${(ttfb / 1000).toFixed(2)}s, which is slow.` : ""} A CDN would serve your content from servers closer to your users, dramatically improving load times.`,
        impact: {
          score: 15,
          metric: "Performance Score",
          business: `Without a CDN, users in Asia/Europe wait 2-5 seconds longer than US users. A CDN reduces this to under 1 second globally. For a site with 10k monthly visitors, this could reduce bounce rate by 30% and increase conversions by 15-20%. Cloudflare's free tier handles 100k requests/day.`,
        },
        recommendation: {
          summary:
            "Add Cloudflare CDN (free tier) - takes 30 minutes, costs $0",
          steps: [
            "1. Sign up at cloudflare.com (free plan)",
            "2. Add your domain to Cloudflare",
            "3. Cloudflare will scan your DNS records (takes 1 minute)",
            "4. Update nameservers at your domain registrar (copy from Cloudflare)",
            "5. Wait 5-60 minutes for DNS propagation",
            '6. In Cloudflare dashboard: Enable "Auto Minify" for HTML/CSS/JS',
            "7. Enable Brotli compression (better than Gzip)",
            '8. Set Browser Cache TTL to "4 hours"',
            "9. Test with PageSpeed Insights - expect +10-15 point improvement",
          ],
          timeEstimate: "30 minutes",
          difficulty: "easy",
          learnMoreUrl: "https://www.cloudflare.com/",
        },
        relatedTab: "performance",
        dependencies: ["cross-hosting-bottleneck"], // Do hosting fix first if it exists
        sequenceOrder: 2,
      };
    }

    return null;
  }

  // Detect if outdated WordPress is causing security AND performance issues
  detectWordPressRisk(): AIInsight | null {
    const { technologyData } = this.data;

    if (!technologyData.wordpress?.detected) return null;

    const version = technologyData.wordpress.version;
    if (!version) return null;

    const versionNum = parseFloat(version);
    const latestVersion = 6.7;
    const versionsBehind = latestVersion - versionNum;

    if (versionsBehind > 0.5) {
      const isCritical = versionsBehind > 1.0;
      const hasWooCommerce =
        technologyData.ecommerce?.platform === "WooCommerce";

      return {
        id: "cross-wordpress-outdated",
        type: "security",
        priority: isCritical ? "critical" : "high",
        category: "WordPress Security",
        title: `WordPress ${version} is ${versionsBehind.toFixed(1)} Versions Behind (Critical Risk)`,
        description: `You're running WordPress ${version}, which is ${versionsBehind.toFixed(1)} versions behind the latest (${latestVersion}). ${hasWooCommerce ? "Your WooCommerce store is at risk of payment data theft." : "Your site is vulnerable to known exploits."} Outdated WordPress is the #1 cause of website hacks.`,
        impact: {
          score: isCritical ? 15 : 10,
          metric: "Security Score",
          business: hasWooCommerce
            ? `73% of WordPress hacks exploit known vulnerabilities in old versions. For e-commerce sites, this means potential credit card theft, customer data breaches, and legal liability. The average cost of a data breach is $4.35M. Updating takes 20 minutes.`
            : `Outdated WordPress installations are targeted by automated bots scanning for known vulnerabilities. Your site is likely being probed right now. 90% of hacked WordPress sites were running outdated versions. This affects SEO rankings, user trust, and can result in Google blacklisting.`,
        },
        recommendation: {
          summary:
            "Update WordPress immediately - this is your highest security risk",
          steps: [
            "⚠️ CRITICAL: Do this TODAY, not tomorrow",
            "1. Backup your site completely (use UpdraftPlus plugin or hosting backup)",
            "2. Update all plugins FIRST (Dashboard → Plugins → Update All)",
            "3. Update your theme (Dashboard → Appearance → Themes)",
            "4. Go to Dashboard → Updates",
            '5. Click "Update Now" for WordPress core',
            "6. Test your site thoroughly (check homepage, login, checkout if e-commerce)",
            "7. Enable automatic updates: Dashboard → Updates → Enable automatic updates for all",
            "8. Set calendar reminder to check monthly",
            "",
            "💡 Pro Tip: If update fails, your host likely has 1-click restore in cPanel",
          ],
          timeEstimate: "20 minutes",
          difficulty: "easy",
          learnMoreUrl:
            "https://wordpress.org/support/article/updating-wordpress/",
        },
        relatedTab: "hosting",
        sequenceOrder: 1, // ALWAYS do security fixes first
      };
    }

    return null;
  }

  // Detect if SSL issues are blocking performance improvements
  detectSSLBlocker(): AIInsight | null {
    const { securityData } = this.data;

    if (!securityData.ssl) return null;

    const sslGrade = securityData.ssl.grade;
    const hasMixedContent = securityData.ssl.mixedContent;

    // Check if SSL is blocking HTTP/2 (which requires good SSL)
    const hasHTTP2 = securityData.ssl.protocols?.includes("h2");

    if ((sslGrade && ["C", "D", "F"].includes(sslGrade)) || hasMixedContent) {
      return {
        id: "cross-ssl-blocker",
        type: "security",
        priority: "high",
        category: "SSL/TLS",
        title: `SSL Grade ${sslGrade || "F"} is Blocking Performance Improvements`,
        description: `Your SSL configuration is weak (grade ${sslGrade || "F"}). ${!hasHTTP2 ? "This is preventing HTTP/2, which would improve load times by 30-50%." : ""} ${hasMixedContent ? "You also have mixed content (HTTP resources on HTTPS page), which browsers block." : ""}`,
        impact: {
          score: 12,
          metric: "Security + Performance",
          business: `Weak SSL causes: (1) Browser security warnings (15% of Chrome users see warnings), (2) Blocks HTTP/2 protocol (30-50% faster loading), (3) Google ranking penalty, (4) User trust issues. ${hasMixedContent ? "Mixed content breaks images/scripts on your site." : ""} Fixing this unlocks performance improvements you can't get otherwise.`,
        },
        recommendation: {
          summary:
            "Upgrade to TLS 1.3 and fix mixed content - this unblocks other optimizations",
          steps: [
            "1. Contact your hosting provider (or check cPanel → SSL/TLS)",
            "2. Request TLS 1.3 enabled + disable TLS 1.0/1.1 (deprecated)",
            "3. If on Cloudflare: SSL/TLS → Edge Certificates → Minimum TLS Version → 1.2",
            "4. Enable HTTP/2 (usually automatic with TLS 1.2+)",
            hasMixedContent
              ? '5. Fix mixed content: Install "Really Simple SSL" plugin (WordPress) or search your code for http:// links and change to https://'
              : "",
            "6. Test at ssllabs.com/ssltest - aim for A or A+ grade",
            "7. Re-run performance scan - expect +5-10 point improvement from HTTP/2",
          ].filter(Boolean),
          timeEstimate: "30 minutes",
          difficulty: "medium",
          learnMoreUrl: "https://www.ssllabs.com/ssltest/",
        },
        relatedTab: "security",
        dependencies: ["cross-wordpress-outdated"], // Fix WordPress first
        sequenceOrder: 2,
      };
    }

    return null;
  }

  // Detect if email security is weak (affects deliverability AND reputation)
  detectEmailSecurityImpact(): AIInsight | null {
    const { emailData, technologyData } = this.data;

    if (!emailData) return null;

    const missingSPF = !emailData.spf?.valid;
    const missingDKIM = !emailData.dkim?.valid;
    const missingDMARC = !emailData.dmarc?.valid;
    const missingCount = [missingSPF, missingDKIM, missingDMARC].filter(
      Boolean,
    ).length;

    if (missingCount >= 2) {
      const isEcommerce = technologyData.ecommerce?.detected;

      return {
        id: "cross-email-security",
        type: "security",
        priority: isEcommerce ? "high" : "medium",
        category: "Email Security",
        title: `Missing ${missingCount}/3 Email Security Records (SPF/DKIM/DMARC)`,
        description: `Your domain is missing ${missingCount} critical email security records. ${isEcommerce ? "This means order confirmations and password resets are likely going to spam." : "This affects email deliverability and makes your domain easy to spoof."} ${missingSPF ? "No SPF record. " : ""}${missingDKIM ? "No DKIM signature. " : ""}${missingDMARC ? "No DMARC policy." : ""}`,
        impact: {
          score: 8,
          metric: "Email Deliverability",
          business: isEcommerce
            ? `Without SPF/DKIM/DMARC, 40-60% of your transactional emails (order confirmations, shipping notifications, password resets) go to spam. For a store with 100 orders/month, that's 40-60 customers not receiving order confirmations, leading to support tickets, chargebacks, and lost repeat business. Gmail and Outlook are especially strict.`
            : `Missing email authentication makes your domain easy to spoof (phishing). Your legitimate emails are more likely to be marked as spam. This affects contact forms, newsletters, and any automated emails from your site.`,
        },
        recommendation: {
          summary:
            "Add SPF, DKIM, and DMARC records to your DNS - improves deliverability by 40-60%",
          steps: [
            "1. Log into your domain registrar (HostingInfo, Namecheap, etc.)",
            "2. Go to DNS Management",
            missingSPF
              ? "3. Add SPF record (TXT): v=spf1 include:_spf.google.com ~all (if using Gmail)"
              : "",
            missingSPF ? "   Or for generic: v=spf1 a mx ~all" : "",
            missingDKIM
              ? "4. Add DKIM: Contact your email provider for DKIM keys (Gmail, Outlook, etc.)"
              : "",
            missingDMARC
              ? "5. Add DMARC record (TXT): v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
              : "",
            "6. Wait 1-24 hours for DNS propagation",
            "7. Test at mxtoolbox.com/SuperTool.aspx",
            "8. Send test email to mail-tester.com for deliverability score",
          ].filter(Boolean),
          timeEstimate: "30 minutes",
          difficulty: "medium",
          learnMoreUrl: "https://mxtoolbox.com/dmarc.aspx",
        },
        relatedTab: "email",
        sequenceOrder: 4, // Do after critical security/performance fixes
      };
    }

    return null;
  }

  // Get all cross-tab insights
  getAllInsights(): AIInsight[] {
    return [
      this.detectHostingBottleneck(),
      this.detectCDNOpportunity(),
      this.detectWordPressRisk(),
      this.detectSSLBlocker(),
      this.detectEmailSecurityImpact(),
    ].filter((insight): insight is AIInsight => insight !== null);
  }
}

// ============================================================================
// TECH-STACK SPECIFIC ANALYZERS
// ============================================================================

class WordPressAnalyzer {
  private data: ScanData;

  constructor(data: ScanData) {
    this.data = data;
  }

  analyzePlugins(): AIInsight[] {
    const insights: AIInsight[] = [];
    const { technologyData, performanceData } = this.data;

    if (!technologyData.wordpress?.detected) return insights;

    const plugins = technologyData.wordpress.plugins || [];
    const mobileScore = performanceData?.mobile?.score || 0;

    // Check for performance-killing plugins
    const heavyPlugins = plugins.filter((p: string) =>
      ["elementor", "divi", "visual-composer", "wpbakery"].some((heavy) =>
        p.toLowerCase().includes(heavy),
      ),
    );

    if (heavyPlugins.length > 0 && mobileScore < 60) {
      insights.push({
        id: "wp-heavy-plugins",
        type: "performance",
        priority: "medium",
        category: "WordPress Performance",
        title: `Page Builder (${heavyPlugins[0]}) is Slowing Your Site`,
        description: `You're using ${heavyPlugins[0]}, which adds 500KB-1MB of CSS/JS to every page. This is contributing to your ${mobileScore}/100 mobile score.`,
        impact: {
          score: 10,
          metric: "Performance Score",
          business: `Page builders are convenient but bloated. ${heavyPlugins[0]} loads 50-100 CSS/JS files on every page, even if you only use 10% of features. This adds 2-3 seconds to load time.`,
        },
        recommendation: {
          summary:
            "Optimize page builder or consider switching to Gutenberg (WordPress blocks)",
          steps: [
            `1. Install "Asset CleanUp" plugin to disable ${heavyPlugins[0]} on pages that don't need it`,
            "2. In Asset CleanUp, unload unused page builder modules",
            '3. Enable "Lazy Load" for page builder elements',
            "4. Consider Gutenberg (built-in WordPress blocks) for new pages - 80% lighter",
            "5. If rebuilding, use GeneratePress theme + Gutenberg instead of page builders",
          ],
          timeEstimate: "1 hour",
          difficulty: "medium",
        },
        relatedTab: "performance",
        sequenceOrder: 5,
      });
    }

    // Check for missing security plugins
    const hasSecurityPlugin = plugins.some((p: string) =>
      [
        "wordfence",
        "sucuri",
        "ithemes-security",
        "all-in-one-wp-security",
      ].some((sec) => p.toLowerCase().includes(sec)),
    );

    if (!hasSecurityPlugin) {
      insights.push({
        id: "wp-no-security-plugin",
        type: "security",
        priority: "medium",
        category: "WordPress Security",
        title:
          "No Security Plugin Detected - WordPress is Under Constant Attack",
        description:
          "WordPress sites receive 90,000+ attacks per minute globally. Without a security plugin, you have no firewall, no malware scanning, and no brute-force protection.",
        impact: {
          score: 8,
          metric: "Security Score",
          business:
            "WordPress security plugins block 99% of automated attacks. Without one, bots are trying to brute-force your login, exploit plugin vulnerabilities, and inject malware 24/7.",
        },
        recommendation: {
          summary:
            "Install Wordfence (free) - takes 5 minutes, blocks 100k+ attacks/day",
          steps: [
            "1. Go to Dashboard → Plugins → Add New",
            '2. Search "Wordfence Security"',
            "3. Click Install Now → Activate",
            "4. Complete setup wizard (enable firewall + malware scanning)",
            "5. Enable 2FA for admin accounts (Wordfence → Login Security)",
            "6. Check Wordfence dashboard weekly to see blocked attacks",
          ],
          timeEstimate: "10 minutes",
          difficulty: "easy",
          learnMoreUrl: "https://wordpress.org/plugins/wordfence/",
        },
        relatedTab: "hosting",
        sequenceOrder: 3,
      });
    }

    return insights;
  }
}

// ============================================================================
// STANDARD INSIGHTS (Enhanced with better context)
// ============================================================================

function generateSecurityInsights(data: ScanData): AIInsight[] {
  const insights: AIInsight[] = [];
  const { securityData, technologyData } = data;

  // Missing CSP Header
  if (
    securityData.securityHeaders &&
    !securityData.securityHeaders["content-security-policy"]
  ) {
    const isWordPress = technologyData.wordpress?.detected;
    const isEcommerce = technologyData.ecommerce?.detected;

    insights.push({
      id: "sec-csp-missing",
      type: "security",
      priority: isEcommerce ? "high" : "medium",
      category: "Security Headers",
      title: "Missing Content Security Policy (CSP)",
      description: isWordPress
        ? "Your WordPress site lacks CSP headers, making it vulnerable to XSS attacks. This is especially risky if you allow user comments or have contact forms."
        : "Your site lacks CSP headers, making it vulnerable to cross-site scripting (XSS) attacks.",
      impact: {
        score: 10,
        metric: "Security Score",
        business: isEcommerce
          ? "E-commerce sites without CSP are 3x more likely to experience payment data theft via injected scripts. This could result in customer loss, chargebacks, and legal liability under PCI-DSS."
          : "CSP prevents malicious scripts from running on your site. Without it, attackers can inject code to steal user data, redirect visitors, or deface your site.",
      },
      recommendation: {
        summary: isWordPress
          ? 'Install "HTTP Headers" plugin (free) - takes 5 minutes'
          : "Add CSP header to your server configuration",
        steps: isWordPress
          ? [
              "1. Dashboard → Plugins → Add New",
              '2. Search "HTTP Headers"',
              "3. Install + Activate",
              "4. Go to Settings → HTTP Headers",
              "5. Add new header: Content-Security-Policy",
              "6. Value: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
              "7. Save and test your site (make sure nothing breaks)",
              "8. Gradually tighten policy by removing 'unsafe-inline' if possible",
            ]
          : [
              "1. Open .htaccess (Apache) or nginx.conf (Nginx)",
              "2. Add CSP header (see code snippet below)",
              "3. Test with: curl -I https://yourdomain.com",
              "4. Verify header appears in response",
              "5. Test site functionality (forms, scripts, etc.)",
            ],
        timeEstimate: isWordPress ? "5 minutes" : "15 minutes",
        difficulty: "easy",
        codeSnippet: isWordPress
          ? undefined
          : `# Apache (.htaccess)
Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"

# Nginx (nginx.conf)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;`,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
      },
      relatedTab: "security",
      sequenceOrder: 6,
    });
  }

  return insights;
}

function generatePerformanceInsights(data: ScanData): AIInsight[] {
  const insights: AIInsight[] = [];
  const { performanceData } = data;

  if (!performanceData) return insights;

  const mobileScore = performanceData.mobile?.score || 0;
  const desktopScore = performanceData.desktop?.score || 0;

  // Large mobile/desktop score gap
  if (desktopScore - mobileScore > 20) {
    insights.push({
      id: "perf-mobile-gap",
      type: "performance",
      priority: "high",
      category: "Mobile Performance",
      title: `Mobile Score (${mobileScore}) is ${desktopScore - mobileScore} Points Behind Desktop (${desktopScore})`,
      description: `Your site performs well on desktop but poorly on mobile. This suggests unoptimized images, render-blocking resources, or heavy JavaScript that mobile devices struggle with.`,
      impact: {
        score: desktopScore - mobileScore,
        metric: "Mobile Performance",
        business: `60-70% of web traffic is mobile. Your mobile users are experiencing load times 2-3x slower than desktop users. This directly increases bounce rate (53% of mobile users abandon sites that take over 3 seconds). For a site with 10k monthly visitors, that's 6k mobile users with a poor experience.`,
      },
      recommendation: {
        summary:
          "Optimize for mobile-first: compress images, defer JavaScript, enable lazy loading",
        steps: [
          "1. Compress images: Use TinyPNG or Squoosh.app to reduce image sizes by 60-80%",
          "2. Convert to WebP format (95% browser support, 30% smaller than JPEG)",
          '3. Add loading="lazy" to all images below the fold',
          "4. Defer non-critical JavaScript: Add defer attribute to script tags",
          "5. Minify CSS/JS: Use online tools or build process",
          "6. Test on real mobile device (not just Chrome DevTools)",
          "7. Re-run PageSpeed Insights - aim for 70+ mobile score",
        ],
        timeEstimate: "2 hours",
        difficulty: "medium",
      },
      relatedTab: "performance",
      sequenceOrder: 7,
    });
  }

  return insights;
}

// ============================================================================
// PRIORITY & SEQUENCING ENGINE
// ============================================================================

function prioritizeInsights(insights: AIInsight[]): AIInsight[] {
  // Assign sequence orders based on dependencies
  insights.forEach((insight) => {
    if (!insight.sequenceOrder) {
      // Default ordering by priority
      const priorityOrder: Record<string, number> = {
        critical: 10,
        high: 20,
        medium: 30,
        low: 40,
      };
      insight.sequenceOrder = priorityOrder[insight.priority] || 50;
    }
  });

  // Sort by sequence order, then priority
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return insights.sort((a, b) => {
    if (a.sequenceOrder !== b.sequenceOrder) {
      return (a.sequenceOrder || 999) - (b.sequenceOrder || 999);
    }
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: Request, res: Response) {
  try {
    const scanData: ScanData = req.body;

    // Validate required data
    if (!scanData.technologyData || !scanData.securityData) {
      return res.status(400).json({ error: "Missing required scan data" });
    }

    // Generate insights from all analyzers
    const crossTabAnalyzer = new CrossTabAnalyzer(scanData);
    const wordpressAnalyzer = new WordPressAnalyzer(scanData);

    const allInsights: AIInsight[] = [
      ...crossTabAnalyzer.getAllInsights(),
      ...wordpressAnalyzer.analyzePlugins(),
      ...generateSecurityInsights(scanData),
      ...generatePerformanceInsights(scanData),
    ];

    // Deduplicate insights (prevent showing same issue twice)
    const uniqueInsights = allInsights.filter(
      (insight, index, self) =>
        index === self.findIndex((i) => i.id === insight.id),
    );

    // Prioritize and sequence
    const prioritizedInsights = prioritizeInsights(uniqueInsights);

    // ============================================================================
    // GPT-4 ENHANCEMENT (Hybrid System)
    // ============================================================================

    let finalInsights = prioritizedInsights;
    let gptEnhanced = false;
    let upgradePrompt: string | undefined;

    const openaiKey = getSecret("OPENAI_API_KEY");

    if (openaiKey) {
      try {
        // Check if user can use GPT (freemium gating)
        // For now, allow all users during free trial period
        // User tracking and gating not yet implemented
        const user = (req as Request & { user?: unknown }).user; // From auth middleware
        const gptScansThisMonth = 0; // Query from database when tracking is enabled

        const allowGPT = !user || canUseGPT(user, gptScansThisMonth);

        if (allowGPT) {
          console.log("Enhancing insights with GPT-4...");
          const gptInsights = await enhanceInsightsWithGPT(
            scanData,
            prioritizedInsights,
          );

          if (gptInsights.length > 0) {
            // Add GPT insights to the list
            finalInsights = [...prioritizedInsights, ...gptInsights];
            gptEnhanced = true;
            console.log(`Added ${gptInsights.length} GPT-enhanced insights`);
          }
        } else {
          // User exceeded free tier
          upgradePrompt =
            "Upgrade to Premium for unlimited GPT-4 enhanced insights ($10/month)";
        }
      } catch (gptError: unknown) {
        const gptMessage =
          gptError instanceof Error ? gptError.message : String(gptError);
        console.error(
          "GPT enhancement failed, using rule-based only:",
          gptMessage,
        );
        // Graceful fallback - still return rule-based insights
      }
    } else {
      console.log(
        "OpenAI API key not configured, using rule-based insights only",
      );
    }

    // Generate summary (with GPT insights included)
    const summary = {
      totalIssues: finalInsights.length,
      criticalCount: finalInsights.filter((i) => i.priority === "critical")
        .length,
      highCount: finalInsights.filter((i) => i.priority === "high").length,
      estimatedImpact:
        finalInsights
          .filter((i) => i.impact.score)
          .reduce((sum, i) => sum + (i.impact.score || 0), 0)
          .toString() + " points potential improvement",
    };

    res.json({
      insights: finalInsights,
      summary,
      gptEnhanced, // Tell frontend if GPT was used
      upgradePrompt, // Show upgrade message if needed
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    res.status(500).json({ error: "Failed to generate insights" });
  }
}
