import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Server, Zap, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IntelligenceSummaryProps {
  domain: string;
  confidence: number;
  techCount: number;
  edgeProvider: string | null;
  originHost: string | null;
  sslValid: boolean;
  lastScan: Date | null;
  onScan: () => void;
  loading?: boolean;
}

export function IntelligenceSummary({
  domain,
  confidence,
  techCount,
  edgeProvider,
  originHost,
  sslValid,
  lastScan,
  onScan,
  loading = false,
}: IntelligenceSummaryProps) {
  const hostingDisplay =
    [edgeProvider, originHost].filter(Boolean).join(" + ") || "Unknown";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Intelligence Summary
        </CardTitle>
        <div className="text-xs text-muted-foreground">{domain}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="h-4 w-4" />
              Technologies
            </div>
            <div className="text-2xl font-bold">{techCount}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Security
            </div>
            <div className="text-sm font-semibold">
              {sslValid ? (
                <span className="text-green-600 dark:text-green-400">
                  ✓ SSL Valid
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  ✗ SSL Invalid
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              Confidence
            </div>
            <div className="text-2xl font-bold">{confidence}%</div>
          </div>
        </div>

        {/* Hosting Info */}
        <div className="space-y-1 pt-2 border-t">
          <div className="text-sm text-muted-foreground">Hosting</div>
          <div className="text-sm font-semibold">{hostingDisplay}</div>
        </div>

        {/* Last Scan */}
        {lastScan && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Clock className="h-3 w-3" />
            Last scan {formatDistanceToNow(lastScan, { addSuffix: true })}
          </div>
        )}

        {/* Scan Button */}
        <Button
          onClick={onScan}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          {loading ? "Scanning..." : "Scan Again"}
        </Button>
      </CardContent>
    </Card>
  );
}
