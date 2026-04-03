/**
 * Automated Monitoring Cron Job
 *
 * Runs daily at 2 AM UTC to scan all domains with monitoring enabled
 * Compares results with previous scans and triggers alerts if needed
 */

import cron from "node-cron";
import { db } from "../db/client.js";
import {
  monitoringSettings,
  scanHistory,
  alertSettings,
  alertLogs,
  users,
  performanceHistory,
} from "../db/schema.js";
import { eq, and, lte, desc, isNotNull, ne, gte, lt } from "drizzle-orm";
import {
  sendPerformanceAlert,
  sendSecurityAlert,
  sendSslExpiryAlert,
  sendDowntimeAlert,
  sendMonthlyReport,
} from "../lib/email-service.js";

// Track if cron is already initialized
let cronInitialized = false;

interface MonitoringSettingRecord {
  id: number;
  userId: number;
  domain: string;
  consecutiveFailures: number | null;
}

interface ScanIssue {
  severity?: string;
  type?: string;
  description?: string;
}

interface ReachabilityScanResult {
  reachable?: boolean;
  isReachable?: boolean;
  statusCode?: number;
  error?: string;
}

interface PerformanceScanResult {
  mobile?: { score?: number };
  desktop?: { score?: number };
}

interface SslScanResult {
  daysUntilExpiry?: number | null;
  validTo?: string;
}

interface SecurityScanResult {
  score?: number;
  malwareDetected?: boolean;
  issues?: ScanIssue[];
}

interface FullScanData {
  domain: string;
  timestamp: string;
  performance: PerformanceScanResult | null;
  security: SecurityScanResult | null;
  ssl: SslScanResult | null;
  dns: unknown;
  reachability: ReachabilityScanResult | null;
}

interface MonthlyReportGroup {
  userId: number;
  userEmail: string;
  userName: string | null;
  clientTag: string;
  domains: string[];
}

function parseJsonObject<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Initialize the monitoring cron job
 */
export function initMonitoringCron() {
  if (cronInitialized) {
    console.log("[Monitoring Cron] Already initialized");
    return;
  }

  // Run daily at 2:00 AM UTC
  cron.schedule("0 2 * * *", async () => {
    console.log("[Monitoring Cron] Starting automated scans...");
    await runAutomatedScans();
  });

  // Send monthly performance reports on the 1st of each month at 9:00 AM UTC
  cron.schedule("0 9 1 * *", async () => {
    console.log("[Monitoring Cron] Sending monthly performance reports...");
    await sendMonthlyReports();
  });

  // Also run every 6 hours for more frequent checks (optional)
  // cron.schedule('0 */6 * * *', async () => {
  //   console.log('[Monitoring Cron] Running 6-hour check...');
  //   await runAutomatedScans();
  // });

  cronInitialized = true;
  console.log("[Monitoring Cron] Initialized - Daily scans at 2:00 AM UTC");
}

/**
 * Run automated scans for all enabled domains
 */
async function runAutomatedScans() {
  try {
    const now = new Date();

    // Get all monitoring settings that are enabled and due for scanning
    const settings = await db
      .select()
      .from(monitoringSettings)
      .where(
        and(
          eq(monitoringSettings.enabled, true),
          lte(monitoringSettings.nextScanAt, now),
        ),
      );

    console.log(`[Monitoring Cron] Found ${settings.length} domains to scan`);

    for (const setting of settings) {
      try {
        await scanDomain(setting);
      } catch (error) {
        console.error(
          `[Monitoring Cron] Failed to scan ${setting.domain}:`,
          error,
        );

        // Increment failure counter
        await db
          .update(monitoringSettings)
          .set({
            consecutiveFailures: (setting.consecutiveFailures || 0) + 1,
            updatedAt: now,
          })
          .where(eq(monitoringSettings.id, setting.id));
      }
    }

    console.log("[Monitoring Cron] Completed automated scans");
  } catch (error) {
    console.error("[Monitoring Cron] Error in runAutomatedScans:", error);
  }
}

/**
 * Scan a single domain and check for alerts
 */
