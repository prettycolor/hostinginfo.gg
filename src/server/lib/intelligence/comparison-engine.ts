/**
 * Domain Comparison Engine
 *
 * Compares multiple domains (2-5) side-by-side across DNS, hosting,
 * technology, security, and performance dimensions.
 *
 * @module comparison-engine
 */

import type {
  ComparisonRequest,
  ComparisonResult,
  ComparisonCategory,
  DnsComparison,
  DnsComparisonData,
  HostingComparison,
  HostingComparisonData,
  TechnologyComparison,
  TechnologyComparisonData,
  SecurityComparison,
  SecurityComparisonData,
  PerformanceComparison,
  PerformanceComparisonData,
  DomainSimilarity,
  ComparisonSummary,
} from "../../../types/comparison.js";

/**
 * Compare DNS configurations across domains
 */
export async function compareDns(_domains: string[]): Promise<DnsComparison> {
  const dnsData: DnsComparisonData[] = [];

  // Placeholder: requires dnsRecords table integration
  // for (const domain of domains) {
  //   const records = await db.select().from(dnsRecords)
  //     .where(eq(dnsRecords.domain, domain))
  //     .orderBy(desc(dnsRecords.queriedAt))
  //     .limit(1);
  //
  //   if (records.length > 0) {
  //     dnsData.push({
  //       domain,
  //       aRecords: records[0].aRecords || [],
  //       aaaaRecords: records[0].aaaaRecords || [],
  //       mxRecords: records[0].mxRecords || [],
  //       txtRecords: records[0].txtRecords || [],
  //       nsRecords: records[0].nsRecords || [],
  //       cnameRecord: records[0].cnameRecord,
  //       ttl: records[0].ttl || 3600,
  //       dnssecEnabled: records[0].dnssecEnabled || false,
  //       recordCount: records[0].recordCount || 0,
  //     });
  //   }
  // }

  // Calculate insights
  const allNameservers = dnsData.flatMap((d) => d.nsRecords);
  const sharedNameservers = allNameservers.filter(
    (ns, idx, arr) => arr.indexOf(ns) !== idx,
  );

  const allIPs = dnsData.flatMap((d) => d.aRecords);
  const sharedIPs = allIPs.filter((ip, idx, arr) => arr.indexOf(ip) !== idx);

  const ttls = dnsData.map((d) => d.ttl);
  const ttlVariance =
    ttls.length > 0 ? Math.max(...ttls) - Math.min(...ttls) : 0;

  const dnssecCount = dnsData.filter((d) => d.dnssecEnabled).length;
  const dnssecAdoption =
    dnsData.length > 0 ? (dnssecCount / dnsData.length) * 100 : 0;

  // Calculate similarities between domain pairs
  const similarities: Array<{
    domain1: string;
    domain2: string;
    score: number;
    sharedElements: string[];
  }> = [];

  for (let i = 0; i < dnsData.length; i++) {
    for (let j = i + 1; j < dnsData.length; j++) {
      const d1 = dnsData[i];
      const d2 = dnsData[j];
      const sharedElements: string[] = [];

      // Check shared nameservers
      const sharedNS = d1.nsRecords.filter((ns) => d2.nsRecords.includes(ns));
      if (sharedNS.length > 0) {
        sharedElements.push(`${sharedNS.length} shared nameserver(s)`);
      }

      // Check shared IPs
      const sharedIP = d1.aRecords.filter((ip) => d2.aRecords.includes(ip));
      if (sharedIP.length > 0) {
        sharedElements.push(`${sharedIP.length} shared IP(s)`);
      }

      // Check DNSSEC
      if (d1.dnssecEnabled === d2.dnssecEnabled) {
        sharedElements.push("Same DNSSEC status");
      }

      // Calculate similarity score
      const score = Math.min(
        100,
        sharedNS.length * 30 +
          sharedIP.length * 40 +
          sharedElements.length * 10,
      );

      similarities.push({
        domain1: d1.domain,
        domain2: d2.domain,
        score,
        sharedElements,
      });
    }
  }

  return {
    category: "dns",
    domains: dnsData,
    insights: {
      sharedNameservers: [...new Set(sharedNameservers)],
      sharedIPs: [...new Set(sharedIPs)],
      ttlVariance,
      dnssecAdoption,
      commonRecordTypes: ["A", "MX", "TXT", "NS"], // Simplified
    },
    similarities,
  };
}

