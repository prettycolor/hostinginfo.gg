import type { Request, Response } from "express";
import { validateBody, domainSchema } from "../../../middleware/index.js";
import {
  IntelligenceOrchestrator,
  type ScanData,
} from "../../../../lib/intelligence-orchestrator.js";
import { db } from "../../../db/client.js";
import { intelligenceScans } from "../../../db/schema.js";

/**
 * Intelligence Analysis API Endpoint
 *
 * Runs comprehensive intelligence analysis using the unified orchestrator
 * and persists results to the database.
 */
async function handler(req: Request, res: Response) {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // In a real implementation, this would call actual scanning services
    // For demo purposes, we'll generate mock scan data
    const mockScanData = generateMockScanData(domain);

    // Run comprehensive intelligence analysis
    const startTime = Date.now();
    const intelligence = await IntelligenceOrchestrator.analyze(mockScanData);
    const scanDuration = Date.now() - startTime;

    // Persist to database
    try {
      await db.insert(intelligenceScans).values({
        domain,
        edgeProvider: mockScanData.hosting.edgeProvider,
        edgeConfidence: mockScanData.hosting.edgeProvider ? 95 : null,
        originHost: mockScanData.hosting.originHost,
        originConfidence: mockScanData.hosting.originHost ? 90 : null,
        confidenceScore: 92,
        detectionMethod: "fusion",
        hostingData: JSON.stringify(intelligence.hostingRecommendations),
        dnsData: JSON.stringify(intelligence.dns),
        ipData: JSON.stringify(mockScanData.ip),
        techData: JSON.stringify(intelligence.techStack),
        techCount: intelligence.techStack.totalTechnologies,
        recordCount:
          mockScanData.dns.nameservers.length + mockScanData.dns.a.length,
        openPorts: JSON.stringify([80, 443]),
        scanDuration,
      });
    } catch (dbError) {
      console.error("[Intelligence] Failed to persist scan:", dbError);
      // Continue even if DB save fails - return the intelligence data
    }

    // Generate actionable insights
    const insights = IntelligenceOrchestrator.generateInsights(intelligence);

    res.json({
      ...intelligence,
      insights,
      scanDuration,
    });
  } catch (error) {
    console.error("Intelligence analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze domain",
      message: "An internal error occurred",
    });
  }
}

/**
 * Generate mock scan data for demo purposes
 * In production, this would come from actual scanning services
 */
function generateMockScanData(domain: string): ScanData {
  const isHostingInfo = domain.toLowerCase().includes("hostinginfo");
  const isWordPress = Math.random() > 0.5;
  const hasSSL = true;
  const hasCDN = Math.random() > 0.3;

  return {
    domain,
    hosting: {
      originHost: isHostingInfo ? "HostingInfo" : "Unknown",
      edgeProvider: hasCDN ? "Cloudflare" : null,
      framework: isWordPress ? "WordPress" : null,
    },
    security: {
      ssl: {
        valid: hasSSL,
        issuer: "Let's Encrypt",
        expiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      headers: {
        "content-encoding": hasCDN ? "gzip" : undefined,
        "cache-control": "max-age=3600",
        "strict-transport-security": hasSSL ? "max-age=31536000" : undefined,
      },
    },
    dns: {
      nameservers: [
        "ns1.example.com",
        "ns2.example.com",
        "ns3.example.com",
        "ns4.example.com",
      ],
      a: ["192.0.2.1"],
      aaaa: Math.random() > 0.5 ? ["2001:db8::1"] : [],
      mx: [
        { priority: 10, exchange: "mail.example.com" },
        { priority: 20, exchange: "mail2.example.com" },
      ],
      txt: [
        "v=spf1 include:_spf.google.com ~all",
        "google-site-verification=abc123",
      ],
      dnssec: Math.random() > 0.7,
      ttl: 3600,
    },
    tech: {
      technologies: generateMockTechnologies(isWordPress),
    },
    ip: {
      address: "192.0.2.1",
      location: {
        country: "United States",
        city: "Phoenix",
        region: "Arizona",
      },
      asn: {
        number: "AS12345",
        organization: isHostingInfo
          ? "HostingInfo.com, LLC"
          : "Example Hosting",
      },
    },
    performance: {
      loadTime: 1200 + Math.random() * 800,
      ttfb: 200 + Math.random() * 300,
      fcp: 800 + Math.random() * 400,
      lcp: 1500 + Math.random() * 1000,
      cls: Math.random() * 0.2,
      fid: 50 + Math.random() * 100,
    },
  };
}

/**
 * Generate mock technologies
 */
function generateMockTechnologies(isWordPress: boolean) {
  const baseTech = [
    { name: "Cloudflare", category: "CDN", confidence: 100 },
    { name: "Google Analytics", category: "Analytics", confidence: 95 },
    {
      name: "jQuery",
      version: "3.6.0",
      category: "JavaScript Library",
      confidence: 100,
    },
  ];

  if (isWordPress) {
    return [
      { name: "WordPress", version: "6.4", category: "CMS", confidence: 100 },
      {
        name: "PHP",
        version: "8.1",
        category: "Programming Language",
        confidence: 100,
      },
      { name: "MySQL", version: "8.0", category: "Database", confidence: 90 },
      ...baseTech,
      {
        name: "WooCommerce",
        version: "8.0",
        category: "E-commerce",
        confidence: 85,
      },
    ];
  }

  return [
    {
      name: "React",
      version: "18.2",
      category: "JavaScript Framework",
      confidence: 100,
    },
    {
      name: "Next.js",
      version: "14.0",
      category: "Web Framework",
      confidence: 100,
    },
    { name: "Tailwind CSS", category: "CSS Framework", confidence: 95 },
    ...baseTech,
  ];
}

// Export with validation middleware
export default [validateBody(domainSchema), handler];
