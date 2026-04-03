/**
 * Email Service - Nodemailer with HostingInfo SMTP
 *
 * Sends automated alerts and notifications using info@hostinginfo.gg
 */

import nodemailer from "nodemailer";
import { getSecret } from "#secrets";

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Email provider configurations
 */
const EMAIL_PROVIDERS = {
  gmail: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requiresAppPassword: true,
  },
  microsoft: {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    requiresAppPassword: false,
  },
  outlook: {
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    requiresAppPassword: false,
  },
};

type EmailProvider = keyof typeof EMAIL_PROVIDERS;

function getTransporter() {
  if (!transporter) {
    const emailUser = getSecret("EMAIL_USER");
    const emailPassword = getSecret("EMAIL_PASSWORD");
    const emailProviderSecret = getSecret("EMAIL_PROVIDER");
    const emailProvider = (
      typeof emailProviderSecret === "string" ? emailProviderSecret : "gmail"
    ).toLowerCase() as EmailProvider;

    if (typeof emailUser !== "string" || typeof emailPassword !== "string") {
      throw new Error(
        "Email credentials not configured. Please add EMAIL_USER and EMAIL_PASSWORD to secrets.",
      );
    }

    // Get provider config or default to Gmail
    const providerConfig =
      EMAIL_PROVIDERS[emailProvider] || EMAIL_PROVIDERS.gmail;

    console.log(
      `[Email Service] Using ${emailProvider} provider (${providerConfig.host})`,
    );

    transporter = nodemailer.createTransport({
      host: providerConfig.host,
      port: providerConfig.port,
      secure: providerConfig.secure,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      tls: {
        minVersion: "TLSv1.2",
      },
    });
  }

  return transporter;
}

/**
 * Send performance drop alert
 */
