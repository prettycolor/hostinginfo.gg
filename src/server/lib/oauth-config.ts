import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getSecret } from "#secrets";
import { isSignupEnabled } from "./feature-flags.js";

type OAuthDone = (error: Error | null, user?: unknown) => void;

/** Safe column set for OAuth/session user objects — excludes passwordHash and password */
const safeUserColumns = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  profileName: users.profileName,
  authProvider: users.authProvider,
  providerId: users.providerId,
  emailVerified: users.emailVerified,
  level: users.level,
  selectedAvatarId: users.selectedAvatarId,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
} as const;

interface GitHubProfileLike {
  id?: string;
  username?: string;
  displayName?: string;
  emails?: Array<{ value?: string }>;
}

interface MicrosoftGraphProfile {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

function getConfiguredString(name: string): string | undefined {
  const secretValue = getSecret(name);
  if (typeof secretValue === "string" && secretValue.trim().length > 0) {
    return secretValue.trim();
  }

  const envValue = process.env[name];
  if (typeof envValue === "string" && envValue.trim().length > 0) {
    return envValue.trim();
  }

  return undefined;
}

// OAuth Configuration
export function configureOAuth() {
  // Get OAuth credentials from secrets (with fallback to env vars)
  const googleClientId = getConfiguredString("GOOGLE_CLIENT_ID");
  const googleClientSecret = getConfiguredString("GOOGLE_CLIENT_SECRET");
  const googleRedirectUrl = getConfiguredString("GOOGLE_REDIRECT_URL");
  const githubClientId = getConfiguredString("GITHUB_CLIENT_ID");
  const githubClientSecret = getConfiguredString("GITHUB_CLIENT_SECRET");
  const microsoftClientId = getConfiguredString("MICROSOFT_CLIENT_ID");
  const microsoftClientSecret = getConfiguredString("MICROSOFT_CLIENT_SECRET");
  const microsoftTenantId = getConfiguredString("MICROSOFT_TENANT_ID");

  // Base URL for OAuth callbacks (public app URL in production)
  const callbackBaseUrl =
    process.env.APP_URL ||
    process.env.VITE_PREVIEW_URL ||
    "http://localhost:5173";

  // Google OAuth Strategy
  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL:
            googleRedirectUrl || `${callbackBaseUrl}/api/auth/google/callback`,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"));
            }

            // Check if user exists
            const existingUsers = await db
              .select(safeUserColumns)
              .from(users)
              .where(eq(users.email, email))
              .limit(1);

            if (existingUsers.length > 0) {
              // Update OAuth info if needed
              const user = existingUsers[0];
              if (!user.authProvider || !user.providerId) {
                await db
                  .update(users)
                  .set({
                    authProvider: "google",
                    providerId: profile.id,
                    emailVerified: true, // Google emails are verified
                    emailVerifiedAt: new Date(),
                  })
                  .where(eq(users.id, user.id));
              }
              return done(null, user);
            }

            if (!isSignupEnabled()) {
              return done(new Error("signup_disabled"));
            }

            // Create new user
            const result = await db.insert(users).values({
              email,
              fullName: profile.displayName || email.split("@")[0],
              passwordHash: null, // No password for OAuth users
              authProvider: "google",
              providerId: profile.id,
              emailVerified: true,
              emailVerifiedAt: new Date(),
              emailNotifications: false,
              scanAlerts: false,
              weeklyReports: false,
              marketingEmails: false,
            });

            const newUserId = Number(result[0].insertId);
            const newUsers = await db
              .select(safeUserColumns)
              .from(users)
              .where(eq(users.id, newUserId))
              .limit(1);

