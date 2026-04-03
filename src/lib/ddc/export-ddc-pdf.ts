/**
 * Export DDC Savings Report to PDF using browser's print functionality
 * Professional sales proposal format for closing deals
 */

import type { SavingsResult, TimeFrame } from "@/types/ddc";
import { formatCurrency } from "./calculator";
import pricingData from "@/data/pricing.json";

export const exportDDCReportToPDF = (
  results: SavingsResult,
  timeFrame: TimeFrame,
) => {
  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Failed to open print window");
    return;
  }

  // Calculate best tier (highest net savings)
  const bestTier = [
    {
      name: "Basic",
      savings: results.basic.netSavings,
      data: results.basic,
      info: pricingData.memberships.basic,
    },
    {
      name: "Premium",
      savings: results.premium.netSavings,
      data: results.premium,
      info: pricingData.memberships.premium,
    },
    {
      name: "Pro",
      savings: results.pro.netSavings,
      data: results.pro,
      info: pricingData.memberships.pro,
    },
  ].sort((a, b) => b.savings - a.savings)[0];

  // Calculate money left on table (best tier net savings)
  const moneyLeftOnTable = bestTier.savings > 0 ? bestTier.savings : 0;

  // Generate domain list HTML
  const domainListHTML = results.domains
    .filter((d) => d.supported)
    .map(
      (domain) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 16px; font-family: 'Courier New', monospace; font-size: 14px;">${domain.full}</td>
        <td style="padding: 12px 16px; text-align: center; font-weight: 600; color: #6b7280;">${domain.extension}</td>
        <td style="padding: 12px 16px; text-align: right; color: #6b7280;">${formatCurrency(domain.listPrice * timeFrame)}</td>
        <td style="padding: 12px 16px; text-align: right; color: #3b82f6;">${formatCurrency(domain.basicPrice * timeFrame)}</td>
        <td style="padding: 12px 16px; text-align: right; color: #9333ea;">${formatCurrency(domain.premiumPrice * timeFrame)}</td>
        <td style="padding: 12px 16px; text-align: right; color: #16a34a; font-weight: 600;">${formatCurrency(domain.proPrice * timeFrame)}</td>
      </tr>
    `,
    )
    .join("");

  // Create the print document
  const printDocument = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Domain Discount Club - Savings Proposal</title>
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
            background: #ffffff;
            padding: 0;
          }

          /* Print-specific styles */
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

            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              break-after: avoid;
            }
          }

          .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 48px;
          }

          /* Header */
          .header {
            text-align: center;
            margin-bottom: 48px;
            padding-bottom: 32px;
            border-bottom: 3px solid #9333ea;
          }

          .header h1 {
            font-size: 36px;
            font-weight: bold;
            background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
          }

          .header .subtitle {
            font-size: 18px;
            color: #6b7280;
            font-weight: 500;
          }

          .header .date {
            font-size: 14px;
            color: #9ca3af;
            margin-top: 8px;
          }

          /* Hero Section - Money Left on Table */
          .hero {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 3px solid #f59e0b;
            border-radius: 16px;
            padding: 32px;
            text-align: center;
            margin-bottom: 48px;
            box-shadow: 0 10px 25px rgba(245, 158, 11, 0.2);
          }

          .hero .label {
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
          }

          .hero .amount {
            font-size: 64px;
            font-weight: bold;
            color: #b45309;
            line-height: 1;
            margin-bottom: 16px;
          }

          .hero .message {
            font-size: 18px;
            color: #78350f;
            font-weight: 600;
          }

          /* Savings Breakdown */
          .savings-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            margin-bottom: 48px;
          }

          .savings-card {
            background: #ffffff;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
          }

          .savings-card.best {
            border-color: #16a34a;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            position: relative;
          }

          .savings-card.best::before {
            content: '⭐ BEST VALUE';
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: #16a34a;
            color: white;
            padding: 4px 16px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 0.5px;
          }

          .savings-card .tier-name {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 8px;
          }

          .savings-card .tier-price {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 16px;
          }

          .savings-card .net-savings {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .savings-card.best .net-savings {
            color: #16a34a;
          }

          .savings-card .savings-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Time Comparison */
          .time-comparison {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 48px;
          }

          .time-comparison h2 {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 24px;
            text-align: center;
          }

          .time-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }

          .time-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }

          .time-card .period {
            font-size: 14px;
            color: #6b7280;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .time-card .amount {
            font-size: 28px;
            font-weight: bold;
            color: #16a34a;
          }

          /* Domain List */
          .domain-section {
            margin-bottom: 48px;
          }

          .domain-section h2 {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 16px;
          }

          .domain-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
          }

          .domain-table thead {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          }

          .domain-table th {
            padding: 16px;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .domain-table th:nth-child(3),
          .domain-table th:nth-child(4),
          .domain-table th:nth-child(5),
          .domain-table th:nth-child(6) {
            text-align: right;
          }

          .domain-table th:nth-child(2) {
            text-align: center;
          }

          /* How It Works */
          .how-it-works {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 48px;
          }

          .how-it-works h2 {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 24px;
            text-align: center;
          }

          .how-it-works .section {
            margin-bottom: 24px;
          }

          .how-it-works .section:last-child {
            margin-bottom: 0;
          }

          .how-it-works h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 12px;
          }

          .how-it-works p {
            color: #1e3a8a;
            line-height: 1.8;
          }

          .how-it-works ul {
            list-style: none;
            padding-left: 0;
          }

          .how-it-works li {
            padding-left: 24px;
            position: relative;
            margin-bottom: 8px;
            color: #1e3a8a;
          }

          .how-it-works li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #16a34a;
            font-weight: bold;
            font-size: 18px;
          }

          /* Footer */
          .footer {
            text-align: center;
            padding-top: 32px;
            border-top: 2px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }

          .footer .cta {
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            color: white;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 16px;
            text-decoration: none;
          }

          /* Summary Stats */
          .summary-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }

          .stat-box {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }

          .stat-box .label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }

          .stat-box .value {
            font-size: 32px;
            font-weight: bold;
            color: #111827;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>Domain Discount Club</h1>
            <div class="subtitle">Savings Proposal & Analysis</div>
            <div class="date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>

          <!-- Hero - Money Left on Table -->
          ${
            moneyLeftOnTable > 0
              ? `
          <div class="hero no-break">
            <div class="label">💰 Money Left on the Table</div>
            <div class="amount">${formatCurrency(moneyLeftOnTable)}</div>
            <div class="message">This is how much you're losing by NOT joining the ${bestTier.name} tier!</div>
          </div>
          `
              : ""
          }

          <!-- Summary Stats -->
          <div class="summary-stats no-break">
            <div class="stat-box">
              <div class="label">Total Domains</div>
              <div class="value">${results.totalDomains}</div>
            </div>
            <div class="stat-box">
              <div class="label">Supported</div>
              <div class="value" style="color: #16a34a;">${results.supportedDomains}</div>
            </div>
            <div class="stat-box">
              <div class="label">Analysis Period</div>
              <div class="value">${timeFrame} Year${timeFrame > 1 ? "s" : ""}</div>
            </div>
          </div>

          <!-- Savings Breakdown -->
          <div class="savings-grid no-break">
            <div class="savings-card ${bestTier.name === "Basic" ? "best" : ""}">
              <div class="tier-name">Basic</div>
              <div class="tier-price">${formatCurrency(pricingData.memberships.basic.price)}/year</div>
              <div class="net-savings" style="color: ${results.basic.netSavings > 0 ? "#16a34a" : "#ef4444"};">
                ${formatCurrency(results.basic.netSavings)}
              </div>
              <div class="savings-label">Net Savings</div>
            </div>
            <div class="savings-card ${bestTier.name === "Premium" ? "best" : ""}">
              <div class="tier-name">Premium</div>
              <div class="tier-price">${formatCurrency(pricingData.memberships.premium.price)}/year</div>
              <div class="net-savings" style="color: ${results.premium.netSavings > 0 ? "#16a34a" : "#ef4444"};">
                ${formatCurrency(results.premium.netSavings)}
              </div>
              <div class="savings-label">Net Savings</div>
            </div>
            <div class="savings-card ${bestTier.name === "Pro" ? "best" : ""}">
              <div class="tier-name">Pro</div>
              <div class="tier-price">${formatCurrency(pricingData.memberships.pro.price)}/year</div>
              <div class="net-savings" style="color: ${results.pro.netSavings > 0 ? "#16a34a" : "#ef4444"};">
                ${formatCurrency(results.pro.netSavings)}
              </div>
              <div class="savings-label">Net Savings</div>
            </div>
          </div>

          <!-- Time Comparison -->
          ${
            bestTier.savings > 0
              ? `
          <div class="time-comparison no-break">
            <h2>Your Savings Over Time (${bestTier.name} Tier)</h2>
            <div class="time-grid">
              <div class="time-card">
                <div class="period">1 Year</div>
                <div class="amount">${formatCurrency(bestTier.data.netSavings / timeFrame)}</div>
              </div>
              <div class="time-card">
                <div class="period">5 Years</div>
                <div class="amount">${formatCurrency((bestTier.data.netSavings / timeFrame) * 5)}</div>
              </div>
              <div class="time-card">
                <div class="period">10 Years</div>
                <div class="amount">${formatCurrency((bestTier.data.netSavings / timeFrame) * 10)}</div>
              </div>
            </div>
          </div>
          `
              : ""
          }

          <!-- Page Break -->
          <div class="page-break"></div>

          <!-- Domain List -->
          <div class="domain-section">
            <h2>Your Domain Portfolio (${results.supportedDomains} domains)</h2>
            <table class="domain-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Extension</th>
                  <th>List Price</th>
                  <th>Basic Price</th>
                  <th>Premium Price</th>
                  <th>Pro Price</th>
                </tr>
              </thead>
              <tbody>
                ${domainListHTML}
              </tbody>
            </table>
          </div>

          <!-- How It Works -->
          <div class="how-it-works no-break">
            <h2>How the Domain Discount Club Works</h2>
            
            <div class="section">
              <h3>🎯 For Domain Renewals</h3>
              <p>
                The Domain Discount Club provides <strong>automatic discounts on domain renewals</strong>. 
                Once you join, all your domains renew at the discounted member rate—no coupon codes needed!
              </p>
              <ul>
                <li>Automatic renewal discounts on 500+ extensions</li>
                <li>Savings apply year after year</li>
                <li>No manual work—set it and forget it</li>
                <li>Deeper discounts with Premium and Pro tiers</li>
              </ul>
            </div>

            <div class="section">
              <h3>🆕 For New Domain Registrations</h3>
              <p>
                <strong>Important:</strong> The Domain Discount Club pricing applies to <strong>renewals only</strong>. 
                New domain registrations are typically offered at promotional prices (often lower than member rates).
              </p>
              <ul>
                <li>First-year registrations use standard promotional pricing</li>
                <li>Member discounts kick in starting with your first renewal</li>
                <li>Long-term savings accumulate over the life of your domains</li>
              </ul>
            </div>

            <div class="section">
              <h3>💡 Why Join?</h3>
              <p>
                If you manage multiple domains long-term, the Domain Discount Club pays for itself through 
                renewal savings. The more domains you have, the more you save!
              </p>
            </div>
          </div>

          <!-- Footer CTA -->
          <div class="footer no-break">
            <div class="cta">Ready to Start Saving? Join the Domain Discount Club Today!</div>
            <p>Questions? Contact your account representative for personalized assistance.</p>
            <p style="margin-top: 16px; font-size: 12px;">This proposal is based on current pricing and your domain portfolio as of ${new Date().toLocaleDateString()}. Actual savings may vary based on promotions and pricing changes.</p>
          </div>
        </div>

        <script>
          // Auto-print when page loads
          window.onload = function() {
            window.print();
          };
          
          // Close window after print
          window.onafterprint = function() {
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  // Write the document and trigger print
  printWindow.document.write(printDocument);
  printWindow.document.close();
};
