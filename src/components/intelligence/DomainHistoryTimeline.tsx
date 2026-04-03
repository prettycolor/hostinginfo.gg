import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Server,
  Globe,
  Code,
  ArrowRight,
  Calendar,
} from "lucide-react";

interface Change {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  timestamp: string;
}

interface HistoricalScan {
  id: number;
  domain: string;
  edgeProvider: string | null;
  originHost: string | null;
  confidenceScore: number | null;
  techCount: number;
  createdAt: string;
  changes: Change[];
  hostingData: Record<string, unknown> | null;
  dnsData: Record<string, unknown> | null;
  ipData: Record<string, unknown> | null;
  techData: Record<string, unknown> | null;
}

interface HistorySummary {
  totalScans: number;
  totalChanges: number;
  hasHostingChanges: boolean;
  hasTechChanges: boolean;
  firstScan: string;
  lastScan: string;
}

interface DomainHistoryTimelineProps {
  domain: string;
  onScanSelect?: (scan: HistoricalScan) => void;
}

interface DomainHistoryResponse {
  success: boolean;
  scans?: HistoricalScan[];
  summary?: HistorySummary | null;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDomainHistoryResponse(
  value: unknown,
): value is DomainHistoryResponse {
  if (!isRecord(value) || typeof value.success !== "boolean") {
    return false;
  }

  if (
    "scans" in value &&
    value.scans !== undefined &&
    !Array.isArray(value.scans)
  ) {
    return false;
  }

  return true;
}

export function DomainHistoryTimeline({
  domain,
  onScanSelect,
}: DomainHistoryTimelineProps) {
  const [scans, setScans] = useState<HistoricalScan[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedScan, setExpandedScan] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intelligence/history?domain=${encodeURIComponent(domain)}`,
      );
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const payload: unknown = isJson
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message =
          isRecord(payload) && "error" in payload
            ? String(payload.error)
            : typeof payload === "string"
              ? `History API returned non-JSON response (${response.status})`
              : `History API request failed (${response.status})`;
        throw new Error(message);
      }

      if (!isJson || !isDomainHistoryResponse(payload)) {
        throw new Error("History API returned an invalid response format");
      }

      if (payload.success) {
        setScans(Array.isArray(payload.scans) ? payload.scans : []);
        setSummary(payload.summary ?? null);
      } else {
        setError(payload.error || "Failed to load history");
      }
    } catch (err) {
      console.error("Error loading history:", err);
      setError("Failed to load scan history");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getChangeIcon = (field: string) => {
    if (field.includes("Provider") || field.includes("Host"))
      return <Server className="h-4 w-4" />;
    if (field.includes("Technologies")) return <Code className="h-4 w-4" />;
    if (field.includes("Confidence")) return <TrendingUp className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getChangeColor = (
    field: string,
    oldValue: string | number | null,
    newValue: string | number | null,
  ) => {
    if (field === "Confidence Score") {
      return newValue > oldValue ? "text-green-600" : "text-orange-600";
    }
    if (field === "Technology Count") {
      return newValue > oldValue ? "text-blue-600" : "text-gray-600";
    }
    if (field === "Technologies Added") return "text-green-600";
    if (field === "Technologies Removed") return "text-red-600";
    return "text-yellow-600";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scan history available for this domain</p>
            <p className="text-sm mt-2">
              Run a scan to start tracking changes over time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scan History
            </CardTitle>
            <CardDescription>
              {summary && (
                <span>
                  {summary.totalScans} scans • {summary.totalChanges} changes
                  detected
                </span>
              )}
            </CardDescription>
          </div>
          {summary && summary.totalChanges > 0 && (
            <div className="flex gap-2">
              {summary.hasHostingChanges && (
                <Badge
                  variant="outline"
                  className="text-orange-600 border-orange-600"
                >
                  <Server className="h-3 w-3 mr-1" />
                  Hosting Changes
                </Badge>
              )}
              {summary.hasTechChanges && (
                <Badge
                  variant="outline"
                  className="text-blue-600 border-blue-600"
                >
                  <Code className="h-3 w-3 mr-1" />
                  Tech Changes
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {scans.map((scan, index) => (
              <div key={scan.id} className="relative pl-14">
                {/* Timeline dot */}
                <div
                  className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
                    scan.changes.length > 0
                      ? "bg-orange-500 border-orange-600"
                      : "bg-green-500 border-green-600"
                  } flex items-center justify-center`}
                >
                  {scan.changes.length > 0 ? (
                    <AlertCircle className="h-3 w-3 text-white" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>

                {/* Scan card */}
                <div
                  className={`border rounded-lg p-4 ${
                    index === 0 ? "bg-accent/50" : "bg-card"
                  } hover:bg-accent/30 transition-colors cursor-pointer`}
                  onClick={() =>
                    setExpandedScan(expandedScan === scan.id ? null : scan.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDate(scan.createdAt)}
                        </span>
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">
                            Latest
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {scan.edgeProvider && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {scan.edgeProvider}
                          </span>
                        )}
                        {scan.originHost && (
                          <span className="flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            {scan.originHost}
                          </span>
                        )}
                        <span>{scan.techCount} technologies</span>
                      </div>

                      {/* Changes */}
                      {scan.changes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {scan.changes.map((change, changeIndex) => (
                            <div
                              key={changeIndex}
                              className={`flex items-center gap-2 text-sm ${getChangeColor(
                                change.field,
                                change.oldValue,
                                change.newValue,
                              )}`}
                            >
                              {getChangeIcon(change.field)}
                              <span className="font-medium">
                                {change.field}:
                              </span>
                              {change.oldValue !== null && (
                                <span className="text-muted-foreground">
                                  {change.oldValue}
                                </span>
                              )}
                              {change.oldValue !== null &&
                                change.newValue !== null && (
                                  <ArrowRight className="h-3 w-3" />
                                )}
                              {change.newValue !== null && (
                                <span>{change.newValue}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {scan.changes.length === 0 && (
                        <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          No changes detected
                        </div>
                      )}
                    </div>

                    {onScanSelect && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onScanSelect(scan);
                        }}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
