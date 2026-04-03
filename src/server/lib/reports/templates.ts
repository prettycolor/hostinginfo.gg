/**
 * Report Templates Library
 *
 * Pre-built report templates for common use cases.
 * Each template defines sections, data requirements, and formatting.
 */

import type { ReportData, ReportSection } from "./pdf-generator.js";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  type: "performance" | "security" | "uptime" | "comprehensive" | "comparison";
  sections: string[];
  isSystem: boolean;
}

interface PerformanceMetrics {
  score?: number;
  fcp?: number;
  lcp?: number;
  tbt?: number;
  cls?: number;
  speedIndex?: number;
}

interface PerformanceRecommendation {
  title?: string;
  description?: string;
  impact?: string;
}

interface SecurityIssue {
  severity?: string;
  title?: string;
  solution?: string;
}

interface SecurityScanData {
  overallScore?: number;
  ssl?: {
    valid?: boolean;
    issuer?: string;
    daysUntilExpiry?: number;
    httpsRedirect?: boolean;
    tlsVersion?: number;
  };
  dns?: {
    dnssec?: boolean;
    caa?: boolean;
  };
  email?: {
    spf?: string;
    dkim?: string;
    dmarc?: string;
  };
  issues?: SecurityIssue[];
}

interface UptimeIncident {
  startTime?: string | Date;
  duration?: number;
  type?: string;
  resolved?: boolean;
}

interface UptimeScanData {
  percentage?: number;
  totalChecks?: number;
  failedChecks?: number;
  avgResponseTime?: number;
  incidents?: UptimeIncident[];
  totalDowntime?: number;
}

interface TechnologySummary {
  server?: string;
  cms?: string;
  framework?: string;
  cdn?: string;
  analytics?: string;
}

interface HostingSummary {
  provider?: string;
  confidence?: number;
  ip?: string;
  location?: string;
}

interface TemplateScanData {
  domain: string;
  performance?: {
    mobile?: PerformanceMetrics;
    desktop?: PerformanceMetrics;
  };
  recommendations?: PerformanceRecommendation[];
  security?: SecurityScanData;
  uptime?: UptimeScanData;
  technology?: TechnologySummary;
  hosting?: HostingSummary;
}

/**
 * System templates (pre-built)
 */
export const SYSTEM_TEMPLATES: TemplateDefinition[] = [
  {
    id: "performance",
    name: "Performance Report",
    description:
      "Comprehensive performance analysis with Core Web Vitals and optimization recommendations",
    type: "performance",
    sections: [
      "summary",
      "scores",
      "core-web-vitals",
      "trends",
      "recommendations",
      "technical",
    ],
    isSystem: true,
  },
  {
    id: "security",
    name: "Security Audit Report",
    description:
      "Complete security assessment including SSL, DNS, email security, and vulnerability analysis",
    type: "security",
    sections: [
      "summary",
      "ssl",
      "dns-security",
      "email-security",
      "vulnerabilities",
      "remediation",
    ],
    isSystem: true,
  },
  {
    id: "uptime",
    name: "Uptime & Monitoring Report",
    description:
      "Uptime statistics, downtime incidents, response times, and SLA compliance",
    type: "uptime",
    sections: [
      "summary",
      "uptime-stats",
      "incidents",
      "response-times",
      "regional",
      "sla",
    ],
    isSystem: true,
  },
  {
    id: "comprehensive",
    name: "Comprehensive Analysis",
    description:
      "Complete domain analysis including performance, security, uptime, technology stack, and hosting",
    type: "comprehensive",
    sections: [
      "executive-summary",
      "performance",
      "security",
      "uptime",
      "technology",
      "hosting",
      "cost-analysis",
      "strategic-recommendations",
    ],
    isSystem: true,
  },
  {
    id: "comparison",
    name: "Competitor Comparison",
    description:
      "Side-by-side comparison of multiple domains with benchmarking and recommendations",
    type: "comparison",
    sections: [
      "overview",
      "performance-comparison",
      "security-comparison",
      "feature-matrix",
      "cost-comparison",
      "recommendations",
    ],
    isSystem: true,
  },
];

