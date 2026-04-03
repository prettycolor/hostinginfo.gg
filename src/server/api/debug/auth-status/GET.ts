/**
 * GET /api/debug/auth-status
 *
 * Check authentication status and user info.
 * Only available in development mode.
 */

import type { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const user = (req as Request & { user?: { id?: number; email?: string } })
      .user;

    return res.json({
      isAuthenticated: !!user,
      userId: user?.id || null,
      email: user?.email || null,
    });
  } catch (error) {
    console.error("[Debug Auth] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Debug failed",
    });
  }
}
