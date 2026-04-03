/**
 * PDF Report Generator
 *
 * Generates professional PDF reports using Playwright for HTML-to-PDF conversion.
 * Supports multiple report types with customizable templates and branding.
 */

import type { Browser } from "playwright";
import fs from "fs/promises";
import path from "path";
import { launchPdfBrowser } from "./browser-launcher.js";

export interface ReportData {
  title: string;
  domain: string;
  generatedAt: Date;
  type: "performance" | "security" | "uptime" | "comprehensive" | "comparison";
  sections: ReportSection[];
  branding?: {
    logo?: string;
    companyName?: string;
    primaryColor?: string;
  };
}

export interface ReportSection {
  id: string;
  title: string;
  content: string | object;
  type: "text" | "chart" | "table" | "metrics" | "list";
}

export interface PDFOptions {
  format?: "A4" | "Letter";
  orientation?: "portrait" | "landscape";
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

interface TableSectionContent {
  rows?: Array<Record<string, unknown>>;
  columns?: string[];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTableSectionContent(value: unknown): value is TableSectionContent {
  return isObjectRecord(value);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generate PDF report from data
 */
export async function generatePDFReport(
  data: ReportData,
  outputPath: string,
  options: PDFOptions = {},
): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
  fileSize?: number;
}> {
  let browser: Browser | null = null;

  try {
    // Generate HTML content
    const html = generateHTMLTemplate(data);

    // Launch headless browser
    browser = await launchPdfBrowser();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: options.format || "A4",
      printBackground: true,
      margin: options.margin || {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
      displayHeaderFooter: options.displayHeaderFooter || true,
      headerTemplate: options.headerTemplate || getDefaultHeader(data),
      footerTemplate: options.footerTemplate || getDefaultFooter(),
    });

    // Get file size
    const stats = await fs.stat(outputPath);

    return {
      success: true,
      filePath: outputPath,
      fileSize: stats.size,
    };
  } catch {
    return {
      success: false,
      error: "An internal error occurred",
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}

/**
 * Generate HTML template for report
 */
function generateHTMLTemplate(data: ReportData): string {
  const primaryColor = data.branding?.primaryColor || "#3b82f6";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(data.title)}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #1f2937;
          background: white;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          border-bottom: 3px solid ${primaryColor};
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 28pt;
          color: ${primaryColor};
          margin-bottom: 10px;
        }
        
        .header .meta {
          display: flex;
          justify-content: space-between;
          color: #6b7280;
          font-size: 10pt;
        }
        
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-size: 18pt;
          color: #111827;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .metric-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        
        .metric-value {
          font-size: 32pt;
          font-weight: bold;
          color: ${primaryColor};
          margin-bottom: 5px;
        }
        
        .metric-label {
          font-size: 10pt;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        
        tr:hover {
          background: #f9fafb;
        }
        
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 9pt;
          font-weight: 600;
        }
        
        .badge-success {
          background: #d1fae5;
          color: #065f46;
        }
        
        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }
        
        .badge-error {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .list-item {
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .list-item:last-child {
          border-bottom: none;
        }
        
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #9ca3af;
          font-size: 9pt;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(data.title)}</h1>
          <div class="meta">
            <span><strong>Domain:</strong> ${escapeHtml(data.domain)}</span>
            <span><strong>Generated:</strong> ${new Date(data.generatedAt).toLocaleDateString()}</span>
            <span><strong>Type:</strong> ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}</span>
          </div>
        </div>
        
        ${data.sections.map((section) => renderSection(section, primaryColor)).join("\n")}
        
        <div class="footer">
          <p>Generated by HostingInfo &copy; ${new Date().getFullYear()}</p>
          <p>This report is confidential and intended for the recipient only.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render individual section based on type
 */
function renderSection(section: ReportSection, primaryColor: string): string {
  const content =
    typeof section.content === "string"
      ? escapeHtml(section.content)
      : escapeHtml(JSON.stringify(section.content, null, 2));

  switch (section.type) {
    case "metrics":
      return renderMetricsSection(section, primaryColor);
    case "table":
      return renderTableSection(section);
    case "list":
      return renderListSection(section);
    case "text":
    default:
      return `
        <div class="section">
          <h2 class="section-title">${escapeHtml(section.title)}</h2>
          <div>${content}</div>
        </div>
      `;
  }
}

/**
 * Render metrics section with cards
 */
function renderMetricsSection(
  section: ReportSection,
  _primaryColor: string,
): string {
  const metrics =
    typeof section.content === "object"
      ? (section.content as Record<string, unknown>)
      : {};

  const metricsHTML = Object.entries(metrics)
    .map(
      ([key, value]) => `
    <div class="metric-card">
      <div class="metric-value">${escapeHtml(String(value))}</div>
      <div class="metric-label">${escapeHtml(key.replace(/_/g, " "))}</div>
    </div>
  `,
    )
    .join("");

  return `
    <div class="section">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <div class="metrics-grid">
        ${metricsHTML}
      </div>
    </div>
  `;
}

/**
 * Render table section
 */
function renderTableSection(section: ReportSection): string {
  const data = isTableSectionContent(section.content) ? section.content : {};
  const rows = data.rows || [];
  const columns = data.columns || [];

  if (!rows.length || !columns.length) {
    return `
      <div class="section">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        <p>No data available</p>
      </div>
    `;
  }

  return `
    <div class="section">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <table>
        <thead>
          <tr>
            ${columns.map((col: string) => `<th>${escapeHtml(col)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row: Record<string, unknown>) => `
            <tr>
              ${columns
                .map(
                  (col: string) =>
                    `<td>${escapeHtml(String(row[col] ?? "-"))}</td>`,
                )
                .join("")}
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Render list section
 */
function renderListSection(section: ReportSection): string {
  const items = Array.isArray(section.content) ? section.content : [];

  return `
    <div class="section">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <div>
        ${items
          .map(
            (item: unknown) => `
          <div class="list-item">
            ${escapeHtml(typeof item === "string" ? item : JSON.stringify(item))}
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

/**
 * Get default header template
 */
function getDefaultHeader(data: ReportData): string {
  return `
    <div style="font-size: 9pt; color: #6b7280; padding: 0 15mm; width: 100%; display: flex; justify-content: space-between;">
      <span>${escapeHtml(data.branding?.companyName || "HostingInfo")}</span>
      <span>${escapeHtml(data.title)}</span>
    </div>
  `;
}

/**
 * Get default footer template
 */
function getDefaultFooter(): string {
  return `
    <div style="font-size: 9pt; color: #9ca3af; padding: 0 15mm; width: 100%; text-align: center;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `;
}

/**
 * Generate HTML export (non-PDF)
 */
export async function generateHTMLReport(
  data: ReportData,
  outputPath: string,
): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
  fileSize?: number;
}> {
  try {
    const html = generateHTMLTemplate(data);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Write HTML file
    await fs.writeFile(outputPath, html, "utf-8");

    // Get file size
    const stats = await fs.stat(outputPath);

    return {
      success: true,
      filePath: outputPath,
      fileSize: stats.size,
    };
  } catch {
    return {
      success: false,
      error: "An internal error occurred",
    };
  }
}