/**
 * Compare hosting configurations across domains
 */
export async function compareHosting(
  _domains: string[],
): Promise<HostingComparison> {
  const hostingData: HostingComparisonData[] = [];

  // Placeholder: requires ipIntelligence table integration
  // for (const domain of domains) {
  //   const ipData = await db.select().from(ipIntelligence)
  //     .where(eq(ipIntelligence.domain, domain))
  //     .orderBy(desc(ipIntelligence.queriedAt))
  //     .limit(1);
  //
  //   if (ipData.length > 0) {
  //     hostingData.push({
  //       domain,
  //       ipAddress: ipData[0].ipAddress,
  //       ipv6Address: ipData[0].ipv6Address,
  //       provider: ipData[0].provider || 'Unknown',
  //       asn: ipData[0].asn || 'Unknown',
  //       asnOrg: ipData[0].asnOrg || 'Unknown',
  //       country: ipData[0].country || 'Unknown',
  //       city: ipData[0].city || 'Unknown',
  //       datacenterLocation: ipData[0].datacenterLocation,
  //       hostingType: ipData[0].hostingType || 'unknown',
  //       reverseIp: ipData[0].reverseIp,
  //     });
  //   }
  // }

  // Calculate insights
  const providers = hostingData.map((h) => h.provider);
  const sharedProviders = providers.filter(
    (p, idx, arr) => arr.indexOf(p) !== idx && p !== "Unknown",
  );

  const asns = hostingData.map((h) => h.asn);
  const sharedASNs = asns.filter(
    (a, idx, arr) => arr.indexOf(a) !== idx && a !== "Unknown",
  );

  const geoDistribution = hostingData.reduce(
    (acc, h) => {
      const existing = acc.find((g) => g.country === h.country);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ country: h.country, count: 1 });
      }
      return acc;
    },
    [] as Array<{ country: string; count: number }>,
  );

  const hostingTypeDistribution = hostingData.reduce(
    (acc, h) => {
      acc[h.hostingType] = (acc[h.hostingType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const ipv6Count = hostingData.filter((h) => h.ipv6Address).length;
  const ipv6Adoption =
    hostingData.length > 0 ? (ipv6Count / hostingData.length) * 100 : 0;

  // Calculate similarities
  const similarities: Array<{
    domain1: string;
    domain2: string;
    score: number;
    sharedElements: string[];
  }> = [];

  for (let i = 0; i < hostingData.length; i++) {
    for (let j = i + 1; j < hostingData.length; j++) {
      const h1 = hostingData[i];
      const h2 = hostingData[j];
      const sharedElements: string[] = [];
      let score = 0;

      if (h1.provider === h2.provider && h1.provider !== "Unknown") {
        sharedElements.push("Same hosting provider");
        score += 40;
      }

      if (h1.asn === h2.asn && h1.asn !== "Unknown") {
        sharedElements.push("Same ASN");
        score += 30;
      }

      if (h1.country === h2.country) {
        sharedElements.push("Same country");
        score += 20;
      }

      if (h1.hostingType === h2.hostingType && h1.hostingType !== "unknown") {
        sharedElements.push("Same hosting type");
        score += 10;
      }

      similarities.push({
        domain1: h1.domain,
        domain2: h2.domain,
        score: Math.min(100, score),
        sharedElements,
      });
    }
  }

  return {
    category: "hosting",
    domains: hostingData,
    insights: {
      sharedProviders: [...new Set(sharedProviders)],
      sharedASNs: [...new Set(sharedASNs)],
      geographicDistribution: geoDistribution,
      hostingTypeDistribution,
      ipv6Adoption,
    },
    similarities,
  };
}

/**
 * Compare technology stacks across domains
 */
export async function compareTechnology(
  _domains: string[],
): Promise<TechnologyComparison> {
  const techData: TechnologyComparisonData[] = [];

  // Placeholder: requires technologyStack table integration

  // Calculate insights
  const allTechnologies = techData
    .flatMap((t) => [
      t.webServer,
      ...t.frameworks,
      t.cms || "",
      ...t.programmingLanguages,
      ...t.jsLibraries,
      ...t.analytics,
      ...t.cdns,
      ...t.securityTools,
    ])
    .filter(Boolean);

  const techCounts = allTechnologies.reduce(
    (acc, tech) => {
      acc[tech] = (acc[tech] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const commonTechnologies = Object.entries(techCounts)
    .filter(([_, count]) => count > 1)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate similarities
  const similarities: Array<{
    domain1: string;
    domain2: string;
    score: number;
    sharedTechnologies: string[];
  }> = [];

  for (let i = 0; i < techData.length; i++) {
    for (let j = i + 1; j < techData.length; j++) {
      const t1 = techData[i];
      const t2 = techData[j];

      const allT1 = [
        t1.webServer,
        ...t1.frameworks,
        t1.cms || "",
        ...t1.jsLibraries,
      ].filter(Boolean);
      const allT2 = [
        t2.webServer,
        ...t2.frameworks,
        t2.cms || "",
        ...t2.jsLibraries,
      ].filter(Boolean);

      const sharedTechnologies = allT1.filter((tech) => allT2.includes(tech));
      const score = Math.min(
        100,
        (sharedTechnologies.length / Math.max(allT1.length, allT2.length)) *
          100,
      );

      similarities.push({
        domain1: t1.domain,
        domain2: t2.domain,
        score,
        sharedTechnologies,
      });
    }
  }

  return {
    category: "technology",
    domains: techData,
    insights: {
      commonTechnologies,
      uniqueTechnologies: [],
      frameworkDistribution: {},
      cmsDistribution: {},
      modernStackAdoption: 0,
    },
    similarities,
  };
}

/**
 * Compare security configurations across domains
 */
export async function compareSecurity(
  _domains: string[],
): Promise<SecurityComparison> {
  const securityData: SecurityComparisonData[] = [];

  // Placeholder: requires urlscanResults table integration

  // Calculate insights
  const httpsCount = securityData.filter((s) => s.httpsEnabled).length;
  const httpsAdoption =
    securityData.length > 0 ? (httpsCount / securityData.length) * 100 : 0;

  const avgScore =
    securityData.length > 0
      ? securityData.reduce((sum, s) => sum + s.securityScore, 0) /
        securityData.length
      : 0;

  // Calculate similarities
  const similarities: Array<{
    domain1: string;
    domain2: string;
    score: number;
    sharedCharacteristics: string[];
  }> = [];

  for (let i = 0; i < securityData.length; i++) {
    for (let j = i + 1; j < securityData.length; j++) {
      const s1 = securityData[i];
      const s2 = securityData[j];
      const sharedCharacteristics: string[] = [];
      let score = 0;

      if (s1.httpsEnabled === s2.httpsEnabled) {
        sharedCharacteristics.push("Same HTTPS status");
        score += 20;
      }

      if (s1.sslGrade === s2.sslGrade) {
        sharedCharacteristics.push("Same SSL grade");
        score += 30;
      }

      // Compare security headers
      const h1 = Object.values(s1.securityHeaders).filter(Boolean).length;
      const h2 = Object.values(s2.securityHeaders).filter(Boolean).length;
      if (Math.abs(h1 - h2) <= 1) {
        sharedCharacteristics.push("Similar security headers");
        score += 30;
      }

      similarities.push({
        domain1: s1.domain,
        domain2: s2.domain,
        score: Math.min(100, score),
        sharedCharacteristics,
      });
    }
  }

  return {
    category: "security",
    domains: securityData,
    insights: {
      httpsAdoption,
      averageSecurityScore: avgScore,
      commonVulnerabilities: [],
      securityHeaderAdoption: {},
      certificateIssuers: [],
    },
    similarities,
  };
}

/**
 * Compare performance metrics across domains
 */
export async function comparePerformance(
  _domains: string[],
): Promise<PerformanceComparison> {
  const perfData: PerformanceComparisonData[] = [];

  // Placeholder: requires performance data integration

  // Calculate insights
  const sortedByLoadTime = [...perfData].sort(
    (a, b) => a.loadTime - b.loadTime,
  );
  const fastestDomain = sortedByLoadTime[0]?.domain || "";
  const slowestDomain =
    sortedByLoadTime[sortedByLoadTime.length - 1]?.domain || "";

  const avgLoadTime =
    perfData.length > 0
      ? perfData.reduce((sum, p) => sum + p.loadTime, 0) / perfData.length
      : 0;

  const avgScore =
    perfData.length > 0
      ? perfData.reduce((sum, p) => sum + p.performanceScore, 0) /
        perfData.length
      : 0;

  const rankings = perfData
    .map((p) => ({ domain: p.domain, score: p.performanceScore }))
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    category: "performance",
    domains: perfData,
    insights: {
      fastestDomain,
      slowestDomain,
      averageLoadTime: avgLoadTime,
      averagePerformanceScore: avgScore,
      gradeDistribution: {},
      performanceLeader: fastestDomain,
    },
    rankings,
  };
}

/**
 * Calculate overall similarity between domains
 */
function calculateSimilarities(
  dnsComp?: DnsComparison,
  hostingComp?: HostingComparison,
  techComp?: TechnologyComparison,
  securityComp?: SecurityComparison,
  _perfComp?: PerformanceComparison,
): DomainSimilarity[] {
  const similarities: DomainSimilarity[] = [];
  const domainPairs = new Set<string>();

  // Collect all domain pairs from comparisons
  const allSimilarities = [
    ...(dnsComp?.similarities || []),
    ...(hostingComp?.similarities || []),
    ...(techComp?.similarities || []),
    ...(securityComp?.similarities || []),
  ];

  allSimilarities.forEach((sim) => {
    const pairKey = [sim.domain1, sim.domain2].sort().join("|");
    domainPairs.add(pairKey);
  });

  // Calculate overall similarity for each pair
  domainPairs.forEach((pairKey) => {
    const [domain1, domain2] = pairKey.split("|");
    const categoryScores: Record<string, number> = {};
    const sharedCharacteristics: string[] = [];
    const keyDifferences: string[] = [];

    // DNS score
    const dnsSim = dnsComp?.similarities.find(
      (s) =>
        (s.domain1 === domain1 && s.domain2 === domain2) ||
        (s.domain1 === domain2 && s.domain2 === domain1),
    );
    if (dnsSim) {
      categoryScores.dns = dnsSim.score;
      sharedCharacteristics.push(...dnsSim.sharedElements);
    }

    // Hosting score
    const hostingSim = hostingComp?.similarities.find(
      (s) =>
        (s.domain1 === domain1 && s.domain2 === domain2) ||
        (s.domain1 === domain2 && s.domain2 === domain1),
    );
    if (hostingSim) {
      categoryScores.hosting = hostingSim.score;
      sharedCharacteristics.push(...hostingSim.sharedElements);
    }

    // Technology score
    const techSim = techComp?.similarities.find(
      (s) =>
        (s.domain1 === domain1 && s.domain2 === domain2) ||
        (s.domain1 === domain2 && s.domain2 === domain1),
    );
    if (techSim) {
      categoryScores.technology = techSim.score;
      if (techSim.sharedTechnologies.length > 0) {
        sharedCharacteristics.push(
          `${techSim.sharedTechnologies.length} shared technologies`,
        );
      }
    }

    // Security score
    const securitySim = securityComp?.similarities.find(
      (s) =>
        (s.domain1 === domain1 && s.domain2 === domain2) ||
        (s.domain1 === domain2 && s.domain2 === domain1),
    );
    if (securitySim) {
      categoryScores.security = securitySim.score;
      sharedCharacteristics.push(...securitySim.sharedCharacteristics);
    }

    // Calculate overall score
    const scores = Object.values(categoryScores) as number[];
    const overallScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    // Determine relationship
    let relationship: DomainSimilarity["relationship"];
    if (overallScore >= 90) relationship = "identical";
    else if (overallScore >= 70) relationship = "very_similar";
    else if (overallScore >= 50) relationship = "similar";
    else if (overallScore >= 30) relationship = "somewhat_similar";
    else relationship = "different";

    similarities.push({
      domain1,
      domain2,
      overallScore,
      categoryScores,
      relationship,
      sharedCharacteristics: [...new Set(sharedCharacteristics)],
      keyDifferences,
    });
  });

  return similarities;
}

/**
 * Generate comparison summary
 */
function generateSummary(
  domains: string[],
  categories: ComparisonCategory[],
  similarities: DomainSimilarity[],
): ComparisonSummary {
  // Find most and least similar pairs
  const sortedSimilarities = [...similarities].sort(
    (a, b) => b.overallScore - a.overallScore,
  );
  const mostSimilar = sortedSimilarities[0];
  const leastSimilar = sortedSimilarities[sortedSimilarities.length - 1];

  return {
    totalDomains: domains.length,
    categoriesCompared: categories.length,
    mostSimilarPair: mostSimilar
      ? {
          domain1: mostSimilar.domain1,
          domain2: mostSimilar.domain2,
          score: mostSimilar.overallScore,
        }
      : { domain1: "", domain2: "", score: 0 },
    leastSimilarPair: leastSimilar
      ? {
          domain1: leastSimilar.domain1,
          domain2: leastSimilar.domain2,
          score: leastSimilar.overallScore,
        }
      : { domain1: "", domain2: "", score: 0 },
    keyFindings: [],
    competitiveInsights: [],
    recommendations: [],
  };
}

/**
 * Compare multiple domains across specified categories
 */
export async function compareDomains(
  request: ComparisonRequest,
): Promise<ComparisonResult> {
  const {
    domains,
    categories = ["dns", "hosting", "technology", "security", "performance"],
  } = request;
  const now = new Date().toISOString();

  // Validate domain count
  if (domains.length < 2 || domains.length > 5) {
    throw new Error("Please provide 2-5 domains to compare");
  }

  // Run comparisons in parallel for requested categories
  const comparisons = await Promise.all([
    categories.includes("dns")
      ? compareDns(domains)
      : Promise.resolve(undefined),
    categories.includes("hosting")
      ? compareHosting(domains)
      : Promise.resolve(undefined),
    categories.includes("technology")
      ? compareTechnology(domains)
      : Promise.resolve(undefined),
    categories.includes("security")
      ? compareSecurity(domains)
      : Promise.resolve(undefined),
    categories.includes("performance")
      ? comparePerformance(domains)
      : Promise.resolve(undefined),
  ]);

  const [dnsComp, hostingComp, techComp, securityComp, perfComp] = comparisons;

  // Calculate overall similarities
  const similarities = calculateSimilarities(
    dnsComp,
    hostingComp,
    techComp,
    securityComp,
    perfComp,
  );

  // Generate summary
  const summary = generateSummary(domains, categories, similarities);

  return {
    domains,
    comparedAt: now,
    categories,
    dnsComparison: dnsComp,
    hostingComparison: hostingComp,
    technologyComparison: techComp,
    securityComparison: securityComp,
    performanceComparison: perfComp,
    similarities,
    summary,
  };
}
