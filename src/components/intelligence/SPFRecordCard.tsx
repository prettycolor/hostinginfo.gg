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

interface SPFRecordCardProps {
  present: boolean;
  record?: string;
  status: "valid" | "warning" | "error" | "missing";
  mechanisms?: string[];
  issues?: string[];
  compact?: boolean;
}

export function SPFRecordCard({
  present,
  record,
  status,
  mechanisms = [],
  issues = [],
  compact = false,
}: SPFRecordCardProps) {
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
          message: "SPF record is properly configured",
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
          message: "SPF record has issues",
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
          message: "SPF record has critical errors",
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
          message: "No SPF record found",
        };
    }
  };

  const config = getStatusConfig();

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
                SPF Record
              </h3>
              <p className="text-sm text-muted-foreground">
                Sender Policy Framework
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
                  No SPF Record Found
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Your domain does not have an SPF record. This makes your
                  domain vulnerable to spoofing and can cause legitimate emails
                  to be treated as spam.
                </p>
                <div className="text-sm font-semibold text-muted-foreground mb-2">
                  Recommended SPF Record:
                </div>
                <div className="bg-muted/50 p-3 rounded font-mono text-sm break-all">
                  v=spf1 include:_spf.google.com ~all
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Replace with your provider include value (Google, Microsoft,
                  SendGrid, etc.).
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
                    What is SPF?
                  </div>
                  <p className="text-sm text-muted-foreground">
                    SPF (Sender Policy Framework) lists which mail servers are
                    allowed to send mail for your domain. It helps receivers
                    reject spoofed messages.
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
              SPF Record
            </h3>
            <p className="text-sm text-muted-foreground">
              Sender Policy Framework
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
                    "Your SPF record is correctly configured and helps prevent spoofing."}
                  {status === "warning" &&
                    "Your SPF record works but has issues that should be fixed."}
                  {status === "error" &&
                    "Your SPF record has critical errors that can hurt deliverability."}
                </p>
              )}
            </div>
          </div>
        </div>

        {record && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  SPF Record
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
                          This TXT record defines authorized senders for your
                          domain and how unauthorized senders are handled.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
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

        {mechanisms.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Authorized Senders
              </span>
            </div>
            <div className="space-y-2">
              {mechanisms.map((mechanism, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="font-mono text-sm">{mechanism}</span>
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

        {!compact && (
          <>
            <div className="pt-6 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  SPF Syntax Guide
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                    v=spf1
                  </code>
                  <span className="text-muted-foreground">
                    SPF version (required)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                    include:
                  </code>
                  <span className="text-muted-foreground">
                    Include another domain SPF record
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                    ip4:
                  </code>
                  <span className="text-muted-foreground">
                    Authorize an IPv4 address or range
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                    a
                  </code>
                  <span className="text-muted-foreground">
                    Authorize domain A records
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                    mx
                  </code>
                  <span className="text-muted-foreground">
                    Authorize domain MX records
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                    ~all
                  </code>
                  <span className="text-muted-foreground">
                    Soft fail (recommended)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                    -all
                  </code>
                  <span className="text-muted-foreground">
                    Hard fail (reject unauthorized mail)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    SPF Best Practices
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>- Keep SPF records under 10 DNS lookups.</li>
                    <li>- Prefer ~all before moving to strict -all.</li>
                    <li>- Include every service that sends on your domain.</li>
                    <li>- Test SPF changes before production rollout.</li>
                    <li>- Pair SPF with DKIM and DMARC.</li>
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
