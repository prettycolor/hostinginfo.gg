/**
 * GET /api/debug/tables
 *
 * Debug endpoint to check what tables exist in the database.
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
      SHOW TABLES
    `);

    const tables = Array.isArray(result) ? result[0] : [];

    return res.json({
      success: true,
      tables,
      count: Array.isArray(tables) ? tables.length : 0,
    });
  } catch (error) {
    console.error("[Debug Tables] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Database error",
    });
  }
}
