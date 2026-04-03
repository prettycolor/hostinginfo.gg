import React, { useState, useEffect } from "react";
import { AuthContext, type User, type SignupResult } from "./auth-context";

async function parseErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
      }
      if (typeof payload?.message === "string" && payload.message.trim()) {
        return payload.message;
      }
      return fallback;
    }

    const text = await response.text();
    if (text && text.trim()) {
      return text.trim();
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");

    console.log("🔄 Auth initialization...", { hasToken: !!storedToken });

    if (storedToken) {
      console.log("✅ Token found, fetching user...");
      // Let backend handle token expiration validation
      // Frontend just checks if token exists and fetches user
      setToken(storedToken);
      void fetchUser(storedToken);
    } else {
      console.log("ℹ️ No token found, user not logged in");
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  // Auto-refresh user data every hour to keep session alive and extend it
  useEffect(() => {
    if (!token || !user) return;

    const refreshInterval = setInterval(
      async () => {
        console.log("🔄 Checking session validity...");
        try {
          const response = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            // Session still valid, extend it
            const data = await response.json();
            setUser(data.user);
            // Update timestamp to extend session
            localStorage.setItem("auth_token_timestamp", Date.now().toString());
            console.log("✅ Session extended");
          } else {
            // Token actually expired on backend, logout
            console.log("⏰ Session expired on backend, logging out...");
            logout();
          }
        } catch (error) {
          console.error("Failed to check session:", error);
        }
      },
      60 * 60 * 1000,
    ); // Check every hour

    return () => clearInterval(refreshInterval);
  }, [token, user]);

  // Fetch user data
  const fetchUser = async (authToken: string) => {
    try {
      console.log("🔍 Fetching user with token...");
      console.log(
        "🔑 Token (first 20 chars):",
        `${authToken.substring(0, 20)}...`,
      );

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log("📡 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ User data received:", data);
        setUser(data.user);
        setToken(authToken); // Ensure token state is set
        console.log("✅ User authenticated:", data.user.email);
        console.log("✅ User state set, loading will be false");
      } else {
        // Token invalid, clear it
        const errorData = await response.json().catch(() => ({
          error: "Unknown error",
        }));
        console.warn("⚠️ Token invalid - Status:", response.status);
        console.warn("⚠️ Error data:", errorData);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_token_timestamp");
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("❌ Failed to fetch user:", error);
      console.error(
        "❌ Error type:",
        error instanceof Error ? error.message : "Unknown",
      );
      // On network error, clear everything to force re-login
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_token_timestamp");
      setToken(null);
      setUser(null);
    } finally {
      console.log("🏁 fetchUser complete, setting loading to false");
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, "Login failed"));
    }

    const data = await response.json();
    console.log("✅ Login successful:", data.user.email);

    // Save token first
    const authToken = data.token;
    setToken(authToken);
    localStorage.setItem("auth_token", authToken);
    localStorage.setItem("auth_token_timestamp", Date.now().toString());
    console.log("✅ Token saved to localStorage");

    // Fetch complete user data including avatar from /api/auth/me
    console.log("🔄 Fetching complete user data with avatar...");
    await fetchUser(authToken);
  };

  const signup = async (
    email: string,
    password: string,
    fullName?: string,
    username?: string,
  ): Promise<SignupResult> => {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, username }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response, "Signup failed"));
    }

    const data = (await response.json()) as SignupResult;

    // Auto-login after successful signup when backend returns a token.
    if (data.token) {
      const authToken = data.token;
      setToken(authToken);
      localStorage.setItem("auth_token", authToken);
      localStorage.setItem("auth_token_timestamp", Date.now().toString());
      await fetchUser(authToken);
    }

    return data;
  };

  const logout = () => {
    console.log("🚪 Logging out user");
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_token_timestamp");
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
