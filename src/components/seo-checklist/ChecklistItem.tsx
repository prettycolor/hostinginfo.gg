/**
 * Checklist Item Component
 * Individual checklist item with evidence drawer
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ChecklistItem as ChecklistItemType } from "./types";

interface ChecklistItemProps {
  item: ChecklistItemType;
}

export function ChecklistItem({ item }: ChecklistItemProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const hasEvidence = Boolean(item.evidence);

  const statusConfig = {
    good: {
      icon: CheckCircle2,
      iconColor: "text-emerald-300",
      badgeVariant: "outline" as const,
      badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      iconWrapClass: "border-emerald-500/30 bg-muted/20",
      label: "Good",
    },
    needs_work: {
      icon: AlertTriangle,
      iconColor: "text-amber-300",
      badgeVariant: "outline" as const,
      badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      iconWrapClass: "border-amber-500/30 bg-muted/20",
      label: "Needs work",
    },
    critical: {
      icon: XCircle,
      iconColor: "text-rose-300",
      badgeVariant: "outline" as const,
      badgeClass: "border-rose-500/40 bg-rose-500/10 text-rose-200",
      iconWrapClass: "border-rose-500/30 bg-muted/20",
      label: "Critical",
    },
    unknown: {
      icon: HelpCircle,
      iconColor: "text-slate-300",
      badgeVariant: "outline" as const,
      badgeClass: "border-slate-400/40 bg-slate-500/10 text-slate-200",
      iconWrapClass: "border-slate-400/30 bg-muted/20",
      label: "Unknown",
    },
  }[item.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background/50 shadow-sm">
      <div className="border-b bg-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`rounded-md border p-1.5 ${statusConfig.iconWrapClass}`}
            >
              <StatusIcon className={`h-4 w-4 ${statusConfig.iconColor}`} />
            </div>
            <div className="truncate text-sm font-semibold sm:text-base">
              {item.label}
            </div>
          </div>
          <Badge
            variant={statusConfig.badgeVariant}
            className={statusConfig.badgeClass}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Finding
          </div>
          <div className="mt-1 text-sm text-foreground">
            {hasEvidence
              ? renderFindingValue(item.evidence?.foundValue)
              : "No direct finding value was returned for this check."}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Why this matters
          </div>
          <p className="mt-1 text-sm text-foreground">{item.why}</p>
        </div>

        {item.fix && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              Recommended action
            </div>
            <p className="mt-1 text-sm text-foreground">{item.fix}</p>
          </div>
        )}

        {item.evidence && (
          <div className="rounded-lg border bg-card/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evidence
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEvidence(!showEvidence)}
                className="h-7 px-2 text-[11px]"
              >
                {showEvidence ? (
                  <>
                    <ChevronUp className="mr-1 h-3 w-3" />
                    Hide evidence
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3 w-3" />
                    View evidence
                  </>
                )}
              </Button>
            </div>

            {showEvidence && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border bg-muted/40 p-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    URL tested
                  </div>
                  <div className="mt-1 break-all text-xs text-foreground">
                    {item.evidence.url}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/40 p-2 sm:col-span-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Raw evidence
                  </div>
                  <div className="mt-1 text-xs text-foreground">
                    {typeof item.evidence.foundValue === "object" ? (
                      <pre className="whitespace-pre-wrap break-words rounded bg-background/70 p-2 text-[11px]">
                        {JSON.stringify(item.evidence.foundValue, null, 2)}
                      </pre>
                    ) : (
                      String(item.evidence.foundValue)
                    )}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/40 p-2 sm:col-span-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    What this means
                  </div>
                  <div className="mt-1 text-xs text-foreground">
                    {item.evidence.whatThisMeans}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderFindingValue(foundValue: unknown) {
  if (foundValue === null || foundValue === undefined) {
    return "No detectable value returned.";
  }

  if (typeof foundValue === "object") {
    return (
      <pre className="whitespace-pre-wrap break-words rounded bg-background/70 p-2 text-xs">
        {JSON.stringify(foundValue, null, 2)}
      </pre>
    );
  }

  const normalized = String(foundValue).trim();
  return normalized.length > 0 ? normalized : "No detectable value returned.";
}
