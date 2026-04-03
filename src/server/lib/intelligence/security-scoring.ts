/**
 * Security Posture Scoring Engine
 * 
 * Provides:
 * - Combined security score (0-100)
 * - DNS security analysis (DNSSEC, SPF, DMARC)
 * - SSL/TLS certificate validation
 * - Malware and phishing detection (URLScan + Google Safe Browsing)
 * - Technology vulnerability assessment
 * - Actionable security recommendations
 */

import { db } from '../../db/client.js';
import { 
  dnsRecords, 
  urlscanResults, 
  technologyStack,
  ipIntelligence 
} from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { checkUrlSafety } from '../safe-browsing.js';

type UrlscanRow = typeof urlscanResults.$inferSelect;
type TechnologyRow = typeof technologyStack.$inferSelect;

function inferSslStatus(scan: UrlscanRow): { valid: boolean | null; issuer: string | null } {
  const issuer = scan.tlsIssuer || null;
  const hasTlsSignals = Boolean(scan.tlsVersion || scan.tlsValidFrom || scan.tlsValidTo || issuer);

  if (!hasTlsSignals) {
    return { valid: null, issuer };
  }

  if (scan.tlsValidTo) {
    return { valid: new Date(scan.tlsValidTo).getTime() > Date.now(), issuer };
  }

  return { valid: true, issuer };
}

function getMaliciousScore(scan: UrlscanRow): number {
  return scan.score ?? 0;
}

function getSuspiciousRequests(scan: UrlscanRow): number {
  if (!scan.suspiciousActivity) return 0;
  const totalRequests = scan.totalRequests ?? 60;
  return Math.max(6, Math.round(totalRequests * 0.1));
}

function getTechnologyName(tech: TechnologyRow): string {
  return tech.name;
}

function getTechnologyConfidence(tech: TechnologyRow): number {
  return tech.confidence;
}

function mapThreatLevelToScore(threatLevel: string | null | undefined): number {
  if (!threatLevel) return 0;
  const normalized = threatLevel.toLowerCase();
  if (normalized === 'critical') return 100;
  if (normalized === 'high') return 75;
  if (normalized === 'medium') return 50;
  if (normalized === 'low') return 25;
  const numeric = Number.parseInt(normalized, 10);
  return Number.isNaN(numeric) ? 0 : numeric;
}

export interface SecurityScore {
  domain: string;
  overallScore: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    dnsScore: number; // 0-25
    sslScore: number; // 0-20
    malwareScore: number; // 0-25
    emailScore: number; // 0-15
    technologyScore: number; // 0-15
  };
  findings: SecurityFinding[];
  recommendations: SecurityRecommendation[];
  lastScanned: Date;
}

export interface SecurityFinding {
  category: 'dns' | 'ssl' | 'malware' | 'email' | 'technology';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  impact: string;
  affectsScore: number; // Points deducted
}

export interface SecurityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  estimatedTime: string;
  potentialScoreGain: number;
}

export interface DetailedSecurityReport {
  score: SecurityScore;
  dnsAnalysis: {
    dnssecEnabled: boolean;
    spfRecord: string | null;
    dmarcRecord: string | null;
    dkimDetected: boolean;
    nameserverCount: number;
    issues: string[];
  };
  sslAnalysis: {
    valid: boolean;
    issuer: string | null;
    expiryDate: Date | null;
    daysUntilExpiry: number | null;
    issues: string[];
  };
  malwareAnalysis: {
    clean: boolean;
    malwareDetected: boolean;
    phishingDetected: boolean;
    suspiciousRequests: number;
    lastScan: Date | null;
    issues: string[];
  };
  technologyAnalysis: {
    outdatedTechnologies: number;
    eolTechnologies: number;
    vulnerabilities: string[];
    issues: string[];
  };
  ipAnalysis: {
    threatLevel: number;
    isProxy: boolean;
    isVpn: boolean;
    isTor: boolean;
    issues: string[];
  };
}

/**
 * Calculate comprehensive security score for a domain
 */