/**
 * Build report data from template and scan results
 */
export async function buildReportFromTemplate(
  templateId: string,
  domain: string,
  scanData: TemplateScanData,
  options?: {
    dateRange?: { start: Date; end: Date };
    includeHistorical?: boolean;
    comparisonDomains?: string[];
  },
): Promise<ReportData> {
  const template = SYSTEM_TEMPLATES.find((t) => t.id === templateId);

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const sections: ReportSection[] = [];

  // Build sections based on template type
  switch (template.type) {
    case "performance":
      sections.push(...buildPerformanceSections(scanData, template.sections));
      break;
    case "security":
      sections.push(...buildSecuritySections(scanData, template.sections));
      break;
    case "uptime":
      sections.push(...buildUptimeSections(scanData, template.sections));
      break;
    case "comprehensive":
      sections.push(...buildComprehensiveSections(scanData, template.sections));
      break;
    case "comparison":
      sections.push(
        ...buildComparisonSections(
          scanData,
          template.sections,
          options?.comparisonDomains,
        ),
      );
      break;
  }

  return {
    title: template.name,
    domain,
    generatedAt: new Date(),
    type: template.type,
    sections,
    branding: {
      companyName: "HostingInfo",
      primaryColor: "#3b82f6",
    },
  };
}

/**
 * Build performance report sections
 */
