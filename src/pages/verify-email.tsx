import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    // Verify email
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage("Your email has been verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
      <SEOHead
        title={PAGE_META.verifyEmail.title}
        description={PAGE_META.verifyEmail.description}
        keywords={PAGE_META.verifyEmail.keywords}
        noindex={PAGE_META.verifyEmail.noindex}
      />
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
          {status === "loading" && (
            <>
              <div className="mb-6 flex justify-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Verifying Email...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Email Verified!
              </h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button onClick={() => navigate("/login")} className="w-full">
                  Go to Login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <XCircle className="h-16 w-16 text-red-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Verification Failed
              </h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button onClick={() => navigate("/signup")} className="w-full">
                  Sign Up Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
