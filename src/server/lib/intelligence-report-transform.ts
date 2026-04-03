import type { DomainIntelligence } from "@/lib/intelligence-api";

interface ReportSource {
  domain?: string;
  security?: {
    overall?: number;
    grade?: string;
    categories?: {
      dnsScore?: number;
      sslScore?: number;
      malwareScore?: number;
      emailScore?: number;
      technologyScore?: number;
    };
    breakdown?: {
      dnsScore?: number;
      sslScore?: number;
      malwareScore?: number;
      emailScore?: number;
      technologyScore?: number;
    };
    issues?: unknown[];
    findings?: unknown[];
  };
  whois?: {
    expiryDate?: string | Date;
    daysUntilExpiry?: number;
  };
  infrastructure?: {
    hostingProvider?: string;
    ipAddress?: string;
    asn?: string;
    location?: string;
    cdn?: string;
  };
  intelligenceModules?: {
    dnsIntelligence?: unknown[];
    technologyStack?: unknown[];
  };
  recommendations?: unknown[];
  generatedAt?: string | Date;
}

export function transformComprehensiveReport(
  report: ReportSource,
): DomainIntelligence {
  return {
    domain: report.domain || "",
    security: {
      overall: report.security?.overall || 0,
      grade: report.security?.grade || "N/A",
      categories: {
        dns:
          report.security?.categories?.dnsScore ||
          report.security?.breakdown?.dnsScore ||
          0,
        ssl:
          report.security?.categories?.sslScore ||
          report.security?.breakdown?.sslScore ||
          0,
        malware:
          report.security?.categories?.malwareScore ||
          report.security?.breakdown?.malwareScore ||
          0,
        email:
          report.security?.categories?.emailScore ||
          report.security?.breakdown?.emailScore ||
          0,
        technology:
          report.security?.categories?.technologyScore ||
          report.security?.breakdown?.technologyScore ||
          0,
      },
      issues:
        (report.security?.issues as DomainIntelligence["security"]["issues"]) ||
        (report.security
          ?.findings as DomainIntelligence["security"]["issues"]) ||
        [],
    },
    whois: report.whois
      ? {
          domain: report.domain || "",
          registrar: "Unknown",
          creationDate: "",
          expirationDate: report.whois.expiryDate
            ? new Date(report.whois.expiryDate).toISOString()
            : "",
          updatedDate: "",
          nameservers: [],
          status: [],
          dnssecEnabled: false,
          transferLock: false,
          daysUntilExpiry: report.whois.daysUntilExpiry || 0,
        }
      : {
          domain: report.domain || "",
          registrar: "Unknown",
          creationDate: "",
          expirationDate: "",
          updatedDate: "",
          nameservers: [],
          status: [],
          dnssecEnabled: false,
          transferLock: false,
          daysUntilExpiry: 0,
        },
    infrastructure: {
      hostingProvider: report.infrastructure?.hostingProvider || "Unknown",
      providerType: "unknown",
      cdn: report.infrastructure?.cdn,
      ipAddresses: report.infrastructure?.ipAddress
        ? [report.infrastructure.ipAddress]
        : [],
      ipVersion: report.infrastructure?.ipAddress?.includes(":")
        ? "IPv6"
        : report.infrastructure?.ipAddress
          ? "IPv4"
          : undefined,
      asn: report.infrastructure?.asn,
      datacenterLocation: report.infrastructure?.location || "",
      reverseProxy: false,
      loadBalancer: false,
      isSharedHosting: false,
    },
    dns: (report.intelligenceModules?.dnsIntelligence ||
      []) as DomainIntelligence["dns"],
    technologies: (report.intelligenceModules?.technologyStack ||
      []) as DomainIntelligence["technologies"],
    recommendations: (report.recommendations ||
      []) as DomainIntelligence["recommendations"],
    lastScanned: report.generatedAt
      ? new Date(report.generatedAt).toISOString()
      : new Date().toISOString(),
  };
}
