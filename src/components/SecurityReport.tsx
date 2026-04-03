import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Bot,
  Zap,
  Globe,
  Server,
  Clock,
  DollarSign,
  Users,
  FileWarning,
} from "lucide-react";
import IntelligenceAccordion from "./intelligence/IntelligenceAccordion";
import type { MigrationAnalysis } from "@/lib/engines/migration-analysis-engine";
// import { Badge } from './ui/badge';

interface SecurityReportProps {
  domain: string;
  securityData: SecurityData;
  technologyData: TechnologyData;
  dnsData?: DNSData; // DNS data including A record age
  scanDate: Date;
}

interface SecurityData {
  waf?: { detected?: boolean };
  ddos?: { detected?: boolean };
  headers?: Record<string, unknown>;
  ssl?: { valid?: boolean };
  score?: number;
  [key: string]: unknown;
}

interface TechnologyData {
  wordpress?: { detected?: boolean; version?: string | null };
  php?: { version?: string | null };
  server?: { isWebsiteBuilder?: boolean; type?: string };
  [key: string]: unknown;
}

interface DNSData {
  aRecordAge?: {
    aRecordAge?: number;
    needsRedesign?: boolean;
    estimatedAge?: boolean;
    aRecordLastChanged?: string;
  };
}

export const SecurityReport: React.FC<SecurityReportProps> = ({
  domain,
  securityData,
  technologyData,
  dnsData,
  scanDate,
}) => {
  // Check A record age for redesign recommendation
  const aRecordAge = dnsData?.aRecordAge?.aRecordAge || null;
  const aRecordNeedsRedesign = dnsData?.aRecordAge?.needsRedesign || false;
  const aRecordEstimated = dnsData?.aRecordAge?.estimatedAge || false;
  const aRecordLastChanged = dnsData?.aRecordAge?.aRecordLastChanged || null;

  // Determine if site needs security improvements
  const hasFirewall = securityData?.waf?.detected || false;
  const hasBotProtection =
    securityData?.ddos?.detected ||
    securityData?.headers?.["x-content-type-options"] ||
    securityData?.headers?.["x-xss-protection"] ||
    false;
  const hasSSL = securityData?.ssl?.valid || false;
  const securityScore = securityData?.score || 0;

  // Determine site type for personalized messaging
  const isWordPress = technologyData?.wordpress?.detected || false;
  const isWebsiteBuilder = technologyData?.server?.isWebsiteBuilder || false;
  // const serverType = technologyData?.server?.type || 'Unknown';

  // WordPress and PHP version detection
  const wordpressVersion = technologyData?.wordpress?.version || null;
  const phpVersion = technologyData?.php?.version || null;

  // Parse version numbers for comparison
  const parseVersion = (version: string | null): number[] => {
    if (!version) return [0, 0, 0];
    const cleaned = version.replace(/[^0-9.]/g, "");
    return cleaned.split(".").map((v) => parseInt(v) || 0);
  };

  const compareVersions = (
    version: string | null,
    threshold: string,
  ): boolean => {
    const v = parseVersion(version);
    const t = parseVersion(threshold);

    for (let i = 0; i < 3; i++) {
      if (v[i] < t[i]) return true; // version is lower
      if (v[i] > t[i]) return false; // version is higher
    }
    return false; // versions are equal
  };

  // WordPress maintenance thresholds
  const needsMaintenanceSupport =
    isWordPress &&
    (compareVersions(wordpressVersion, "6.8") ||
      compareVersions(phpVersion, "8.1"));

  const needsRebuild =
    isWordPress &&
    (compareVersions(wordpressVersion, "6.5") ||
      compareVersions(phpVersion, "7.4"));

  // Calculate risk level
  const getRiskLevel = () => {
    if (securityScore >= 80)
      return { level: "Low", color: "green", emoji: "✅" };
    if (securityScore >= 60)
      return { level: "Medium", color: "orange", emoji: "⚠️" };
    if (securityScore >= 40)
      return { level: "High", color: "red", emoji: "🚨" };
    return { level: "Critical", color: "red", emoji: "🔴" };
  };

  const risk = getRiskLevel();

  // Don't show report for website builders (they handle security)
  if (isWebsiteBuilder) {
    return null;
  }

  return (
    <div
      id="security-report"
      className="bg-background text-foreground p-8 max-w-4xl mx-auto space-y-8"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <div className="text-center space-y-4 pb-6 border-b-2 border-border">
        <div className="flex items-center justify-center gap-3">
          <Shield className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">
            Website Security Report
          </h1>
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-primary">{domain}</p>
          <p className="text-sm text-muted-foreground">
            Report Generated:{" "}
            {scanDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* A Record Age Alert - Priority Redesign Recommendation */}
      {/* Only show if WordPress version < 6.5 OR if not WordPress */}
      {aRecordNeedsRedesign &&
        (!isWordPress || compareVersions(wordpressVersion, "6.5")) && (
          <div className="no-break space-y-4 bg-gradient-to-br from-red-50 via-red-100 to-red-50 dark:from-red-950/40 dark:via-red-900/40 dark:to-red-950/40 p-8 rounded-lg border-2 border-red-500 shadow-lg">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-10 w-10 text-red-500 animate-pulse" />
                <h2 className="text-3xl font-bold text-foreground">
                  🚨 Critical: Your Website Is Severely Outdated
                </h2>
              </div>
              <div className="inline-block px-4 py-2 bg-red-500 text-white rounded-full font-bold text-lg">
                DNS Record Age: {aRecordAge} Years
                {aRecordEstimated ? " (Estimated)" : ""}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border-2 border-red-300 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-2xl font-bold text-red-700 dark:text-red-400">
                    Your Website Infrastructure Hasn't Changed in{" "}
                    {Math.floor(aRecordAge)} Years
                  </h3>
                  <p className="text-base leading-relaxed">
                    Our analysis shows your website's DNS records (the digital
                    address that connects your domain to your website) haven't
                    been updated since{" "}
                    {aRecordLastChanged
                      ? new Date(aRecordLastChanged).getFullYear()
                      : `approximately ${new Date().getFullYear() - Math.floor(aRecordAge)}`}
                    . This is a strong indicator that your website is running on
                    severely outdated technology.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pl-16">
                <div>
                  <h4 className="font-bold text-lg mb-2 text-foreground">
                    What This Means:
                  </h4>
                  <ul className="space-y-3 text-base">
                    <li className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Outdated Design:</strong> Web design standards
                        have evolved dramatically. Your site likely looks dated
                        compared to competitors, hurting your credibility and
                        conversions.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Security Vulnerabilities:</strong> Older
                        websites are built on technology with known security
                        flaws. Hackers specifically target old sites because
                        they're easier to compromise.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Poor Mobile Experience:</strong> If your site
                        was built {Math.floor(aRecordAge)} years ago, it likely
                        wasn't designed for smartphones, which now account for
                        over 60% of web traffic.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Slow Performance:</strong> Modern websites load
                        in under 2 seconds. Older sites often take 5-10 seconds,
                        causing visitors to leave before seeing your content.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Search Engine Penalties:</strong> Google
                        prioritizes modern, fast, mobile-friendly websites. Your
                        old site is likely losing search rankings to competitors
                        with newer sites.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Maintenance Nightmare:</strong> Finding
                        developers who can work on {Math.floor(aRecordAge)}
                        -year-old technology is expensive and difficult. Updates
                        and fixes cost more and take longer.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-950/30 p-5 rounded-lg border-2 border-red-400">
                  <p className="text-base font-bold mb-3 text-red-700 dark:text-red-400">
                    Real-World Impact:
                  </p>
                  <p className="text-base text-muted-foreground italic leading-relaxed">
                    "A local business was losing customers to competitors
                    without understanding why. Their website was{" "}
                    {Math.floor(aRecordAge)} years old - slow, not
                    mobile-friendly, and looked unprofessional. After a complete
                    redesign, they saw a 240% increase in online inquiries and
                    180% increase in sales within 6 months. The new site paid
                    for itself in just 3 months."
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 p-6 rounded-lg border-2 border-green-500">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <h4 className="text-xl font-bold text-foreground">
                        Our #1 Recommendation: Complete Website Redesign
                      </h4>
                      <p className="text-base leading-relaxed">
                        Given the age of your website infrastructure, we
                        strongly recommend a complete redesign rather than
                        trying to patch an outdated system. A modern website
                        will:
                      </p>
                      <ul className="space-y-2 text-base">
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>
                            Look professional and build trust with visitors
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>
                            Work perfectly on all devices (phones, tablets,
                            computers)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>
                            Load in under 2 seconds for better user experience
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>Include modern security features built-in</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>Rank higher in Google search results</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 font-bold">✓</span>
                          <span>
                            Be easy to update and maintain going forward
                          </span>
                        </li>
                      </ul>
                      <div className="pt-4">
                        <a
                          href="https://www.godaddy.com/websites/web-design"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors text-lg"
                          style={{ textDecoration: "none" }}
                        >
                          <Globe className="h-5 w-5" />
                          Get a Professional Website Redesign
                        </a>
                        {/* Print-friendly clickable link */}
                        <div className="hidden print:block mt-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-500">
                          <p className="text-sm font-semibold mb-2 text-foreground">
                            🌐 Professional Website Redesign Services:
                          </p>
                          <a
                            href="https://www.godaddy.com/websites/web-design"
                            className="text-primary font-mono text-sm break-all underline hover:text-blue-400"
                          >
                            https://www.godaddy.com/websites/web-design
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-5 rounded-lg border border-blue-300">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> While the security recommendations
                    below are still important, they're secondary to getting a
                    modern website. A new site will include these security
                    features by default, and trying to secure a{" "}
                    {Math.floor(aRecordAge)}-year-old website is like putting a
                    new lock on a house with rotting walls - it's better to
                    rebuild.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Executive Summary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileWarning className="h-6 w-6" />
          Executive Summary
        </h2>
        <div
          className={`p-6 rounded-lg border-2 ${
            risk.color === "green"
              ? "bg-green-50 border-green-500 dark:bg-green-950/30"
              : risk.color === "orange"
                ? "bg-orange-50 border-orange-500 dark:bg-orange-950/30"
                : "bg-red-50 border-red-500 dark:bg-red-950/30"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">{risk.emoji}</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">
                Risk Level:{" "}
                <span
                  className={`text-${risk.color}-600 dark:text-${risk.color}-400`}
                >
                  {risk.level}
                </span>
              </h3>
              <p className="text-base leading-relaxed">
                {risk.level === "Low" && (
                  <>
                    Your website has good security measures in place. Continue
                    monitoring and maintaining these protections to keep your
                    site safe.
                  </>
                )}
                {risk.level === "Medium" && (
                  <>
                    Your website has some security protections, but there are
                    important gaps that could put your business at risk. We
                    recommend addressing these issues soon.
                  </>
                )}
                {(risk.level === "High" || risk.level === "Critical") && (
                  <>
                    Your website is currently vulnerable to common attacks that
                    could damage your business, lose customer trust, and cost
                    you money. Immediate action is strongly recommended.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Score */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Overall Security Score
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - securityScore / 100)}`}
                className={`${
                  securityScore >= 80
                    ? "text-green-500"
                    : securityScore >= 60
                      ? "text-orange-500"
                      : "text-red-500"
                }`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold">{securityScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-base leading-relaxed text-muted-foreground">
              Your website scored <strong>{securityScore} out of 100</strong> on
              our security assessment.
              {securityScore < 80 && (
                <>
                  {" "}
                  This score indicates vulnerabilities that could be exploited
                  by attackers. The good news is that these issues can be fixed.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* What's At Risk */}
      {(risk.level === "High" ||
        risk.level === "Critical" ||
        risk.level === "Medium") && (
        <div className="no-break space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            What's At Risk?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <DollarSign className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-base mb-1">Lost Revenue</h3>
                  <p className="text-sm text-muted-foreground">
                    If your site goes down or gets hacked, customers can't buy
                    from you. Even a few hours of downtime can cost thousands in
                    lost sales.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Users className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-base mb-1">
                    Customer Trust
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    If customer data is stolen or your site shows warnings,
                    people will lose trust in your business. Trust takes years
                    to build and seconds to lose.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-base mb-1">
                    Time & Stress
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Recovering from a hack can take days or weeks. You'll spend
                    time dealing with the mess instead of running your business.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Globe className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-base mb-1">
                    Search Rankings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Google penalizes hacked websites. You could lose your search
                    rankings and the traffic you've worked hard to build.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missing Protection: Firewall */}
      {!hasFirewall && (
        <div className="no-break space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Missing: Website Firewall
          </h2>
          <div className="p-6 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/30 space-y-4">
            <div className="flex items-start gap-4">
              <Unlock className="h-8 w-8 text-red-500 shrink-0" />
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">
                  Your Website Has No Firewall
                </h3>
                <p className="text-base leading-relaxed">
                  Think of a firewall like a security guard at the entrance to
                  your building. Without one, anyone can walk in and cause
                  trouble.
                </p>
              </div>
            </div>

            <div className="space-y-3 pl-12">
              <h4 className="font-semibold text-base">
                What This Means For You:
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Hackers can attack your site directly</strong> -
                    There's nothing stopping automated attacks that try
                    thousands of password combinations or look for
                    vulnerabilities.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Your site could be taken over</strong> - Attackers
                    could deface your website, steal customer information, or
                    use your site to attack others.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>You won't know until it's too late</strong> -
                    Without monitoring, you might not discover a breach until
                    customers complain or Google flags your site.
                  </span>
                </li>
                {isWordPress && (
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>WordPress sites are common targets</strong> -
                      Because WordPress is so popular, hackers have automated
                      tools specifically designed to attack WordPress sites
                      without firewalls.
                    </span>
                  </li>
                )}
              </ul>

              <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-300">
                <p className="text-sm font-semibold mb-2">
                  Real-World Example:
                </p>
                <p className="text-sm text-muted-foreground italic">
                  "A small e-commerce store was hacked overnight. The attackers
                  replaced the homepage with spam, stole 2,000 customer email
                  addresses, and the site was down for 3 days. The business lost
                  $15,000 in sales and spent $5,000 on emergency cleanup. A
                  firewall would have blocked the attack automatically."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missing Protection: Bot Protection */}
      {!hasBotProtection && (
        <div className="no-break space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-red-500" />
            Missing: Bot Protection
          </h2>
          <div className="p-6 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/30 space-y-4">
            <div className="flex items-start gap-4">
              <Zap className="h-8 w-8 text-red-500 shrink-0" />
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">
                  Your Website Is Vulnerable to Automated Attacks
                </h3>
                <p className="text-base leading-relaxed">
                  Malicious bots are automated programs that attack websites
                  24/7. They're like having thousands of burglars constantly
                  trying your doors and windows.
                </p>
              </div>
            </div>

            <div className="space-y-3 pl-12">
              <h4 className="font-semibold text-base">
                What This Means For You:
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Your site could crash from fake traffic</strong> -
                    Bots can overwhelm your website with fake visitors, making
                    it slow or completely unavailable to real customers.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Forms can be spammed with junk</strong> - Contact
                    forms, comment sections, and registration pages will be
                    flooded with spam, wasting your time and filling your
                    database with garbage.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bots can steal your content</strong> - Automated
                    scrapers can copy your entire website, including product
                    descriptions, blog posts, and images, to use on competitor
                    sites.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Your hosting costs could skyrocket</strong> - Bot
                    traffic counts against your bandwidth limits. You could end
                    up paying for thousands of fake visitors.
                  </span>
                </li>
              </ul>

              <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-300">
                <p className="text-sm font-semibold mb-2">
                  Real-World Example:
                </p>
                <p className="text-sm text-muted-foreground italic">
                  "A local restaurant's website was hit by a bot attack during
                  their busiest weekend. The site became so slow that customers
                  couldn't view the menu or make reservations online. They lost
                  an estimated 50+ reservations worth $3,000+ in revenue. Bot
                  protection would have automatically blocked the fake traffic."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SSL Status */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {hasSSL ? (
            <Lock className="h-6 w-6 text-green-500" />
          ) : (
            <Unlock className="h-6 w-6 text-red-500" />
          )}
          Secure Connection (SSL Certificate)
        </h2>
        <div
          className={`p-6 rounded-lg border-2 ${
            hasSSL
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-red-500 bg-red-50 dark:bg-red-950/30"
          }`}
        >
          {hasSSL ? (
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">
                  Your Website Has a Valid SSL Certificate
                </h3>
                <p className="text-base leading-relaxed">
                  Great! Your website uses HTTPS, which means data sent between
                  your visitors and your site is encrypted. This protects
                  passwords, credit card information, and personal details from
                  being intercepted.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <XCircle className="h-8 w-8 text-red-500 shrink-0" />
                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">
                    Your Website Doesn't Have SSL Protection
                  </h3>
                  <p className="text-base leading-relaxed">
                    Without SSL (the padlock in the browser), all data sent to
                    your website travels in plain text. This is like sending
                    postcards instead of sealed letters - anyone can read them.
                  </p>
                </div>
              </div>
              <div className="pl-12 space-y-2 text-sm">
                <p className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Browsers show "Not Secure" warnings</strong> - This
                    scares customers away before they even see your content.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Google penalizes your search rankings</strong> -
                    Sites without SSL rank lower in search results.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Customer data can be stolen</strong> - Passwords,
                    emails, and payment info can be intercepted by hackers.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="no-break space-y-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          Recommended Next Steps
        </h2>
        <div className="space-y-3">
          {!hasFirewall && (
            <div className="p-4 rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">
                    Install a Website Firewall
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    A firewall will block malicious traffic before it reaches
                    your site. Popular options include Cloudflare, Sucuri, or
                    Wordfence (for WordPress).
                  </p>
                </div>
              </div>
            </div>
          )}
          {!hasBotProtection && (
            <div className="p-4 rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 font-bold">
                  {!hasFirewall ? "2" : "1"}
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">
                    Enable Bot Protection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add protection against automated attacks. Most firewall
                    services include bot protection, or you can use services
                    like Cloudflare's Bot Management.
                  </p>
                </div>
              </div>
            </div>
          )}
          {!hasSSL && (
            <div className="p-4 rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 font-bold">
                  {!hasFirewall && !hasBotProtection
                    ? "3"
                    : !hasFirewall || !hasBotProtection
                      ? "2"
                      : "1"}
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1">
                    Install an SSL Certificate
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Most hosting providers offer free SSL certificates through
                    Let's Encrypt. This is usually a one-click installation in
                    your hosting control panel.
                  </p>
                </div>
              </div>
            </div>
          )}
          {hasFirewall && hasBotProtection && hasSSL && (
            <div className="p-4 rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-base mb-1">
                    Maintain Your Security
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your website has good security protections in place.
                    Continue to monitor your security, keep software updated,
                    and review your security settings regularly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cost vs Benefit */}
      {(risk.level === "High" ||
        risk.level === "Critical" ||
        risk.level === "Medium") && (
        <div className="no-break space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            The Bottom Line
          </h2>
          <div className="p-6 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-red-600 dark:text-red-400">
                  Cost of Doing Nothing:
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span>
                      Average cost of a data breach:{" "}
                      <strong>$4,000 - $50,000+</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span>
                      Lost revenue during downtime:{" "}
                      <strong>$100 - $5,000+ per day</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span>
                      Emergency cleanup and recovery:{" "}
                      <strong>$2,000 - $10,000+</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span>
                      Permanent loss of customer trust:{" "}
                      <strong>Priceless</strong>
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3 text-green-600 dark:text-green-400">
                  Cost of Protection:
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>
                      Basic firewall protection:{" "}
                      <strong>$10 - $50/month</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>
                      SSL certificate: <strong>Free - $100/year</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>
                      Bot protection:{" "}
                      <strong>Often included with firewall</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>
                      Peace of mind: <strong>Priceless</strong>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-green-300">
              <p className="text-center text-base font-semibold">
                Investing in security costs a fraction of what you'd lose in a
                single attack.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WordPress Maintenance & Support Section - Conditional */}
      {needsMaintenanceSupport && (
        <div className="no-break space-y-6 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-orange-950/30 dark:via-orange-900/30 dark:to-orange-950/30 p-8 rounded-lg border-2 border-orange-500/30">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <h2 className="text-3xl font-bold text-foreground">
                Your WordPress Site Needs Attention
              </h2>
            </div>
            <div className="space-y-2">
              {wordpressVersion && (
                <p className="text-base text-muted-foreground">
                  <strong>Current WordPress Version:</strong> {wordpressVersion}
                  {compareVersions(wordpressVersion, "6.8") && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400 font-semibold">
                      (Outdated - Latest recommended: 6.8+)
                    </span>
                  )}
                </p>
              )}
              {phpVersion && (
                <p className="text-base text-muted-foreground">
                  <strong>Current PHP Version:</strong> {phpVersion}
                  {compareVersions(phpVersion, "8.1") && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400 font-semibold">
                      (Outdated - Latest recommended: 8.1+)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Critical Rebuild Recommendation */}
          {needsRebuild && (
            <div className="no-break bg-red-50 dark:bg-red-950/30 p-6 rounded-lg border-2 border-red-500">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <ShieldAlert className="h-8 w-8 text-red-500" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-bold text-red-600 dark:text-red-400">
                    Critical: Your Site May Need Professional Rebuilding
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your WordPress version ({wordpressVersion || "Unknown"}) or
                    PHP version ({phpVersion || "Unknown"}) is significantly
                    outdated. This puts your site at serious risk and may cause
                    compatibility issues with modern plugins and themes.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      Why this matters:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Security vulnerabilities that hackers actively exploit
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Incompatibility with modern plugins and security
                          updates
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>Poor performance and potential site crashes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Risk of complete site failure during updates
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-4">
                    <a
                      href="https://www.godaddy.com/websites/web-design"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg transition-all hover:shadow-xl no-print"
                    >
                      <Server className="h-5 w-5" />
                      Get Professional Website Rebuild
                    </a>
                    {/* Print-friendly version */}
                    <div className="hidden print:block mt-2 p-3 bg-white dark:bg-gray-900 rounded border border-red-500">
                      <p className="text-sm font-semibold mb-1 text-foreground">
                        Professional Website Rebuild Services:
                      </p>
                      <a
                        href="https://www.godaddy.com/websites/web-design"
                        className="font-mono text-xs text-primary break-all underline hover:text-blue-400"
                      >
                        https://www.godaddy.com/websites/web-design
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WordPress Premium Support Recommendation */}
          <div className="no-break bg-background/80 backdrop-blur p-6 rounded-lg border border-border space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-bold text-foreground">
                  Keep Your WordPress Site Updated & Secure
                </h3>
                <p className="text-sm text-muted-foreground">
                  Don't let outdated software put your business at risk.
                  Professional WordPress maintenance ensures your site stays
                  current, secure, and performing at its best.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    What you get:
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Automatic WordPress core, plugin, and theme updates
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Daily security scans and malware removal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Performance optimization and uptime monitoring
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Expert support when you need it</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-4">
                  <a
                    href="https://www.godaddy.com/wordpress/premium-support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg transition-all hover:shadow-xl no-print"
                  >
                    <Shield className="h-5 w-5" />
                    Get WordPress Premium Support
                  </a>
                  {/* Print-friendly version */}
                  <div className="hidden print:block mt-2 p-3 bg-white dark:bg-gray-900 rounded border border-blue-500">
                    <p className="text-sm font-semibold mb-1 text-foreground">
                      WordPress Premium Support:
                    </p>
                    <a
                      href="https://www.godaddy.com/wordpress/premium-support"
                      className="font-mono text-xs text-primary break-all underline hover:text-blue-400"
                    >
                      https://www.godaddy.com/wordpress/premium-support
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 360 Degree Maintenance Section */}
          <div className="no-break bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 dark:from-purple-950/30 dark:via-purple-900/30 dark:to-purple-950/30 p-6 rounded-lg border-2 border-purple-500/30">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Zap className="h-7 w-7 text-purple-500" />
                <h3 className="text-2xl font-bold text-foreground">
                  Need 360° Maintenance and Support?
                </h3>
              </div>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                Get comprehensive website care that covers everything from
                security updates to performance optimization, plus expert
                WordPress support whenever you need it.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {/* Website Care */}
                <div className="bg-background/80 backdrop-blur p-5 rounded-lg border border-border text-left space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Globe className="h-6 w-6 text-green-500" />
                    </div>
                    <h4 className="font-bold text-lg">Complete Website Care</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All-in-one maintenance package that keeps your entire
                    website secure, fast, and up-to-date with automatic updates,
                    daily backups, and 24/7 monitoring.
                  </p>
                  <a
                    href="https://www.godaddy.com/help/whats-included-in-website-care-40136"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline no-print"
                  >
                    Learn More About Website Care →
                  </a>
                  <div className="hidden print:block text-xs">
                    <a
                      href="https://www.godaddy.com/help/whats-included-in-website-care-40136"
                      className="text-primary font-mono break-all underline hover:text-blue-400"
                    >
                      https://www.godaddy.com/help/whats-included-in-website-care-40136
                    </a>
                  </div>
                </div>

                {/* WordPress Premium Support */}
                <div className="bg-background/80 backdrop-blur p-5 rounded-lg border border-border text-left space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Shield className="h-6 w-6 text-blue-500" />
                    </div>
                    <h4 className="font-bold text-lg">
                      WordPress Expert Support
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dedicated WordPress specialists handle all updates, security
                    patches, and technical issues so you can focus on your
                    business instead of website maintenance.
                  </p>
                  <a
                    href="https://www.godaddy.com/wordpress/premium-support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline no-print"
                  >
                    Learn More About Premium Support →
                  </a>
                  <div className="hidden print:block text-xs">
                    <a
                      href="https://www.godaddy.com/wordpress/premium-support"
                      className="text-primary font-mono break-all underline hover:text-blue-400"
                    >
                      https://www.godaddy.com/wordpress/premium-support
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Products Section */}
      <div className="no-break space-y-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 rounded-lg border-2 border-primary/20">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              Protect Your Website Today
            </h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don't wait for an attack to happen. Secure your website with
            professional-grade protection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-background/80 backdrop-blur p-6 rounded-lg border border-border space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg">Website Firewall</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Block malicious traffic, SQL injections, and cross-site scripting
              attacks before they reach your site.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-background/80 backdrop-blur p-6 rounded-lg border border-border space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Bot className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg">Malware Scanning</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Daily automated scans detect and remove malware, keeping your site
              clean and your visitors safe.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-background/80 backdrop-blur p-6 rounded-lg border border-border space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Lock className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-lg">DDoS Protection</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Stay online during attacks with enterprise-grade DDoS mitigation
              and traffic filtering.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center pt-4">
          <a
            href="https://www.godaddy.com/web-security/website-security"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-4 rounded-lg shadow-lg transition-all hover:shadow-xl hover:scale-105 no-print"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              color: "white",
            }}
          >
            <Shield className="h-6 w-6" />
            View GoDaddy Website Security Solutions
            <Globe className="h-5 w-5" />
          </a>
          {/* Print-friendly version */}
          <div className="hidden print:block mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-500">
            <p className="font-bold text-lg mb-2 text-foreground">
              🛡️ Protect Your Website Today
            </p>
            <p className="text-base mb-2 text-foreground">
              Visit GoDaddy Website Security Solutions:
            </p>
            <a
              href="https://www.godaddy.com/web-security/website-security"
              className="font-mono text-sm text-primary break-all underline hover:text-blue-400"
            >
              https://www.godaddy.com/web-security/website-security
            </a>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-primary">24/7</p>
            <p className="text-sm text-muted-foreground">Security Monitoring</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-primary">99.9%</p>
            <p className="text-sm text-muted-foreground">Uptime Guarantee</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-primary">Expert</p>
            <p className="text-sm text-muted-foreground">Support Team</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t-2 border-border text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          This report was generated by an automated security scanner. For a
          comprehensive security audit or to implement these recommendations,
          please consult with a web security professional.
        </p>
        <p className="text-xs text-muted-foreground">
          Report ID: {domain.replace(/\./g, "-")}-{scanDate.getTime()}
        </p>
      </div>

      {/* Intelligence & Migration Analysis Section */}
      <IntelligenceSection domain={domain} technologyData={technologyData} />
    </div>
  );
};

/**
 * Intelligence Section Component
 * Fetches and displays migration analysis below the main security report
 */
function IntelligenceSection({
  domain,
  technologyData,
}: {
  domain: string;
  technologyData: TechnologyData;
}) {
  const [analysis, setAnalysis] = useState<MigrationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/intelligence/migration-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain,
            techStack: technologyData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch migration analysis");
        }

        const data = await response.json();
        setAnalysis(data.analysis);
      } catch (err) {
        console.error("Migration analysis error:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    if (domain && technologyData) {
      fetchAnalysis();
    }
  }, [domain, technologyData]);

  if (loading) {
    return (
      <div className="mt-8 p-8 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">
            Analyzing migration compatibility...
          </p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return null; // Silently fail - don't show errors to user
  }

  return <IntelligenceAccordion scanData={analysis} />;
}
