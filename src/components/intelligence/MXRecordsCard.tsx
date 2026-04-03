import { Copy, CheckCircle2, AlertTriangle, Info } from "lucide-react";
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

interface MXRecord {
  priority: number;
  exchange: string;
  provider?: string;
}

interface MXRecordsCardProps {
  records: MXRecord[];
  status: "valid" | "warning" | "error";
  provider?: string;
  compact?: boolean;
}

export function MXRecordsCard({
  records,
  status,
  provider,
  compact = false,
}: MXRecordsCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
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
          message: "MX records are properly configured",
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
          message: "MX records need attention",
        };
      case "error":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          textColor: "text-red-600 dark:text-red-400",
          badge: {
            label: "Error",
            color:
              "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
          },
          message: "MX records have critical issues",
        };
    }
  };

  const config = getStatusConfig();

  // Sort records by priority (lower number = higher priority)
  const sortedRecords = [...records].sort((a, b) => a.priority - b.priority);

  if (records.length === 0) {
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
                MX Records
              </h3>
              <p className="text-sm text-muted-foreground">
                Mail server configuration
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
            >
              No Records
            </Badge>
          </div>
          <div
            className={`${compact ? "p-4 border" : "p-6 border-2"} bg-red-500/5 border-red-500/20 rounded-lg`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <div className="font-semibold text-red-600 dark:text-red-400 mb-2">
                  No MX Records Found
                </div>
                <p className="text-sm text-muted-foreground">
                  {compact
                    ? "Email cannot be delivered until MX records are configured for this domain."
                    : "Your domain has no MX records configured. This means email cannot be delivered to your domain. You need to add MX records pointing to your mail server."}
                </p>
              </div>
            </div>
          </div>
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
              MX Records
            </h3>
            <p className="text-sm text-muted-foreground">
              Mail server configuration - {records.length} record
              {records.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {provider && (
              <Badge
                variant="outline"
                className="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
              >
                {provider}
              </Badge>
            )}
            <Badge variant="outline" className={config.badge.color}>
              {config.badge.label}
            </Badge>
          </div>
        </div>

        {/* Status Summary */}
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
                    "Email can be delivered to your domain successfully."}
                  {status === "warning" &&
                    "Some configuration issues detected that may affect deliverability."}
                  {status === "error" &&
                    "Critical issues detected that will prevent email delivery."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* MX Records List */}
        <div className="space-y-3">
          <div
            className={`flex items-center gap-2 ${compact ? "mb-2" : "mb-3"}`}
          >
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Mail Servers (Priority Order)
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
                      MX records tell email servers where to deliver mail for
                      your domain. Lower priority numbers are tried first.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {sortedRecords.map((record, index) => {
            const isCopied = copiedIndex === index;
            return (
              <div
                key={index}
                className={`${compact ? "p-3 border" : "p-4 border-2"} rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div
                      className={`${compact ? "w-10 h-10" : "w-12 h-12"} rounded-lg bg-primary/10 flex items-center justify-center`}
                    >
                      <span
                        className={`${compact ? "text-lg" : "text-xl"} font-bold text-primary`}
                      >
                        {record.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Priority {record.priority}
                      </span>
                      {index === 0 && (
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs"
                        >
                          Primary
                        </Badge>
                      )}
                      {record.provider && (
                        <Badge variant="outline" className="text-xs">
                          {record.provider}
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-sm break-all">
                      {record.exchange}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(record.exchange, index)}
                    className="flex-shrink-0"
                  >
                    {isCopied ? (
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
              </div>
            );
          })}
        </div>

        {/* Best Practices */}
        {!compact && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Best Practices
              </span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Have at least 2 MX records for redundancy</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Use different priority values (e.g., 10, 20, 30)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  Point to mail servers in different locations for reliability
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  Ensure all MX records point to valid, reachable mail servers
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Warning for single MX record */}
        {!compact && records.length === 1 && (
          <div className="mt-6 p-4 bg-yellow-500/5 border-2 border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                  Single Point of Failure
                </div>
                <p className="text-sm text-muted-foreground">
                  You only have one MX record. Consider adding a backup mail
                  server with a higher priority number to ensure email delivery
                  if your primary server is unavailable.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
