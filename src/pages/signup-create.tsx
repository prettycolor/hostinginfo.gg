import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { trackSignUp } from "@/lib/analytics";
import { isSignupEnabled } from "@/lib/feature-flags";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { triggerSignupConfetti } from "@/lib/signup-confetti";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

export default function SignUpCreatePage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (!isSignupEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
        <SEOHead
          title={PAGE_META.signupCreate.title}
          description={PAGE_META.signupCreate.description}
          keywords={PAGE_META.signupCreate.keywords}
          noindex={PAGE_META.signupCreate.noindex}
        />
        <div className="w-full max-w-md">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Signups Coming Soon
            </h1>
            <p className="text-muted-foreground mb-6">
              Account creation is temporarily paused while we finish launch
              readiness.
            </p>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => navigate("/login")}>
                Go to Login
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const passwordsMatch = password === confirmPassword;

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    const passwordPolicyError = getPasswordPolicyError(password);
    if (passwordPolicyError) {
      setError(passwordPolicyError);
      return;
    }

    setLoading(true);

    try {
      const result = await signup(email, password, fullName, username);
      trackSignUp("email");
      triggerSignupConfetti();
      setSuccessMessage(result.message || "");
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
        <SEOHead
          title={PAGE_META.signupCreate.title}
          description={PAGE_META.signupCreate.description}
          keywords={PAGE_META.signupCreate.keywords}
          noindex={PAGE_META.signupCreate.noindex}
        />
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Check Your Email!
            </h1>
            <p className="text-muted-foreground mb-6">
              {successMessage || (
                <>
                  We&apos;ve sent a verification link to{" "}
                  <strong>{email}</strong>. Click the link in the email to
                  verify your account and unlock all features.
                </>
              )}
            </p>
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
            <p className="mt-6 text-sm text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => setSuccess(false)}
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
      <SEOHead
        title={PAGE_META.signupCreate.title}
        description={PAGE_META.signupCreate.description}
        keywords={PAGE_META.signupCreate.keywords}
        noindex={PAGE_META.signupCreate.noindex}
      />
      <div className="w-full max-w-md">
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Create Account
            </h1>
            <p className="text-muted-foreground">
              Enter your details to create your account
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                maxLength={12}
                pattern="[A-Za-z0-9]{3,12}"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                3-12 chars, letters and numbers only
              </p>
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Must be at least 8 characters and include uppercase, lowercase,
                number, and symbol.
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="mt-1.5"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive mt-1.5">
                  Passwords do not match
                </p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) =>
                  setAgreedToTerms(checked as boolean)
                }
                disabled={loading}
              />
              <Label
                htmlFor="terms"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I agree to the{" "}
                <Link
                  to="/terms-of-service"
                  className="text-primary hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                !agreedToTerms ||
                !username.trim() ||
                !password ||
                !confirmPassword ||
                !passwordsMatch
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
