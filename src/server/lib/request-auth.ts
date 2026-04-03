import type { Request, Response } from "express";
import { extractToken, verifyToken } from "./auth.js";

export interface AuthenticatedRequestUser {
  id: number;
  email: string;
  isAdmin: boolean;
  isDisabled: boolean;
}

type RequestWithAuth = Request & {
  user?: { id?: string | number };
  userId?: string | number;
  session?: { userId?: string | number };
  authUser?: AuthenticatedRequestUser;
};

/**
 * Resolve authenticated user ID from common auth sources.
 * Supports legacy req.user, req.userId, session userId, and Bearer JWT.
 */
export function getAuthenticatedUserId(req: Request): number | null {
  const reqWithAuth = req as RequestWithAuth;

  if (reqWithAuth.authUser?.isDisabled) {
    return null;
  }

  if (
    typeof reqWithAuth.authUser?.id === "number" &&
    reqWithAuth.authUser.id > 0
  ) {
    return reqWithAuth.authUser.id;
  }

  const candidates = [
    reqWithAuth.user?.id,
    reqWithAuth.userId,
    reqWithAuth.session?.userId,
  ];

  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? Number(candidate) : candidate;
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }
  }

  const token = extractToken(req.headers.authorization);
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return null;
  }

  return decoded.userId;
}

export function getAuthenticatedUser(
  req: Request,
): AuthenticatedRequestUser | null {
  const reqWithAuth = req as RequestWithAuth;
  if (!reqWithAuth.authUser || reqWithAuth.authUser.isDisabled) {
    return null;
  }
  return reqWithAuth.authUser;
}

/**
 * Resolve authenticated user ID or return a standard 401 response.
 */
export function requireAuthenticatedUserId(
  req: Request,
  res: Response,
): number | null {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

/**
 * Resolve authenticated admin user or return a standard 401/403 response.
 */
export function requireAdminUser(
  req: Request,
  res: Response,
): AuthenticatedRequestUser | null {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  if (!authUser.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return authUser;
}
