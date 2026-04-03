/**
 * Score Panel Component
 * Display total score and category scores
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ChecklistCategoryKey, ScanResult } from "./types";

interface ScorePanelProps {
  scan: ScanResult;
  activeCategory: ChecklistCategoryKey | "all";
  onCategorySelect: (category: ChecklistCategoryKey | "all") => void;
}

export function ScorePanel({
  scan,
  activeCategory,
  onCategorySelect,
}: ScorePanelProps) {
  if (!scan.score) return null;

  const rawScore =
    typeof scan.score === "string"
      ? (() => {
          try {
            return JSON.parse(scan.score);
          } catch {
            return null;
          }
        })()
      : scan.score;
  if (!rawScore || typeof rawScore !== "object") {
    return null;
  }

  const rawScoreRecord = rawScore as Record<string, unknown>;
  const totalScore = toScore(rawScoreRecord.total);

  const rawCategories =
    typeof rawScoreRecord.categories === "string"
      ? (() => {
          try {
            return JSON.parse(rawScoreRecord.categories);
          } catch {
            return null;
          }
        })()
      : rawScoreRecord.categories;
  const categoriesRecord =
    rawCategories && typeof rawCategories === "object"
      ? (rawCategories as Record<string, unknown>)
      : null;

  const getScoreBand = (score: number) => {
    if (score >= 80) {
      return {
        label: "Strong",
        dotClass: "bg-emerald-500",
        badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      };
    }
    if (score >= 60) {
      return {
        label: "Watch",
        dotClass: "bg-amber-500",
        badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      };
    }
    return {
      label: "Needs focus",
      dotClass: "bg-rose-500",
      badgeClass: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    };
  };

  const categories: Array<{ key: ChecklistCategoryKey; label: string }> = [
    { key: "access", label: "Access" },
    { key: "mobile_speed", label: "Mobile Speed" },
    { key: "page_basics", label: "Page Basics" },
    { key: "site_health", label: "Site Health" },
    { key: "tracking", label: "Measured Signals" },
  ];
  const totalBand = getScoreBand(totalScore);

  const selectCategory = (key: ChecklistCategoryKey | "all") => {
    onCategorySelect(key);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <Card
        role="button"
        tabIndex={0}
        onClick={() => selectCategory("all")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectCategory("all");
          }
        }}
        className={`cursor-pointer border-border/70 bg-card/60 backdrop-blur transition-all hover:border-primary/50 hover:bg-accent/20 ${
          activeCategory === "all"
            ? "border-primary/60 ring-2 ring-primary/50"
            : ""
        }`}
      >
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">SEO Checklist Score</CardTitle>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary"
            >
              Overview
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-foreground">
                {totalScore}
              </span>
              <span className="pb-1 text-xl text-muted-foreground">/100</span>
            </div>
            <Badge variant="outline" className={totalBand.badgeClass}>
              <span className="inline-flex items-center gap-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${totalBand.dotClass}`}
                />
                {totalBand.label}
              </span>
            </Badge>
          </div>
          <Progress value={totalScore} className="h-2.5" />
          <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-muted-foreground">
            Opens the full checklist overview and all categories.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map(({ key, label }) => {
              const value = toScore(categoriesRecord?.[key]);
              const isActive = activeCategory === key;
              const scoreBand = getScoreBand(value);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectCategory(key)}
                  className={`rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/20 ${
                    isActive
                      ? "border-primary/60 bg-primary/10 ring-2 ring-primary/50"
                      : "border-border/70 bg-card/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {label}
                    </span>
                    <Badge variant="outline" className={scoreBand.badgeClass}>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${scoreBand.dotClass}`}
                        />
                        {scoreBand.label}
                      </span>
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <Progress value={value} className="h-1.5 flex-1" />
                    <span className="text-sm font-semibold text-foreground">
                      {value}/100
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Click to open checklist
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function toScore(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}
