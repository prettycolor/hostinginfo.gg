import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function sanitizeNextPath(nextParam: string | null): string {
  if (!nextParam) return "/dashboard";
  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/dashboard";
  }
  return nextParam;
}

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextPath = sanitizeNextPath(searchParams.get("next"));

    // Exchange the httpOnly oauth_token cookie for a JWT via the backend
    fetch("/api/auth/exchange-token", {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Token exchange failed");
        const data = await res.json();
        if (!data.token) throw new Error("No token received");

        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("auth_token_timestamp", Date.now().toString());
        localStorage.setItem("token", data.token);
        window.location.replace(nextPath);
      })
      .catch(() => {
        setError("Failed to complete authentication. Please try again.");
      });
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Sign-in Failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild className="w-full">
            <Link to="/login">Back to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
}
