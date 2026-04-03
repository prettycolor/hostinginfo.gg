/**
 * Summary Banner Component
 * Top-level summary with decision and top fixes
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ScanResult } from "./types";

interface SummaryBannerProps {
  scan: ScanResult;
}

export function SummaryBanner({ scan }: SummaryBannerProps) {
  if (!scan.decision || !scan.summary) return null;
  const summary =
    typeof scan.summary === "string"
      ? (() => {
          try {
            return JSON.parse(scan.summary);
          } catch {
            return {};
          }
        })()
      : scan.summary;
  const topReasons: string[] = Array.isArray(summary?.topReasons)
    ? summary.topReasons.filter(
        (reason: unknown): reason is string => typeof reason === "string",
      )
    : Array.isArray(summary?.top_reasons)
      ? summary.top_reasons.filter(
          (reason: unknown): reason is string => typeof reason === "string",
        )
      : [];
  const topFixes: string[] = Array.isArray(summary?.topFixes)
    ? summary.topFixes.filter(
        (fix: unknown): fix is string => typeof fix === "string",
      )
    : Array.isArray(summary?.top_fixes)
      ? summary.top_fixes.filter(
          (fix: unknown): fix is string => typeof fix === "string",
        )
      : [];

  const config = {
    ready: {
      icon: CheckCircle2,
      iconColor: "text-emerald-300",
    },
    fix_first: {
      icon: AlertTriangle,
      iconColor: "text-amber-300",
    },
    not_ready: {
      icon: XCircle,
      iconColor: "text-rose-300",
    },
  }[scan.decision];

  const Icon = config.icon;

  return (
    <Alert className="border-border/70 bg-card/50">
      <Icon className={`h-5 w-5 ${config.iconColor}`} />
      <AlertTitle className="text-base font-semibold sm:text-lg">
        {summary?.headline || "SEO scan summary"}
      </AlertTitle>
      <AlertDescription className="space-y-4">
        {topReasons.length > 0 ? (
          <div className="mt-3 space-y-2">
            {topReasons.map((reason, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="text-sm">{reason}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Summary reasons were not provided for this scan.
          </div>
        )}

        {topFixes.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="font-semibold mb-2">Top fixes:</div>
            <ul className="list-disc list-inside space-y-1">
              {topFixes.map((fix, index) => (
                <li key={index} className="text-sm">
                  {fix}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
