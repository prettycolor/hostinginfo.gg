/**
 * Export security report to PDF using browser's print functionality
 * This provides a clean, professional PDF without additional dependencies
 */

export const exportSecurityReportToPDF = (domain: string) => {
  // Get the security report element
  const reportElement = document.getElementById('security-report');
  if (!reportElement) {
    console.error('Security report element not found');
    return;
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Clone the report content
  const reportClone = reportElement.cloneNode(true) as HTMLElement;

  // Create the print document
  const printDocument = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Report - ${domain}</title>
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

          /* Print-specific styles */
          @media print {
            body {
              padding: 0;
            }

            .no-print {
              display: none !important;
            }

            /* Ensure colors print - CRITICAL for dark mode */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            body {
              background: #f9fafb !important;
              color: #1f2937 !important;
            }

            /* Page breaks */
            .page-break {
              page-break-before: always;
              break-before: always;
            }

            /* Avoid breaking inside elements - CRITICAL */
            .no-break,
            .space-y-6 > *,
            .space-y-4 > *,
            .bg-red-50,
            .bg-green-50,
            .bg-orange-50,
            .bg-blue-50,
            .bg-purple-50,
            .border-2,
            .rounded-lg,
            [class*="gradient"],
            section,
            article {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            /* Keep headings with content */
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              break-after: avoid;
            }

            /* Ensure links are clickable and visible */
            a {
              color: #2563eb !important;
              text-decoration: underline !important;
              font-weight: 600 !important;
            }

            a:hover {
              color: #1d4ed8 !important;
            }
          }

          /* Layout */
          .report-container {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            padding: 32px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          /* Typography */
          h1 {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #111827;
          }

          h2 {
            font-size: 24px;
            font-weight: bold;
            margin-top: 32px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #111827;
          }

          h3 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #1f2937;
          }

          h4 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #1f2937;
          }

          p {
            margin-bottom: 12px;
          }

          /* Spacing */
          .space-y-4 > * + * {
            margin-top: 16px;
          }

          .space-y-3 > * + * {
            margin-top: 12px;
          }

          .space-y-2 > * + * {
            margin-top: 8px;
          }

          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .mt-4 { margin-top: 16px; }
          .mt-6 { margin-top: 24px; }
          .pb-6 { padding-bottom: 24px; }
          .pt-6 { padding-top: 24px; }
          .p-4 { padding: 16px; }
          .p-6 { padding: 24px; }
          .pl-12 { padding-left: 48px; }

          /* Borders */
          .border { border: 1px solid #e5e7eb; }
          .border-2 { border: 2px solid; }
          .border-t-2 { border-top: 2px solid #e5e7eb; }
          .border-b-2 { border-bottom: 2px solid #e5e7eb; }
          .rounded-lg { border-radius: 8px; }

          /* Colors - Professional Light Mode */
          .text-primary { color: #2563eb; }
          .text-muted-foreground { color: #6b7280; }
          .text-foreground { color: #1f2937; }
          .text-red-500 { color: #ef4444; }
          .text-red-600 { color: #dc2626; }
          .text-red-700 { color: #b91c1c; }
          .text-green-500 { color: #22c55e; }
          .text-green-600 { color: #16a34a; }
          .text-green-700 { color: #15803d; }
          .text-orange-500 { color: #f97316; }

          /* Professional light backgrounds with subtle gradients */
          .bg-red-50 { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); }
          .bg-green-50 { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
          .bg-orange-50 { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); }
          .bg-blue-50 { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
          .bg-purple-50 { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); }
          .bg-white { background-color: #ffffff; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-gray-900 { background-color: #111827; }

          .border-red-300 { border-color: #fca5a5; }
          .border-red-500 { border-color: #ef4444; }
          .border-green-300 { border-color: #86efac; }
          .border-green-500 { border-color: #22c55e; }
          .border-orange-500 { border-color: #f97316; }
          .border-blue-300 { border-color: #93c5fd; }
          .border-blue-500 { border-color: #3b82f6; }
          .border-purple-500 { border-color: #a855f7; }

          .text-blue-500 { color: #3b82f6; }
          .text-blue-600 { color: #2563eb; }
          .text-blue-400 { color: #60a5fa; }
          .text-purple-500 { color: #a855f7; }
          .text-purple-600 { color: #9333ea; }
          .text-orange-600 { color: #ea580c; }
          .text-orange-400 { color: #fb923c; }
          .text-red-400 { color: #f87171; }
          .text-green-400 { color: #4ade80; }

          /* Flexbox */
          .flex { display: flex; }
          .items-start { align-items: flex-start; }
          .items-center { align-items: center; }
          .justify-center { justify-content: center; }
          .justify-between { justify-content: space-between; }
          .gap-2 { gap: 8px; }
          .gap-3 { gap: 12px; }
          .gap-4 { gap: 16px; }
          .gap-6 { gap: 24px; }
          .flex-1 { flex: 1; }
          .shrink-0 { flex-shrink: 0; }

          /* Grid */
          .grid { display: grid; }
          .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

          /* Text */
          .text-center { text-align: center; }
          .text-sm { font-size: 14px; }
          .text-base { font-size: 16px; }
          .text-lg { font-size: 18px; }
          .text-xl { font-size: 20px; }
          .text-2xl { font-size: 24px; }
          .text-3xl { font-size: 30px; }
          .text-4xl { font-size: 36px; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          .italic { font-style: italic; }

          /* Lists */
          ul {
            list-style: none;
          }

          li {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 8px;
          }

          /* Icons (using Unicode symbols) */
          .icon {
            display: inline-block;
            width: 20px;
            height: 20px;
            text-align: center;
            flex-shrink: 0;
          }

          .icon-shield::before { content: '🛡️'; }
          .icon-alert::before { content: '⚠️'; }
          .icon-check::before { content: '✅'; }
          .icon-x::before { content: '❌'; }
          .icon-lock::before { content: '🔒'; }
          .icon-unlock::before { content: '🔓'; }
          .icon-bot::before { content: '🤖'; }
          .icon-dollar::before { content: '💰'; }
          .icon-users::before { content: '👥'; }
          .icon-clock::before { content: '⏰'; }
          .icon-globe::before { content: '🌐'; }

          /* SVG Circle Progress */
          .progress-circle {
            width: 128px;
            height: 128px;
          }

          .progress-circle circle {
            fill: none;
            stroke-width: 8;
          }

          .progress-bg {
            stroke: #e5e7eb;
          }

          .progress-bar {
            stroke-linecap: round;
          }

          .progress-bar.green { stroke: #22c55e; }
          .progress-bar.orange { stroke: #f97316; }
          .progress-bar.red { stroke: #ef4444; }

          /* Numbered steps */
          .step-number {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #22c55e;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
          }

          /* Buttons and Interactive Elements */
          button, .button, a.inline-flex {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #3b82f6;
          }

          .bg-green-500 {
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
            border: 1px solid #22c55e !important;
          }

          .bg-red-500 {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
            border: 1px solid #ef4444 !important;
          }

          /* Badge styling */
          .rounded-full {
            border-radius: 9999px;
            padding: 8px 16px;
            font-weight: 700;
            display: inline-block;
          }

          /* Gradient backgrounds */
          .bg-gradient-to-br,
          .bg-gradient-to-r {
            position: relative;
            overflow: hidden;
          }

          /* Shadow effects for depth */
          .shadow-lg {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          }

          /* Utilities */
          .relative { position: relative; }
          .absolute { position: absolute; }
          .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
          .overflow-hidden { overflow: hidden; }

          /* Responsive */
          @media (min-width: 768px) {
            .grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          ${reportClone.innerHTML}
        </div>
        <script>
          // Auto-print when page loads
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

  // Write the document and trigger print
  printWindow.document.write(printDocument);
  printWindow.document.close();
};
