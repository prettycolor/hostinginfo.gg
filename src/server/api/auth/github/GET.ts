import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { passport } from "../../../lib/oauth-config.js";
import { writeOAuthStateCookie } from "../../../lib/oauth-state.js";

export default function handler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Generate CSRF state token
  const state = crypto.randomBytes(32).toString("hex");
  writeOAuthStateCookie(res, "github", state);

  const startOAuth = () =>
    passport.authenticate("github", {
      scope: ["user:email"],
      session: false,
      state,
    })(req, res, next);

  if (!req.session) {
    return startOAuth();
  }

  (req.session as unknown as Record<string, unknown>).oauthState = state;
  req.session.save((saveError) => {
    if (saveError) {
      console.error("GitHub OAuth session save error:", saveError);
      return res
        .status(500)
        .json({ error: "Failed to initialize GitHub sign-in session" });
    }

    return startOAuth();
  });
}
