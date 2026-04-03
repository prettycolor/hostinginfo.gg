import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { claimedDomains } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { validateBody } from "../../../middleware/index.js";
import { requireAuthenticatedUserId } from "../../../lib/request-auth.js";
import { z } from "zod";

// Custom schema for claim endpoint
const claimSchema = z.object({
  domain: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/),
  verificationMethod: z.enum(["dns", "file", "meta", "email"]),
});

/**
 * POST /api/domains/claim
 * Claim a domain and generate verification token
 */
async function handler(req: Request, res: Response) {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const { domain, verificationMethod } = req.body;
    // Validation handled by middleware

    // Normalize domain (remove protocol, www, trailing slash)
    const normalizedDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase();

    // Check if domain is already claimed by this user
    const existingClaim = await db
      .select()
      .from(claimedDomains)
      .where(
        and(
          eq(claimedDomains.userId, userId),
          eq(claimedDomains.domain, normalizedDomain),
        ),
      )
      .limit(1);

    if (existingClaim.length > 0) {
      const claim = existingClaim[0];
      if (claim.isVerified) {
        return res.status(400).json({
          error: "Domain already verified",
          claimId: claim.id,
        });
      }
      // Return existing claim if not verified yet
      return res.json({
        claimId: claim.id,
        domain: normalizedDomain,
        verificationToken: claim.verificationToken,
        verificationMethod: claim.verificationMethod,
        instructions: getInstructions(
          normalizedDomain,
          claim.verificationToken!,
          claim.verificationMethod!,
        ),
        status: "pending",
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create claim
    const result = await db.insert(claimedDomains).values({
      userId,
      domain: normalizedDomain,
      verificationMethod,
      verificationToken,
      isVerified: false,
    });

    const claimId = Number(result[0].insertId);

    console.log(
      `[Domain Claim] User ${userId} claimed ${normalizedDomain} (ID: ${claimId})`,
    );

    return res.status(201).json({
      claimId,
      domain: normalizedDomain,
      verificationToken,
      verificationMethod,
      instructions: getInstructions(
        normalizedDomain,
        verificationToken,
        verificationMethod,
      ),
      status: "pending",
    });
  } catch (error) {
    console.error("[Domain Claim] Error:", error);
    return res.status(500).json({
      error: "Failed to claim domain",
      message: "An internal error occurred",
    });
  }
}

function getInstructions(domain: string, token: string, method: string) {
  const instructions: Record<string, string> = {};

  if (method === "dns") {
    instructions.dns = `Add a TXT record to your DNS:\n\nHost: @ (or ${domain})\nType: TXT\nValue: hostinginfo-verify=${token}\n\nDNS changes can take up to 48 hours to propagate.`;
  }

  if (method === "file") {
    instructions.file = `Create a file named 'hostinginfo-verification.html' with this content:\n\n${token}\n\nUpload it to: https://${domain}/hostinginfo-verification.html`;
  }

  if (method === "meta") {
    instructions.meta = `Add this meta tag to the <head> section of your homepage:\n\n<meta name="hostinginfo-verify" content="${token}" />`;
  }

  if (method === "email") {
    instructions.email = `A verification email will be sent to:\n- admin@${domain}\n- webmaster@${domain}\n\nClick the link in the email to verify.`;
  }

  return instructions;
}

// Export with validation middleware
export default [validateBody(claimSchema), handler];
