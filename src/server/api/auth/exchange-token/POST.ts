import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { sessions } from "../../../db/schema.js";
import { verifyToken } from "../../../lib/auth.js";

/**
 * POST /api/auth/exchange-token
 * Exchange the short-lived oauth_token cookie for a JSON response.
 * The cookie is httpOnly so the frontend can't read it directly —
 * this endpoint returns the token and clears the cookie.
 */
export default function handler(req: Request, res: Response) {
  // Parse oauth_token from Cookie header (no cookie-parser dependency needed)
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)oauth_token=([^;]*)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (!token) {
    return res.status(401).json({ error: "No token available" });
  }

  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const ipAddress = req.ip || null;
  const userAgent = req.headers["user-agent"] || null;

  const createSession = async () => {
    try {
      await db.insert(sessions).values({
        userId: decoded.userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      // Token may already be present from a retry; treat as success.
      if (message.includes("Duplicate entry")) {
        return;
      }
      throw error;
    }
  };

  createSession()
    .then(() => {
      // Clear the one-time cookie
      res.clearCookie("oauth_token", { path: "/" });

      res.json({ token });
    })
    .catch((error) => {
      console.error(
        "OAuth session creation failed during token exchange:",
        error,
      );
      res.status(500).json({ error: "Failed to initialize login session" });
    });
}
