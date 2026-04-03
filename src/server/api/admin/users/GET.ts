import type { Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { requireAdminUser } from "../../../lib/request-auth.js";

type StatusFilter = "active" | "disabled" | "all";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseStatusFilter(value: string | undefined): StatusFilter {
  if (value === "active" || value === "disabled" || value === "all") {
    return value;
  }
  return "active";
}

export default async function handler(req: Request, res: Response) {
  try {
    const adminUser = requireAdminUser(req, res);
    if (!adminUser) {
      return;
    }

    const page = parsePositiveInt(req.query.page as string | undefined, 1);
    const pageSize = Math.min(
      parsePositiveInt(req.query.pageSize as string | undefined, 20),
      100,
    );
    const offset = (page - 1) * pageSize;
    const status = parseStatusFilter(req.query.status as string | undefined);
    const search = (req.query.search as string | undefined)?.trim() || "";

    const whereClauses: Array<ReturnType<typeof eq> | ReturnType<typeof sql>> =
      [];

    if (status === "active") {
      whereClauses.push(eq(users.isDisabled, false));
    } else if (status === "disabled") {
      whereClauses.push(eq(users.isDisabled, true));
    }

    if (search) {
      const pattern = `%${search.toLowerCase()}%`;
      whereClauses.push(
        sql`(
          lower(${users.email}) like ${pattern}
          or lower(coalesce(${users.profileName}, '')) like ${pattern}
          or lower(coalesce(${users.fullName}, '')) like ${pattern}
        )`,
      );
    }

    const whereCondition =
      whereClauses.length > 1
        ? and(...whereClauses)
        : whereClauses.length === 1
          ? whereClauses[0]
          : undefined;

    const baseQuery = db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        profileName: users.profileName,
        authProvider: users.authProvider,
        emailVerified: users.emailVerified,
        level: users.level,
        totalXp: users.totalXp,
        currentXp: users.currentXp,
        isAdmin: users.isAdmin,
        isDisabled: users.isDisabled,
        disabledAt: users.disabledAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users);

    const listQuery = whereCondition
      ? baseQuery.where(whereCondition)
      : baseQuery;

    const items = await listQuery
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countBaseQuery = db
      .select({
        total: sql<number>`cast(count(*) as unsigned)`,
      })
      .from(users);

    const countQuery = whereCondition
      ? countBaseQuery.where(whereCondition)
      : countBaseQuery;
    const [countRow] = await countQuery;

    return res.json({
      success: true,
      users: items,
      pagination: {
        page,
        pageSize,
        total: Number(countRow?.total || 0),
      },
      filters: {
        status,
        search,
      },
    });
  } catch (error) {
    console.error("Failed to list admin users:", error);
    return res.status(500).json({ error: "Failed to list users" });
  }
}
