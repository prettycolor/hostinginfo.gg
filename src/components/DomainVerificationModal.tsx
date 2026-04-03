import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface DomainVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  onVerified?: () => void;
}

interface ClaimResponse {
  claimId: number;
  domain: string;
  verificationToken: string;
  verificationMethod: string;
  instructions: Record<string, string>;
  status: string;
}

interface VerifyResponse {
  verified: boolean;
  verifiedAt?: string;
  method?: string;
  message: string;
}

export default function DomainVerificationModal({
  open,
  onOpenChange,
  domain,
  onVerified,
}: DomainVerificationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<
    "dns" | "file" | "meta" | "email"
  >("dns");
  const [claimData, setClaimData] = useState<ClaimResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerifyResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open && domain) {
      // Reset state when modal opens
      setClaimData(null);
      setVerificationResult(null);
      setSelectedMethod("dns");
    }
  }, [open, domain]);

  const handleClaim = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      const response = await fetch("/api/domains/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domain,
          verificationMethod: selectedMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to claim domain");
      }

      setClaimData(data);
      toast.success("Domain claimed! Follow the instructions to verify.");
    } catch (error) {
      console.error("Claim error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to claim domain",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!claimData) return;

    try {
      setVerifying(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/domains/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          claimId: claimData.claimId,
        }),
      });

      const data = await response.json();

      setVerificationResult(data);

      if (data.verified) {
        toast.success("Domain verified successfully!");
        setTimeout(() => {
          onVerified?.();
          onOpenChange(false);
        }, 2000);
      } else {
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verify error:", error);
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getVerificationToken = () => {
    if (!claimData) return "";
    return claimData.verificationToken;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verify Domain Ownership
          </DialogTitle>
          <DialogDescription>
            Prove you own <strong>{domain}</strong> to unlock premium features
          </DialogDescription>
        </DialogHeader>

        {verificationResult?.verified ? (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Domain Verified!</strong>
                <br />
                {verificationResult.message}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Method Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Choose Verification Method
              </label>
              <Tabs
                value={selectedMethod}
                onValueChange={(v) =>
                  setSelectedMethod(v as "dns" | "file" | "meta" | "email")
                }
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dns">DNS</TabsTrigger>
                  <TabsTrigger value="file">File</TabsTrigger>
                  <TabsTrigger value="meta">Meta Tag</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>

                {/* DNS Method */}
                <TabsContent value="dns" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">DNS TXT Record Verification</h4>
                    <p className="text-sm text-muted-foreground">
                      Add a TXT record to your domain's DNS settings. This is
                      the most reliable method.
                    </p>
                  </div>

                  {claimData ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Verification Token
                        </label>
                        <div className="flex gap-2">
                          <code className="flex-1 p-3 bg-muted rounded text-sm break-all">
                            hostinginfo-verify={getVerificationToken()}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(
                                `hostinginfo-verify=${getVerificationToken()}`,
                                "dns",
                              )
                            }
                          >
                            {copiedField === "dns" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <Alert>
                        <AlertDescription className="text-sm space-y-2">
                          <p>
                            <strong>Instructions:</strong>
                          </p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>
                              Log in to your DNS provider (HostingInfo,
                              Cloudflare, etc.)
                            </li>
                            <li>Add a new TXT record</li>
                            <li>
                              Set Host/Name to:{" "}
                              <code className="bg-muted px-1">@</code> or{" "}
                              <code className="bg-muted px-1">{domain}</code>
                            </li>
                            <li>Set Value to the token above</li>
                            <li>
                              Save and wait 5-10 minutes for DNS propagation
                            </li>
                            <li>Click "Check Verification" below</li>
                          </ol>
                          <p className="text-xs text-muted-foreground mt-2">
                            Note: DNS changes can take up to 48 hours to fully
                            propagate.
                          </p>
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <Button
                      onClick={handleClaim}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Claim Domain with DNS
                    </Button>
                  )}
                </TabsContent>

                {/* File Method */}
                <TabsContent value="file" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">HTML File Verification</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload a verification file to your website's root
                      directory.
                    </p>
                  </div>

                  {claimData ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          File Content
                        </label>
                        <div className="flex gap-2">
                          <code className="flex-1 p-3 bg-muted rounded text-sm break-all">
                            {getVerificationToken()}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(getVerificationToken(), "file")
                            }
                          >
                            {copiedField === "file" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <Alert>
                        <AlertDescription className="text-sm space-y-2">
                          <p>
                            <strong>Instructions:</strong>
                          </p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>
                              Create a file named{" "}
                              <code className="bg-muted px-1">
                                hostinginfo-verification.html
                              </code>
                            </li>
                            <li>Paste the token above as the file content</li>
                            <li>
                              Upload to:{" "}
                              <code className="bg-muted px-1">
                                https://{domain}/hostinginfo-verification.html
                              </code>
                            </li>
                            <li>Make sure the file is publicly accessible</li>
                            <li>Click "Check Verification" below</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <Button
                      onClick={handleClaim}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Claim Domain with File Upload
                    </Button>
                  )}
                </TabsContent>

                {/* Meta Tag Method */}
                <TabsContent value="meta" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Meta Tag Verification</h4>
                    <p className="text-sm text-muted-foreground">
                      Add a meta tag to your website's homepage &lt;head&gt;
                      section.
                    </p>
                  </div>

                  {claimData ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Meta Tag</label>
                        <div className="flex gap-2">
                          <code className="flex-1 p-3 bg-muted rounded text-sm break-all">
                            &lt;meta name="hostinginfo-verify" content="
                            {getVerificationToken()}" /&gt;
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(
                                `<meta name="hostinginfo-verify" content="${getVerificationToken()}" />`,
                                "meta",
                              )
                            }
                          >
                            {copiedField === "meta" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <Alert>
                        <AlertDescription className="text-sm space-y-2">
                          <p>
                            <strong>Instructions:</strong>
                          </p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Open your website's homepage HTML file</li>
                            <li>
                              Find the{" "}
                              <code className="bg-muted px-1">
                                &lt;head&gt;
                              </code>{" "}
                              section
                            </li>
                            <li>
                              Paste the meta tag above inside the &lt;head&gt;
                            </li>
                            <li>Save and deploy your changes</li>
                            <li>Click "Check Verification" below</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <Button
                      onClick={handleClaim}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Claim Domain with Meta Tag
                    </Button>
                  )}
                </TabsContent>

                {/* Email Method */}
                <TabsContent value="email" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Email Verification</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive a verification link via email (easiest but less
                      secure).
                    </p>
                  </div>

                  <Alert>
                    <AlertDescription className="text-sm space-y-2">
                      <p>
                        <strong>How it works:</strong>
                      </p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          We'll send an email to admin@{domain} or webmaster@
                          {domain}
                        </li>
                        <li>Click the verification link in the email</li>
                        <li>Domain will be verified automatically</li>
                      </ol>
                      <p className="text-xs text-muted-foreground mt-2">
                        Note: You must have access to these email addresses.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleClaim}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Verification Email
                  </Button>
                </TabsContent>
              </Tabs>
            </div>

            {/* Verification Result */}
            {verificationResult && !verificationResult.verified && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {verificationResult.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            {claimData && selectedMethod !== "email" && (
              <div className="flex gap-2">
                <Button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex-1"
                >
                  {verifying && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Check Verification
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setClaimData(null);
                    setVerificationResult(null);
                  }}
                >
                  Start Over
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
