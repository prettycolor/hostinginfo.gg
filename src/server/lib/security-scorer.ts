/**
 * Security Scorer
 *
 * Calculates security scores and assigns grades based on collected intelligence data.
 *
 * Scoring Algorithm:
 * - Base Score: 100 points
 * - Deductions based on security issues, missing configurations, and vulnerabilities
 *
 * Grade Assignment:
 * - 95-100: A+
 * - 90-94: A
 * - 85-89: A-
 * - 80-84: B+
 * - 75-79: B
 * - 70-74: B-
 * - 65-69: C+
 * - 60-64: C
 * - 55-59: C-
 * - 50-54: D
 * - 0-49: F
 */

export interface SecurityIssue {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  deduction: number;
}

export interface SecurityScoreResult {
  score: number;
  grade: string;
  issues: SecurityIssue[];
  issueCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface DnsTxtRecord {
  value?: string;
  name?: string;
}

interface DnsSecurityData {
  a?: unknown[];
  mx?: unknown[];
  txt?: DnsTxtRecord[];
}

interface WhoisSecurityData {
  expirationDate?: string;
  registrantName?: string;
  registrantEmail?: string;
  transferLock?: boolean;
}

interface IpSecurityData {
  isProxy?: boolean;
  isVpn?: boolean;
  isTor?: boolean;
  threatLevel?: string;
  organization?: string;
}

interface TechnologySecurityEntry {
  name?: string;
  category?: string;
  version?: string;
  isEol?: boolean;
  hasKnownVulnerabilities?: boolean;
}

interface TechnologySecurityData {
  technologies?: TechnologySecurityEntry[];
}

interface UrlscanVerdicts {
  malicious?: boolean;
  phishing?: boolean;
}

interface UrlscanSecurityData {
  malwareDetected?: boolean;
  phishingDetected?: boolean;
  verdicts?: UrlscanVerdicts;
  securityScore?: number;
  redirectCount?: number;
}

export interface IntelligenceData {
  dns?: DnsSecurityData | null;
  whois?: WhoisSecurityData | null;
  ip?: IpSecurityData | null;
  tech?: TechnologySecurityData | null;
  urlscan?: UrlscanSecurityData | null;
}

/**
 * Calculate security score from intelligence data
 */
export function calculateSecurityScore(
  data: IntelligenceData,
): SecurityScoreResult {
  let score = 100;
  const issues: SecurityIssue[] = [];

  // DNS Security Checks
  if (data.dns) {
    const dnsIssues = checkDnsSecurity(data.dns);
    issues.push(...dnsIssues);
    score -= dnsIssues.reduce((sum, issue) => sum + issue.deduction, 0);
  }

  // WHOIS Security Checks
  if (data.whois) {
    const whoisIssues = checkWhoisSecurity(data.whois);
    issues.push(...whoisIssues);
    score -= whoisIssues.reduce((sum, issue) => sum + issue.deduction, 0);
  }

  // IP/Hosting Security Checks
  if (data.ip) {
    const ipIssues = checkIpSecurity(data.ip);
    issues.push(...ipIssues);
    score -= ipIssues.reduce((sum, issue) => sum + issue.deduction, 0);
  }

  // Technology Security Checks
  if (data.tech) {
    const techIssues = checkTechnologySecurity(data.tech);
    issues.push(...techIssues);
    score -= techIssues.reduce((sum, issue) => sum + issue.deduction, 0);
  }

  // URLScan Security Checks
  if (data.urlscan) {
    const urlscanIssues = checkUrlscanSecurity(data.urlscan);
    issues.push(...urlscanIssues);
    score -= urlscanIssues.reduce((sum, issue) => sum + issue.deduction, 0);
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, Math.round(score));

  // Calculate issue counts
  const issueCounts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
  };

  return {
    score,
    grade: assignGrade(score),
    issues,
    issueCounts,
  };
}

/**
 * Assign letter grade based on score
 */
function assignGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Check DNS security
 */
function checkDnsSecurity(dns: DnsSecurityData): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check for missing A records
  if (!dns.a || dns.a.length === 0) {
    issues.push({
      category: "DNS",
      severity: "high",
      description: "No A records found - domain may not be accessible",
      deduction: 15,
    });
  }

  // Check for missing MX records (email)
  if (!dns.mx || dns.mx.length === 0) {
    issues.push({
      category: "DNS",
      severity: "low",
      description: "No MX records found - email may not be configured",
      deduction: 3,
    });
  }

  // Check for SPF record (email security)
  const hasSPF = dns.txt?.some(
    (record) =>
      typeof record.value === "string" && record.value.includes("v=spf1"),
  );
  if (!hasSPF) {
    issues.push({
      category: "DNS",
      severity: "medium",
      description:
        "Missing SPF record - email spoofing protection not configured",
      deduction: 5,
    });
  }

  // Check for DMARC record
  const hasDMARC = dns.txt?.some(
    (record) =>
      typeof record.value === "string" && record.value.includes("v=DMARC1"),
  );
  if (!hasDMARC) {
    issues.push({
      category: "DNS",
      severity: "medium",
      description: "Missing DMARC record - email authentication not configured",
      deduction: 5,
    });
  }

  // Check for DKIM (look for _domainkey in TXT records)
  const hasDKIM = dns.txt?.some(
    (record) =>
      typeof record.name === "string" && record.name.includes("_domainkey"),
  );
  if (!hasDKIM) {
    issues.push({
      category: "DNS",
      severity: "medium",
      description: "Missing DKIM record - email signing not configured",
      deduction: 5,
    });
  }

  return issues;
}

