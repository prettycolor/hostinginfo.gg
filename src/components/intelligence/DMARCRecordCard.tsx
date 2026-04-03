import { CheckCircle2, XCircle, AlertTriangle, Copy, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DMARCRecordCardProps {
  present: boolean;
  record?: string;
  status: "valid" | "warning" | "error" | "missing";
  policy?: "none" | "quarantine" | "reject";
  subdomainPolicy?: "none" | "quarantine" | "reject";
  percentage?: number;
  reportingEmails?: string[];
  issues?: string[];
  compact?: boolean;
}

export function DMARCRecordCard({
  present,
  record,
  status,
  policy,
  subdomainPolicy,
  percentage,
  reportingEmails = [],
  issues = [],
  compact = false,
}: DMARCRecordCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
          message: "DMARC policy is properly configured",
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
          message: "DMARC policy needs improvement",
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
          message: "DMARC policy has critical errors",
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
          message: "No DMARC policy found",
        };
    }
  };

  const getPolicyConfig = (policyValue?: string) => {
    switch (policyValue) {
      case "reject":
        return {
          label: "Reject",
          color:
            "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
          strength: "Strong",
        };
      case "quarantine":
        return {
          label: "Quarantine",
          color:
            "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
          strength: "Moderate",
        };
      case "none":
        return {
          label: "None",
          color:
            "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
          strength: "Weak",
        };
      default:
        return {
          label: "Unknown",
          color:
            "bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400",
          strength: "Unknown",
        };
    }
  };

  const config = getStatusConfig();
  const policyConfig = getPolicyConfig(policy);
  const subdomainPolicyConfig = getPolicyConfig(subdomainPolicy);

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
                DMARC Policy
              </h3>
              <p className="text-sm text-muted-foreground">
                Domain-based Message Authentication
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
                  No DMARC Policy Found
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Your domain does not have a DMARC policy. DMARC builds on SPF
                  and DKIM and lets you enforce handling for failed
                  authentication.
                </p>
                <div className="text-sm font-semibold text-muted-foreground mb-2">
                  Recommended DMARC Record:
                </div>
                <div className="bg-muted/50 p-3 rounded font-mono text-sm break-all">
                  v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com;
                  pct=100; adkim=s; aspf=s
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Start with p=none for monitoring, then move to quarantine or
                  reject.
                </p>
              </div>
            </div>
          </div>

          {!compact && (
            <div className="p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    What is DMARC?
                  </div>
                  <p className="text-sm text-muted-foreground">
                    DMARC tells receiving mail servers what to do with messages
                    that fail SPF and DKIM and provides reporting visibility for
                    your domain.
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
              DMARC Policy
            </h3>
            <p className="text-sm text-muted-foreground">
              Domain-based Message Authentication
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
                    "Your DMARC policy provides strong email authentication and reporting."}
                  {status === "warning" &&
                    "Your DMARC policy is active but could be strengthened."}
                  {status === "error" &&
                    "Your DMARC policy has errors that may affect email security."}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 ${compact ? "lg:grid-cols-3" : "md:grid-cols-2"} gap-4 mb-6`}
        >
          <div className="p-4 rounded-lg border-2 bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Domain Policy
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
                        Action to take for emails that fail authentication
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Badge
              variant="outline"
              className={`${policyConfig.color} text-lg px-3 py-1`}
            >
              {policyConfig.label}
            </Badge>
            <div className="text-xs text-muted-foreground mt-2">
              Protection: {policyConfig.strength}
            </div>
          </div>

          {subdomainPolicy && (
            <div className="p-4 rounded-lg border-2 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Subdomain Policy
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
                          Policy for subdomains (for example, mail.example.com)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Badge
                variant="outline"
                className={`${subdomainPolicyConfig.color} text-lg px-3 py-1`}
              >
                {subdomainPolicyConfig.label}
              </Badge>
              <div className="text-xs text-muted-foreground mt-2">
                Protection: {subdomainPolicyConfig.strength}
              </div>
            </div>
          )}

          {percentage !== undefined && (
            <div className="p-4 rounded-lg border-2 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Policy Application
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
                          Percentage of failing messages that receive policy
                          treatment
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="text-3xl font-bold">{percentage}%</div>
              <div className="text-xs text-muted-foreground mt-2">
                {percentage === 100
                  ? "Full enforcement"
                  : "Partial enforcement"}
              </div>
            </div>
          )}
        </div>

        {record && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                DMARC Record
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(record)}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div
              className={`${compact ? "p-3 border" : "p-4 border-2"} bg-muted/50 rounded-lg font-mono text-sm break-all`}
            >
              {record}
            </div>
          </div>
        )}

        {reportingEmails.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Report Recipients
              </span>
            </div>
            <div className="space-y-2">
              {reportingEmails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="font-mono text-sm">{email}</span>
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

        {policy === "none" && (
          <div
            className={`${compact ? "p-3 border" : "p-4 border-2"} mb-6 bg-yellow-500/5 border-yellow-500/20 rounded-lg`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                  Monitoring Mode Only
                </div>
                <p className="text-sm text-muted-foreground">
                  Your policy is set to none. Move to quarantine or reject for
                  stronger enforcement once monitoring is stable.
                </p>
              </div>
            </div>
          </div>
        )}

        {!compact && (
          <div className="pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                DMARC Tags Guide
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                  v=DMARC1
                </code>
                <span className="text-muted-foreground">DMARC version</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                  p=
                </code>
                <span className="text-muted-foreground">
                  Domain policy (none, quarantine, reject)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                  sp=
                </code>
                <span className="text-muted-foreground">Subdomain policy</span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                  rua=
                </code>
                <span className="text-muted-foreground">
                  Aggregate report recipient
                </span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                  pct=
                </code>
                <span className="text-muted-foreground">
                  Percent of messages to enforce policy on
                </span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                  adkim=
                </code>
                <span className="text-muted-foreground">
                  DKIM alignment mode
                </span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                  aspf=
                </code>
                <span className="text-muted-foreground">
                  SPF alignment mode
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
