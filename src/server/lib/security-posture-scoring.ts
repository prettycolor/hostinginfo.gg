/**
 * Security Posture Scoring Engine
 *
 * Comprehensive security analysis and scoring system that evaluates domains
 * across multiple security dimensions including SSL/TLS, DNS security,
 * email security, vulnerabilities, and threat intelligence.
 *
 * Scoring System (0-100):
 * - SSL/TLS Configuration: 25 points
 * - Security Headers: 20 points
 * - DNS Security: 15 points
 * - Email Security: 15 points
 * - Vulnerability Assessment: 15 points
 * - Threat Intelligence: 10 points
 *
 * Security Grades:
 * - A+ (95-100): Excellent security posture
 * - A  (90-94):  Very good security
 * - B  (80-89):  Good security with minor issues
 * - C  (70-79):  Adequate security, improvements needed
 * - D  (60-69):  Poor security, significant risks
 * - F  (0-59):   Critical security issues
 */

import { db } from "../db/client.js";
import { urlscanResults, dnsRecords, whoisRecords } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export interface SecurityScore {
  domain: string;
  overallScore: number; // 0-100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  categoryScores: {
    sslTls: SecurityCategory;
    securityHeaders: SecurityCategory;
    dnsSecurity: SecurityCategory;
    emailSecurity: SecurityCategory;
    vulnerabilities: SecurityCategory;
    threatIntelligence: SecurityCategory;
  };
  riskLevel: "critical" | "high" | "medium" | "low" | "minimal";
  findings: SecurityFinding[];
  recommendations: SecurityRecommendation[];
  lastAssessed: Date;
  historicalTrend?: "improving" | "stable" | "declining";
}

export interface SecurityCategory {
  name: string;
  score: number; // 0-max points for category
  maxScore: number;
  percentage: number; // 0-100
  status: "excellent" | "good" | "fair" | "poor" | "critical";
  issues: string[];
  strengths: string[];
}

export interface SecurityFinding {
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  impact: string;
  remediation: string;
  cvssScore?: number; // 0-10 for vulnerabilities
  cveId?: string;
}

export interface SecurityRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  implementation: string;
  estimatedEffort: "low" | "medium" | "high";
  impactScore: number; // How many points this would add
}

export interface SecurityTrend {
  domain: string;
  assessments: {
    date: Date;
    score: number;
    grade: string;
  }[];
  trend: "improving" | "stable" | "declining";
  changeRate: number; // Points per month
  projectedScore?: number; // Projected score in 30 days
}

interface UrlscanTechnology {
  name: string;
  version?: string;
}

interface UrlscanData {
  certificateInfo?: {
    valid?: boolean;
    validTo?: string;
    issuer?: string;
  };
  pageData?: {
    protocol?: string;
    headers?: Record<string, string>;
  };
  verdicts?: {
    overall?: {
      malicious?: boolean;
      suspicious?: boolean;
    };
  };
  technologies?: UrlscanTechnology[];
}

interface DnsSecurityRecord {
  dnssecEnabled?: boolean;
  recordType?: string;
  value?: string;
}

interface WhoisSecurityData {
  createdDate?: string;
}

/**
 * Calculate comprehensive security score for a domain
 */
