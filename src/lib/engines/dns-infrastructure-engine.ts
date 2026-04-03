/**
 * DNS Infrastructure Analysis Engine
 *
 * Analyzes DNS configuration, nameservers, and infrastructure setup
 */

export interface DNSRecord {
  type: string;
  value: string;
  ttl?: number;
}

export interface DNSAnalysis {
  nameservers: string[];
  provider: string;
  records: {
    a: DNSRecord[];
    aaaa: DNSRecord[];
    mx: DNSRecord[];
    txt: DNSRecord[];
    cname: DNSRecord[];
  };
  configuration: {
    hasCDN: boolean;
    hasEmailSetup: boolean;
    hasIPv6: boolean;
    hasDNSSEC: boolean;
    ttlOptimized: boolean;
  };
  insights: string[];
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    benefit: string;
  }>;
  securityScore: number; // 0-100
}

interface DNSScanData {
  hosting?: {
    edgeProvider?: string;
  };
  dns?: {
    nameservers?: string[];
    a?: DNSRecord[];
    aaaa?: DNSRecord[];
    mx?: DNSRecord[];
    txt?: DNSRecord[];
    cname?: DNSRecord[];
    dnssec?: boolean;
  };
}

export class DNSInfrastructureEngine {
  /**
   * Analyze DNS infrastructure
   */
  static analyzeDNS(scanData: DNSScanData): DNSAnalysis {
    const nameservers = this.extractNameservers(scanData);
    const provider = this.identifyDNSProvider(nameservers);
    const records = this.extractRecords(scanData);
    const configuration = this.analyzeConfiguration(scanData, records);
    const securityScore = this.calculateSecurityScore(configuration, scanData);
    const insights = this.generateInsights(
      provider,
      configuration,
      nameservers,
    );
    const recommendations = this.generateRecommendations(
      configuration,
      scanData,
    );

    return {
      nameservers,
      provider,
      records,
      configuration,
      insights,
      recommendations,
      securityScore,
    };
  }

  /**
   * Extract nameservers from scan data
   */
  private static extractNameservers(scanData: DNSScanData): string[] {
    const ns = scanData.dns?.nameservers || [];
    return Array.isArray(ns) ? ns : [];
  }

  /**
   * Identify DNS provider from nameservers
   */
  private static identifyDNSProvider(nameservers: string[]): string {
    const nsString = nameservers.join(" ").toLowerCase();

    if (nsString.includes("cloudflare")) return "Cloudflare";
    if (nsString.includes("awsdns")) return "AWS Route 53";
    if (nsString.includes("azure")) return "Azure DNS";
    if (nsString.includes("googledomains") || nsString.includes("google"))
      return "Google Cloud DNS";
    if (nsString.includes("hostinginfo")) return "HostingInfo";
    if (nsString.includes("namecheap")) return "Namecheap";
    if (nsString.includes("bluehost")) return "Bluehost";
    if (nsString.includes("hostgator")) return "HostGator";
    if (nsString.includes("dreamhost")) return "DreamHost";
    if (nsString.includes("ns1.")) return "NS1";
    if (nsString.includes("dnsimple")) return "DNSimple";

    return "Unknown Provider";
  }

  /**
   * Extract DNS records
   */
  private static extractRecords(scanData: DNSScanData): DNSAnalysis["records"] {
    return {
      a: scanData.dns?.a || [],
      aaaa: scanData.dns?.aaaa || [],
      mx: scanData.dns?.mx || [],
      txt: scanData.dns?.txt || [],
      cname: scanData.dns?.cname || [],
    };
  }

  /**
   * Analyze DNS configuration
   */
  private static analyzeConfiguration(
    scanData: DNSScanData,
    records: DNSAnalysis["records"],
  ): DNSAnalysis["configuration"] {
    const hasCDN = !!scanData.hosting?.edgeProvider;
    const hasEmailSetup = records.mx.length > 0;
    const hasIPv6 = records.aaaa.length > 0;
    const hasDNSSEC = scanData.dns?.dnssec === true;

    // Check if TTL is optimized (not too low, not too high)
    const aRecords = records.a || [];
    const avgTTL =
      aRecords.length > 0
        ? aRecords.reduce((sum, r) => sum + (r.ttl || 3600), 0) /
          aRecords.length
        : 3600;
    const ttlOptimized = avgTTL >= 300 && avgTTL <= 86400; // 5 min to 1 day

    return {
      hasCDN,
      hasEmailSetup,
      hasIPv6,
      hasDNSSEC,
      ttlOptimized,
    };
  }

