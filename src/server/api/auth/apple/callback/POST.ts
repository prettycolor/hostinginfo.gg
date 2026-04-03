import type { Request, Response } from "express";
import appleSigninAuth from "apple-signin-auth";
import { getSecret } from "#secrets";
import { db } from "../../../../db/client.js";
import { users } from "../../../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { isSignupEnabled } from "../../../../lib/feature-flags.js";
import { generateToken } from "../../../../lib/auth.js";
import {
  clearOAuthStateCookie,
  readOAuthStateCookie,
} from "../../../../lib/oauth-state.js";

interface AppleOAuthSession {
  appleOAuthState?: string;
}

function getConfiguredString(name: string): string | undefined {
  const envValue = process.env[name];
  if (typeof envValue === "string" && envValue.trim().length > 0) {
    return envValue.trim();
  }

  const secretValue = getSecret(name);
  if (typeof secretValue === "string" && secretValue.trim().length > 0) {
    return secretValue.trim();
  }

  return undefined;
}

function resolveAppBaseUrl(req: Request): string {
  const configuredBaseUrl = process.env.APP_URL || process.env.VITE_PREVIEW_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const protocol = req.protocol;
  const host = req.get("host");
  if (host) {
    return `${protocol}://${host}`;
  }

  return "http://localhost:5173";
}

export default async function handler(req: Request, res: Response) {
  const appBaseUrl = resolveAppBaseUrl(req);

  try {
    const clientId = getConfiguredString("APPLE_CLIENT_ID");
    const teamId = getConfiguredString("APPLE_TEAM_ID");
    const keyId = getConfiguredString("APPLE_KEY_ID");
    const privateKey = getConfiguredString("APPLE_PRIVATE_KEY");
    const redirectUri =
      getConfiguredString("APPLE_REDIRECT_URL") ||
      `${appBaseUrl}/api/auth/apple/callback`;

    if (!clientId || !teamId || !keyId || !privateKey) {
      console.error("Apple callback error: missing Apple OAuth configuration");
      return res.redirect(`${appBaseUrl}/login?error=apple_not_configured`);
    }

    const { code, user, state } = req.body ?? {};
    if (!code || typeof code !== "string") {
      return res.redirect(`${appBaseUrl}/login?error=apple_missing_code`);
    }

    const session = req.session as AppleOAuthSession | undefined;
    const sessionState = session?.appleOAuthState;
    const cookieState = readOAuthStateCookie(req, "apple");
    if (session) delete session.appleOAuthState;
    clearOAuthStateCookie(res, "apple");

    const stateMatchesSession = Boolean(
      typeof state === "string" && sessionState && state === sessionState,
    );
    const stateMatchesCookie = Boolean(
      typeof state === "string" && cookieState && state === cookieState,
    );
    const strictStateValidation = process.env.OAUTH_STRICT_STATE === "true";

    if (!state || (!stateMatchesSession && !stateMatchesCookie)) {
      console.warn("Apple OAuth state mismatch", {
        hasReturnedState: Boolean(state),
        hasSessionState: Boolean(sessionState),
        hasCookieState: Boolean(cookieState),
        strictStateValidation,
      });
      if (strictStateValidation) {
        return res.redirect(`${appBaseUrl}/login?error=apple_state_mismatch`);
      }
    }

    const clientSecret = appleSigninAuth.getClientSecret({
      clientID: clientId,
      teamID: teamId,
      keyIdentifier: keyId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      expAfter: 86400 * 180,
    });

    const tokenResponse = await appleSigninAuth.getAuthorizationToken(code, {
      clientID: clientId,
      redirectUri,
      clientSecret,
    });

    const verifiedIdToken = await appleSigninAuth.verifyIdToken(
      tokenResponse.id_token,
      {
        audience: clientId,
      },
    );

    if (!verifiedIdToken?.sub) {
      return res.redirect(`${appBaseUrl}/login?error=apple_invalid_id_token`);
    }

    const appleUserId = verifiedIdToken.sub;
    let email = verifiedIdToken.email;

    let firstName = "Apple";
    let lastName = "User";
    if (user) {
      try {
        const userInfo = typeof user === "string" ? JSON.parse(user) : user;
        firstName = userInfo.name?.firstName || "Apple";
        lastName = userInfo.name?.lastName || "User";
      } catch (e) {
        console.error("Failed to parse user info:", e);
      }
    }

    const [existingAppleUser] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.authProvider, "apple"), eq(users.providerId, appleUserId)),
      )
      .limit(1);

    if (!email && existingAppleUser?.email) {
      email = existingAppleUser.email;
    }

    if (!email) {
      email = `${appleUserId}@privaterelay.appleid.com`;
    }

    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let authenticatedUser = existingAppleUser || existingByEmail;

    if (authenticatedUser) {
      if (!existingAppleUser && existingByEmail) {
        if (
          !existingByEmail.providerId ||
          existingByEmail.authProvider === "email"
        ) {
          await db
            .update(users)
            .set({
              authProvider: "apple",
              providerId: appleUserId,
              emailVerified: true,
              emailVerifiedAt: new Date(),
            })
            .where(eq(users.id, existingByEmail.id));
        }
      }
    } else {
      if (!isSignupEnabled()) {
        return res.redirect(`${appBaseUrl}/signup?status=coming-soon`);
      }

      const result = await db.insert(users).values({
        email,
        passwordHash: null,
        fullName: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        authProvider: "apple",
        providerId: appleUserId,
        emailNotifications: false,
        scanAlerts: false,
        weeklyReports: false,
        marketingEmails: false,
      });

      const newUserId = Number(result[0].insertId);
      const [newUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, newUserId))
        .limit(1);

      authenticatedUser = newUser;
    }

    if (!authenticatedUser) {
      return res.redirect(`${appBaseUrl}/login?error=apple_user_lookup_failed`);
    }

    const token = generateToken(authenticatedUser.id, authenticatedUser.email);
    const requiresUsername =
      !authenticatedUser.profileName ||
      String(authenticatedUser.profileName).trim().length === 0;
    const nextPath = requiresUsername ? "/choose-username" : "/dashboard";

    // Set token as httpOnly cookie instead of URL parameter
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("oauth_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 1000,
      path: "/",
    });

    return res.redirect(
      `${appBaseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    );
  } catch (error) {
    console.error("Apple callback error:", error);
    return res.redirect(`${appBaseUrl}/login?error=apple_signin_failed`);
  }
}