export async function calculateSecurityScore(
  domain: string,
): Promise<SecurityScore> {
  // Fetch latest security data
  const [urlscanData, dnsData, whoisData] = await Promise.all([
    getLatestUrlscanData(domain),
    getDnsSecurityData(domain),
    getWhoisSecurityData(domain),
  ]);

  // Calculate category scores
  const sslTls = await scoreSslTls(urlscanData);
  const securityHeaders = await scoreSecurityHeaders(urlscanData);
  const dnsSecurity = await scoreDnsSecurity(dnsData);
  const emailSecurity = await scoreEmailSecurity(dnsData);
  const vulnerabilities = await scoreVulnerabilities(urlscanData);
  const threatIntelligence = await scoreThreatIntelligence(
    urlscanData,
    whoisData,
  );

  // Calculate overall score
  const overallScore = Math.round(
    sslTls.score +
      securityHeaders.score +
      dnsSecurity.score +
      emailSecurity.score +
      vulnerabilities.score +
      threatIntelligence.score,
  );

  // Determine grade
  const grade = calculateGrade(overallScore);

  // Determine risk level
  const riskLevel = calculateRiskLevel(overallScore, [
    sslTls,
    securityHeaders,
    dnsSecurity,
    emailSecurity,
    vulnerabilities,
    threatIntelligence,
  ]);

  // Generate findings
  const findings = generateFindings([
    sslTls,
    securityHeaders,
    dnsSecurity,
    emailSecurity,
    vulnerabilities,
    threatIntelligence,
  ]);

  // Generate recommendations
  const recommendations = generateRecommendations([
    sslTls,
    securityHeaders,
    dnsSecurity,
    emailSecurity,
    vulnerabilities,
    threatIntelligence,
  ]);

  return {
    domain,
    overallScore,
    grade,
    categoryScores: {
      sslTls,
      securityHeaders,
      dnsSecurity,
      emailSecurity,
      vulnerabilities,
      threatIntelligence,
    },
    riskLevel,
    findings,
    recommendations,
    lastAssessed: new Date(),
  };
}

/**
 * Score SSL/TLS configuration (max 25 points)
 */