  /**
   * Calculate DNS security score
   */
  private static calculateSecurityScore(
    config: DNSAnalysis["configuration"],
    scanData: DNSScanData,
  ): number {
    let score = 50; // Base score

    if (config.hasDNSSEC) score += 25;
    if (config.hasCDN) score += 15;
    if (config.hasIPv6) score += 10;
    if (config.ttlOptimized) score += 5;

    // Bonus for premium DNS providers
    const provider = this.identifyDNSProvider(scanData.dns?.nameservers || []);
    if (["Cloudflare", "AWS Route 53", "Google Cloud DNS"].includes(provider)) {
      score += 10;
    }

    // Penalty for no email setup (might indicate incomplete setup)
    if (!config.hasEmailSetup) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate DNS insights
   */
  private static generateInsights(
    provider: string,
    config: DNSAnalysis["configuration"],
    nameservers: string[],
  ): string[] {
    const insights: string[] = [];

    // Provider insight
    if (provider === "Cloudflare") {
      insights.push(
        "🛡️ Using Cloudflare DNS - excellent performance and security",
      );
    } else if (provider === "AWS Route 53") {
      insights.push(
        "☁️ AWS Route 53 - enterprise-grade DNS with global presence",
      );
    } else if (provider === "HostingInfo") {
      insights.push("🌐 HostingInfo DNS - reliable and easy to manage");
    } else if (provider === "Unknown Provider") {
      insights.push("❓ Custom DNS provider detected");
    }

    // DNSSEC insight
    if (config.hasDNSSEC) {
      insights.push("✅ DNSSEC enabled - protected against DNS spoofing");
    } else {
      insights.push(
        "⚠️ DNSSEC not enabled - consider enabling for better security",
      );
    }

    // IPv6 insight
    if (config.hasIPv6) {
      insights.push("🌍 IPv6 enabled - ready for modern internet");
    } else {
      insights.push("📡 IPv6 not configured - consider adding AAAA records");
    }

    // CDN insight
    if (config.hasCDN) {
      insights.push("⚡ CDN detected - optimized for global performance");
    }

    // Email insight
    if (config.hasEmailSetup) {
      insights.push("📧 Email records configured - professional email setup");
    } else {
      insights.push("📧 No MX records found - email may not be configured");
    }

    // Nameserver count
    if (nameservers.length >= 2) {
      insights.push(`✅ ${nameservers.length} nameservers - good redundancy`);
    } else {
      insights.push("⚠️ Only 1 nameserver - add more for redundancy");
    }

    return insights;
  }

  /**
   * Generate DNS recommendations
   */
  private static generateRecommendations(
    config: DNSAnalysis["configuration"],
    scanData: DNSScanData,
  ): DNSAnalysis["recommendations"] {
    const recommendations: DNSAnalysis["recommendations"] = [];

    // DNSSEC recommendation
    if (!config.hasDNSSEC) {
      recommendations.push({
        priority: "high",
        title: "Enable DNSSEC",
        description:
          "Add DNSSEC to protect against DNS cache poisoning and spoofing attacks",
        benefit: "Enhanced security and trust",
      });
    }

    // IPv6 recommendation
    if (!config.hasIPv6) {
      recommendations.push({
        priority: "medium",
        title: "Add IPv6 Support",
        description: "Configure AAAA records to support IPv6 connections",
        benefit: "Future-proof and better performance for IPv6 users",
      });
    }

    // CDN recommendation
    if (!config.hasCDN) {
      recommendations.push({
        priority: "high",
        title: "Enable CDN",
        description:
          "Add Cloudflare or similar CDN to improve global performance",
        benefit: "40-60% faster load times worldwide",
      });
    }

    // Email setup recommendation
    if (!config.hasEmailSetup) {
      recommendations.push({
        priority: "low",
        title: "Configure Email Records",
        description:
          "Set up MX records for professional email (@yourdomain.com)",
        benefit: "Professional communication and branding",
      });
    }

    // TTL optimization
    if (!config.ttlOptimized) {
      recommendations.push({
        priority: "low",
        title: "Optimize DNS TTL Values",
        description:
          "Adjust TTL to balance between propagation speed and DNS query load",
        benefit: "Better performance and flexibility",
      });
    }

    // Cloudflare recommendation for non-Cloudflare users
    const provider = this.identifyDNSProvider(scanData.dns?.nameservers || []);
    if (provider !== "Cloudflare" && !config.hasCDN) {
      recommendations.push({
        priority: "medium",
        title: "Consider Cloudflare DNS",
        description:
          "Cloudflare offers free DNS with built-in CDN, DDoS protection, and SSL",
        benefit: "Free performance and security upgrades",
      });
    }

    return recommendations;
  }
}
