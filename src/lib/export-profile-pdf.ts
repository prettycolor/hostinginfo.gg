/**
 * Export complete domain profile report to PDF
 * Includes all tabs: Hosting, DNS, Email, Security, Performance
 */

interface ProfileData {
  domain: string;
  technology: TechnologyData | null;
  provider: ProviderData | null;
  dns: DnsData | null;
  email: EmailData | null;
  security: SecurityData | null;
  performance: PerformanceData | null;
  geolocation: GeolocationData | null;
}

interface TechnologyData {
  server?: {
    type?: string;
    isWebsiteBuilder?: boolean;
    builderName?: string;
  };
  wordpress?: {
    detected?: boolean;
    version?: string;
  };
  php?: {
    detected?: boolean;
    version?: string;
  };
}

interface ProviderData {
  name?: string;
  category?: string;
}

interface DnsMxRecord {
  exchange?: string;
  priority?: number;
}

interface DnsData {
  A?: string[];
  AAAA?: string[];
  MX?: DnsMxRecord[];
  NS?: string[];
}

interface EmailData {
  spf?: { valid?: boolean };
  dmarc?: { valid?: boolean };
  dkim?: { valid?: boolean };
  mx?: { records?: unknown[] };
}

interface SecurityData {
  score?: number;
  grade?: string;
  ssl?: {
    valid?: boolean;
    grade?: string;
  };
  waf?: {
    detected?: boolean;
    provider?: string;
  };
  headers?: {
    hsts?: boolean;
    csp?: boolean;
    xFrameOptions?: boolean;
    xContentTypeOptions?: boolean;
  };
}

interface PerformanceData {
  mobile?: { score?: number };
  desktop?: { score?: number };
}

interface GeolocationData {
  city?: string;
  country?: string;
}

