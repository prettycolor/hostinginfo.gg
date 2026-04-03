import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MailCheck, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

export default function VerifyEmailRequiredPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState<
    "success" | "error" | "info"
  >("info");

  const redirectTarget = useMemo(() => {
    const raw = searchParams.get("redirect") || "/dashboard";
    return raw.startsWith("/") ? raw : "/dashboard";
  }, [searchParams]);

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
        replace
      />
    );
  }

  if (user.emailVerified) {
    return <Navigate to={redirectTarget} replace />;
  }

  const handleResend = async () => {
    setStatusMessage("");
    setResending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to resend verification email.",
        );
      }

      setStatusVariant("success");
      setStatusMessage(
        "Verification email sent. Check your inbox and spam folder.",
      );
    } catch (error) {
      setStatusVariant("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to resend verification email.",
      );
    } finally {
      setResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    setStatusMessage("");

    try {
      await refreshUser();
      setStatusVariant("info");
      setStatusMessage("Verification status refreshed.");
    } catch {
      setStatusVariant("error");
      setStatusMessage(
        "Could not refresh verification status. Please try again.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
      <SEOHead
        title={PAGE_META.verifyEmailRequired.title}
        description={PAGE_META.verifyEmailRequired.description}
        keywords={PAGE_META.verifyEmailRequired.keywords}
        noindex={PAGE_META.verifyEmailRequired.noindex}
      />
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <MailCheck className="h-12 w-12 text-primary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">
            Verify Your Email First
          </h1>
          <p className="text-muted-foreground mb-2">
            You need to verify <strong>{user.email}</strong> before accessing
            account features like leaderboard and intelligence scanner.
          </p>
          <p className="text-muted-foreground mb-6">
            Click the verification link we sent to your inbox.
          </p>

          {statusMessage && (
            <div
              className={`mb-6 p-3 rounded-md text-sm border ${
                statusVariant === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                  : statusVariant === "error"
                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                    : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {statusMessage}
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleRefreshStatus}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />I Verified, Continue
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
