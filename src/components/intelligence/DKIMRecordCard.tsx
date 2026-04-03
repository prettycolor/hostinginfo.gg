import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DKIMRecordCardProps {
  present: boolean;
  status: "valid" | "warning" | "error" | "missing";
  selectors?: string[];
  keyLength?: number;
  issues?: string[];
  compact?: boolean;
}

export function DKIMRecordCard({
  present,
  status,
  selectors = [],
  keyLength,
  issues = [],
  compact = false,
}: DKIMRecordCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "valid":
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
          textColor: "text-green-600 dark:text-green-400",
          badge: {
            label: "Valid",
            color:
              "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
          },
          message: "DKIM signature is properly configured",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          textColor: "text-yellow-600 dark:text-yellow-400",
          badge: {
            label: "Warning",
            color:
              "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
          },
          message: "DKIM signature has issues",
        };
      case "error":
        return {
          icon: <XCircle className="h-6 w-6 text-red-500" />,
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          textColor: "text-red-600 dark:text-red-400",
          badge: {
            label: "Error",
            color:
              "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
          },
          message: "DKIM signature has critical errors",
        };
      case "missing":
        return {
          icon: <XCircle className="h-6 w-6 text-red-500" />,
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          textColor: "text-red-600 dark:text-red-400",
          badge: {
            label: "Missing",
            color:
              "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
          },
          message: "No DKIM signature found",
        };
    }
  };

  const getKeyStrength = (length?: number) => {
    if (!length)
      return {
        label: "Unknown",
        color:
          "bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400",
      };
    if (length >= 2048)
      return {
        label: "Strong",
        color:
          "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
      };
    if (length >= 1024)
      return {
        label: "Moderate",
        color:
          "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
      };
    return {
      label: "Weak",
      color: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
    };
  };

  const config = getStatusConfig();
  const keyStrength = getKeyStrength(keyLength);

  if (!present || status === "missing") {
    return (
      <Card
        className={`${compact ? "border border-border bg-card/50" : "border-2 border-red-500/20"}`}
      >
        <CardContent className={compact ? "pt-4" : "pt-6"}>
          <div
            className={`flex items-start justify-between gap-3 ${compact ? "mb-3" : "mb-4"}`}
          >
            <div className="flex-1 min-w-0">
              <h3 className={`${compact ? "text-lg" : "text-xl"} font-bold`}>
                DKIM Signature
              </h3>
              <p className="text-sm text-muted-foreground">
                DomainKeys Identified Mail
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
            >
              Not Configured
            </Badge>
          </div>
          <div
            className={`${compact ? "p-4 border mb-4" : "p-6 border-2 mb-6"} bg-red-500/5 border-red-500/20 rounded-lg`}
          >
            <div className="flex items-start gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <div className="font-semibold text-red-600 dark:text-red-400 mb-2">
                  No DKIM Signature Found
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Your domain does not have DKIM enabled. DKIM signs outgoing
                  mail so recipients can verify the message was not altered and
                  was authorized by your domain.
                </p>
                <div className="text-sm font-semibold text-muted-foreground mb-2">
                  How to Set Up DKIM:
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Generate a DKIM key pair with your provider</li>
                  <li>Add the public key as a DNS TXT record</li>
                  <li>Enable signing on your outbound mail server</li>
                  <li>Validate signatures after deployment</li>
                </ol>
              </div>
            </div>
          </div>

          {!compact && (
            <div className="p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    What is DKIM?
                  </div>
                  <p className="text-sm text-muted-foreground">
                    DKIM uses cryptographic signatures to validate email
                    integrity and sender authenticity. It complements SPF and
                    DMARC.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? "border border-border bg-card/50" : "border-2"}>
      <CardContent className={compact ? "pt-4" : "pt-6"}>
        <div
          className={`flex items-start justify-between gap-3 ${compact ? "mb-4" : "mb-6"}`}
        >
          <div className="flex-1 min-w-0">
            <h3 className={`${compact ? "text-lg" : "text-xl"} font-bold`}>
              DKIM Signature
            </h3>
            <p className="text-sm text-muted-foreground">
              DomainKeys Identified Mail
            </p>
          </div>
          <Badge variant="outline" className={config.badge.color}>
            {config.badge.label}
          </Badge>
        </div>

        <div
          className={`${compact ? "p-3 border mb-4 bg-muted/40" : `p-4 border-2 mb-6 ${config.bgColor} ${config.borderColor}`} rounded-lg`}
        >
          <div className="flex items-center gap-3">
            {!compact && config.icon}
            <div className="flex-1">
              <div className={`font-semibold ${config.textColor}`}>
                {config.message}
              </div>
              {!compact && (
                <p className="text-sm text-muted-foreground mt-1">
                  {status === "valid" &&
                    "Your emails are cryptographically signed and verifiable."}
                  {status === "warning" &&
                    "DKIM is active but has issues that should be corrected."}
                  {status === "error" &&
                    "DKIM errors may reduce deliverability and trust."}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 ${compact ? "lg:grid-cols-2" : "md:grid-cols-2"} gap-4 mb-6`}
        >
          {keyLength && (
            <div className="p-4 rounded-lg border-2 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Key Length
                </span>
                {!compact && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button>
                          <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          2048-bit or higher keys are recommended.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="text-3xl font-bold mb-2">{keyLength}-bit</div>
              <Badge variant="outline" className={keyStrength.color}>
                {keyStrength.label}
              </Badge>
            </div>
          )}

          <div className="p-4 rounded-lg border-2 bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Active Selectors
              </span>
              {!compact && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button>
                        <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Selectors allow multiple DKIM keys for one domain.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="text-3xl font-bold mb-2">{selectors.length}</div>
            <div className="text-xs text-muted-foreground">
              {selectors.length === 1 ? "Single key" : "Multiple keys"}
            </div>
          </div>
        </div>

        {selectors.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                DKIM Selectors
              </span>
              {!compact && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button>
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Selectors are DNS names used to retrieve the public key
                        for verification.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="space-y-2">
              {selectors.map((selector, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="font-mono text-sm">
                    {selector}._domainkey
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {issues.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Issues Found
              </span>
            </div>
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-yellow-500/5 border-2 border-yellow-500/20 rounded-lg"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {keyLength && keyLength < 2048 && (
          <div
            className={`${compact ? "p-3 border" : "p-4 border-2"} mb-6 bg-yellow-500/5 border-yellow-500/20 rounded-lg`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                  Weak Key Strength
                </div>
                <p className="text-sm text-muted-foreground">
                  Your DKIM key is {keyLength}-bit. 2048-bit or higher is
                  recommended.
                </p>
              </div>
            </div>
          </div>
        )}

        {!compact && (
          <>
            <div className="pt-6 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  How DKIM Works
                </span>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground mb-1">
                      Email Signing
                    </div>
                    <p>Your sender signs each message with a private key.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground mb-1">
                      DNS Lookup
                    </div>
                    <p>
                      The receiver fetches the public key from your selector DNS
                      record.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground mb-1">
                      Verification
                    </div>
                    <p>
                      The receiver verifies signature integrity before accepting
                      the message.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    DKIM Best Practices
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>- Use 2048-bit+ RSA keys.</li>
                    <li>- Rotate DKIM keys every 6-12 months.</li>
                    <li>- Use distinct selectors per sender/service.</li>
                    <li>- Keep private keys secure.</li>
                    <li>- Pair DKIM with SPF and DMARC.</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
