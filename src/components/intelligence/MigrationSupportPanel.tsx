import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

interface MigrationSupportPanelProps {
  technology: {
    wordpress?: {
      version?: string;
      versionUncertain?: boolean;
      versionReliability?: string;
    };
    php?: {
      version?: string;
    };
    controlPanel?: {
      reason?: string;
      recommendation?: string;
      needsPaidSupport?: boolean;
    };
  };
  compact?: boolean;
  showSupportButton?: boolean;
}

function parseMajorMinorVersion(
  version: string | null | undefined,
): number | null {
  if (!version) return null;
  const match = version.match(/^(\d+)\.(\d+)/);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return Number(`${major}.${minor}`);
}

export function MigrationSupportPanel({
  technology,
  compact = false,
  showSupportButton = true,
}: MigrationSupportPanelProps) {
  const [showPaidSupportDetails, setShowPaidSupportDetails] = useState(false);

  const wpVersion = technology?.wordpress?.version;
  const phpVersion = technology?.php?.version;
  const reason = technology?.controlPanel?.reason;
  const wpVersionNumber = parseMajorMinorVersion(wpVersion);
  const phpVersionNumber = parseMajorMinorVersion(phpVersion);
  const wpVersionUncertain =
    technology?.wordpress?.versionUncertain ??
    technology?.wordpress?.versionReliability === "low";
  const wpMeetsMinimum = wpVersionNumber !== null && wpVersionNumber >= 6.6;
  const phpMeetsMinimum = phpVersionNumber !== null && phpVersionNumber >= 7.4;

  const needsSupport =
    technology?.controlPanel?.recommendation === "paid-support" ||
    technology?.controlPanel?.needsPaidSupport ||
    (!wpMeetsMinimum && !!wpVersion) ||
    (!phpMeetsMinimum && !!phpVersion);

  const baseTextClass = compact ? "text-xs" : "text-sm";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {wpVersion && (
          <div className="space-y-1">
            <div
              className={`flex items-center ${compact ? "justify-between gap-3" : "gap-2"} ${baseTextClass}`}
            >
              {compact && (
                <span className="text-muted-foreground">WordPress Version</span>
              )}

              <div
                className={`flex items-center gap-2 ${compact ? "text-right" : ""}`}
              >
                {wpVersionUncertain ? (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                ) : wpMeetsMinimum ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}

                {wpVersionUncertain ? (
                  <span className="text-muted-foreground">
                    {compact
                      ? `${wpVersion} (unverified)`
                      : `WordPress ${wpVersion} (public estimate - verify actual version before migration; 6.6+ required)`}
                  </span>
                ) : wpMeetsMinimum ? (
                  <span className="text-muted-foreground">
                    {compact
                      ? `${wpVersion} (meets 6.6+)`
                      : `WordPress ${wpVersion} (meets minimum 6.6+ requirement)`}
                  </span>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-orange-500 underline underline-offset-4 hover:text-orange-400 text-left"
                      >
                        {compact
                          ? `${wpVersion} (too old)`
                          : `WordPress ${wpVersion} (too old)`}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      className="w-80 space-y-1 text-xs"
                    >
                      <p className="font-semibold text-foreground">
                        Migration support checklist
                      </p>
                      <p>1. Confirm WordPress core is 6.6+ and PHP is 7.4+.</p>
                      <p>
                        2. Gather admin access + current host/control panel
                        details.
                      </p>
                      <p>
                        3. Share the domain and checklist results with support
                        for a migration plan.
                      </p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {wpVersionUncertain && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={
                      compact
                        ? "text-[11px] text-primary underline underline-offset-4 hover:text-primary/80"
                        : "ml-6 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                    }
                  >
                    Verify true WordPress version
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  align="start"
                  className="w-80 space-y-1 text-xs"
                >
                  <p className="font-semibold text-foreground">
                    Verify true WordPress version
                  </p>
                  <p>1. WP Admin: Dashboard - Updates shows core version.</p>
                  <p>
                    2. WP-CLI (if available): run{" "}
                    <code className="font-mono">wp core version</code>.
                  </p>
                  <p>
                    3. File check: open{" "}
                    <code className="font-mono">wp-includes/version.php</code>{" "}
                    and read <code className="font-mono">$wp_version</code>.
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {phpVersion && (
          <div
            className={`flex items-center ${compact ? "justify-between gap-3" : "gap-2"} ${baseTextClass}`}
          >
            {compact && (
              <span className="text-muted-foreground">PHP Version</span>
            )}

            <div
              className={`flex items-center gap-2 ${compact ? "text-right" : ""}`}
            >
              {phpVersionNumber === null ? (
                <Info className="h-4 w-4 text-blue-500" />
              ) : phpMeetsMinimum ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}

              {phpVersionNumber === null ? (
                <span className="text-muted-foreground">
                  {compact
                    ? `${phpVersion} (unverified)`
                    : `PHP ${phpVersion} (version could not be validated)`}
                </span>
              ) : phpMeetsMinimum ? (
                <span className="text-muted-foreground">
                  {compact
                    ? `${phpVersion} (meets 7.4+)`
                    : `PHP ${phpVersion} (meets minimum 7.4+ requirement)`}
                </span>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-orange-500 underline underline-offset-4 hover:text-orange-400 text-left"
                    >
                      {compact
                        ? `${phpVersion} (too old)`
                        : `PHP ${phpVersion} (too old)`}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    className="w-80 space-y-1 text-xs"
                  >
                    <p className="font-semibold text-foreground">
                      PHP update checklist
                    </p>
                    <p>
                      1. Confirm your current PHP version in hosting control
                      panel or Site Health.
                    </p>
                    <p>
                      2. Backup site/files/database and check plugin/theme
                      compatibility with PHP 7.4+.
                    </p>
                    <p>
                      3. Upgrade PHP to 7.4+ and retest site functionality
                      before migration.
                    </p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}
      </div>

      {needsSupport && showSupportButton && (
        <>
          <Button
            variant="default"
            size="sm"
            className="mt-2 bg-orange-700 hover:bg-orange-600 text-white border border-orange-300/40 shadow-[0_0_14px_rgba(194,65,12,0.32)] hover:shadow-[0_0_18px_rgba(194,65,12,0.42)]"
            onClick={() => setShowPaidSupportDetails((prev) => !prev)}
          >
            {showPaidSupportDetails
              ? "Hide Migration Support Details"
              : "Contact Support for Migration Help"}
          </Button>

          {showPaidSupportDetails && (
            <div className="space-y-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 shadow-[0_0_28px_rgba(249,115,22,0.25)] animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                <AlertTriangle className="h-3.5 w-3.5" />
                PAID SUPPORT RECOMMENDED
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    Critical Updates Required
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reason ||
                      "This site needs professional migration help before it can be safely moved."}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-3">
                <h5 className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2">
                  Updates without a developer can break the site
                </h5>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>
                    - Outdated software can require careful migration planning.
                  </li>
                  <li>
                    - Professional migration helps reduce downtime and data loss
                    risk.
                  </li>
                  <li>
                    - Sites on older stacks have higher security and
                    compatibility risk.
                  </li>
                </ul>
              </div>

              <div className="text-xs pt-1 border-t border-orange-500/20">
                <span className="text-muted-foreground">
                  Current versions:{" "}
                </span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  WP {wpVersion || "unknown"} | PHP {phpVersion || "unknown"}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