export async function calculateSecurityScore(
  domain: string
): Promise<SecurityScore | null> {
  try {
    const findings: SecurityFinding[] = [];
    const recommendations: SecurityRecommendation[] = [];
    
    // Initialize breakdown
    const breakdown = {
      dnsScore: 0,
      sslScore: 0,
      malwareScore: 0,
      emailScore: 0,
      technologyScore: 0,
    };

    // 1. DNS Security Analysis (25 points)
    const dnsAnalysis = await analyzeDNSSecurity(domain);
    breakdown.dnsScore = dnsAnalysis.score;
    findings.push(...dnsAnalysis.findings);
    recommendations.push(...dnsAnalysis.recommendations);

    // 2. SSL/TLS Analysis (20 points)
    const sslAnalysis = await analyzeSSLSecurity(domain);
    breakdown.sslScore = sslAnalysis.score;
    findings.push(...sslAnalysis.findings);
    recommendations.push(...sslAnalysis.recommendations);

    // 3. Malware/Phishing Analysis (25 points)
    const malwareAnalysis = await analyzeMalwareSecurity(domain);
    breakdown.malwareScore = malwareAnalysis.score;
    findings.push(...malwareAnalysis.findings);
    recommendations.push(...malwareAnalysis.recommendations);

    // 4. Email Security Analysis (15 points)
    const emailAnalysis = await analyzeEmailSecurity(domain);
    breakdown.emailScore = emailAnalysis.score;
    findings.push(...emailAnalysis.findings);
    recommendations.push(...emailAnalysis.recommendations);

    // 5. Technology Security Analysis (15 points)
    const techAnalysis = await analyzeTechnologySecurity(domain);
    breakdown.technologyScore = techAnalysis.score;
    findings.push(...techAnalysis.findings);
    recommendations.push(...techAnalysis.recommendations);

    // Calculate overall score
    const overallScore = Math.round(
      breakdown.dnsScore +
      breakdown.sslScore +
      breakdown.malwareScore +
      breakdown.emailScore +
      breakdown.technologyScore
    );

    // Assign grade
    const grade = getSecurityGrade(overallScore);

    // Sort recommendations by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
      domain,
      overallScore,
      grade,
      breakdown,
      findings,
      recommendations: recommendations.slice(0, 10), // Top 10
      lastScanned: new Date(),
    };
  } catch (error) {
    console.error('[Security Scoring] Error calculating score:', error);
    return null;
  }
}

/**
 * Analyze DNS security
 */
async function analyzeDNSSecurity(domain: string) {
  const findings: SecurityFinding[] = [];
  const recommendations: SecurityRecommendation[] = [];
  let score = 25; // Start with full points

  try {
    // Get DNS records
    const records = await db
      .select()
      .from(dnsRecords)
      .where(eq(dnsRecords.domain, domain));

    if (records.length === 0) {
      score = 0;
      findings.push({
        category: 'dns',
        severity: 'critical',
        title: 'No DNS records found',
        description: 'Domain has not been scanned for DNS records',
        impact: 'Cannot assess DNS security posture',
        affectsScore: 25,
      });
      return { score, findings, recommendations };
    }

    // Check for DNSSEC
    const hasDNSSEC = records.some(r => r.recordType === 'DNSKEY' || r.recordType === 'RRSIG');
    if (!hasDNSSEC) {
      score -= 10;
      findings.push({
        category: 'dns',
        severity: 'high',
        title: 'DNSSEC not enabled',
        description: 'Domain does not have DNSSEC protection',
        impact: 'Vulnerable to DNS spoofing and cache poisoning attacks',
        affectsScore: 10,
      });
      recommendations.push({
        priority: 'high',
        title: 'Enable DNSSEC',
        description: 'Add DNSSEC to protect against DNS attacks',
        implementation: 'Contact your DNS provider to enable DNSSEC signing',
        estimatedTime: '30 minutes',
        potentialScoreGain: 10,
      });
    }

    // Check nameserver count
    const nsRecords = records.filter(r => r.recordType === 'NS');
    if (nsRecords.length < 2) {
      score -= 5;
      findings.push({
        category: 'dns',
        severity: 'medium',
        title: 'Insufficient nameservers',
        description: `Only ${nsRecords.length} nameserver(s) configured`,
        impact: 'Single point of failure for DNS resolution',
        affectsScore: 5,
      });
      recommendations.push({
        priority: 'medium',
        title: 'Add redundant nameservers',
        description: 'Configure at least 2 nameservers for redundancy',
        implementation: 'Add secondary nameserver in your DNS settings',
        estimatedTime: '15 minutes',
        potentialScoreGain: 5,
      });
    }

    // Check for CAA records
    const hasCAARecord = records.some(r => r.recordType === 'CAA');
    if (!hasCAARecord) {
      score -= 5;
      findings.push({
        category: 'dns',
        severity: 'medium',
        title: 'No CAA record found',
        description: 'Missing Certificate Authority Authorization record',
        impact: 'Anyone can issue SSL certificates for your domain',
        affectsScore: 5,
      });
      recommendations.push({
        priority: 'medium',
        title: 'Add CAA record',
        description: 'Specify which CAs can issue certificates for your domain',
        implementation: 'Add CAA record: "0 issue letsencrypt.org"',
        estimatedTime: '10 minutes',
        potentialScoreGain: 5,
      });
    }

    // Check for excessive A records (potential security issue)
    const aRecords = records.filter(r => r.recordType === 'A');
    if (aRecords.length > 10) {
      score -= 5;
      findings.push({
        category: 'dns',
        severity: 'low',
        title: 'Excessive A records',
        description: `${aRecords.length} A records found - may indicate misconfiguration`,
        impact: 'Potential DNS misconfiguration or security issue',
        affectsScore: 5,
      });
    }
  } catch (error) {
    console.error('[DNS Security] Error:', error);
  }

  return { score: Math.max(0, score), findings, recommendations };
}

