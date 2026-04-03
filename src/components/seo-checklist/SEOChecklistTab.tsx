/**
 * SEO Checklist Tab Component
 * Main container for SEO checklist functionality
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanInput } from "./ScanInput";
import { ScanHistory } from "./ScanHistory";
import { SummaryBanner } from "./SummaryBanner";
import { ScorePanel } from "./ScorePanel";
import { ChecklistCards } from "./ChecklistCards";
import { DecisionBadge } from "./DecisionBadge";
import {
  Clock,
  LayoutDashboard,
  MousePointerClick,
  Smartphone,
  FileText,
  ShieldCheck,
  ChartLine,
} from "lucide-react";
import type { ChecklistCategoryKey, ScanResult } from "./types";

interface SEOChecklistTabProps {
  selectedDomain?: string | null;
}

type ResultTabKey = ChecklistCategoryKey | "all";

export function SEOChecklistTab({
  selectedDomain = null,
}: SEOChecklistTabProps) {
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<ResultTabKey>("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Poll for scan updates if scan is pending or running
  useEffect(() => {
    if (
      selectedScan &&
      (selectedScan.status === "pending" || selectedScan.status === "running")
    ) {
      // Poll every 2 seconds
      const interval = setInterval(async () => {
        try {
          const token = localStorage.getItem("auth_token");
          if (!token) return;

          const response = await fetch(
            `/api/seo-checklist/scan/${selectedScan.scan_id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.ok) {
            const updatedScan = await response.json();
            setSelectedScan(updatedScan);

            // If scan completed or failed, stop polling and refresh history
            if (
              updatedScan.status === "completed" ||
              updatedScan.status === "failed"
            ) {
              setRefreshTrigger((prev) => prev + 1);
            }
          }
        } catch (error) {
          console.error("Error polling scan status:", error);
        }
      }, 2000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [selectedScan]);

  const handleScanComplete = async (scanId: string) => {
    // Trigger history refresh
    setRefreshTrigger((prev) => prev + 1);
    setActiveCategory("all");

    // Auto-select the new scan
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(`/api/seo-checklist/scan/${scanId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const scan = await response.json();
        setSelectedScan(scan);
      }
    } catch (error) {
      console.error("Error fetching new scan:", error);
    }
  };

  const categoryTabs: Array<{
    key: ChecklistCategoryKey;
    label: string;
    icon: typeof MousePointerClick;
  }> = [
    { key: "access", label: "Access", icon: MousePointerClick },
    { key: "mobile_speed", label: "Mobile Speed", icon: Smartphone },
    { key: "page_basics", label: "Page Basics", icon: FileText },
    { key: "site_health", label: "Site Health", icon: ShieldCheck },
    { key: "tracking", label: "Measured Signals", icon: ChartLine },
  ];
  const totalScore = getTotalScore(selectedScan);

  return (
    <div className="space-y-6">
      {/* Domain Input + Scan Button */}
      <ScanInput
        onScanComplete={handleScanComplete}
        selectedDomain={selectedDomain}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Scan History */}
        <ScanHistory
          onSelectScan={(scan) => {
            setSelectedScan(scan);
            setActiveCategory("all");
          }}
          selectedScanId={selectedScan?.scan_id}
          refreshTrigger={refreshTrigger}
        />

        <div className="space-y-6">
          {/* Empty state */}
          {!selectedScan && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <LayoutDashboard className="mb-4 h-14 w-14 text-muted-foreground" />
                <h3 className="text-xl font-semibold">No scan selected</h3>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  Run a new SEO checklist scan or choose one from your recent
                  account scans.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results (if scan selected) */}
          {selectedScan && selectedScan.status === "completed" && (
            <Tabs
              value={activeCategory}
              onValueChange={(value) =>
                setActiveCategory(value as ResultTabKey)
              }
              className="space-y-6"
            >
              <Card className="border-border/70 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>SEO Scan Readout</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold">
                      {selectedScan.target?.host || "Unknown domain"}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Scanned{" "}
                      {new Date(
                        selectedScan.completed_at || selectedScan.created_at,
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedScan.decision && (
                      <DecisionBadge decision={selectedScan.decision} />
                    )}
                    <span className="rounded-md border px-2 py-1 text-sm font-semibold">
                      {totalScore}/100
                    </span>
                  </div>
                </CardContent>
              </Card>

              <SummaryBanner scan={selectedScan} />

              <TabsList className="grid h-auto w-full grid-cols-3 p-1 lg:grid-cols-6">
                <TabsTrigger
                  value="all"
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                {categoryTabs.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <TabIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <ScorePanel
                scan={selectedScan}
                activeCategory={activeCategory}
                onCategorySelect={setActiveCategory}
              />

              <TabsContent value="all" className="space-y-6">
                <ChecklistCards scan={selectedScan} activeCategory="all" />
              </TabsContent>

              {categoryTabs.map((tab) => (
                <TabsContent
                  key={tab.key}
                  value={tab.key}
                  className="space-y-6"
                >
                  <ChecklistCards
                    scan={selectedScan}
                    activeCategory={tab.key}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Loading state */}
          {selectedScan &&
            (selectedScan.status === "pending" ||
              selectedScan.status === "running") && (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">
                    Scanning your site...
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This usually takes 10-30 seconds
                  </p>
                </CardContent>
              </Card>
            )}

          {/* Error state */}
          {selectedScan && selectedScan.status === "failed" && (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-destructive">
                  Scan failed. Please try again.
                </p>
                {selectedScan.errors && selectedScan.errors.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedScan.errors[0]}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function getTotalScore(scan: ScanResult | null): number {
  if (!scan?.score) return 0;

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
    return 0;
  }

  const numeric = Number((rawScore as Record<string, unknown>).total);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}
