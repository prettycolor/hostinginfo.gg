/**
 * Full Scan Completion Endpoint
 *
 * Awards XP for completing a full scan (all scanners).
 * Called once from the frontend after all individual scans complete.
 * This prevents duplicate XP awards for the same scan.
 */

import type { Request, Response } from "express";
import { awardScanXp } from "../../../lib/award-scan-xp.js";
import { XP_REWARDS } from "../../../../lib/leveling-system.js";
import { getAuthenticatedUserId } from "../../../lib/request-auth.js";
import { db } from "../../../db/client.js";
import { xpScanRewardClaims } from "../../../db/schema.js";
import { normalizeDomainForRewards } from "../../../lib/normalize-domain.js";

interface ScanCompleteRequest {
  domain: string;
  scansCompleted: string[]; // Array of scan types completed
}

type ScanRewardDefinition = {
  source: string;
  xp: number;
  statKey?: string;
};

const SCAN_REWARD_DEFINITIONS: Record<string, ScanRewardDefinition> = {
  security: {
    source: "security_scan",
    xp: XP_REWARDS.SECURITY_SCAN,
    statKey: "securityScans",
  },
  performance: {
    source: "performance_scan",
    xp: XP_REWARDS.PERFORMANCE_SCAN,
    statKey: "performanceScans",
  },
  dns: { source: "dns_scan", xp: XP_REWARDS.DNS_SCAN, statKey: "dnsScans" },
  ssl: { source: "ssl_scan", xp: XP_REWARDS.SSL_SCAN, statKey: "sslScans" },
  email: {
    source: "email_scan",
    xp: XP_REWARDS.EMAIL_SCAN,
    statKey: "emailScans",
  },
  malware: {
    source: "malware_scan",
    xp: XP_REWARDS.MALWARE_SCAN,
    statKey: "malwareScans",
  },
  whois: {
    source: "whois_scan",
    xp: XP_REWARDS.WHOIS_SCAN,
    statKey: "whoisScans",
  },
  technology: { source: "technology_scan", xp: XP_REWARDS.TECHNOLOGY_SCAN },
  geolocation: { source: "geolocation_scan", xp: XP_REWARDS.GEOLOCATION_SCAN },
  provider: { source: "provider_scan", xp: XP_REWARDS.PROVIDER_SCAN },
};

function isDuplicateKeyError(error: unknown): boolean {
  const queue: unknown[] = [error];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const maybeError = current as {
      code?: string;
      errno?: number;
      sqlState?: string;
      message?: string;
      cause?: unknown;
    };

    if (
      maybeError.code === "ER_DUP_ENTRY" ||
      maybeError.errno === 1062 ||
      maybeError.sqlState === "23000" ||
      /duplicate entry|unique constraint|duplicate key/i.test(
        String(maybeError.message ?? ""),
      )
    ) {
      return true;
    }

    if (maybeError.cause) {
      queue.push(maybeError.cause);
    }
  }

  return false;
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain, scansCompleted } = req.body as ScanCompleteRequest;

    if (!domain || !scansCompleted || !Array.isArray(scansCompleted)) {
      return res.status(400).json({
        error: "Missing required fields: domain, scansCompleted",
      });
    }

    const userId = getAuthenticatedUserId(req);
    const rewardDomain = normalizeDomainForRewards(domain);

    // Only award XP if user is authenticated
    if (!userId) {
      return res.json({
        success: true,
        xpAwarded: 0,
        message: "Scan completed (no XP - not authenticated)",
        rewardedScanTypes: [],
        duplicateScanTypes: [],
        rewardDomain,
      });
    }

    const uniqueScanTypes = [
      ...new Set(
        scansCompleted.map((scan) => String(scan).toLowerCase().trim()),
      ),
    ].filter((scanType) => scanType.length > 0);
    const recognizedScanTypes = uniqueScanTypes.filter((scanType) =>
      Boolean(SCAN_REWARD_DEFINITIONS[scanType]),
    );

    // Keep counters behavior unchanged: stats always increment from completed scan types.
    const statUpdates: Record<string, number> = {
      totalScans: 1, // One full scan
    };

    for (const scanType of recognizedScanTypes) {
      const rewardDefinition = SCAN_REWARD_DEFINITIONS[scanType];
      if (rewardDefinition.statKey) {
        statUpdates[rewardDefinition.statKey] = 1;
      }
    }

    const xpOutcome = await db.transaction(async (tx) => {
      let totalXp = 0;
      const rewardedScanTypes: string[] = [];
      const duplicateScanTypes: string[] = [];

      for (const scanType of recognizedScanTypes) {
        const rewardDefinition = SCAN_REWARD_DEFINITIONS[scanType];

        try {
          await tx.insert(xpScanRewardClaims).values({
            userId,
            rewardSource: rewardDefinition.source,
            domainNormalized: rewardDomain,
          });
          rewardedScanTypes.push(scanType);
          totalXp += rewardDefinition.xp;
        } catch (error) {
          if (isDuplicateKeyError(error)) {
            duplicateScanTypes.push(scanType);
            continue;
          }
          throw error;
        }
      }

      const awardResult = await awardScanXp({
        userId,
        xpAmount: totalXp,
        source: "full_scan",
        description: `Full scan completed: ${rewardDomain || domain}`,
        domain: rewardDomain || domain,
        statUpdates,
        dbClient: tx as NonNullable<
          Parameters<typeof awardScanXp>[0]["dbClient"]
        >,
        throwOnError: true,
      });

      return {
        totalXp,
        rewardedScanTypes,
        duplicateScanTypes,
        awardResult,
      };
    });

    console.log("[Full Scan] XP outcome", {
      userId,
      rewardDomain,
      rewardedScanTypes: xpOutcome.rewardedScanTypes,
      duplicateScanTypes: xpOutcome.duplicateScanTypes,
      xpAwarded: xpOutcome.totalXp,
    });

    return res.json({
      success: true,
      xpAwarded: xpOutcome.totalXp,
      totalXp: xpOutcome.awardResult.newTotalXp,
      leveledUp: xpOutcome.awardResult.leveledUp,
      newLevel: xpOutcome.awardResult.newLevel,
      newAchievements: xpOutcome.awardResult.newAchievements,
      rewardedScanTypes: xpOutcome.rewardedScanTypes,
      duplicateScanTypes: xpOutcome.duplicateScanTypes,
      rewardDomain,
      message: `Scan completed! +${xpOutcome.totalXp} XP`,
    });
  } catch (error) {
    console.error("[Full Scan] Error:", error);
    return res.status(500).json({
      error: "Failed to process scan completion",
      message: "An internal error occurred",
    });
  }
}