async function scanDomain(setting: MonitoringSettingRecord) {
  const { userId, domain, id: settingId } = setting;
  const now = new Date();

  console.log(`[Monitoring Cron] Scanning ${domain}...`);

  try {
    // Perform full scan (reuse existing scan APIs)
    const scanData = await performFullScan(domain);

    // Store scan in history
    await db.insert(scanHistory).values({
      userId,
      domain,
      scanType: "automated",
      scanData: JSON.stringify(scanData),
    });

    // Store performance history
    if (scanData.performance) {
      await db.insert(performanceHistory).values({
        domain,
        scanDate: now,
        mobileScore: scanData.performance.mobile?.score || 0,
        desktopScore: scanData.performance.desktop?.score || 0,
        mobileFcp: scanData.performance.mobile?.fcp || "0",
        mobileLcp: scanData.performance.mobile?.lcp || "0",
        mobileTbt: scanData.performance.mobile?.tbt || "0",
        mobileCls: scanData.performance.mobile?.cls || "0",
        mobileSpeedIndex: scanData.performance.mobile?.speedIndex || "0",
        desktopFcp: scanData.performance.desktop?.fcp || "0",
        desktopLcp: scanData.performance.desktop?.lcp || "0",
        desktopTbt: scanData.performance.desktop?.tbt || "0",
        desktopCls: scanData.performance.desktop?.cls || "0",
        desktopSpeedIndex: scanData.performance.desktop?.speedIndex || "0",
      });
    }

    // Update monitoring settings
    const nextScan = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    await db
      .update(monitoringSettings)
      .set({
        lastScanAt: now,
        nextScanAt: nextScan,
        consecutiveFailures: 0,
        updatedAt: now,
      })
      .where(eq(monitoringSettings.id, settingId));

    // Check for alerts
    await checkAndSendAlerts(userId, domain, scanData);

    console.log(`[Monitoring Cron] ✓ Successfully scanned ${domain}`);
  } catch (error) {
    console.error(`[Monitoring Cron] ✗ Error scanning ${domain}:`, error);
    throw error;
  }
}

