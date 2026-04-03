import type { Request, Response } from "express";
import appleSigninAuth from "apple-signin-auth";
import crypto from "crypto";
import { getSecret } from "#secrets";
import { writeOAuthStateCookie } from "../../../lib/oauth-state.js";

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
  try {
    const clientId = getConfiguredString("APPLE_CLIENT_ID");
    const appBaseUrl = resolveAppBaseUrl(req);
    const redirectUri =
      getConfiguredString("APPLE_REDIRECT_URL") ||
      `${appBaseUrl}/api/auth/apple/callback`;

    if (!clientId) {
      return res.status(500).json({ error: "Apple Sign In not configured" });
    }

    const state = crypto.randomBytes(16).toString("hex");
    writeOAuthStateCookie(res, "apple", state);

    const authUrl = appleSigninAuth.getAuthorizationUrl({
      clientID: clientId,
      redirectUri,
      responseMode: "form_post",
      scope: "name email",
      state,
    });
    if (!req.session) {
      return res.redirect(authUrl);
    }

    const sessionWithAppleState = req.session as typeof req.session & {
      appleOAuthState?: string;
    };
    sessionWithAppleState.appleOAuthState = state;
    req.session.save((saveError) => {
      if (saveError) {
        console.error("Apple OAuth session save error:", saveError);
        return res
          .status(500)
          .json({ error: "Failed to initialize Apple sign-in session" });
      }

      return res.redirect(authUrl);
    });
  } catch (error) {
    console.error("Apple OAuth error:", error);
    res.status(500).json({ error: "Failed to initiate Apple Sign In" });
  }
}
