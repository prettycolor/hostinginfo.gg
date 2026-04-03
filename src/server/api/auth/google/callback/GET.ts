import type { Request, Response, NextFunction } from "express";
import { passport } from "../../../../lib/oauth-config.js";
import { generateToken } from "../../../../lib/auth.js";
import {
  clearOAuthStateCookie,
  readOAuthStateCookie,
} from "../../../../lib/oauth-state.js";

interface OAuthAuthenticatedUser {
  id: number;
  email: string;
  profileName?: string | null;
}

function isOAuthAuthenticatedUser(
  value: unknown,
): value is OAuthAuthenticatedUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { id?: unknown; email?: unknown };
  return (
    typeof candidate.id === "number" && typeof candidate.email === "string"
  );
}

function getErrorMessage(err: unknown): string | null {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== "object") return null;
  const maybe = err as { message?: unknown };
  return typeof maybe.message === "string" ? maybe.message : null;
}

export default function handler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const appBaseUrl =
    process.env.APP_URL ||
    process.env.VITE_PREVIEW_URL ||
    "http://localhost:5173";

  // Validate OAuth state parameter to prevent CSRF
  const returnedState = req.query.state as string | undefined;
  const session = req.session as unknown as Record<string, unknown> | undefined;
  const expectedState = session?.oauthState as string | undefined;
  const cookieState = readOAuthStateCookie(req, "google");
  if (session) delete session.oauthState;
  clearOAuthStateCookie(res, "google");

  const stateMatchesSession = Boolean(
    returnedState && expectedState && returnedState === expectedState,
  );
  const stateMatchesCookie = Boolean(
    returnedState && cookieState && returnedState === cookieState,
  );
  const strictStateValidation = process.env.OAUTH_STRICT_STATE === "true";

  if (!returnedState || (!stateMatchesSession && !stateMatchesCookie)) {
    console.warn("Google OAuth state mismatch", {
      hasReturnedState: Boolean(returnedState),
      hasSessionState: Boolean(expectedState),
      hasCookieState: Boolean(cookieState),
      strictStateValidation,
    });
    if (strictStateValidation) {
      return res.redirect(`${appBaseUrl}/login?error=google_auth_failed`);
    }
  }

  passport.authenticate(
    "google",
    { session: false },
    (err: unknown, user: unknown) => {
      if (getErrorMessage(err) === "signup_disabled") {
        return res.redirect(`${appBaseUrl}/signup?status=coming-soon`);
      }

      if (err || !isOAuthAuthenticatedUser(user)) {
        console.error("Google OAuth error:", err);
        return res.redirect(`${appBaseUrl}/login?error=google_auth_failed`);
      }

      try {
        // Generate JWT token
        const token = generateToken(user.id, user.email);
        const requiresUsername =
          !user.profileName || String(user.profileName).trim().length === 0;
        const nextPath = requiresUsername ? "/choose-username" : "/dashboard";

        // Set token as httpOnly cookie instead of URL parameter
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("oauth_token", token, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 60 * 1000, // 1 minute — just long enough for the frontend to exchange
          path: "/",
        });

        const redirectUrl = `${appBaseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
        res.redirect(redirectUrl);
      } catch (error) {
        console.error("Token generation error:", error);
        res.redirect(`${appBaseUrl}/login?error=token_generation_failed`);
      }
    },
  )(req, res, next);
}
