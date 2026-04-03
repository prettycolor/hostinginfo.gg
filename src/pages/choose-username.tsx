import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

async function parseErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export default function ChooseUsernamePage() {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.profileName && user.profileName.trim().length > 0) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user?.profileName]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Username is required");
      return;
    }

    const authToken = token || localStorage.getItem("auth_token");
    if (!authToken) {
      navigate("/login", { replace: true });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ profileName: trimmedUsername }),
      });

      if (!response.ok) {
        throw new Error(
          await parseErrorMessage(response, "Failed to save username"),
        );
      }

      // Keep leaderboard alias aligned with the required username on first setup.
      await fetch("/api/leveling/set-alias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ alias: trimmedUsername }),
      }).catch(() => undefined);

      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save username",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <UserRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Choose Your Username</CardTitle>
            <CardDescription>
              Pick your public username to finish creating your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="yourname"
                  disabled={submitting}
                  required
                  autoFocus
                  maxLength={12}
                  pattern="[A-Za-z0-9]{3,12}"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  3-12 chars, letters and numbers only
                </p>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !username.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