            return done(null, newUsers[0]);
          } catch (error) {
            return done(error as Error);
          }
        },
      ),
    );
  }

  // GitHub OAuth Strategy
  if (githubClientId && githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientId,
          clientSecret: githubClientSecret,
          callbackURL: `${callbackBaseUrl}/api/auth/github/callback`,
          scope: ["user:email"],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: unknown,
          done: OAuthDone,
        ) => {
          try {
            const githubProfile = profile as GitHubProfileLike;
            const email = githubProfile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in GitHub profile"));
            }

            // Check if user exists
            const existingUsers = await db
              .select(safeUserColumns)
              .from(users)
              .where(eq(users.email, email))
              .limit(1);

            if (existingUsers.length > 0) {
              // Update OAuth info if needed
              const user = existingUsers[0];
              if (!user.authProvider || !user.providerId) {
                await db
                  .update(users)
                  .set({
                    authProvider: "github",
                    providerId: githubProfile.id,
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                  })
                  .where(eq(users.id, user.id));
              }
              return done(null, user);
            }

            if (!isSignupEnabled()) {
              return done(new Error("signup_disabled"));
            }

            // Create new user
            const result = await db.insert(users).values({
              email,
              fullName:
                githubProfile.displayName ||
                githubProfile.username ||
                email.split("@")[0],
              passwordHash: null, // No password for OAuth users
              authProvider: "github",
              providerId: githubProfile.id,
              emailVerified: true,
              emailVerifiedAt: new Date(),
              emailNotifications: false,
              scanAlerts: false,
              weeklyReports: false,
              marketingEmails: false,
            });

            const newUserId = Number(result[0].insertId);
            const newUsers = await db
              .select(safeUserColumns)
              .from(users)
              .where(eq(users.id, newUserId))
              .limit(1);

            return done(null, newUsers[0]);
          } catch (error) {
            return done(error as Error);
          }
        },
      ),
    );
  }

  // Microsoft OAuth Strategy
  if (microsoftClientId && microsoftClientSecret && microsoftTenantId) {
    passport.use(
      "microsoft",
      new OAuth2Strategy(
        {
          authorizationURL: `https://login.microsoftonline.com/${microsoftTenantId}/oauth2/v2.0/authorize`,
          tokenURL: `https://login.microsoftonline.com/${microsoftTenantId}/oauth2/v2.0/token`,
          clientID: microsoftClientId,
          clientSecret: microsoftClientSecret,
          callbackURL: `${callbackBaseUrl}/api/auth/microsoft/callback`,
          scope: ["openid", "profile", "email"],
        },
        async (
          accessToken: string,
          _refreshToken: string,
          _profile: unknown,
          done: OAuthDone,
        ) => {
          try {
            // Fetch user profile from Microsoft Graph API
            const response = await fetch(
              "https://graph.microsoft.com/v1.0/me",
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
            const microsoftProfile =
              (await response.json()) as MicrosoftGraphProfile;

            const email =
              microsoftProfile.mail || microsoftProfile.userPrincipalName;
            if (!email) {
              return done(new Error("No email found in Microsoft profile"));
            }

            // Check if user exists
            const existingUsers = await db
              .select(safeUserColumns)
              .from(users)
              .where(eq(users.email, email))
              .limit(1);

            if (existingUsers.length > 0) {
              // Update OAuth info if needed
              const user = existingUsers[0];
              if (!user.authProvider || !user.providerId) {
                await db
                  .update(users)
                  .set({
                    authProvider: "microsoft",
                    providerId: microsoftProfile.id,
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                  })
                  .where(eq(users.id, user.id));
              }
              return done(null, user);
            }

            if (!isSignupEnabled()) {
              return done(new Error("signup_disabled"));
            }

            // Create new user
            const result = await db.insert(users).values({
              email,
              fullName: microsoftProfile.displayName || email.split("@")[0],
              passwordHash: null, // No password for OAuth users
              authProvider: "microsoft",
              providerId: microsoftProfile.id,
              emailVerified: true,
              emailVerifiedAt: new Date(),
              emailNotifications: false,
              scanAlerts: false,
              weeklyReports: false,
              marketingEmails: false,
            });

            const newUserId = Number(result[0].insertId);
            const newUsers = await db
              .select(safeUserColumns)
              .from(users)
              .where(eq(users.id, newUserId))
              .limit(1);

            return done(null, newUsers[0]);
          } catch (error) {
            return done(error as Error);
          }
        },
      ),
    );
  }

  // Serialize user for session
  passport.serializeUser((user: { id?: number | string }, done) => {
    done(null, user.id);
  });

  // Deserialize user from session — explicitly exclude sensitive fields
  passport.deserializeUser(async (id: number, done) => {
    try {
      const userList = await db
        .select(safeUserColumns)
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, userList[0] || null);
    } catch (error) {
      done(error);
    }
  });
}

export { passport };