function resolveMonitoringBaseUrl(): string {
  const configuredBaseUrl =
    process.env.INTERNAL_BASE_URL?.trim() ||
    process.env.VITE_PREVIEW_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  const port = process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}`;
}

async function fetchJsonOrThrow<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(
      `HTTP ${response.status} ${response.statusText} (${url}) ${responseBody}`.trim(),
    );
  }
  return (await response.json()) as T;
}

/**
 * Perform a full scan of the domain
 */
async function performFullScan(domain: string): Promise<FullScanData> {
  const baseUrl = resolveMonitoringBaseUrl();
  const scanHeaders = {
    "Content-Type": "application/json",
    "X-Scan-Context": "monitoring-cron",
  };

  // Run all scans in parallel
  const [performance, security, ssl, dns, reachability] =
    await Promise.allSettled([
      fetchJsonOrThrow<PerformanceScanResult>(
        `${baseUrl}/api/scan/performance`,
        {
          method: "POST",
          headers: scanHeaders,
          body: JSON.stringify({ domain }),
        },
      ),
      fetchJsonOrThrow<SecurityScanResult>(`${baseUrl}/api/scan/security`, {
        method: "POST",
        headers: scanHeaders,
        body: JSON.stringify({ domain }),
      }),
      fetchJsonOrThrow<SslScanResult>(`${baseUrl}/api/scan/ssl`, {
        method: "POST",
        headers: scanHeaders,
        body: JSON.stringify({ domain }),
      }),
      fetchJsonOrThrow<unknown>(`${baseUrl}/api/scan/dns`, {
        method: "POST",
        headers: scanHeaders,
        body: JSON.stringify({ domain }),
      }),
      fetchJsonOrThrow<ReachabilityScanResult>(
        `${baseUrl}/api/scan/reachability?domain=${encodeURIComponent(domain)}`,
        {
          headers: {
            "X-Scan-Context": "monitoring-cron",
          },
        },
      ),
    ]);

  return {
    domain,
    timestamp: new Date().toISOString(),
    performance: performance.status === "fulfilled" ? performance.value : null,
    security: security.status === "fulfilled" ? security.value : null,
    ssl: ssl.status === "fulfilled" ? ssl.value : null,
    dns: dns.status === "fulfilled" ? dns.value : null,
    reachability:
      reachability.status === "fulfilled" ? reachability.value : null,
  };
}

/**
 * Check scan results and send alerts if needed
 */
async function checkAndSendAlerts(
  userId: number,
  domain: string,
  scanData: FullScanData,
) {
  // Get alert settings for this domain
  const settings = await db
    .select()
    .from(alertSettings)
    .where(
      and(
        eq(alertSettings.userId, userId),
        eq(alertSettings.domain, domain),
        eq(alertSettings.enabled, true),
      ),
    )
    .limit(1);

  if (settings.length === 0) {
    return; // No alerts enabled
  }

  const alertSetting = settings[0];

  // Get user email
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) {
    return;
  }

  const user = userResult[0];
  const reportUrl = `https://hostinginfo.gg/dashboard?domain=${encodeURIComponent(domain)}`;

  // CRITICAL ALERT: Check for downtime
  if (alertSetting.alertDowntime && scanData.reachability) {
    const isReachable =
      typeof scanData.reachability.reachable === "boolean"
        ? scanData.reachability.reachable
        : scanData.reachability.isReachable;

    if (isReachable === false) {
      await sendAlertIfNotRecent(userId, domain, "downtime", async () => {
        await sendDowntimeAlert({
          userEmail: user.email,
          userName: user.fullName || undefined,
          domain,
          downSince: new Date().toISOString(),
          statusCode: scanData.reachability.statusCode,
          errorMessage: scanData.reachability.error,
          reportUrl,
        });
      });
    }
  }

  // CRITICAL ALERT: Only alert on MAJOR performance crashes (score < 20 or drop > 50 points)
  if (alertSetting.alertPerformance && scanData.performance) {
    const mobileScore = scanData.performance.mobile?.score || 0;
    const desktopScore = scanData.performance.desktop?.score || 0;

    // Get previous scan for comparison
    const previousScans = await db
      .select()
      .from(scanHistory)
      .where(
        and(eq(scanHistory.userId, userId), eq(scanHistory.domain, domain)),
      )
      .orderBy(desc(scanHistory.createdAt))
      .limit(2); // Get last 2 scans

    if (previousScans.length >= 2) {
      const previousData =
        parseJsonObject<FullScanData>(previousScans[1].scanData) || undefined;
      const previousMobile = previousData.performance?.mobile?.score || 0;
      const previousDesktop = previousData.performance?.desktop?.score || 0;

      // Only alert if score is critically low (< 20) AND dropped massively (> 50 points)
      if (mobileScore < 20 && previousMobile - mobileScore >= 50) {
        await sendAlertIfNotRecent(userId, domain, "performance", async () => {
          await sendPerformanceAlert({
            userEmail: user.email,
            userName: user.fullName || undefined,
            domain,
            previousScore: previousMobile,
            currentScore: mobileScore,
            device: "mobile",
            reportUrl,
          });
        });
      }

      if (desktopScore < 20 && previousDesktop - desktopScore >= 50) {
        await sendAlertIfNotRecent(userId, domain, "performance", async () => {
          await sendPerformanceAlert({
            userEmail: user.email,
            userName: user.fullName || undefined,
            domain,
            previousScore: previousDesktop,
            currentScore: desktopScore,
            device: "desktop",
            reportUrl,
          });
        });
      }
    }
  }

  // CRITICAL ALERT: SSL expiration within 7 days only (not 30)
  if (alertSetting.alertSsl && scanData.ssl) {
    const daysUntilExpiry = scanData.ssl.daysUntilExpiry;

    // Only alert if SSL expires within 7 days (urgent)
    if (
      daysUntilExpiry !== null &&
      daysUntilExpiry <= 7 &&
      daysUntilExpiry > 0
    ) {
      await sendAlertIfNotRecent(userId, domain, "ssl", async () => {
        await sendSslExpiryAlert({
          userEmail: user.email,
          userName: user.fullName || undefined,
          domain,
          daysUntilExpiry,
          expiryDate: scanData.ssl.validTo,
          reportUrl,
        });
      });
    }
  }

  // CRITICAL ALERT: Only alert on CRITICAL security issues (not high)
  if (alertSetting.alertSecurity && scanData.security) {
    const securityIssues = scanData.security.issues || [];
    const criticalIssues = securityIssues.filter(
      (i: ScanIssue) => i.severity === "critical",
    );

    // Also check for malware detection
    const hasMalware =
      scanData.security.malwareDetected ||
      scanData.security.score < 30 ||
      securityIssues.some(
        (i: ScanIssue) =>
          i.type?.toLowerCase().includes("malware") ||
          i.type?.toLowerCase().includes("malicious"),
      );

    if (criticalIssues.length > 0 || hasMalware) {
      await sendAlertIfNotRecent(userId, domain, "security", async () => {
        const issue = criticalIssues[0] || {
          type: "Critical Security Threat Detected",
          severity: "critical",
          description: hasMalware
            ? "Potential malware or malicious code detected. Immediate action required."
            : "Critical security vulnerability detected. Immediate action required.",
        };

        await sendSecurityAlert({
          userEmail: user.email,
          userName: user.fullName || undefined,
          domain,
          issueType: issue.type || "Critical Security Threat",
          severity: "critical",
          details:
            issue.description ||
            "Critical security issue detected. Please review immediately.",
          reportUrl,
        });
      });
    }
  }
}

