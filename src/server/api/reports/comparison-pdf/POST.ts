/**
 * Domain Comparison PDF Export
 * Generates professional PDF report for domain comparison results
 */

import type { Request, Response } from "express";
import type { Browser } from "playwright";
import { launchPdfBrowser } from "../../../lib/reports/browser-launcher.js";

interface ComparisonDomain {
  domain: string;
  technology?: {
    wordpress?: { detected: boolean; version?: string };
    php?: { detected: boolean; version?: string };
    server?: {
      type?: string;
      isWebsiteBuilder?: boolean;
      builderType?: string;
    };
  };
  security?: { score?: number; headers?: Record<string, unknown> };
  performance?: { mobile?: { score?: number }; desktop?: { score?: number } };
  dns?: Record<string, unknown>;
  email?: Record<string, unknown>;
  geolocation?: { country?: string; city?: string };
  provider?: { nameservers?: string[] };
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let browser: Browser | null = null;

  try {
    const { domains } = req.body as { domains: ComparisonDomain[] };

    if (!domains || !Array.isArray(domains) || domains.length < 2) {
      return res
        .status(400)
        .json({ error: "At least 2 domains required for comparison" });
    }

    // Generate HTML for PDF
    const html = generateComparisonHTML(domains);

    browser = await launchPdfBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: domains.length > 2, // Landscape for 3+ domains
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    // Send PDF as download
    const filename = `domain-comparison-${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Comparison PDF generation failed:", error);
    res.status(500).json({
      error: "Failed to generate comparison PDF",
      message: "An internal error occurred",
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

function generateComparisonHTML(domains: ComparisonDomain[]): string {
  const primaryColor = "#3b82f6";
  const timestamp = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Domain Comparison Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.5;
          color: #1f2937;
          background: white;
        }
        
        .container {
          max-width: 100%;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          border-bottom: 3px solid ${primaryColor};
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 24pt;
          color: ${primaryColor};
          margin-bottom: 10px;
        }
        
        .header .meta {
          display: flex;
          justify-content: space-between;
          color: #6b7280;
          font-size: 9pt;
        }
        
        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(${domains.length}, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .domain-column {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .domain-header {
          background: ${primaryColor};
          color: white;
          padding: 15px;
          text-align: center;
        }
        
        .domain-name {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 5px;
          word-break: break-all;
        }
        
        .domain-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 8pt;
          margin-top: 5px;
        }
        
        .section {
          padding: 15px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .section:last-child {
          border-bottom: none;
        }
        
        .section-title {
          font-size: 9pt;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        
        .metric {
          margin-bottom: 8px;
        }
        
        .metric-label {
          font-size: 8pt;
          color: #9ca3af;
          margin-bottom: 2px;
        }
        
        .metric-value {
          font-size: 11pt;
          font-weight: 600;
          color: #111827;
        }
        
        .score {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 10pt;
        }
        
        .score-excellent {
          background: #d1fae5;
          color: #065f46;
        }
        
        .score-good {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .score-fair {
          background: #fef3c7;
          color: #92400e;
        }
        
        .score-poor {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .best-badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 7pt;
          font-weight: bold;
          margin-left: 5px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 8pt;
        }
        
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .summary-table th,
        .summary-table td {
          padding: 10px;
          text-align: left;
          border: 1px solid #e5e7eb;
        }
        
        .summary-table th {
          background: #f9fafb;
          font-weight: 600;
          font-size: 9pt;
          color: #374151;
        }
        
        .summary-table td {
          font-size: 9pt;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Domain Comparison Report</h1>
          <div class="meta">
            <span><strong>Domains Compared:</strong> ${domains.length}</span>
            <span><strong>Generated:</strong> ${timestamp}</span>
            <span><strong>Report Type:</strong> Side-by-Side Comparison</span>
          </div>
        </div>
        
        <!-- Summary Table -->
        <h2 style="font-size: 14pt; color: #111827; margin-bottom: 15px;">Quick Summary</h2>
        <table class="summary-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Technology</th>
              <th>Security Score</th>
              <th>Performance</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${domains
              .map(
                (domain) => `
              <tr>
                <td><strong>${domain.domain}</strong></td>
                <td>
                  ${domain.technology?.wordpress?.detected ? `WordPress ${domain.technology.wordpress.version || ""}` : ""}
                  ${domain.technology?.php?.detected ? `<br>PHP ${domain.technology.php.version || ""}` : ""}
                  ${domain.technology?.server?.type ? `<br>${domain.technology.server.type}` : ""}
                  ${domain.technology?.server?.isWebsiteBuilder ? `<br><em>${domain.technology.server.builderType || "Website Builder"}</em>` : ""}
                </td>
                <td>${domain.security?.score !== undefined ? `<span class="score ${getScoreClass(domain.security.score)}">${domain.security.score}/100</span>` : "N/A"}</td>
                <td>
                  ${domain.performance?.mobile?.score !== undefined ? `Mobile: ${domain.performance.mobile.score}/100` : ""}
                  ${domain.performance?.desktop?.score !== undefined ? `<br>Desktop: ${domain.performance.desktop.score}/100` : ""}
                </td>
                <td>${domain.geolocation?.city || ""} ${domain.geolocation?.country || "N/A"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        
        <!-- Detailed Comparison Grid -->
        <h2 style="font-size: 14pt; color: #111827; margin-bottom: 15px;">Detailed Comparison</h2>
        <div class="comparison-grid">
          ${domains
            .map(
              (domain, index) => `
            <div class="domain-column">
              <div class="domain-header">
                <div class="domain-name">${domain.domain}</div>
                ${domain.technology?.server?.isWebsiteBuilder ? `<div class="domain-badge">Website Builder</div>` : ""}
              </div>
              
              <!-- Technology Stack -->
              <div class="section">
                <div class="section-title">Technology Stack</div>
                ${
                  domain.technology?.wordpress?.detected
                    ? `
                  <div class="metric">
                    <div class="metric-label">WordPress</div>
                    <div class="metric-value">v${domain.technology.wordpress.version || "Unknown"}</div>
                  </div>
                `
                    : ""
                }
                ${
                  domain.technology?.php?.detected
                    ? `
                  <div class="metric">
                    <div class="metric-label">PHP</div>
                    <div class="metric-value">v${domain.technology.php.version || "Unknown"}</div>
                  </div>
                `
                    : ""
                }
                ${
                  domain.technology?.server?.type
                    ? `
                  <div class="metric">
                    <div class="metric-label">Server</div>
                    <div class="metric-value">${domain.technology.server.type}</div>
                  </div>
                `
                    : ""
                }
                ${
                  !domain.technology?.wordpress?.detected &&
                  !domain.technology?.php?.detected &&
                  !domain.technology?.server?.type
                    ? `
                  <div class="metric-value" style="color: #9ca3af;">No data available</div>
                `
                    : ""
                }
              </div>
              
              <!-- Security -->
              <div class="section">
                <div class="section-title">Security</div>
                ${
                  domain.security?.score !== undefined
                    ? `
                  <div class="metric">
                    <div class="metric-label">Overall Score</div>
                    <div class="metric-value">
                      <span class="score ${getScoreClass(domain.security.score)}">
                        ${domain.security.score}/100
                        ${isBestScore(domains, "security", index) ? '<span class="best-badge">BEST</span>' : ""}
                      </span>
                    </div>
                  </div>
                `
                    : '<div class="metric-value" style="color: #9ca3af;">No data available</div>'
                }
              </div>
              
              <!-- Performance -->
              <div class="section">
                <div class="section-title">Performance</div>
                ${
                  domain.performance?.mobile?.score !== undefined
                    ? `
                  <div class="metric">
                    <div class="metric-label">Mobile Score</div>
                    <div class="metric-value">
                      <span class="score ${getScoreClass(domain.performance.mobile.score)}">
                        ${domain.performance.mobile.score}/100
                        ${isBestScore(domains, "performance-mobile", index) ? '<span class="best-badge">BEST</span>' : ""}
                      </span>
                    </div>
                  </div>
                `
                    : ""
                }
                ${
                  domain.performance?.desktop?.score !== undefined
                    ? `
                  <div class="metric">
                    <div class="metric-label">Desktop Score</div>
                    <div class="metric-value">
                      <span class="score ${getScoreClass(domain.performance.desktop.score)}">
                        ${domain.performance.desktop.score}/100
                        ${isBestScore(domains, "performance-desktop", index) ? '<span class="best-badge">BEST</span>' : ""}
                      </span>
                    </div>
                  </div>
                `
                    : ""
                }
                ${
                  !domain.performance?.mobile?.score &&
                  !domain.performance?.desktop?.score
                    ? `
                  <div class="metric-value" style="color: #9ca3af;">No data available</div>
                `
                    : ""
                }
              </div>
              
              <!-- Location -->
              <div class="section">
                <div class="section-title">Location</div>
                ${
                  domain.geolocation?.country
                    ? `
                  <div class="metric">
                    <div class="metric-label">Country</div>
                    <div class="metric-value">${domain.geolocation.country}</div>
                  </div>
                `
                    : ""
                }
                ${
                  domain.geolocation?.city
                    ? `
                  <div class="metric">
                    <div class="metric-label">City</div>
                    <div class="metric-value">${domain.geolocation.city}</div>
                  </div>
                `
                    : ""
                }
                ${
                  !domain.geolocation?.country && !domain.geolocation?.city
                    ? `
                  <div class="metric-value" style="color: #9ca3af;">No data available</div>
                `
                    : ""
                }
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="footer">
          <p><strong>HostingInfo</strong> - Domain Analysis & Comparison Platform</p>
          <p>Generated on ${timestamp} | This report is confidential and intended for the recipient only.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getScoreClass(score: number): string {
  if (score >= 90) return "score-excellent";
  if (score >= 70) return "score-good";
  if (score >= 50) return "score-fair";
  return "score-poor";
}

function isBestScore(
  domains: ComparisonDomain[],
  metric: string,
  currentIndex: number,
): boolean {
  let scores: (number | undefined)[];

  if (metric === "security") {
    scores = domains.map((d) => d.security?.score);
  } else if (metric === "performance-mobile") {
    scores = domains.map((d) => d.performance?.mobile?.score);
  } else if (metric === "performance-desktop") {
    scores = domains.map((d) => d.performance?.desktop?.score);
  } else {
    return false;
  }

  const validScores = scores.filter((s) => s !== undefined) as number[];
  if (validScores.length === 0) return false;

  const maxScore = Math.max(...validScores);
  const currentScore = scores[currentIndex];

  return currentScore === maxScore && currentScore !== undefined;
}
