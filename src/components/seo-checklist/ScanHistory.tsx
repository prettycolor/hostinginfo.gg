/**
 * Scan History Component
 * List of recent scans
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { ScanHistoryItem, ScanResult } from "./types";
import { DecisionBadge } from "./DecisionBadge";

interface ScanHistoryProps {
  onSelectScan: (scan: ScanResult) => void;
  selectedScanId?: string;
  refreshTrigger: number;
}

export function ScanHistory({
  onSelectScan,
  selectedScanId,
  refreshTrigger,
}: ScanHistoryProps) {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("No auth token found");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/seo-checklist/history?limit=10", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setScans(data.scans || []);
    } catch (error) {
      console.error("Error fetching scan history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScan = async (scanId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("No auth token found");
        return;
      }

      const response = await fetch(`/api/seo-checklist/scan/${scanId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch scan");
      const data = await response.json();
      onSelectScan(data);
    } catch (error) {
      console.error("Error fetching scan:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Account Scans</CardTitle>
          <CardDescription>
            Your latest saved SEO checklist runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Loading recent scans...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (scans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Account Scans</CardTitle>
          <CardDescription>
            Your latest saved SEO checklist runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No scans yet. Start by scanning a domain above.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Account Scans</CardTitle>
        <CardDescription>Your latest saved SEO checklist runs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2">
          {scans.map((scan) => (
            <button
              key={scan.scan_id}
              type="button"
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedScanId === scan.scan_id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleSelectScan(scan.scan_id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{scan.domain}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(scan.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {scan.decision && <DecisionBadge decision={scan.decision} />}
                  {scan.total_score !== null && (
                    <Badge variant="outline">{scan.total_score}/100</Badge>
                  )}
                  {scan.status === "pending" && (
                    <Badge
                      variant="outline"
                      className="border-slate-400/40 bg-slate-500/10 text-slate-200"
                    >
                      Pending
                    </Badge>
                  )}
                  {scan.status === "running" && (
                    <Badge
                      variant="outline"
                      className="border-primary/40 bg-primary/5 text-primary"
                    >
                      Running
                    </Badge>
                  )}
                  {scan.status === "failed" && (
                    <Badge
                      variant="outline"
                      className="border-rose-500/40 bg-rose-500/10 text-rose-200"
                    >
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