/**
 * Send alert only if one hasn't been sent recently (prevent spam)
 */
async function sendAlertIfNotRecent(
  userId: number,
  domain: string,
  alertType: string,
  sendFunction: () => Promise<void>,
) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check if we've sent this alert type recently
  const recentAlerts = await db
    .select()
    .from(alertLogs)
    .where(
      and(
        eq(alertLogs.userId, userId),
        eq(alertLogs.domain, domain),
        eq(alertLogs.alertType, alertType),
        eq(alertLogs.emailSent, true),
      ),
    )
    .orderBy(desc(alertLogs.sentAt))
    .limit(1);

  // If alert was sent within last 24 hours, skip
  const lastSentAt = recentAlerts[0]?.sentAt;
  if (lastSentAt && lastSentAt > oneDayAgo) {
    console.log(
      `[Monitoring Cron] Skipping ${alertType} alert for ${domain} (sent recently)`,
    );
    return;
  }

  // Send the alert
  try {
    await sendFunction();

    // Log successful alert
    await db.insert(alertLogs).values({
      userId,
      domain,
      alertType,
      severity: "medium",
      message: `${alertType} alert sent`,
      emailSent: true,
    });

    console.log(`[Monitoring Cron] ✓ Sent ${alertType} alert for ${domain}`);
  } catch (error) {
    // Log failed alert
    await db.insert(alertLogs).values({
      userId,
      domain,
      alertType,
      severity: "medium",
      message: `Failed to send ${alertType} alert`,
      emailSent: false,
      emailError: String(error),
    });

    console.error(
      `[Monitoring Cron] ✗ Failed to send ${alertType} alert for ${domain}:`,
      error,
    );
  }
}

/**
 * Send monthly performance reports for all client-tagged domains
 */