async function scoreSslTls(
  urlscanData: UrlscanData | null,
): Promise<SecurityCategory> {
  let score = 0;
  const maxScore = 25;
  const issues: string[] = [];
  const strengths: string[] = [];

  if (!urlscanData) {
    issues.push("No SSL/TLS data available");
    return createCategory(
      "SSL/TLS Configuration",
      score,
      maxScore,
      issues,
      strengths,
    );
  }

  const cert = urlscanData.certificateInfo;
  const page = urlscanData.pageData;

  // HTTPS enabled (5 points)
  if (page?.protocol === "https") {
    score += 5;
    strengths.push("HTTPS enabled");
  } else {
    issues.push("HTTPS not enabled");
  }

  // Valid certificate (10 points)
  if (cert?.valid) {
    score += 10;
    strengths.push("Valid SSL certificate");
  } else {
    issues.push("Invalid or expired SSL certificate");
  }

  // Certificate not expiring soon (3 points)
  if (cert?.validTo) {
    const daysUntilExpiry = Math.floor(
      (new Date(cert.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilExpiry > 30) {
      score += 3;
      strengths.push(`Certificate valid for ${daysUntilExpiry} days`);
    } else if (daysUntilExpiry > 0) {
      issues.push(`Certificate expires in ${daysUntilExpiry} days`);
    }
  }

  // Strong cipher suites (4 points)
  if (cert?.issuer && !cert.issuer.includes("Self-signed")) {
    score += 4;
    strengths.push("Trusted certificate authority");
  } else {
    issues.push("Self-signed or untrusted certificate");
  }

  // HSTS enabled (3 points)
  if (page?.headers?.["strict-transport-security"]) {
    score += 3;
    strengths.push("HSTS enabled");
  } else {
    issues.push("HSTS not configured");
  }

  return createCategory(
    "SSL/TLS Configuration",
    score,
    maxScore,
    issues,
    strengths,
  );
}

/**
 * Score security headers (max 20 points)
 */
async function scoreSecurityHeaders(
  urlscanData: UrlscanData | null,
): Promise<SecurityCategory> {
  let score = 0;
  const maxScore = 20;
  const issues: string[] = [];
  const strengths: string[] = [];

  if (!urlscanData?.pageData?.headers) {
    issues.push("No security headers data available");
    return createCategory(
      "Security Headers",
      score,
      maxScore,
      issues,
      strengths,
    );
  }

  const headers = urlscanData.pageData.headers;

  // Content-Security-Policy (5 points)
  if (headers["content-security-policy"]) {
    score += 5;
    strengths.push("Content-Security-Policy configured");
  } else {
    issues.push("Missing Content-Security-Policy header");
  }

  // X-Frame-Options (3 points)
  if (headers["x-frame-options"]) {
    score += 3;
    strengths.push("X-Frame-Options configured");
  } else {
    issues.push("Missing X-Frame-Options header");
  }

  // X-Content-Type-Options (3 points)
  if (headers["x-content-type-options"]) {
    score += 3;
    strengths.push("X-Content-Type-Options configured");
  } else {
    issues.push("Missing X-Content-Type-Options header");
  }

  // Referrer-Policy (3 points)
  if (headers["referrer-policy"]) {
    score += 3;
    strengths.push("Referrer-Policy configured");
  } else {
    issues.push("Missing Referrer-Policy header");
  }

  // Permissions-Policy (3 points)
  if (headers["permissions-policy"] || headers["feature-policy"]) {
    score += 3;
    strengths.push("Permissions-Policy configured");
  } else {
    issues.push("Missing Permissions-Policy header");
  }

  // X-XSS-Protection (3 points)
  if (headers["x-xss-protection"]) {
    score += 3;
    strengths.push("X-XSS-Protection configured");
  } else {
    issues.push("Missing X-XSS-Protection header");
  }

  return createCategory("Security Headers", score, maxScore, issues, strengths);
}

/**
 * Score DNS security (max 15 points)
 */
async function scoreDnsSecurity(
  dnsData: DnsSecurityRecord[],
): Promise<SecurityCategory> {
  let score = 0;
  const maxScore = 15;
  const issues: string[] = [];
  const strengths: string[] = [];

  if (!dnsData || dnsData.length === 0) {
    issues.push("No DNS data available");
    return createCategory("DNS Security", score, maxScore, issues, strengths);
  }

  // DNSSEC enabled (8 points)
  const hasDnssec = dnsData.some((record) => record.dnssecEnabled);
  if (hasDnssec) {
    score += 8;
    strengths.push("DNSSEC enabled");
  } else {
    issues.push("DNSSEC not enabled");
  }

  // CAA records present (4 points)
  const hasCaa = dnsData.some((record) => record.recordType === "CAA");
  if (hasCaa) {
    score += 4;
    strengths.push("CAA records configured");
  } else {
    issues.push("No CAA records found");
  }

  // Multiple nameservers (3 points)
  const nsRecords = dnsData.filter((record) => record.recordType === "NS");
  if (nsRecords.length >= 2) {
    score += 3;
    strengths.push(`${nsRecords.length} nameservers configured`);
  } else {
    issues.push("Insufficient nameserver redundancy");
  }

  return createCategory("DNS Security", score, maxScore, issues, strengths);
}

/**
 * Score email security (max 15 points)
 */
async function scoreEmailSecurity(
  dnsData: DnsSecurityRecord[],
): Promise<SecurityCategory> {
  let score = 0;
  const maxScore = 15;
  const issues: string[] = [];
  const strengths: string[] = [];

  if (!dnsData || dnsData.length === 0) {
    issues.push("No DNS data available");
    return createCategory("Email Security", score, maxScore, issues, strengths);
  }

  const txtRecords = dnsData.filter((record) => record.recordType === "TXT");

  // SPF record (5 points)
  const hasSPF = txtRecords.some((record) => record.value?.includes("v=spf1"));
  if (hasSPF) {
    score += 5;
    strengths.push("SPF record configured");
  } else {
    issues.push("No SPF record found");
  }

  // DKIM record (5 points)
  const hasDKIM = txtRecords.some((record) =>
    record.value?.includes("v=DKIM1"),
  );
  if (hasDKIM) {
    score += 5;
    strengths.push("DKIM configured");
  } else {
    issues.push("No DKIM record found");
  }

  // DMARC record (5 points)
  const hasDMARC = txtRecords.some((record) =>
    record.value?.includes("v=DMARC1"),
  );
  if (hasDMARC) {
    score += 5;
    strengths.push("DMARC policy configured");
  } else {
    issues.push("No DMARC policy found");
  }

  return createCategory("Email Security", score, maxScore, issues, strengths);
}

/**
 * Score vulnerabilities (max 15 points)
 */
async function scoreVulnerabilities(
  urlscanData: UrlscanData | null,
): Promise<SecurityCategory> {
  let score = 15; // Start with full points, deduct for issues
  const maxScore = 15;
  const issues: string[] = [];
  const strengths: string[] = [];

  if (!urlscanData) {
    issues.push("No vulnerability data available");
    return createCategory(
      "Vulnerability Assessment",
      score,
      maxScore,
      issues,
      strengths,
    );
  }

  const verdicts = urlscanData.verdicts || {};

  // Check for malicious content
  if (verdicts.overall?.malicious) {
    score -= 15;
    issues.push("Malicious content detected");
  } else {
    strengths.push("No malicious content detected");
  }

  // Check for suspicious activity
  if (verdicts.overall?.suspicious && score > 0) {
    score -= 8;
    issues.push("Suspicious activity detected");
  }

  // Check for known vulnerabilities in technologies
  const technologies = urlscanData.technologies || [];
  const outdatedTech = technologies.filter(
    (tech) => tech.version && isOutdated(tech.name, tech.version),
  );
  if (outdatedTech.length > 0 && score > 0) {
    score -= Math.min(5, outdatedTech.length * 2);
    issues.push(`${outdatedTech.length} outdated technologies detected`);
  } else if (technologies.length > 0) {
    strengths.push("Technologies appear up-to-date");
  }

  score = Math.max(0, score);

  return createCategory(
    "Vulnerability Assessment",
    score,
    maxScore,
    issues,
    strengths,
  );
}

/**
 * Score threat intelligence (max 10 points)
 */
async function scoreThreatIntelligence(
  urlscanData: UrlscanData | null,
  whoisData: WhoisSecurityData | null,
): Promise<SecurityCategory> {
  let score = 10; // Start with full points, deduct for threats
  const maxScore = 10;
  const issues: string[] = [];
  const strengths: string[] = [];

  // Check URLScan threat indicators
  if (urlscanData?.verdicts?.overall?.malicious) {
    score -= 10;
    issues.push("Domain flagged as malicious");
  } else if (urlscanData?.verdicts?.overall?.suspicious) {
    score -= 5;
    issues.push("Domain flagged as suspicious");
  } else {
    strengths.push("No threat indicators found");
  }

  // Check domain age (very new domains can be risky)
  if (whoisData?.createdDate) {
    const ageInDays = Math.floor(
      (Date.now() - new Date(whoisData.createdDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (ageInDays < 30 && score > 0) {
      score -= 3;
      issues.push(`Domain is only ${ageInDays} days old`);
    } else if (ageInDays > 365) {
      strengths.push(
        `Established domain (${Math.floor(ageInDays / 365)} years old)`,
      );
    }
  }

  score = Math.max(0, score);

  return createCategory(
    "Threat Intelligence",
    score,
    maxScore,
    issues,
    strengths,
  );
}

/**
 * Helper: Create security category object
 */
function createCategory(
  name: string,
  score: number,
  maxScore: number,
  issues: string[],
  strengths: string[],
): SecurityCategory {
  const percentage = Math.round((score / maxScore) * 100);
  let status: SecurityCategory["status"];

  if (percentage >= 90) status = "excellent";
  else if (percentage >= 75) status = "good";
  else if (percentage >= 50) status = "fair";
  else if (percentage >= 25) status = "poor";
  else status = "critical";

  return {
    name,
    score,
    maxScore,
    percentage,
    status,
    issues,
    strengths,
  };
}

/**
 * Calculate security grade from overall score
 */
function calculateGrade(score: number): SecurityScore["grade"] {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Calculate risk level based on score and critical issues
 */
function calculateRiskLevel(
  score: number,
  categories: SecurityCategory[],
): SecurityScore["riskLevel"] {
  // Check for critical issues
  const hasCriticalIssues = categories.some((cat) => cat.status === "critical");
  if (hasCriticalIssues || score < 60) return "critical";

  const hasPoorCategories = categories.some((cat) => cat.status === "poor");
  if (hasPoorCategories || score < 70) return "high";

  if (score < 80) return "medium";
  if (score < 90) return "low";
  return "minimal";
}

/**
 * Generate security findings from category results
 */
function generateFindings(categories: SecurityCategory[]): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const category of categories) {
    // Generate findings for each issue
    for (const issue of category.issues) {
      const severity = determineSeverity(category, issue);
      const finding = createFinding(category.name, issue, severity);
      if (finding) findings.push(finding);
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return findings;
}

/**
 * Determine severity of an issue
 */
function determineSeverity(
  category: SecurityCategory,
  issue: string,
): SecurityFinding["severity"] {
  // Critical issues
  if (issue.includes("malicious") || issue.includes("Invalid or expired SSL")) {
    return "critical";
  }

  // High severity
  if (
    issue.includes("HTTPS not enabled") ||
    issue.includes("Self-signed") ||
    issue.includes("No SPF") ||
    issue.includes("No DMARC")
  ) {
    return "high";
  }

  // Medium severity
  if (
    issue.includes("Missing Content-Security-Policy") ||
    issue.includes("DNSSEC not enabled") ||
    issue.includes("outdated technologies")
  ) {
    return "medium";
  }

  // Low severity
  if (
    issue.includes("Missing") ||
    issue.includes("No CAA records") ||
    issue.includes("expires in")
  ) {
    return "low";
  }

  return "info";
}

/**
 * Create a security finding
 */
function createFinding(
  category: string,
  issue: string,
  severity: SecurityFinding["severity"],
): SecurityFinding | null {
  const findingMap: Record<string, Partial<SecurityFinding>> = {
    "HTTPS not enabled": {
      title: "HTTPS Not Enabled",
      description: "The website is not using HTTPS encryption",
      impact:
        "Data transmitted between users and the server is not encrypted, exposing sensitive information to interception",
      remediation:
        "Install an SSL/TLS certificate and configure the web server to use HTTPS. Redirect all HTTP traffic to HTTPS.",
    },
    "Invalid or expired SSL certificate": {
      title: "Invalid SSL Certificate",
      description: "The SSL/TLS certificate is invalid or has expired",
      impact:
        "Users will see security warnings, and the connection is not secure",
      remediation:
        "Renew or replace the SSL certificate with a valid one from a trusted Certificate Authority",
    },
    "Missing Content-Security-Policy header": {
      title: "Missing Content-Security-Policy",
      description: "No Content-Security-Policy header is configured",
      impact:
        "Increased risk of XSS attacks and unauthorized content injection",
      remediation:
        "Implement a Content-Security-Policy header to control which resources can be loaded",
    },
    "DNSSEC not enabled": {
      title: "DNSSEC Not Enabled",
      description: "DNS Security Extensions are not configured",
      impact:
        "DNS responses are not authenticated, making the domain vulnerable to DNS spoofing attacks",
      remediation:
        "Enable DNSSEC at your domain registrar and configure DS records",
    },
    "No SPF record found": {
      title: "Missing SPF Record",
      description: "No Sender Policy Framework record is configured",
      impact:
        "Email spoofing is easier, and legitimate emails may be marked as spam",
      remediation:
        "Add an SPF TXT record to specify which servers can send email for your domain",
    },
    "No DMARC policy found": {
      title: "Missing DMARC Policy",
      description: "No DMARC policy is configured",
      impact:
        "No protection against email spoofing and phishing attacks using your domain",
      remediation:
        "Implement a DMARC policy to specify how to handle unauthenticated emails",
    },
  };

  const template = findingMap[issue];
  if (!template) return null;

  return {
    category,
    severity,
    title: template.title!,
    description: template.description!,
    impact: template.impact!,
    remediation: template.remediation!,
  };
}

/**
 * Generate security recommendations
 */
function generateRecommendations(
  categories: SecurityCategory[],
): SecurityRecommendation[] {
  const recommendations: SecurityRecommendation[] = [];

  for (const category of categories) {
    // Generate recommendations for poor/critical categories
    if (category.status === "critical" || category.status === "poor") {
      const recs = createRecommendationsForCategory(category);
      recommendations.push(...recs);
    }
  }

  // Sort by priority and impact
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.impactScore - a.impactScore;
  });

  return recommendations.slice(0, 10); // Return top 10 recommendations
}

/**
 * Create recommendations for a category
 */
function createRecommendationsForCategory(
  category: SecurityCategory,
): SecurityRecommendation[] {
  const recommendations: SecurityRecommendation[] = [];

  if (category.name === "SSL/TLS Configuration" && category.percentage < 75) {
    recommendations.push({
      priority: "critical",
      category: category.name,
      title: "Implement HTTPS with Valid Certificate",
      description:
        "Enable HTTPS encryption with a valid SSL/TLS certificate from a trusted CA",
      implementation:
        "1. Obtain SSL certificate from Let's Encrypt or commercial CA\n2. Install certificate on web server\n3. Configure HTTPS redirect\n4. Enable HSTS header",
      estimatedEffort: "medium",
      impactScore: 15,
    });
  }

  if (category.name === "Security Headers" && category.percentage < 50) {
    recommendations.push({
      priority: "high",
      category: category.name,
      title: "Configure Security Headers",
      description:
        "Implement essential security headers to protect against common web vulnerabilities",
      implementation:
        "Add the following headers to your web server configuration:\n- Content-Security-Policy\n- X-Frame-Options: DENY\n- X-Content-Type-Options: nosniff\n- Referrer-Policy: strict-origin-when-cross-origin",
      estimatedEffort: "low",
      impactScore: 12,
    });
  }

  if (category.name === "Email Security" && category.percentage < 50) {
    recommendations.push({
      priority: "high",
      category: category.name,
      title: "Implement Email Authentication",
      description: "Configure SPF, DKIM, and DMARC to prevent email spoofing",
      implementation:
        '1. Add SPF TXT record: "v=spf1 include:_spf.google.com ~all"\n2. Configure DKIM signing\n3. Add DMARC policy: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"',
      estimatedEffort: "medium",
      impactScore: 10,
    });
  }

  if (category.name === "DNS Security" && category.percentage < 50) {
    recommendations.push({
      priority: "medium",
      category: category.name,
      title: "Enable DNSSEC",
      description:
        "Implement DNS Security Extensions to protect against DNS spoofing",
      implementation:
        "1. Contact your DNS provider to enable DNSSEC\n2. Add DS records to your domain registrar\n3. Verify DNSSEC validation",
      estimatedEffort: "medium",
      impactScore: 8,
    });
  }

  return recommendations;
}

/**
 * Track security score trends over time
 */
export async function trackSecurityTrend(
  domain: string,
  _days: number = 90,
): Promise<SecurityTrend> {
  // This would query historical security scores from a database
  // For now, return a placeholder structure
  return {
    domain,
    assessments: [],
    trend: "stable",
    changeRate: 0,
  };
}

/**
 * Check if a technology version is outdated
 */
function isOutdated(name: string, version: string): boolean {
  // Simplified check - in production, this would check against a vulnerability database
  const outdatedVersions: Record<string, string[]> = {
    jQuery: ["1.x", "2.x"],
    WordPress: ["5.0", "5.1", "5.2"],
    PHP: ["5.x", "7.0", "7.1", "7.2"],
  };

  const outdated = outdatedVersions[name];
  if (!outdated) return false;

  return outdated.some((v) => version.startsWith(v));
}

/**
 * Get latest URLScan data for domain
 */
async function getLatestUrlscanData(
  domain: string,
): Promise<UrlscanData | null> {
  const results = await db
    .select()
    .from(urlscanResults)
    .where(eq(urlscanResults.domain, domain))
    .orderBy(desc(urlscanResults.scannedAt))
    .limit(1);

  return (results[0] as unknown as UrlscanData) || null;
}

/**
 * Get DNS security data for domain
 */
async function getDnsSecurityData(
  domain: string,
): Promise<DnsSecurityRecord[]> {
  const results = await db
    .select()
    .from(dnsRecords)
    .where(eq(dnsRecords.domain, domain));

  return results as unknown as DnsSecurityRecord[];
}

/**
 * Get WHOIS security data for domain
 */
async function getWhoisSecurityData(
  domain: string,
): Promise<WhoisSecurityData | null> {
  const results = await db
    .select()
    .from(whoisRecords)
    .where(eq(whoisRecords.domain, domain))
    .orderBy(desc(whoisRecords.scannedAt))
    .limit(1);

  return (results[0] as unknown as WhoisSecurityData) || null;
}
