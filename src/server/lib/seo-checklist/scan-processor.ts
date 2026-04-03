/**
 * Scan Processor Module
 * Orchestrates scan execution and updates database
 */

import { db } from "../../db/client.js";
import { seoChecklistScans, seoChecklistPages } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { normalizeTarget } from "./normalize-target.js";
import { runAccessChecks } from "./access-checks.js";
import { miniCrawl } from "./mini-crawl.js";
import { computeDecision } from "./decision-engine.js";
import { computeScores } from "./scoring-engine.js";
import { generateChecklist } from "./checklist-generator.js";
import type { ScanData, LighthouseData, SslSignal } from "./types.js";
import {
  fetchPeerCertificate,
  getCertificateValidity,
} from "../tls-certificate.js";

/**
 * Process a scan
 */
export async function processScan(scanId: string): Promise<void> {
  try {
    // Get scan from database
    const scans = await db
      .select()
      .from(seoChecklistScans)
      .where(eq(seoChecklistScans.scanId, scanId))
      .limit(1);

    if (scans.length === 0) {
      throw new Error(`Scan ${scanId} not found`);
    }

    const scan = scans[0];

    // Update status to running
    await db
      .update(seoChecklistScans)
      .set({ status: "running" })
      .where(eq(seoChecklistScans.scanId, scanId));

    // Step 1: Normalize target
    console.log(`[${scanId}] Normalizing target...`);
    const normalized = await normalizeTarget(scan.inputUrl);

    await db
      .update(seoChecklistScans)
      .set({
        finalUrl: normalized.finalUrl,
        redirectChain: normalized.redirectChain,
      })
      .where(eq(seoChecklistScans.scanId, scanId));

    // Step 2: Run access checks
    console.log(`[${scanId}] Running access checks...`);
    const access = await runAccessChecks(normalized.finalUrl);

    // Step 3: Run mini crawl
    console.log(`[${scanId}] Running mini crawl...`);
    const crawl = await miniCrawl(normalized.finalUrl);

    // Save sampled pages
    for (const page of crawl.pages) {
      await db.insert(seoChecklistPages).values({
        scanId,
        url: page.url,
        statusCode: page.statusCode,
        fetchTimeMs: page.fetchTimeMs,
        pageTitle: page.pageTitle,
        metaDescription: page.metaDescription,
        h1Present: page.h1Present,
        h1Text: page.h1Text,
        structuredData: page.structuredData,
        socialTags: page.socialTags,
      });
    }

    // Step 4: Get existing Lighthouse data (reuse from performance scan)
    console.log(`[${scanId}] Getting Lighthouse data...`);
    const lighthouse = await getExistingLighthouseData(scan.domain);

    // Step 5: Gather SSL signal
    console.log(`[${scanId}] Gathering SSL signal...`);
    const ssl = await getSslSignal(normalized.finalUrl);

    // Step 6: Compute decision
    console.log(`[${scanId}] Computing decision...`);
    const scanData: ScanData = { normalized, access, crawl, lighthouse, ssl };
    const { decision, summary } = computeDecision(scanData);

    // Step 7: Compute scores
    console.log(`[${scanId}] Computing scores...`);
    const scores = computeScores(scanData, decision);

    // Step 8: Generate checklist
    console.log(`[${scanId}] Generating checklist...`);
    const checklist = generateChecklist(scanData);

    // Step 9: Save results
    console.log(`[${scanId}] Saving results...`);
    await db
      .update(seoChecklistScans)
      .set({
        status: "completed",
        decision,
        totalScore: scores.total,
        categoryScores: scores.categories,
        summary,
        checklist,
        evidence: {
          sampledPages: crawl.pages,
          lighthouse,
          ssl,
          unsupportedSignals: [
            "backlinks",
            "domain_authority_trust_flow",
            "indexed_by_google",
          ],
        },
        completedAt: new Date(),
      })
      .where(eq(seoChecklistScans.scanId, scanId));

    console.log(`[${scanId}] Scan completed successfully`);
  } catch (error) {
    console.error(`[${scanId}] Scan failed:`, error);

    // Update status to failed
    await db
      .update(seoChecklistScans)
      .set({
        status: "failed",
        errors: [String(error)],
        completedAt: new Date(),
      })
      .where(eq(seoChecklistScans.scanId, scanId));
  }
}

async function getSslSignal(targetUrl: string): Promise<SslSignal> {
  try {
    const parsedUrl = new URL(targetUrl);
    const { cert } = await fetchPeerCertificate(parsedUrl.hostname);
    const { validFrom, validTo } = getCertificateValidity(cert);
    const now = Date.now();
    const daysUntilExpiry =
      validTo !== null
        ? Math.ceil((validTo.getTime() - now) / (1000 * 60 * 60 * 24))
        : null;

    const validNow =
      validFrom !== null &&
      validTo !== null &&
      validFrom.getTime() <= now &&
      validTo.getTime() >= now;

    return {
      certificatePresent: true,
      validNow,
      validFrom: validFrom ? validFrom.toISOString() : null,
      validTo: validTo ? validTo.toISOString() : null,
      daysUntilExpiry,
      error: null,
    };
  } catch (error) {
    return {
      certificatePresent: false,
      validNow: null,
      validFrom: null,
      validTo: null,
      daysUntilExpiry: null,
      error: String(error),
    };
  }
}

/**
 * Get existing Lighthouse data from performance history
 */
async function getExistingLighthouseData(
  domain: string,
): Promise<LighthouseData> {
  try {
    // Try to get recent performance scan data
    // This reuses the existing /api/scan/performance endpoint data
    const response = await fetch(
      `http://localhost:3000/api/scan/performance/history?domain=${domain}&limit=1`,
    );

    if (!response.ok) {
      return {
        mobileScore: null,
        desktopScore: null,
        performanceScore: null,
        accessibilityScore: null,
        bestPracticesScore: null,
        seoScore: null,
        failingAudits: [],
      };
    }

    const data = await response.json();

    if (data.history && data.history.length > 0) {
      const latest = data.history[0];
      return {
        mobileScore: latest.mobile_score || null,
        desktopScore: latest.desktop_score || null,
        performanceScore: latest.mobile_score || null,
        accessibilityScore: null,
        bestPracticesScore: null,
        seoScore: null,
        failingAudits: [],
      };
    }

    return {
      mobileScore: null,
      desktopScore: null,
      performanceScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      seoScore: null,
      failingAudits: [],
    };
  } catch (error) {
    console.error("Error getting Lighthouse data:", error);
    return {
      mobileScore: null,
      desktopScore: null,
      performanceScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      seoScore: null,
      failingAudits: [],
    };
  }
}