async function sendMonthlyReports() {
  try {
    console.log("[Monitoring Cron] Generating monthly reports...");

    // Get all users with client-tagged domains
    const clientDomains = await db
      .select({
        userId: monitoringSettings.userId,
        clientTag: monitoringSettings.clientTag,
        domain: monitoringSettings.domain,
        userEmail: users.email,
        userName: users.fullName,
      })
      .from(monitoringSettings)
      .innerJoin(users, eq(users.id, monitoringSettings.userId))
      .where(
        and(
          eq(monitoringSettings.enabled, true),
          // Only domains with a client tag
          isNotNull(monitoringSettings.clientTag),
          ne(monitoringSettings.clientTag, ""),
        ),
      );

    if (clientDomains.length === 0) {
      console.log("[Monitoring Cron] No client-tagged domains found");
      return;
    }

    // Group by user and client tag
    const groupedByUser = clientDomains.reduce<
      Record<string, MonthlyReportGroup>
    >((acc, domain) => {
      const key = `${domain.userId}-${domain.clientTag}`;
      if (!acc[key]) {
        acc[key] = {
          userId: domain.userId,
          userEmail: domain.userEmail,
          userName: domain.userName,
          clientTag: domain.clientTag!,
          domains: [],
        };
      }
      acc[key].domains.push(domain.domain);
      return acc;
    }, {});

    // Generate and send reports
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const reportMonth = lastMonthStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    for (const group of Object.values(groupedByUser)) {
      try {
        // Get performance data for each domain in the last month
        const domainStats = await Promise.all(
          group.domains.map(async (domain: string) => {
            // Get all scans from last month
            const scans = await db
              .select()
              .from(performanceHistory)
              .where(
                and(
                  eq(performanceHistory.domain, domain),
                  gte(performanceHistory.scanDate, lastMonthStart),
                  lt(performanceHistory.scanDate, currentMonthStart),
                ),
              );

            if (scans.length === 0) {
              return null;
            }

            // Calculate averages
            const avgMobileScore = Math.round(
              scans.reduce((sum, s) => sum + s.mobileScore, 0) / scans.length,
            );
            const avgDesktopScore = Math.round(
              scans.reduce((sum, s) => sum + s.desktopScore, 0) / scans.length,
            );

            // Determine trend (compare first half vs second half of month)
            const midpoint = Math.floor(scans.length / 2);
            const firstHalfAvg =
              scans
                .slice(0, midpoint)
                .reduce((sum, s) => sum + s.mobileScore, 0) / midpoint;
            const secondHalfAvg =
              scans.slice(midpoint).reduce((sum, s) => sum + s.mobileScore, 0) /
              (scans.length - midpoint);
            const trend =
              secondHalfAvg > firstHalfAvg + 5
                ? "up"
                : secondHalfAvg < firstHalfAvg - 5
                  ? "down"
                  : "stable";

            // Count issues from scan history
            const scanHistoryRecords = await db
              .select()
              .from(scanHistory)
              .where(
                and(
                  eq(scanHistory.userId, group.userId),
                  eq(scanHistory.domain, domain),
                  gte(scanHistory.createdAt, lastMonthStart),
                  lt(scanHistory.createdAt, currentMonthStart),
                ),
              );

            let issuesCount = 0;
            for (const record of scanHistoryRecords) {
              try {
                const scanData = parseJsonObject<FullScanData>(record.scanData);
                const securityIssues = scanData?.security?.issues || [];
                issuesCount += securityIssues.filter(
                  (i: ScanIssue) =>
                    i.severity === "high" || i.severity === "critical",
                ).length;
              } catch {
                // Skip invalid JSON
              }
            }

            return {
              domain,
              avgMobileScore,
              avgDesktopScore,
              scansCount: scans.length,
              trend,
              issuesCount,
            };
          }),
        );

        // Filter out null results
        const validStats = domainStats.filter((s) => s !== null);

        if (validStats.length === 0) {
          console.log(
            `[Monitoring Cron] No data for ${group.clientTag}, skipping report`,
          );
          continue;
        }

        // Send monthly report
        await sendMonthlyReport({
          userEmail: group.userEmail,
          userName: group.userName || undefined,
          clientTag: group.clientTag,
          domains: validStats,
          reportMonth,
          dashboardUrl: "https://hostinginfo.gg/dashboard",
        });

        console.log(
          `[Monitoring Cron] ✓ Sent monthly report to ${group.userEmail} for ${group.clientTag}`,
        );
      } catch (error) {
        console.error(
          `[Monitoring Cron] ✗ Failed to send report for ${group.clientTag}:`,
          error,
        );
      }
    }

    console.log("[Monitoring Cron] Completed monthly reports");
  } catch (error) {
    console.error("[Monitoring Cron] Error in sendMonthlyReports:", error);
  }
}

// Export for manual testing
export { runAutomatedScans, sendMonthlyReports };