export const exportProfileReportToPDF = (data: ProfileData) => {
  const {
    domain,
    technology,
    provider,
    dns,
    email,
    security,
    performance,
    geolocation,
  } = data;

  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Failed to open print window");
    return;
  }

  // Helper function to get grade color
  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A"))
      return { bg: "#dcfce7", border: "#22c55e", text: "#15803d" };
    if (grade.startsWith("B"))
      return { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" };
    if (grade.startsWith("C"))
      return { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" };
    if (grade.startsWith("D"))
      return { bg: "#fed7aa", border: "#f97316", text: "#9a3412" };
    return { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" };
  };

  // Helper function to get score color
  const getScoreColor = (score: number) => {
    if (score >= 80)
      return { bg: "#dcfce7", border: "#22c55e", text: "#15803d" };
    if (score >= 50)
      return { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" };
    return { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" };
  };

  // Calculate email security score
  const calculateEmailScore = () => {
    if (!email) return { score: 0, grade: "F" };
    let score = 0;
    if (email.spf?.valid) score += 30;
    if (email.dmarc?.valid) score += 30;
    if (email.dkim?.valid) score += 25;
    if (email.mx?.records && email.mx.records.length > 0) score += 15;

    let grade = "F";
    if (score >= 97) grade = "A+";
    else if (score >= 93) grade = "A";
    else if (score >= 90) grade = "A-";
    else if (score >= 87) grade = "B+";
    else if (score >= 83) grade = "B";
    else if (score >= 80) grade = "B-";
    else if (score >= 77) grade = "C+";
    else if (score >= 73) grade = "C";
    else if (score >= 70) grade = "C-";
    else if (score >= 60) grade = "D";

    return { score, grade };
  };

  const emailScore = calculateEmailScore();
  const securityColors = getScoreColor(security?.score || 0);
  const emailColors = getGradeColor(emailScore.grade);
  const mobileScore = performance?.mobile?.score ?? 0;
  const desktopScore = performance?.desktop?.score ?? 0;
  const perfAvg = performance
    ? Math.round((mobileScore + desktopScore) / 2)
    : 0;
  const perfColors = getScoreColor(perfAvg);

  const printDocument = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Domain Profile Report - ${domain}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #f9fafb;
            padding: 20px;
          }

          @media print {
            body {
              padding: 0;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            .page-break {
              page-break-before: always;
              break-before: always;
            }

            .no-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            h1, h2, h3 {
              page-break-after: avoid;
              break-after: avoid;
            }
          }

          .report-container {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          /* Header */
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 24px;
            border-bottom: 3px solid #e5e7eb;
          }

          .header h1 {
            font-size: 36px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 8px;
          }

          .header .domain {
            font-size: 24px;
            color: #2563eb;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .header .date {
            font-size: 14px;
            color: #6b7280;
          }

          /* Score Cards Grid */
          .score-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }

          .score-card {
            padding: 20px;
            border-radius: 8px;
            border: 2px solid;
            text-align: center;
          }

          .score-card .label {
            font-size: 12px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }

          .score-card .value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 4px;
          }

          .score-card .subtitle {
            font-size: 14px;
            opacity: 0.8;
          }

          /* Section */
          .section {
            margin-bottom: 32px;
            padding: 24px;
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }

          .section h2 {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .section h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-top: 16px;
            margin-bottom: 12px;
          }

          /* Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }

          .info-item {
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }

          .info-item .label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
          }

          .info-item .value {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
          }

          /* List */
          .list {
            list-style: none;
            padding: 0;
          }

          .list li {
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .list li::before {
            content: '✓';
            color: #22c55e;
            font-weight: bold;
            font-size: 16px;
          }

          .list li.fail::before {
            content: '✗';
            color: #ef4444;
          }

          /* Badge */
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid;
          }

          .badge.success {
            background: #dcfce7;
            color: #15803d;
            border-color: #22c55e;
          }

          .badge.warning {
            background: #fef3c7;
            color: #92400e;
            border-color: #f59e0b;
          }

          .badge.error {
            background: #fee2e2;
            color: #991b1b;
            border-color: #ef4444;
          }

          /* Footer */
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }

          /* Utilities */
          .text-center { text-align: center; }
          .mb-2 { margin-bottom: 8px; }
          .mb-4 { margin-bottom: 16px; }
          .mt-4 { margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- Header -->
          <div class="header">
            <h1>🌐 Domain Profile Report</h1>
            <div class="domain">${domain}</div>
            <div class="date">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          </div>

          <!-- Score Overview -->
          <div class="score-grid no-break">
            <div class="score-card" style="background: ${securityColors.bg}; border-color: ${securityColors.border}; color: ${securityColors.text};">
              <div class="label">Security</div>
              <div class="value">${security?.score || 0}/100</div>
              <div class="subtitle">${security?.grade || "N/A"}</div>
            </div>
            <div class="score-card" style="background: ${emailColors.bg}; border-color: ${emailColors.border}; color: ${emailColors.text};">
              <div class="label">Email Security</div>
              <div class="value">${emailScore.grade}</div>
              <div class="subtitle">${emailScore.score}/100</div>
            </div>
            <div class="score-card" style="background: ${perfColors.bg}; border-color: ${perfColors.border}; color: ${perfColors.text};">
              <div class="label">Performance</div>
              <div class="value">${perfAvg}/100</div>
              <div class="subtitle">${perfAvg >= 90 ? "Excellent" : perfAvg >= 50 ? "Good" : "Needs Work"}</div>
            </div>
          </div>

          <!-- Hosting Information -->
          <div class="section no-break">
            <h2>🖥️ Hosting Information</h2>
            <div class="info-grid">
              ${
                provider
                  ? `
                <div class="info-item">
                  <div class="label">Provider</div>
                  <div class="value">${provider.name || "Unknown"}</div>
                </div>
                <div class="info-item">
                  <div class="label">Category</div>
                  <div class="value">${provider.category || "Unknown"}</div>
                </div>
              `
                  : ""
              }
              ${
                technology?.server
                  ? `
                <div class="info-item">
                  <div class="label">Server</div>
                  <div class="value">${technology.server.type || "Unknown"}</div>
                </div>
                ${
                  technology.server.isWebsiteBuilder
                    ? `
                  <div class="info-item">
                    <div class="label">Platform</div>
                    <div class="value">${technology.server.builderName || "Website Builder"}</div>
                  </div>
                `
                    : ""
                }
              `
                  : ""
              }
              ${
                technology?.wordpress?.detected &&
                !technology?.server?.isWebsiteBuilder
                  ? `
                <div class="info-item">
                  <div class="label">WordPress</div>
                  <div class="value">${technology.wordpress.version || "Detected"}</div>
                </div>
              `
                  : ""
              }
              ${
                technology?.php?.detected &&
                !technology?.server?.isWebsiteBuilder
                  ? `
                <div class="info-item">
                  <div class="label">PHP Version</div>
                  <div class="value">${technology.php.version || "Detected"}</div>
                </div>
              `
                  : ""
              }
              ${
                geolocation
                  ? `
                <div class="info-item">
                  <div class="label">Location</div>
                  <div class="value">${geolocation.city ? `${geolocation.city}, ` : ""}${geolocation.country || "Unknown"}</div>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <!-- DNS Records -->
          ${
            dns
              ? `
            <div class="section no-break">
              <h2>🌐 DNS Records</h2>
              ${
                dns.A && dns.A.length > 0
                  ? `
                <h3>A Records (IPv4)</h3>
                <ul class="list">
                  ${dns.A.map((ip: string) => `<li>${ip}</li>`).join("")}
                </ul>
              `
                  : ""
              }
              ${
                dns.AAAA && dns.AAAA.length > 0
                  ? `
                <h3>AAAA Records (IPv6)</h3>
                <ul class="list">
                  ${dns.AAAA.map((ip: string) => `<li>${ip}</li>`).join("")}
                </ul>
              `
                  : ""
              }
              ${
                dns.MX && dns.MX.length > 0
                  ? `
                <h3>MX Records (Mail)</h3>
                <ul class="list">
                  ${dns.MX.map((mx: DnsMxRecord) => `<li>${mx.exchange || "Unknown"} (Priority: ${mx.priority ?? "N/A"})</li>`).join("")}
                </ul>
              `
                  : ""
              }
              ${
                dns.NS && dns.NS.length > 0
                  ? `
                <h3>NS Records (Nameservers)</h3>
                <ul class="list">
                  ${dns.NS.map((ns: string) => `<li>${ns}</li>`).join("")}
                </ul>
              `
                  : ""
              }
            </div>
          `
              : ""
          }

          <!-- Email Security -->
          ${
            email
              ? `
            <div class="section no-break">
              <h2>📧 Email Security</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="label">SPF (Sender Policy Framework)</div>
                  <div class="value">
                    <span class="badge ${email.spf?.valid ? "success" : "error"}">
                      ${email.spf?.valid ? "✓ Configured" : "✗ Not Configured"}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="label">DMARC (Domain-based Message Authentication)</div>
                  <div class="value">
                    <span class="badge ${email.dmarc?.valid ? "success" : "error"}">
                      ${email.dmarc?.valid ? "✓ Configured" : "✗ Not Configured"}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="label">DKIM (DomainKeys Identified Mail)</div>
                  <div class="value">
                    <span class="badge ${email.dkim?.valid ? "success" : "error"}">
                      ${email.dkim?.valid ? "✓ Configured" : "✗ Not Configured"}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="label">MX Records</div>
                  <div class="value">
                    <span class="badge ${email.mx?.records && email.mx.records.length > 0 ? "success" : "error"}">
                      ${email.mx?.records && email.mx.records.length > 0 ? `✓ ${email.mx.records.length} Record(s)` : "✗ Not Configured"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          `
              : ""
          }

          <!-- Security Analysis -->
          ${
            security
              ? `
            <div class="section no-break">
              <h2>🔒 Security Analysis</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="label">SSL/TLS Certificate</div>
                  <div class="value">
                    <span class="badge ${security.ssl?.valid ? "success" : "error"}">
                      ${security.ssl?.valid ? `✓ Valid (${security.ssl.grade || "N/A"})` : "✗ Invalid"}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="label">Web Application Firewall</div>
                  <div class="value">
                    <span class="badge ${security.waf?.detected ? "success" : "error"}">
                      ${security.waf?.detected ? `✓ ${security.waf.provider || "Detected"}` : "✗ Not Detected"}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="label">HSTS (HTTP Strict Transport Security)</div>
                  <div class="value">
                    <span class="badge ${security.headers?.hsts ? "success" : "error"}">
                      ${security.headers?.hsts ? "✓ Enabled" : "✗ Not Enabled"}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="label">Content Security Policy</div>
                  <div class="value">
                    <span class="badge ${security.headers?.csp ? "success" : "error"}">
                      ${security.headers?.csp ? "✓ Configured" : "✗ Not Configured"}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="label">X-Frame-Options</div>
                  <div class="value">
                    <span class="badge ${security.headers?.xFrameOptions ? "success" : "error"}">
                      ${security.headers?.xFrameOptions ? "✓ Enabled" : "✗ Not Enabled"}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="label">X-Content-Type-Options</div>
                  <div class="value">
                    <span class="badge ${security.headers?.xContentTypeOptions ? "success" : "error"}">
                      ${security.headers?.xContentTypeOptions ? "✓ Enabled" : "✗ Not Enabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          `
              : ""
          }

          <!-- Performance Metrics -->
          ${
            performance
              ? `
            <div class="section no-break">
              <h2>⚡ Performance Metrics</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="label">Mobile Performance</div>
                  <div class="value">${mobileScore}/100</div>
                </div>
                <div class="info-item">
                  <div class="label">Desktop Performance</div>
                  <div class="value">${desktopScore}/100</div>
                </div>
                <div class="info-item">
                  <div class="label">Average Score</div>
                  <div class="value">${perfAvg}/100</div>
                </div>
                <div class="info-item">
                  <div class="label">Performance Level</div>
                  <div class="value">
                    <span class="badge ${perfAvg >= 90 ? "success" : perfAvg >= 50 ? "warning" : "error"}">
                      ${perfAvg >= 90 ? "🏆 Excellent" : perfAvg >= 50 ? "⚡ Good" : "🔰 Needs Work"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          `
              : ""
          }

          <!-- Footer -->
          <div class="footer">
            <p>This report was generated by HostingInfo - Domain Security & Performance Analysis</p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
          
          // Close window immediately after print dialog is dismissed
          window.onafterprint = function() {
            window.close();
          };
          
          // Fallback: close if user cancels print dialog
          window.onbeforeunload = function() {
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(printDocument);
  printWindow.document.close();
};