/**
 * Check WHOIS security
 */
function checkWhoisSecurity(whois: WhoisSecurityData): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check domain expiry
  if (whois.expirationDate) {
    const expiryDate = new Date(whois.expirationDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      issues.push({
        category: "WHOIS",
        severity: "critical",
        description: "Domain has expired",
        deduction: 30,
      });
    } else if (daysUntilExpiry < 30) {
      issues.push({
        category: "WHOIS",
        severity: "high",
        description: `Domain expires in ${daysUntilExpiry} days`,
        deduction: 10,
      });
    } else if (daysUntilExpiry < 60) {
      issues.push({
        category: "WHOIS",
        severity: "medium",
        description: `Domain expires in ${daysUntilExpiry} days`,
        deduction: 5,
      });
    }
  }

  // Check for WHOIS privacy
  const hasPrivacy =
    whois.registrantName?.toLowerCase().includes("privacy") ||
    whois.registrantName?.toLowerCase().includes("redacted") ||
    whois.registrantEmail?.toLowerCase().includes("privacy");

  if (!hasPrivacy) {
    issues.push({
      category: "WHOIS",
      severity: "low",
      description: "WHOIS privacy protection not enabled",
      deduction: 3,
    });
  }

  // Check for transfer lock
  if (whois.transferLock === false) {
    issues.push({
      category: "WHOIS",
      severity: "medium",
      description: "Domain transfer lock not enabled",
      deduction: 5,
    });
  }

  return issues;
}

/**
 * Check IP/Hosting security
 */
function checkIpSecurity(ip: IpSecurityData): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check for proxy/VPN/Tor (potential security risk)
  if (ip.isProxy || ip.isVpn || ip.isTor) {
    issues.push({
      category: "Hosting",
      severity: "medium",
      description: "Domain hosted behind proxy/VPN/Tor network",
      deduction: 5,
    });
  }

  // Check threat level
  if (ip.threatLevel) {
    const level = ip.threatLevel.toLowerCase();
    if (level === "high" || level === "critical") {
      issues.push({
        category: "Hosting",
        severity: "critical",
        description: `High threat level detected: ${ip.threatLevel}`,
        deduction: 25,
      });
    } else if (level === "medium") {
      issues.push({
        category: "Hosting",
        severity: "high",
        description: `Medium threat level detected`,
        deduction: 10,
      });
    }
  }

  // Check for hosting provider (prefer known providers)
  if (!ip.organization || ip.organization === "Unknown") {
    issues.push({
      category: "Hosting",
      severity: "low",
      description: "Unknown hosting provider",
      deduction: 2,
    });
  }

  return issues;
}

/**
 * Check technology security
 */
function checkTechnologySecurity(
  tech: TechnologySecurityData,
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  if (!tech.technologies || tech.technologies.length === 0) {
    return issues;
  }

  // Check for outdated technologies
  tech.technologies.forEach((technology) => {
    if (technology.isEol) {
      issues.push({
        category: "Technology",
        severity: "high",
        description: `${technology.name} is end-of-life and no longer supported`,
        deduction: 8,
      });
    }

    // Check for known vulnerable versions
    if (technology.version && technology.hasKnownVulnerabilities) {
      issues.push({
        category: "Technology",
        severity: "high",
        description: `${technology.name} ${technology.version} has known vulnerabilities`,
        deduction: 10,
      });
    }
  });

  // Check for HTTPS
  const hasHttps = tech.technologies.some(
    (technology) =>
      (typeof technology.name === "string" &&
        technology.name.toLowerCase().includes("https")) ||
      technology.category === "SSL/TLS",
  );
  if (!hasHttps) {
    issues.push({
      category: "Technology",
      severity: "critical",
      description: "No HTTPS detected - insecure connection",
      deduction: 20,
    });
  }

  return issues;
}

/**
 * Check URLScan security
 */
function checkUrlscanSecurity(urlscan: UrlscanSecurityData): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check for malware
  if (urlscan.malwareDetected || urlscan.verdicts?.malicious) {
    issues.push({
      category: "Security",
      severity: "critical",
      description: "Malware detected on domain",
      deduction: 50,
    });
  }

  // Check for phishing
  if (urlscan.phishingDetected || urlscan.verdicts?.phishing) {
    issues.push({
      category: "Security",
      severity: "critical",
      description: "Phishing activity detected",
      deduction: 50,
    });
  }

  // Check security score from URLScan
  if (urlscan.securityScore !== undefined && urlscan.securityScore < 50) {
    issues.push({
      category: "Security",
      severity: "high",
      description: `Low URLScan security score: ${urlscan.securityScore}/100`,
      deduction: 15,
    });
  }

  // Check for suspicious redirects
  if (urlscan.redirectCount && urlscan.redirectCount > 3) {
    issues.push({
      category: "Security",
      severity: "medium",
      description: `Excessive redirects detected (${urlscan.redirectCount})`,
      deduction: 5,
    });
  }

  return issues;
}

/**
 * Get total issue count
 */
export function getTotalIssueCount(result: SecurityScoreResult): number {
  return result.issues.length;
}

/**
 * Get issue count by severity
 */
export function getIssueCountBySeverity(
  result: SecurityScoreResult,
  severity: "critical" | "high" | "medium" | "low",
): number {
  return result.issueCounts[severity];
}
