/**
 * Client-Side Comparison PDF Export
 * Generates professional PDF reports for domain comparisons
 */

import { jsPDF } from "jspdf";

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

export async function exportComparisonPDF(
  domains: ComparisonDomain[],
): Promise<void> {
  if (!domains || domains.length < 2) {
    throw new Error("At least 2 domains required for comparison");
  }

  // Create PDF (landscape for 3+ domains)
  const orientation = domains.length > 2 ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // #3b82f6
  const textColor: [number, number, number] = [31, 41, 55]; // #1f2937
  const mutedColor: [number, number, number] = [107, 114, 128]; // #6b7280
  const borderColor: [number, number, number] = [229, 231, 235]; // #e5e7eb

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(...primaryColor);
  pdf.setFont("helvetica", "bold");
  pdf.text("Domain Comparison Report", margin, yPos);
  yPos += 10;

  // Metadata
  pdf.setFontSize(9);
  pdf.setTextColor(...mutedColor);
  pdf.setFont("helvetica", "normal");
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(
    `Domains Compared: ${domains.length} | Generated: ${date} | Report Type: Side-by-Side Comparison`,
    margin,
    yPos,
  );
  yPos += 5;

  // Blue line separator
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Summary Table
  pdf.setFontSize(14);
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.text("Quick Summary", margin, yPos);
  yPos += 8;

  // Table headers
  pdf.setFontSize(9);
  pdf.setFillColor(249, 250, 251); // #f9fafb
  pdf.rect(margin, yPos - 5, contentWidth, 8, "F");
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");

  const colWidth = contentWidth / 5;
  pdf.text("Domain", margin + 2, yPos);
  pdf.text("Technology", margin + colWidth + 2, yPos);
  pdf.text("Security", margin + colWidth * 2 + 2, yPos);
  pdf.text("Performance", margin + colWidth * 3 + 2, yPos);
  pdf.text("Location", margin + colWidth * 4 + 2, yPos);
  yPos += 8;

  // Table rows
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  domains.forEach((domain) => {
    // Border
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.1);
    pdf.rect(margin, yPos - 5, contentWidth, 12);

    // Domain name
    pdf.setFont("helvetica", "bold");
    pdf.text(truncateText(domain.domain, 25), margin + 2, yPos);

    // Technology
    pdf.setFont("helvetica", "normal");
    let techText = "";
    if (domain.technology?.wordpress?.detected) {
      techText += `WordPress ${domain.technology.wordpress.version || ""}`;
    }
    if (domain.technology?.php?.detected) {
      techText +=
        (techText ? ", " : "") + `PHP ${domain.technology.php.version || ""}`;
    }
    if (domain.technology?.server?.isWebsiteBuilder) {
      techText = domain.technology.server.builderType || "Website Builder";
    }
    pdf.text(truncateText(techText || "N/A", 25), margin + colWidth + 2, yPos);

    // Security score
    if (domain.security?.score !== undefined) {
      const score = domain.security.score;
      const scoreColor = getScoreColor(score);
      pdf.setTextColor(...scoreColor);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${score}/100`, margin + colWidth * 2 + 2, yPos);
      pdf.setTextColor(...textColor);
      pdf.setFont("helvetica", "normal");
    } else {
      pdf.text("N/A", margin + colWidth * 2 + 2, yPos);
    }

    // Performance
    let perfText = "";
    if (domain.performance?.mobile?.score !== undefined) {
      perfText += `M: ${domain.performance.mobile.score}`;
    }
    if (domain.performance?.desktop?.score !== undefined) {
      perfText +=
        (perfText ? ", " : "") + `D: ${domain.performance.desktop.score}`;
    }
    pdf.text(perfText || "N/A", margin + colWidth * 3 + 2, yPos);

    // Location
    const location =
      `${domain.geolocation?.city || ""} ${domain.geolocation?.country || "N/A"}`.trim();
    pdf.text(truncateText(location, 20), margin + colWidth * 4 + 2, yPos);

    yPos += 12;
  });

  yPos += 10;

  // Detailed Comparison
  if (yPos > pageHeight - 60) {
    pdf.addPage();
    yPos = margin;
  }

  pdf.setFontSize(14);
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.text("Detailed Comparison", margin, yPos);
  yPos += 10;

  // Domain columns
  const columnWidth = contentWidth / domains.length;

  domains.forEach((domain, index) => {
    const xPos = margin + columnWidth * index;
    let colYPos = yPos;

    // Domain header
    pdf.setFillColor(...primaryColor);
    pdf.rect(xPos, colYPos - 6, columnWidth - 2, 10, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(truncateText(domain.domain, 20), xPos + 2, colYPos);
    colYPos += 10;

    // Technology section
    pdf.setFillColor(249, 250, 251);
    pdf.rect(xPos, colYPos, columnWidth - 2, 6, "F");
    pdf.setTextColor(...mutedColor);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("TECHNOLOGY", xPos + 2, colYPos + 4);
    colYPos += 8;

    pdf.setTextColor(...textColor);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");

    if (domain.technology?.wordpress?.detected) {
      pdf.text(
        `WordPress v${domain.technology.wordpress.version || "?"}`,
        xPos + 2,
        colYPos,
      );
      colYPos += 4;
    }
    if (domain.technology?.php?.detected) {
      pdf.text(
        `PHP v${domain.technology.php.version || "?"}`,
        xPos + 2,
        colYPos,
      );
      colYPos += 4;
    }
    if (domain.technology?.server?.type) {
      pdf.text(
        truncateText(domain.technology.server.type, 20),
        xPos + 2,
        colYPos,
      );
      colYPos += 4;
    }
    if (
      !domain.technology?.wordpress?.detected &&
      !domain.technology?.php?.detected &&
      !domain.technology?.server?.type
    ) {
      pdf.setTextColor(...mutedColor);
      pdf.text("No data", xPos + 2, colYPos);
      pdf.setTextColor(...textColor);
      colYPos += 4;
    }
    colYPos += 4;

    // Security section
    pdf.setFillColor(249, 250, 251);
    pdf.rect(xPos, colYPos, columnWidth - 2, 6, "F");
    pdf.setTextColor(...mutedColor);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("SECURITY", xPos + 2, colYPos + 4);
    colYPos += 8;

    if (domain.security?.score !== undefined) {
      const score = domain.security.score;
      const scoreColor = getScoreColor(score);
      pdf.setTextColor(...scoreColor);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${score}/100`, xPos + 2, colYPos);

      // Best badge
      const isBest = isBestScore(domains, "security", index);
      if (isBest) {
        pdf.setFillColor(16, 185, 129); // green
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(6);
        pdf.rect(xPos + 20, colYPos - 3, 10, 4, "F");
        pdf.text("BEST", xPos + 21, colYPos);
      }

      pdf.setTextColor(...textColor);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      colYPos += 4;
    } else {
      pdf.setTextColor(...mutedColor);
      pdf.text("No data", xPos + 2, colYPos);
      pdf.setTextColor(...textColor);
      colYPos += 4;
    }
    colYPos += 4;

    // Performance section
    pdf.setFillColor(249, 250, 251);
    pdf.rect(xPos, colYPos, columnWidth - 2, 6, "F");
    pdf.setTextColor(...mutedColor);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("PERFORMANCE", xPos + 2, colYPos + 4);
    colYPos += 8;

    pdf.setTextColor(...textColor);
    pdf.setFont("helvetica", "normal");

    if (domain.performance?.mobile?.score !== undefined) {
      const score = domain.performance.mobile.score;
      const scoreColor = getScoreColor(score);
      pdf.setTextColor(...scoreColor);
      pdf.text(`Mobile: ${score}/100`, xPos + 2, colYPos);
      pdf.setTextColor(...textColor);
      colYPos += 4;
    }
    if (domain.performance?.desktop?.score !== undefined) {
      const score = domain.performance.desktop.score;
      const scoreColor = getScoreColor(score);
      pdf.setTextColor(...scoreColor);
      pdf.text(`Desktop: ${score}/100`, xPos + 2, colYPos);
      pdf.setTextColor(...textColor);
      colYPos += 4;
    }
    if (
      !domain.performance?.mobile?.score &&
      !domain.performance?.desktop?.score
    ) {
      pdf.setTextColor(...mutedColor);
      pdf.text("No data", xPos + 2, colYPos);
      pdf.setTextColor(...textColor);
      colYPos += 4;
    }
    colYPos += 4;

    // Location section
    pdf.setFillColor(249, 250, 251);
    pdf.rect(xPos, colYPos, columnWidth - 2, 6, "F");
    pdf.setTextColor(...mutedColor);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("LOCATION", xPos + 2, colYPos + 4);
    colYPos += 8;

    pdf.setTextColor(...textColor);
    pdf.setFont("helvetica", "normal");

    if (domain.geolocation?.country) {
      pdf.text(truncateText(domain.geolocation.country, 18), xPos + 2, colYPos);
      colYPos += 4;
    }
    if (domain.geolocation?.city) {
      pdf.text(truncateText(domain.geolocation.city, 18), xPos + 2, colYPos);
      colYPos += 4;
    }
    if (!domain.geolocation?.country && !domain.geolocation?.city) {
      pdf.setTextColor(...mutedColor);
      pdf.text("No data", xPos + 2, colYPos);
      pdf.setTextColor(...textColor);
      colYPos += 4;
    }
  });

  // Footer
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(...mutedColor);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    "HostingInfo - Domain Analysis & Comparison Platform",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );
  pdf.text(
    `Generated on ${date} | This report is confidential and intended for the recipient only.`,
    pageWidth / 2,
    footerY + 4,
    { align: "center" },
  );

  // Save PDF
  const filename = `domain-comparison-${Date.now()}.pdf`;
  pdf.save(filename);
}

function getScoreColor(score: number): [number, number, number] {
  if (score >= 90) return [6, 95, 70]; // green
  if (score >= 70) return [30, 64, 175]; // blue
  if (score >= 50) return [146, 64, 14]; // yellow
  return [153, 27, 27]; // red
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

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