export async function sendPerformanceAlert({
  userEmail,
  userName,
  domain,
  previousScore,
  currentScore,
  device,
  reportUrl,
}: {
  userEmail: string;
  userName?: string;
  domain: string;
  previousScore: number;
  currentScore: number;
  device: "mobile" | "desktop";
  reportUrl: string;
}) {
  const transport = getTransporter();
  const scoreDrop = previousScore - currentScore;
  const severity =
    scoreDrop > 30 ? "Critical" : scoreDrop > 20 ? "High" : "Medium";

  const mailOptions = {
    from: `"HostingInfo Alerts" <${getSecret("EMAIL_USER")}>`,
    to: userEmail,
    subject: `⚠️ Performance Alert: ${domain} (${severity} Priority)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: #fee; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .stat-label { font-weight: 600; color: #6b7280; }
          .stat-value { font-weight: 700; }
          .score-drop { color: #dc2626; font-size: 24px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">⚠️ Performance Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${domain}</p>
          </div>
          
          <div class="content">
            <p>Hi ${userName || "there"},</p>
            
            <div class="alert-box">
              <strong>${severity} Priority Alert</strong><br>
              Your website's ${device} performance has dropped significantly.
            </div>
            
            <div class="stats">
              <div class="stat-row">
                <span class="stat-label">Previous Score:</span>
                <span class="stat-value" style="color: #059669;">${previousScore}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Current Score:</span>
                <span class="stat-value" style="color: #dc2626;">${currentScore}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Score Drop:</span>
                <span class="score-drop">-${scoreDrop} points</span>
              </div>
              <div class="stat-row" style="border: none;">
                <span class="stat-label">Device:</span>
                <span class="stat-value">${device.charAt(0).toUpperCase() + device.slice(1)}</span>
              </div>
            </div>
            
            <h3>Recommended Actions:</h3>
            <ul>
              <li>Check server response times and hosting resources</li>
              <li>Optimize images and compress assets</li>
              <li>Review recent code or plugin changes</li>
              <li>Clear caching and CDN if applicable</li>
              <li>Run a full security scan to rule out malware</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${reportUrl}" class="button">View Full Report →</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              This alert was triggered because your performance score dropped by ${scoreDrop} points. 
              You can adjust alert thresholds in your dashboard settings.
            </p>
          </div>
          
          <div class="footer">
            <p>HostingInfo - Website Intelligence Platform</p>
            <p>
              <a href="https://hostinginfo.gg/dashboard" style="color: #667eea;">Dashboard</a> | 
              <a href="https://hostinginfo.gg/account-settings" style="color: #667eea;">Settings</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transport.sendMail(mailOptions);
}

/**
 * Send monthly performance report for client domains
 */
export async function sendMonthlyReport({
  userEmail,
  userName,
  clientTag,
  domains,
  reportMonth,
  dashboardUrl,
}: {
  userEmail: string;
  userName?: string;
  clientTag: string;
  domains: Array<{
    domain: string;
    avgMobileScore: number;
    avgDesktopScore: number;
    scansCount: number;
    trend: "up" | "down" | "stable";
    issuesCount: number;
  }>;
  reportMonth: string; // e.g., "January 2026"
  dashboardUrl: string;
}) {
  const transport = getTransporter();

  const domainsHtml = domains
    .map(
      (d) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${d.domain}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${d.avgMobileScore >= 90 ? "#10b981" : d.avgMobileScore >= 50 ? "#f59e0b" : "#ef4444"}; color: white; font-weight: 600;">
              ${d.avgMobileScore}
            </span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${d.avgDesktopScore >= 90 ? "#10b981" : d.avgDesktopScore >= 50 ? "#f59e0b" : "#ef4444"}; color: white; font-weight: 600;">
              ${d.avgDesktopScore}
            </span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.scansCount}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 20px;">
            ${d.trend === "up" ? "📈" : d.trend === "down" ? "📉" : "➡️"}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${d.issuesCount === 0 ? "#10b981" : d.issuesCount < 3 ? "#f59e0b" : "#ef4444"}; color: white; font-weight: 600;">
              ${d.issuesCount}
            </span>
          </td>
        </tr>
      `,
    )
    .join("");

  const mailOptions = {
    from: `"HostingInfo" <${getSecret("EMAIL_USER")}>`,
    to: userEmail,
    subject: `📊 Monthly Report: ${clientTag} - ${reportMonth}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
          }
          .summary-box {
            background: #f9fafb;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
          .metric {
            display: inline-block;
            margin: 10px 20px;
            text-align: center;
          }
          .metric-value {
            font-size: 32px;
            font-weight: 700;
            color: #667eea;
          }
          .metric-label {
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Monthly Performance Report</h1>
            <p>${reportMonth}</p>
          </div>
          
          <div class="content">
            <p class="greeting">Hi ${userName || "there"},</p>
            
            <p>Here's your monthly performance summary for <strong>${clientTag}</strong> domains:</p>
            
            <div class="summary-box">
              <div style="text-align: center;">
                <div class="metric">
                  <div class="metric-value">${domains.length}</div>
                  <div class="metric-label">Domains Monitored</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${domains.reduce((sum, d) => sum + d.scansCount, 0)}</div>
                  <div class="metric-label">Total Scans</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${domains.reduce((sum, d) => sum + d.issuesCount, 0)}</div>
                  <div class="metric-label">Issues Detected</div>
                </div>
              </div>
            </div>
            
            <h2 style="color: #1f2937; margin-top: 30px;">Domain Performance</h2>
            
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th style="text-align: center;">Mobile</th>
                  <th style="text-align: center;">Desktop</th>
                  <th style="text-align: center;">Scans</th>
                  <th style="text-align: center;">Trend</th>
                  <th style="text-align: center;">Issues</th>
                </tr>
              </thead>
              <tbody>
                ${domainsHtml}
              </tbody>
            </table>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e40af;"><strong>💡 Tip:</strong> Domains with consistent monitoring show better performance over time. Keep up the great work!</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View Full Dashboard →</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>HostingInfo</strong> - Website Intelligence Platform</p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">You're receiving this monthly report for your client domains tagged as "${clientTag}".</p>
            <p style="font-size: 12px; color: #9ca3af;">To stop receiving these reports, remove the client tag from your domains in the dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transport.sendMail(mailOptions);
}

/**
 * Send security issue alert
 */
export async function sendSecurityAlert({
  userEmail,
  userName,
  domain,
  issueType,
  severity,
  details,
  reportUrl,
}: {
  userEmail: string;
  userName?: string;
  domain: string;
  issueType: string;
  severity: "low" | "medium" | "high" | "critical";
  details: string;
  reportUrl: string;
}) {
  const transport = getTransporter();
  const severityColors = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    critical: "#dc2626",
  };
  const severityEmojis = {
    low: "ℹ️",
    medium: "⚠️",
    high: "🚨",
    critical: "🔴",
  };

  const mailOptions = {
    from: `"HostingInfo Security" <${getSecret("EMAIL_USER")}>`,
    to: userEmail,
    subject: `${severityEmojis[severity]} Security Alert: ${domain} (${severity.toUpperCase()})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: #fee; border-left: 4px solid ${severityColors[severity]}; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">${severityEmojis[severity]} Security Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${domain}</p>
          </div>
          
          <div class="content">
            <p>Hi ${userName || "there"},</p>
            
            <div class="alert-box">
              <strong style="color: ${severityColors[severity]};">${severity.toUpperCase()} Severity</strong><br>
              ${issueType}
            </div>
            
            <h3>Issue Details:</h3>
            <p>${details}</p>
            
            <h3>Immediate Actions:</h3>
            <ul>
              <li>Review the full security report for detailed findings</li>
              <li>Update all software, plugins, and dependencies</li>
              <li>Check for unauthorized access or changes</li>
              <li>Enable security headers if missing</li>
              <li>Contact your hosting provider if needed</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${reportUrl}" class="button">View Security Report →</a>
            </div>
          </div>
          
          <div class="footer">
            <p>HostingInfo - Website Intelligence Platform</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transport.sendMail(mailOptions);
}

/**
 * Send SSL expiration warning
 */
export async function sendSslExpiryAlert({
  userEmail,
  userName,
  domain,
  daysUntilExpiry,
  expiryDate,
  reportUrl,
}: {
  userEmail: string;
  userName?: string;
  domain: string;
  daysUntilExpiry: number;
  expiryDate: string;
  reportUrl: string;
}) {
  const transport = getTransporter();
  const urgency =
    daysUntilExpiry <= 7
      ? "URGENT"
      : daysUntilExpiry <= 14
        ? "Important"
        : "Notice";

  const mailOptions = {
    from: `"HostingInfo Alerts" <${getSecret("EMAIL_USER")}>`,
    to: userEmail,
    subject: `🔒 SSL Certificate Expiring Soon: ${domain} (${daysUntilExpiry} days)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🔒 SSL Certificate Expiring</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${domain}</p>
          </div>
          
          <div class="content">
            <p>Hi ${userName || "there"},</p>
            
            <div class="alert-box">
              <strong>${urgency}:</strong> Your SSL certificate will expire in <strong>${daysUntilExpiry} days</strong> on ${expiryDate}.
            </div>
            
            <p>An expired SSL certificate will cause:</p>
            <ul>
              <li>Browser security warnings for all visitors</li>
              <li>Loss of trust and credibility</li>
              <li>Potential SEO ranking penalties</li>
              <li>Blocked access to your website</li>
            </ul>
            
            <h3>Action Required:</h3>
            <ol>
              <li>Contact your hosting provider to renew the certificate</li>
              <li>If using Let's Encrypt, check auto-renewal settings</li>
              <li>Verify certificate installation after renewal</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${reportUrl}" class="button">View SSL Details →</a>
            </div>
          </div>
          
          <div class="footer">
            <p>HostingInfo - Website Intelligence Platform</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transport.sendMail(mailOptions);
}

/**
 * Send downtime alert
 */
export async function sendDowntimeAlert({
  userEmail,
  userName,
  domain,
  downSince,
  statusCode,
  errorMessage,
  reportUrl,
}: {
  userEmail: string;
  userName?: string;
  domain: string;
  downSince: string;
  statusCode?: number;
  errorMessage?: string;
  reportUrl: string;
}) {
  const transport = getTransporter();

  const mailOptions = {
    from: `"HostingInfo Alerts" <${getSecret("EMAIL_USER")}>`,
    to: userEmail,
    subject: `🚨 URGENT: ${domain} is DOWN`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: #fee; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🚨 Website DOWN</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${domain}</p>
          </div>
          
          <div class="content">
            <p>Hi ${userName || "there"},</p>
            
            <div class="alert-box">
              <strong>CRITICAL:</strong> Your website is currently unreachable.
            </div>
            
            <p><strong>Down Since:</strong> ${downSince}</p>
            ${statusCode ? `<p><strong>Status Code:</strong> ${statusCode}</p>` : ""}
            ${errorMessage ? `<p><strong>Error:</strong> ${errorMessage}</p>` : ""}
            
            <h3>Immediate Actions:</h3>
            <ol>
              <li>Check your hosting control panel for service status</li>
              <li>Verify DNS settings are correct</li>
              <li>Contact your hosting provider immediately</li>
              <li>Check for server resource limits (CPU, memory, bandwidth)</li>
              <li>Review recent changes or updates</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${reportUrl}" class="button">View Diagnostic Report →</a>
            </div>
          </div>
          
          <div class="footer">
            <p>HostingInfo - Website Intelligence Platform</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transport.sendMail(mailOptions);
}

/**
 * Send weekly summary report
 */
export async function sendWeeklySummary({
  userEmail,
  userName,
  domains,
  dashboardUrl,
}: {
  userEmail: string;
  userName?: string;
  domains: Array<{
    domain: string;
    avgScore: number;
    scansCount: number;
    trend: "up" | "down" | "stable";
    issues: number;
  }>;
  dashboardUrl: string;
}) {
  const transport = getTransporter();

  const domainsHtml = domains
    .map(
      (d) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${d.domain}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <strong style="color: ${d.avgScore >= 80 ? "#059669" : d.avgScore >= 50 ? "#f59e0b" : "#dc2626"};">${d.avgScore}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.scansCount}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${d.trend === "up" ? "📈" : d.trend === "down" ? "📉" : "➡️"}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${d.issues > 0 ? `<span style="color: #dc2626;">${d.issues}</span>` : "✓"}
        </td>
      </tr>
    `,
    )
    .join("");

  const mailOptions = {
    from: `"HostingInfo Reports" <${getSecret("EMAIL_USER")}>`,
    to: userEmail,
    subject: `📊 Weekly Summary: ${domains.length} Domain${domains.length > 1 ? "s" : ""} Monitored`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          table { width: 100%; background: white; border-radius: 8px; overflow: hidden; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">📊 Weekly Summary</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your website performance overview</p>
          </div>
          
          <div class="content">
            <p>Hi ${userName || "there"},</p>
            
            <p>Here's your weekly summary for ${domains.length} monitored domain${domains.length > 1 ? "s" : ""}:</p>
            
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th style="text-align: center;">Avg Score</th>
                  <th style="text-align: center;">Scans</th>
                  <th style="text-align: center;">Trend</th>
                  <th style="text-align: center;">Issues</th>
                </tr>
              </thead>
              <tbody>
                ${domainsHtml}
              </tbody>
            </table>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View Full Dashboard →</a>
            </div>
          </div>
          
          <div class="footer">
            <p>HostingInfo - Website Intelligence Platform</p>
            <p style="font-size: 12px; color: #9ca3af;">You're receiving this because you have automated monitoring enabled.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transport.sendMail(mailOptions);
}
