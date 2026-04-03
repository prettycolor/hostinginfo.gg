/**
 * GET /api/debug/migrations
 *
 * Check which migrations have been applied.
 * Only available in development mode.
 */

import type { Request, Response } from "express";
import { db } from "../../../db/client.js";
import { sql } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const result = await db.execute(sql`
      SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 20
    `);

    const migrations = Array.isArray(result) ? result[0] : [];

    return res.json({
      success: true,
      migrations,
      count: Array.isArray(migrations) ? migrations.length : 0,
    });
  } catch (error) {
    console.error("[Debug Migrations] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Database error",
    });
  }
}