function buildPerformanceSections(
  scanData: TemplateScanData,
  sectionIds: string[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  if (sectionIds.includes("summary")) {
    sections.push({
      id: "summary",
      title: "Executive Summary",
      type: "text",
      content: `
        <p>This performance report provides a comprehensive analysis of ${scanData.domain}'s web performance metrics, 
        Core Web Vitals, and optimization opportunities. The analysis is based on real-world user data and 
        lab testing using industry-standard tools.</p>
        
        <p><strong>Key Findings:</strong></p>
        <ul>
          <li>Mobile Performance Score: ${scanData.performance?.mobile?.score || "N/A"}/100</li>
          <li>Desktop Performance Score: ${scanData.performance?.desktop?.score || "N/A"}/100</li>
          <li>Overall Status: ${getPerformanceStatus(scanData.performance)}</li>
        </ul>
      `,
    });
  }

  if (sectionIds.includes("scores")) {
    sections.push({
      id: "scores",
      title: "Performance Scores",
      type: "metrics",
      content: {
        "Mobile Score": scanData.performance?.mobile?.score || 0,
        "Desktop Score": scanData.performance?.desktop?.score || 0,
        "Average Score": Math.round(
          ((scanData.performance?.mobile?.score || 0) +
            (scanData.performance?.desktop?.score || 0)) /
            2,
        ),
      },
    });
  }

  if (sectionIds.includes("core-web-vitals")) {
    const vitals = scanData.performance?.mobile || {};
    sections.push({
      id: "core-web-vitals",
      title: "Core Web Vitals Breakdown",
      type: "table",
      content: {
        columns: ["Metric", "Value", "Status", "Target"],
        rows: [
          {
            Metric: "First Contentful Paint (FCP)",
            Value: `${vitals.fcp || 0}s`,
            Status: getMetricStatus(vitals.fcp, 1.8, 3.0),
            Target: "< 1.8s",
          },
          {
            Metric: "Largest Contentful Paint (LCP)",
            Value: `${vitals.lcp || 0}s`,
            Status: getMetricStatus(vitals.lcp, 2.5, 4.0),
            Target: "< 2.5s",
          },
          {
            Metric: "Total Blocking Time (TBT)",
            Value: `${vitals.tbt || 0}ms`,
            Status: getMetricStatus(vitals.tbt, 200, 600),
            Target: "< 200ms",
          },
          {
            Metric: "Cumulative Layout Shift (CLS)",
            Value: vitals.cls || 0,
            Status: getMetricStatus(vitals.cls, 0.1, 0.25),
            Target: "< 0.1",
          },
          {
            Metric: "Speed Index",
            Value: `${vitals.speedIndex || 0}s`,
            Status: getMetricStatus(vitals.speedIndex, 3.4, 5.8),
            Target: "< 3.4s",
          },
        ],
      },
    });
  }

  if (sectionIds.includes("recommendations")) {
    const recommendations = scanData.recommendations || [];
    sections.push({
      id: "recommendations",
      title: "Optimization Recommendations",
      type: "list",
      content:
        recommendations.length > 0
          ? recommendations.map(
              (recommendation: PerformanceRecommendation) =>
                `<strong>${recommendation.title}</strong>: ${recommendation.description} (Impact: ${recommendation.impact})`,
            )
          : [
              "No specific recommendations at this time. Performance is within acceptable ranges.",
            ],
    });
  }

  if (sectionIds.includes("technical")) {
    sections.push({
      id: "technical",
      title: "Technical Details",
      type: "text",
      content: `
        <p><strong>Testing Methodology:</strong> Performance metrics were collected using Google PageSpeed Insights API, 
        which combines real-world Chrome User Experience Report (CrUX) data with lab-based Lighthouse testing.</p>
        
        <p><strong>Test Configuration:</strong></p>
        <ul>
          <li>Mobile: Simulated Moto G4, 4G connection</li>
          <li>Desktop: Standard desktop configuration</li>
          <li>Test Date: ${new Date().toLocaleDateString()}</li>
        </ul>
      `,
    });
  }

  return sections;
}

/**
 * Build security report sections
 */
function buildSecuritySections(
  scanData: TemplateScanData,
  sectionIds: string[],
): ReportSection[] {
  const sections: ReportSection[] = [];
  const security = scanData.security || {};

  if (sectionIds.includes("summary")) {
    sections.push({
      id: "summary",
      title: "Security Overview",
      type: "text",
      content: `
        <p>This security audit report provides a comprehensive assessment of ${scanData.domain}'s security posture, 
        including SSL/TLS configuration, DNS security, email authentication, and vulnerability analysis.</p>
        
        <p><strong>Overall Security Score: ${security.overallScore || "N/A"}/100</strong></p>
        <p>Status: ${getSecurityStatus(security.overallScore)}</p>
      `,
    });
  }

  if (sectionIds.includes("ssl")) {
    sections.push({
      id: "ssl",
      title: "SSL/TLS Analysis",
      type: "table",
      content: {
        columns: ["Check", "Status", "Details"],
        rows: [
          {
            Check: "SSL Certificate",
            Status: security.ssl?.valid ? "✓ Valid" : "✗ Invalid",
            Details: security.ssl?.issuer || "N/A",
          },
          {
            Check: "Certificate Expiry",
            Status:
              security.ssl?.daysUntilExpiry > 30
                ? "✓ Valid"
                : "⚠ Expiring Soon",
            Details: `${security.ssl?.daysUntilExpiry || 0} days remaining`,
          },
          {
            Check: "HTTPS Redirect",
            Status: security.ssl?.httpsRedirect ? "✓ Enabled" : "✗ Disabled",
            Details: security.ssl?.httpsRedirect
              ? "All traffic redirected to HTTPS"
              : "HTTP traffic not redirected",
          },
          {
            Check: "TLS Version",
            Status: security.ssl?.tlsVersion >= 1.2 ? "✓ Modern" : "⚠ Outdated",
            Details: `TLS ${security.ssl?.tlsVersion || "Unknown"}`,
          },
        ],
      },
    });
  }

  if (sectionIds.includes("dns-security")) {
    sections.push({
      id: "dns-security",
      title: "DNS Security",
      type: "table",
      content: {
        columns: ["Feature", "Status", "Recommendation"],
        rows: [
          {
            Feature: "DNSSEC",
            Status: security.dns?.dnssec ? "✓ Enabled" : "✗ Disabled",
            Recommendation: security.dns?.dnssec
              ? "Properly configured"
              : "Enable DNSSEC for enhanced security",
          },
          {
            Feature: "CAA Records",
            Status: security.dns?.caa ? "✓ Configured" : "✗ Missing",
            Recommendation: security.dns?.caa
              ? "CAA records protect against unauthorized certificates"
              : "Add CAA records to prevent unauthorized SSL issuance",
          },
        ],
      },
    });
  }

  if (sectionIds.includes("email-security")) {
    sections.push({
      id: "email-security",
      title: "Email Security",
      type: "table",
      content: {
        columns: ["Protocol", "Status", "Details"],
        rows: [
          {
            Protocol: "SPF",
            Status: security.email?.spf ? "✓ Configured" : "✗ Missing",
            Details: security.email?.spf || "No SPF record found",
          },
          {
            Protocol: "DKIM",
            Status: security.email?.dkim ? "✓ Configured" : "✗ Missing",
            Details: security.email?.dkim
              ? "DKIM signing enabled"
              : "DKIM not configured",
          },
          {
            Protocol: "DMARC",
            Status: security.email?.dmarc ? "✓ Configured" : "✗ Missing",
            Details: security.email?.dmarc || "No DMARC policy found",
          },
        ],
      },
    });
  }

  if (sectionIds.includes("remediation")) {
    const issues = security.issues || [];
    sections.push({
      id: "remediation",
      title: "Remediation Steps",
      type: "list",
      content:
        issues.length > 0
          ? issues.map(
              (issue: SecurityIssue) =>
                `<strong>${issue.severity}</strong>: ${issue.title} - ${issue.solution}`,
            )
          : [
              "No critical security issues detected. Continue monitoring and maintaining current security practices.",
            ],
    });
  }

  return sections;
}

/**
 * Build uptime report sections
 */
function buildUptimeSections(
  scanData: TemplateScanData,
  sectionIds: string[],
): ReportSection[] {
  const sections: ReportSection[] = [];
  const uptime = scanData.uptime || {};

  if (sectionIds.includes("summary")) {
    sections.push({
      id: "summary",
      title: "Uptime Summary",
      type: "metrics",
      content: {
        "Uptime %": `${uptime.percentage || 0}%`,
        "Total Checks": uptime.totalChecks || 0,
        "Failed Checks": uptime.failedChecks || 0,
        "Avg Response Time": `${uptime.avgResponseTime || 0}ms`,
      },
    });
  }

  if (sectionIds.includes("incidents")) {
    const incidents = uptime.incidents || [];
    sections.push({
      id: "incidents",
      title: "Downtime Incidents",
      type: "table",
      content: {
        columns: ["Date", "Duration", "Type", "Status"],
        rows:
          incidents.length > 0
            ? incidents.map((incident: UptimeIncident) => ({
                Date: new Date(
                  incident.startTime || Date.now(),
                ).toLocaleString(),
                Duration: `${incident.duration || 0} minutes`,
                Type: incident.type || "Unknown",
                Status: incident.resolved ? "Resolved" : "Ongoing",
              }))
            : [{ Date: "No incidents", Duration: "-", Type: "-", Status: "-" }],
      },
    });
  }

  if (sectionIds.includes("sla")) {
    sections.push({
      id: "sla",
      title: "SLA Compliance",
      type: "text",
      content: `
        <p><strong>Target SLA:</strong> 99.9% uptime</p>
        <p><strong>Actual Uptime:</strong> ${uptime.percentage || 0}%</p>
        <p><strong>Status:</strong> ${uptime.percentage >= 99.9 ? "✓ Meeting SLA" : "✗ Below SLA"}</p>
        <p><strong>Allowed Downtime:</strong> 43.2 minutes per month (99.9% SLA)</p>
        <p><strong>Actual Downtime:</strong> ${uptime.totalDowntime || 0} minutes this month</p>
      `,
    });
  }

  return sections;
}

/**
 * Build comprehensive report sections
 */
function buildComprehensiveSections(
  scanData: TemplateScanData,
  sectionIds: string[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  // Combine all section types
  sections.push(
    ...buildPerformanceSections(scanData, [
      "summary",
      "scores",
      "core-web-vitals",
    ]),
  );
  sections.push(
    ...buildSecuritySections(scanData, [
      "ssl",
      "dns-security",
      "email-security",
    ]),
  );
  sections.push(...buildUptimeSections(scanData, ["summary", "incidents"]));

  // Add technology stack
  if (sectionIds.includes("technology")) {
    const tech = scanData.technology || {};
    sections.push({
      id: "technology",
      title: "Technology Stack",
      type: "list",
      content: [
        `<strong>Web Server:</strong> ${tech.server || "Unknown"}`,
        `<strong>CMS:</strong> ${tech.cms || "Unknown"}`,
        `<strong>Framework:</strong> ${tech.framework || "Unknown"}`,
        `<strong>CDN:</strong> ${tech.cdn || "None detected"}`,
        `<strong>Analytics:</strong> ${tech.analytics || "None detected"}`,
      ],
    });
  }

  // Add hosting attribution
  if (sectionIds.includes("hosting")) {
    const hosting = scanData.hosting || {};
    sections.push({
      id: "hosting",
      title: "Hosting Information",
      type: "text",
      content: `
        <p><strong>Provider:</strong> ${hosting.provider || "Unknown"}</p>
        <p><strong>Confidence:</strong> ${hosting.confidence || 0}%</p>
        <p><strong>IP Address:</strong> ${hosting.ip || "N/A"}</p>
        <p><strong>Location:</strong> ${hosting.location || "Unknown"}</p>
      `,
    });
  }

  return sections;
}

/**
 * Build comparison report sections
 */
function buildComparisonSections(
  scanData: TemplateScanData,
  sectionIds: string[],
  comparisonDomains?: string[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  sections.push({
    id: "overview",
    title: "Comparison Overview",
    type: "text",
    content: `
      <p>This report compares ${scanData.domain} against ${comparisonDomains?.length || 0} competitor domains 
      across performance, security, and feature metrics.</p>
    `,
  });

  // Add comparison tables
  sections.push({
    id: "performance-comparison",
    title: "Performance Comparison",
    type: "table",
    content: {
      columns: ["Domain", "Mobile Score", "Desktop Score", "Avg Response Time"],
      rows: [
        {
          Domain: scanData.domain,
          "Mobile Score": scanData.performance?.mobile?.score || 0,
          "Desktop Score": scanData.performance?.desktop?.score || 0,
          "Avg Response Time": `${scanData.uptime?.avgResponseTime || 0}ms`,
        },
        // Add comparison domains here
      ],
    },
  });

  return sections;
}

/**
 * Helper functions
 */
function getPerformanceStatus(
  performance: TemplateScanData["performance"],
): string {
  const avgScore =
    ((performance?.mobile?.score || 0) + (performance?.desktop?.score || 0)) /
    2;
  if (avgScore >= 90) return "✓ Excellent";
  if (avgScore >= 70) return "⚠ Good";
  if (avgScore >= 50) return "⚠ Needs Improvement";
  return "✗ Poor";
}

function getSecurityStatus(score: number): string {
  if (score >= 90) return "✓ Excellent";
  if (score >= 70) return "⚠ Good";
  if (score >= 50) return "⚠ Needs Improvement";
  return "✗ Poor";
}

function getMetricStatus(value: number, good: number, poor: number): string {
  if (value <= good) return "✓ Good";
  if (value <= poor) return "⚠ Needs Improvement";
  return "✗ Poor";
}
