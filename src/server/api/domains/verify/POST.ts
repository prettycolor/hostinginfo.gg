import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { claimedDomains } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import dns from "dns/promises";
import https from "https";
import { validateBody } from "../../../middleware/index.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";
import { assertPublicDomain } from "../../../lib/ssrf-protection.js";
import { z } from "zod";

// Custom schema for verify endpoint
const verifySchema = z.object({
  claimId: z.number().int().positive(),
});

/**
 * POST /api/domains/verify
 * Verify domain ownership using the chosen method
 */
async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const { claimId } = req.body;
    // Validation handled by middleware

    // Fetch claim
    const claims = await db
      .select()
      .from(claimedDomains)
      .where(
        and(eq(claimedDomains.id, claimId), eq(claimedDomains.userId, userId)),
      )
      .limit(1);

    if (claims.length === 0) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const claim = claims[0];

    if (claim.isVerified) {
      return res.json({
        verified: true,
        verifiedAt: claim.verifiedAt,
        method: claim.verificationMethod,
        message: "Domain already verified",
      });
    }

    if (!claim.verificationToken || !claim.verificationMethod) {
      return res.status(400).json({
        error: "Invalid claim",
        message: "Missing verification token or method",
      });
    }

    // Verify based on method
    let verified = false;
    let errorMessage = "";

    // SSRF protection for methods that make HTTP requests to the domain
    if (
      claim.verificationMethod === "file" ||
      claim.verificationMethod === "meta"
    ) {
      try {
        await assertPublicDomain(claim.domain);
      } catch {
        return res.status(400).json({
          verified: false,
          message: "Domain resolves to a private/internal IP address",
        });
      }
    }

    switch (claim.verificationMethod) {
      case "dns":
        verified = await verifyDNS(claim.domain, claim.verificationToken);
        errorMessage = verified
          ? ""
          : "DNS TXT record not found. Please wait up to 48 hours for DNS propagation.";
        break;

      case "file":
        verified = await verifyFile(claim.domain, claim.verificationToken);
        errorMessage = verified
          ? ""
          : "Verification file not found at https://" +
            claim.domain +
            "/hostinginfo-verification.html";
        break;

      case "meta":
        verified = await verifyMeta(claim.domain, claim.verificationToken);
        errorMessage = verified
          ? ""
          : "Meta tag not found in homepage <head> section.";
        break;

      case "email":
        // Email verification is handled separately (user clicks link in email)
        return res.status(400).json({
          error: "Email verification not supported via this endpoint",
          message: "Please click the link in the verification email",
        });

      default:
        return res.status(400).json({
          error: "Invalid verification method",
          method: claim.verificationMethod,
        });
    }

    if (verified) {
      // Update claim as verified
      await db
        .update(claimedDomains)
        .set({
          isVerified: true,
          verifiedAt: new Date(),
        })
        .where(eq(claimedDomains.id, claimId));

      console.log(
        `[Domain Verify] Domain ${claim.domain} verified for user ${userId}`,
      );

      return res.json({
        verified: true,
        verifiedAt: new Date().toISOString(),
        method: claim.verificationMethod,
        message: "Domain successfully verified!",
      });
    } else {
      return res.json({
        verified: false,
        message: errorMessage,
      });
    }
  } catch (error) {
    console.error("[Domain Verify] Error:", error);
    return res.status(500).json({
      error: "Verification failed",
      message: "An internal error occurred",
    });
  }
}

/**
 * Verify DNS TXT record
 */
async function verifyDNS(domain: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain);
    const flatRecords = records.flat();
    return flatRecords.some((record) =>
      record.includes(`hostinginfo-verify=${token}`),
    );
  } catch (error) {
    console.error(`[DNS Verify] Failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Verify HTML file upload
 */
async function verifyFile(domain: string, token: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `https://${domain}/hostinginfo-verification.html`;

    const request = https.get(url, { timeout: 10000 }, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        // Check if response contains the token
        resolve(data.trim() === token || data.includes(token));
      });
    });

    request.on("error", (error) => {
      console.error(`[File Verify] Failed for ${domain}:`, error.message);
      resolve(false);
    });

    request.on("timeout", () => {
      console.error(`[File Verify] Timeout for ${domain}`);
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * Verify meta tag in homepage
 */
async function verifyMeta(domain: string, token: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `https://${domain}`;

    const request = https.get(url, { timeout: 10000 }, (res) => {
      let html = "";

      res.on("data", (chunk) => {
        html += chunk;
        // Stop reading after <head> section to save bandwidth
        if (html.includes("</head>")) {
          request.destroy();
        }
      });

      res.on("end", () => {
        // Check for meta tag with verification token
        const metaRegex = new RegExp(
          `<meta[^>]*name=["']hostinginfo-verify["'][^>]*content=["']${token}["'][^>]*>`,
          "i",
        );
        const metaRegexReverse = new RegExp(
          `<meta[^>]*content=["']${token}["'][^>]*name=["']hostinginfo-verify["'][^>]*>`,
          "i",
        );
        resolve(metaRegex.test(html) || metaRegexReverse.test(html));
      });
    });

    request.on("error", (error) => {
      console.error(`[Meta Verify] Failed for ${domain}:`, error.message);
      resolve(false);
    });

    request.on("timeout", () => {
      console.error(`[Meta Verify] Timeout for ${domain}`);
      request.destroy();
      resolve(false);
    });
  });
}

// Export with validation middleware
export default [validateBody(verifySchema), handler];
