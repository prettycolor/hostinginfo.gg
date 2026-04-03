import type { Request, Response } from "express";
import { getSecret } from "#secrets";

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

/**
 * SSO Configuration Status Endpoint
 * Returns which SSO providers are available (boolean only, no infra details)
 */
export default function handler(req: Request, res: Response) {
  try {
    const googleConfigured = !!(
      getConfiguredString("GOOGLE_CLIENT_ID") &&
      getConfiguredString("GOOGLE_CLIENT_SECRET")
    );
    const githubConfigured = !!(
      getConfiguredString("GITHUB_CLIENT_ID") &&
      getConfiguredString("GITHUB_CLIENT_SECRET")
    );
    const microsoftConfigured = !!(
      getConfiguredString("MICROSOFT_CLIENT_ID") &&
      getConfiguredString("MICROSOFT_CLIENT_SECRET") &&
      getConfiguredString("MICROSOFT_TENANT_ID")
    );
    const appleConfigured = !!(
      getConfiguredString("APPLE_CLIENT_ID") &&
      getConfiguredString("APPLE_TEAM_ID") &&
      getConfiguredString("APPLE_KEY_ID") &&
      getConfiguredString("APPLE_PRIVATE_KEY")
    );

    res.json({
      providers: {
        google: googleConfigured,
        github: githubConfigured,
        microsoft: microsoftConfigured,
        apple: appleConfigured,
      },
    });
  } catch (error) {
    console.error("SSO status check error:", error);
    res.status(500).json({ error: "Failed to check SSO status" });
  }
}