/**
 * Analyze SSL/TLS security
 */
async function analyzeSSLSecurity(domain: string) {
  const findings: SecurityFinding[] = [];
  const recommendations: SecurityRecommendation[] = [];
  let score = 20; // Start with full points

  try {
    // Get URLScan results for SSL info
    const urlscanData = await db
      .select()
      .from(urlscanResults)
      .where(eq(urlscanResults.domain, domain))
      .orderBy(desc(urlscanResults.scannedAt))
      .limit(1);

    if (urlscanData.length === 0) {
      score = 10; // Partial credit
      findings.push({
        category: 'ssl',
        severity: 'medium',
        title: 'SSL status unknown',
        description: 'No security scan data available',
        impact: 'Cannot verify SSL certificate validity',
        affectsScore: 10,
      });
      return { score, findings, recommendations };
    }

    const scan = urlscanData[0];
    const sslStatus = inferSslStatus(scan);

    // Check SSL validity
    if (sslStatus.valid === false) {
      score -= 15;
      findings.push({
        category: 'ssl',
        severity: 'critical',
        title: 'Invalid SSL certificate',
        description: 'SSL certificate is invalid or expired',
        impact: 'Users will see security warnings, data may be unencrypted',
        affectsScore: 15,
      });
      recommendations.push({
        priority: 'critical',
        title: 'Fix SSL certificate',
        description: 'Renew or replace invalid SSL certificate immediately',
        implementation: 'Use Let\'s Encrypt for free SSL certificates',
        estimatedTime: '1 hour',
        potentialScoreGain: 15,
      });
    }
    if (sslStatus.valid === null) {
      score -= 5;
      findings.push({
        category: 'ssl',
        severity: 'medium',
        title: 'SSL details unavailable',
        description: 'TLS metadata was not returned by the latest security scan',
        impact: 'Cannot fully validate certificate trust and expiry state',
        affectsScore: 5,
      });
    }

    // Check SSL issuer
    if (sslStatus.issuer && sslStatus.issuer.toLowerCase().includes('self-signed')) {
      score -= 10;
      findings.push({
        category: 'ssl',
        severity: 'high',
        title: 'Self-signed certificate',
        description: 'Using self-signed SSL certificate',
        impact: 'Browsers will show security warnings',
        affectsScore: 10,
      });
      recommendations.push({
        priority: 'high',
        title: 'Use trusted CA certificate',
        description: 'Replace self-signed cert with one from a trusted CA',
        implementation: 'Use Let\'s Encrypt or commercial SSL provider',
        estimatedTime: '30 minutes',
        potentialScoreGain: 10,
      });
    }
  } catch (error) {
    console.error('[SSL Security] Error:', error);
  }

  return { score: Math.max(0, score), findings, recommendations };
}

