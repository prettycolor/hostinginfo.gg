/**
 * Checklist Cards Component
 * Display all checklist categories
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartLine,
  FileText,
  MousePointerClick,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { ChecklistItem } from "./ChecklistItem";
import type {
  ChecklistCategoryKey,
  ChecklistItem as ChecklistDataItem,
  ScanResult,
} from "./types";

interface ChecklistCardsProps {
  scan: ScanResult;
  activeCategory: ChecklistCategoryKey | "all";
}

function isChecklistDataItem(value: unknown): value is ChecklistDataItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    id?: unknown;
    label?: unknown;
    status?: unknown;
    why?: unknown;
  };
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.why === "string"
  );
}

export function ChecklistCards({ scan, activeCategory }: ChecklistCardsProps) {
  if (!scan.checklist) return null;

  const checklist: Partial<Record<ChecklistCategoryKey, unknown>> =
    typeof scan.checklist === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(scan.checklist) as unknown;
            return parsed && typeof parsed === "object"
              ? (parsed as Partial<Record<ChecklistCategoryKey, unknown>>)
              : {};
          } catch {
            return {};
          }
        })()
      : scan.checklist;

  const getItems = (key: ChecklistCategoryKey): ChecklistDataItem[] => {
    const value = checklist[key];
    return Array.isArray(value) ? value.filter(isChecklistDataItem) : [];
  };

  const categoryScores = getCategoryScores(scan);

  const categories: Array<{
    key: ChecklistCategoryKey;
    title: string;
    items: ChecklistDataItem[];
    icon: LucideIcon;
  }> = [
    {
      key: "access",
      title: "Can Google access your site?",
      items: getItems("access"),
      icon: MousePointerClick,
    },
    {
      key: "mobile_speed",
      title: "Mobile & speed",
      items: getItems("mobile_speed"),
      icon: Smartphone,
    },
    {
      key: "page_basics",
      title: "Page basics (titles/headings)",
      items: getItems("page_basics"),
      icon: FileText,
    },
    {
      key: "site_health",
      title: "Site health & trust",
      items: getItems("site_health"),
      icon: ShieldCheck,
    },
    {
      key: "tracking",
      title: "Measured Signals",
      items: getItems("tracking"),
      icon: ChartLine,
    },
  ];
  const visibleCategories =
    activeCategory === "all"
      ? categories
      : categories.filter((category) => category.key === activeCategory);

  return (
    <div className="space-y-6">
      {visibleCategories.map((category) => (
        <Card
          key={category.key}
          id={`seo-category-${category.key}`}
          className="scroll-mt-28 border-border/70 bg-card/50 shadow-sm backdrop-blur transition-shadow"
        >
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                  <category.icon className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">{category.title}</CardTitle>
              </div>
              <Badge variant="outline">
                Score {toScore(categoryScores?.[category.key])}/100
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Good
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {
                    category.items.filter((item) => item.status === "good")
                      .length
                  }
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Needs Work
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {
                    category.items.filter(
                      (item) => item.status === "needs_work",
                    ).length
                  }
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Critical
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {
                    category.items.filter((item) => item.status === "critical")
                      .length
                  }
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  Unknown
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {
                    category.items.filter((item) => item.status === "unknown")
                      .length
                  }
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {category.items.length > 0 ? (
              <div className="space-y-3">
                {category.items.map((item) => (
                  <ChecklistItem key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No measured checklist items were returned for this category.
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getCategoryScores(
  scan: ScanResult,
): Partial<Record<ChecklistCategoryKey, unknown>> | null {
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

  if (!rawCategories || typeof rawCategories !== "object") {
    return null;
  }

  return rawCategories as Partial<Record<ChecklistCategoryKey, unknown>>;
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
