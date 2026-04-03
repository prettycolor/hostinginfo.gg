/**
 * Decision Badge Component
 * Displays decision status with appropriate styling
 */

import { Badge } from "@/components/ui/badge";
import type { Decision } from "./types";

interface DecisionBadgeProps {
  decision: Decision;
}

export function DecisionBadge({ decision }: DecisionBadgeProps) {
  const config = {
    ready: {
      label: "Ready",
      variant: "outline" as const,
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    },
    fix_first: {
      label: "Fix First",
      variant: "outline" as const,
      className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    },
    not_ready: {
      label: "Not Ready",
      variant: "outline" as const,
      className: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    },
  }[decision];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