/**
 * Analyze malware/phishing security
 */
async function analyzeMalwareSecurity(domain: string) {
  const findings: SecurityFinding[] = [];
  const recommendations: SecurityRecommendation[] = [];
  let score = 25; // Start with full points

  try {
    // Run both URLScan and Google Safe Browsing checks in parallel
    const [urlscanData, safeBrowsingResult] = await Promise.all([
      db
        .select()
        .from(urlscanResults)
        .where(eq(urlscanResults.domain, domain))
        .orderBy(desc(urlscanResults.scannedAt))
        .limit(1),
      checkUrlSafety(domain),
    ]);

    // Google Safe Browsing check (highest priority)
    if (safeBrowsingResult.checked) {
      if (!safeBrowsingResult.safe) {
        // Critical threat detected by Google
        score = 0; // Zero score for Google-flagged sites
        
        safeBrowsingResult.threats.forEach(threat => {
          findings.push({
            category: 'malware',
            severity: 'critical',
            title: `Google Safe Browsing: ${threat.type}`,
            description: threat.description,
            impact: 'Site flagged by Google - will be blocked in Chrome and other browsers',
            affectsScore: 25,
          });
        });

        recommendations.push({
          priority: 'critical',
          title: 'Remove threats and request Google review',
          description: 'Clean your site and submit for Google Safe Browsing review',
          implementation: '1. Remove malicious content\n2. Scan all files\n3. Update passwords\n4. Request review: https://search.google.com/search-console',
          estimatedTime: '4-8 hours',
          potentialScoreGain: 25,
        });

        // If Google flags it, we don't need to check URLScan
        return { score, findings, recommendations };
      }
    }

    // URLScan results (secondary check)
    if (urlscanData.length === 0) {
      score = 15; // Partial credit
      findings.push({
        category: 'malware',
        severity: 'medium',
        title: 'Malware status unknown',
        description: 'No security scan data available',
        impact: 'Cannot verify site is clean',
        affectsScore: 10,
      });
      return { score, findings, recommendations };
    }

    const scan = urlscanData[0];
    const maliciousScore = getMaliciousScore(scan);
    const suspiciousRequests = getSuspiciousRequests(scan);

    // Check for malware
    if (scan.malwareDetected) {
      score -= 25;
      findings.push({
        category: 'malware',
        severity: 'critical',
        title: 'Malware detected',
        description: 'Active malware found on domain',
        impact: 'Site may infect visitors, blacklisted by search engines',
        affectsScore: 25,
      });
      recommendations.push({
        priority: 'critical',
        title: 'Remove malware immediately',
        description: 'Clean infected files and secure server',
        implementation: 'Scan server, remove malicious code, update passwords',
        estimatedTime: '2-4 hours',
        potentialScoreGain: 25,
      });
    }

    // Check for phishing
    if (scan.phishingDetected) {
      score -= 20;
      findings.push({
        category: 'malware',
        severity: 'critical',
        title: 'Phishing detected',
        description: 'Site flagged as phishing attempt',
        impact: 'Blacklisted, legal liability, reputation damage',
        affectsScore: 20,
      });
      recommendations.push({
        priority: 'critical',
        title: 'Remove phishing content',
        description: 'Remove phishing pages and secure site',
        implementation: 'Delete phishing content, change all credentials',
        estimatedTime: '1-2 hours',
        potentialScoreGain: 20,
      });
    }

    // Check malicious score
    if (maliciousScore > 50) {
      score -= 10;
      findings.push({
        category: 'malware',
        severity: 'high',
        title: 'High malicious score',
        description: `Malicious score: ${maliciousScore}/100`,
        impact: 'Site exhibits suspicious behavior',
        affectsScore: 10,
      });
    }

    // Check suspicious requests
    if (suspiciousRequests > 5) {
      score -= 5;
      findings.push({
        category: 'malware',
        severity: 'medium',
        title: 'Suspicious network requests',
        description: `${suspiciousRequests} suspicious requests detected`,
        impact: 'May indicate compromised site or tracking',
        affectsScore: 5,
      });
    }
  } catch (error) {
    console.error('[Malware Security] Error:', error);
  }

  return { score: Math.max(0, score), findings, recommendations };
}

