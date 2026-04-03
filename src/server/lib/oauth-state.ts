import type { Request, Response } from "express";

export type OAuthProvider = "google" | "github" | "microsoft" | "apple";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function getCookieName(provider: OAuthProvider): string {
  return `oauth_state_${provider}`;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function writeOAuthStateCookie(
  res: Response,
  provider: OAuthProvider,
  state: string,
): void {
  res.cookie(getCookieName(provider), state, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: OAUTH_STATE_TTL_MS,
    path: "/",
  });
}

export function readOAuthStateCookie(
  req: Request,
  provider: OAuthProvider,
): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const targetName = getCookieName(provider);
  const parts = cookieHeader.split(";");

  for (const part of parts) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName !== targetName) continue;

    const rawValue = rawValueParts.join("=");
    if (!rawValue) return undefined;

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return undefined;
}

export function clearOAuthStateCookie(
  res: Response,
  provider: OAuthProvider,
): void {
  res.clearCookie(getCookieName(provider), {
    path: "/",
    sameSite: "lax",
    secure: isProduction(),
    httpOnly: true,
  });
}