/**
 * Analyze email security (SPF, DMARC, DKIM)
 */
async function analyzeEmailSecurity(domain: string) {
  const findings: SecurityFinding[] = [];
  const recommendations: SecurityRecommendation[] = [];
  let score = 15; // Start with full points

  try {
    // Get DNS records
    const records = await db
      .select()
      .from(dnsRecords)
      .where(eq(dnsRecords.domain, domain));

    if (records.length === 0) {
      return { score: 0, findings, recommendations };
    }

    // Check for SPF record
    const spfRecord = records.find(r => 
      r.recordType === 'TXT' && r.value?.includes('v=spf1')
    );
    if (!spfRecord) {
      score -= 5;
      findings.push({
        category: 'email',
        severity: 'high',
        title: 'No SPF record',
        description: 'Missing Sender Policy Framework record',
        impact: 'Emails may be marked as spam, domain can be spoofed',
        affectsScore: 5,
      });
      recommendations.push({
        priority: 'high',
        title: 'Add SPF record',
        description: 'Configure SPF to prevent email spoofing',
        implementation: 'Add TXT record: "v=spf1 include:_spf.google.com ~all"',
        estimatedTime: '15 minutes',
        potentialScoreGain: 5,
      });
    }

    // Check for DMARC record
    const dmarcRecord = records.find(r => 
      r.recordType === 'TXT' && r.value?.includes('v=DMARC1')
    );
    if (!dmarcRecord) {
      score -= 5;
      findings.push({
        category: 'email',
        severity: 'high',
        title: 'No DMARC record',
        description: 'Missing Domain-based Message Authentication record',
        impact: 'Cannot enforce email authentication policy',
        affectsScore: 5,
      });
      recommendations.push({
        priority: 'high',
        title: 'Add DMARC record',
        description: 'Configure DMARC to protect against email spoofing',
        implementation: 'Add TXT record at _dmarc: "v=DMARC1; p=quarantine"',
        estimatedTime: '15 minutes',
        potentialScoreGain: 5,
      });
    }

    // Check for MX records
    const mxRecords = records.filter(r => r.recordType === 'MX');
    if (mxRecords.length === 0) {
      score -= 5;
      findings.push({
        category: 'email',
        severity: 'medium',
        title: 'No MX records',
        description: 'Domain cannot receive email',
        impact: 'Email delivery will fail',
        affectsScore: 5,
      });
    }
  } catch (error) {
    console.error('[Email Security] Error:', error);
  }

  return { score: Math.max(0, score), findings, recommendations };
}

/**
 * Analyze technology security
 */
async function analyzeTechnologySecurity(domain: string) {
  const findings: SecurityFinding[] = [];
  const recommendations: SecurityRecommendation[] = [];
  let score = 15; // Start with full points

  try {
    // Get technology stack
    const technologies = await db
      .select()
      .from(technologyStack)
      .where(eq(technologyStack.domain, domain));

    if (technologies.length === 0) {
      return { score: 10, findings, recommendations }; // Partial credit
    }

    // Check for EOL technologies
    const eolTechs = technologies.filter(t => t.isEol);
    if (eolTechs.length > 0) {
      score -= 10;
      findings.push({
        category: 'technology',
        severity: 'critical',
        title: 'End-of-life technologies detected',
        description: `${eolTechs.length} EOL technologies: ${eolTechs.map(getTechnologyName).join(', ')}`,
        impact: 'No security updates, vulnerable to known exploits',
        affectsScore: 10,
      });
      recommendations.push({
        priority: 'critical',
        title: 'Upgrade EOL technologies',
        description: 'Replace end-of-life software with supported versions',
        implementation: 'Plan migration to current versions',
        estimatedTime: '1-4 weeks',
        potentialScoreGain: 10,
      });
    }

    // Check for outdated technologies (low confidence or old versions)
    const outdatedTechs = technologies.filter(t => 
      !t.isEol && getTechnologyConfidence(t) < 50
    );
    if (outdatedTechs.length > 0) {
      score -= 5;
      findings.push({
        category: 'technology',
        severity: 'medium',
        title: 'Potentially outdated technologies',
        description: `${outdatedTechs.length} technologies may be outdated`,
        impact: 'May have unpatched vulnerabilities',
        affectsScore: 5,
      });
    }
  } catch (error) {
    console.error('[Technology Security] Error:', error);
  }

  return { score: Math.max(0, score), findings, recommendations };
}

/**
 * Get security grade from score
 */
function getSecurityGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Generate detailed security report
 */
export async function generateDetailedSecurityReport(
  domain: string
): Promise<DetailedSecurityReport | null> {
  try {
    const score = await calculateSecurityScore(domain);
    if (!score) return null;

    // Get detailed DNS analysis
    const dnsRecordsData = await db
      .select()
      .from(dnsRecords)
      .where(eq(dnsRecords.domain, domain));

    const spfRecord = dnsRecordsData.find(r => 
      r.recordType === 'TXT' && r.value?.includes('v=spf1')
    );
    const dmarcRecord = dnsRecordsData.find(r => 
      r.recordType === 'TXT' && r.value?.includes('v=DMARC1')
    );
    const hasDNSSEC = dnsRecordsData.some(r => 
      r.recordType === 'DNSKEY' || r.recordType === 'RRSIG'
    );

    // Get SSL analysis
    const urlscanData = await db
      .select()
      .from(urlscanResults)
      .where(eq(urlscanResults.domain, domain))
      .orderBy(desc(urlscanResults.scannedAt))
      .limit(1);

    // Get technology analysis
    const technologies = await db
      .select()
      .from(technologyStack)
      .where(eq(technologyStack.domain, domain));

    // Get IP analysis
    const aRecords = dnsRecordsData.filter(r => r.recordType === 'A');
    let ipAnalysisData = null;
    if (aRecords.length > 0 && aRecords[0].value) {
      const ipData = await db
        .select()
        .from(ipIntelligence)
        .where(eq(ipIntelligence.ipAddress, aRecords[0].value))
        .limit(1);
      ipAnalysisData = ipData[0] || null;
    }

    return {
      score,
      dnsAnalysis: {
        dnssecEnabled: hasDNSSEC,
        spfRecord: spfRecord?.value || null,
        dmarcRecord: dmarcRecord?.value || null,
        dkimDetected: false, // Would need additional detection
        nameserverCount: dnsRecordsData.filter(r => r.recordType === 'NS').length,
        issues: score.findings.filter(f => f.category === 'dns').map(f => f.title),
      },
      sslAnalysis: {
        valid: urlscanData[0] ? inferSslStatus(urlscanData[0]).valid ?? false : false,
        issuer: urlscanData[0] ? inferSslStatus(urlscanData[0]).issuer : null,
        expiryDate: null, // Would need additional data
        daysUntilExpiry: null,
        issues: score.findings.filter(f => f.category === 'ssl').map(f => f.title),
      },
      malwareAnalysis: {
        clean: !urlscanData[0]?.malwareDetected && !urlscanData[0]?.phishingDetected,
        malwareDetected: urlscanData[0]?.malwareDetected || false,
        phishingDetected: urlscanData[0]?.phishingDetected || false,
        suspiciousRequests: urlscanData[0] ? getSuspiciousRequests(urlscanData[0]) : 0,
        lastScan: urlscanData[0]?.scannedAt || null,
        issues: score.findings.filter(f => f.category === 'malware').map(f => f.title),
      },
      technologyAnalysis: {
        outdatedTechnologies: technologies.filter(t => !t.isEol && getTechnologyConfidence(t) < 50).length,
        eolTechnologies: technologies.filter(t => t.isEol).length,
        vulnerabilities: technologies.filter(t => t.isEol).map(t => `${getTechnologyName(t)} (EOL)`),
        issues: score.findings.filter(f => f.category === 'technology').map(f => f.title),
      },
      ipAnalysis: {
        threatLevel: mapThreatLevelToScore(ipAnalysisData?.threatLevel),
        isProxy: ipAnalysisData?.isProxy || false,
        isVpn: ipAnalysisData?.isVpn || false,
        isTor: ipAnalysisData?.isTor || false,
        issues: [],
      },
    };
  } catch (error) {
    console.error('[Security Report] Error:', error);
    return null;
  }
}
