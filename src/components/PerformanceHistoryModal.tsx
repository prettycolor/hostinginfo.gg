/**
 * Performance History Modal for Favorites
 * Shows performance trends over time with date range filtering
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Smartphone,
  Monitor,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface PerformanceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
}

interface PerformanceRecord {
  id: number;
  domain: string;
  scanType: string;
  mobileScore: number | null;
  desktopScore: number | null;
  mobileFcp: string | null;
  mobileLcp: string | null;
  mobileTbt: string | null;
  mobileCls: string | null;
  desktopFcp: string | null;
  desktopLcp: string | null;
  desktopTbt: string | null;
  desktopCls: string | null;
  scannedAt: string;
}

interface PerformanceData {
  success: boolean;
  domain: string;
  dateRange: {
    days: number;
    from: string;
    to: string;
  };
  count: number;
  history: PerformanceRecord[];
  trends: {
    mobile: "improving" | "declining" | "stable";
    desktop: "improving" | "declining" | "stable";
  };
  averages: {
    mobile: {
      score: number | null;
      fcp: number | null;
      lcp: number | null;
      tbt: number | null;
      cls: number | null;
    };
    desktop: {
      score: number | null;
      fcp: number | null;
      lcp: number | null;
      tbt: number | null;
      cls: number | null;
    };
  };
}

export function PerformanceHistoryModal({
  open,
  onOpenChange,
  domain,
}: PerformanceHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [days, setDays] = useState("30");

  const fetchPerformanceHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(
        `/api/favorites/${encodeURIComponent(domain)}/performance?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch performance history",
        );
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Failed to fetch performance history:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load performance history",
      );
    } finally {
      setLoading(false);
    }
  }, [days, domain]);

  useEffect(() => {
    if (open && domain) {
      void fetchPerformanceHistory();
    }
  }, [open, domain, fetchPerformanceHistory]);

  // Transform data for chart
  const chartData =
    data?.history
      .slice()
      .reverse()
      .map((record) => ({
        date: format(new Date(record.scannedAt), "MMM d"),
        Mobile: record.mobileScore || 0,
        Desktop: record.desktopScore || 0,
      })) || [];

  // Core Web Vitals chart data
  const coreWebVitalsData =
    data?.history
      .slice()
      .reverse()
      .map((record) => ({
        date: format(new Date(record.scannedAt), "MMM d"),
        "Mobile FCP": record.mobileFcp ? parseFloat(record.mobileFcp) : null,
        "Desktop FCP": record.desktopFcp ? parseFloat(record.desktopFcp) : null,
        "Mobile LCP": record.mobileLcp ? parseFloat(record.mobileLcp) : null,
        "Desktop LCP": record.desktopLcp ? parseFloat(record.desktopLcp) : null,
      })) || [];

  const getTrendIcon = (trend: "improving" | "declining" | "stable") => {
    if (trend === "improving")
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "declining")
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendText = (trend: "improving" | "declining" | "stable") => {
    if (trend === "improving") return "Improving";
    if (trend === "declining") return "Declining";
    return "Stable";
  };

  const getTrendColor = (trend: "improving" | "declining" | "stable") => {
    if (trend === "improving") return "text-green-500";
    if (trend === "declining") return "text-red-500";
    return "text-gray-500";
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-gray-500";
    if (score >= 90) return "text-green-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance History: {domain}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex items-center gap-4">
            <Label>Time Range:</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 180 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-semibold text-red-900">
                    Failed to load performance history
                  </p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Data State */}
          {!loading && !error && data && data.count === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">
                  No performance data yet
                </p>
                <p className="text-muted-foreground text-center">
                  Run a performance scan to start tracking this domain's
                  performance over time.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Data Display */}
          {!loading && !error && data && data.count > 0 && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mobile Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Mobile Performance
                    </CardTitle>
                    <CardDescription>
                      Average score over {days} days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Average Score:
                        </span>
                        <span
                          className={`text-2xl font-bold ${getScoreColor(data.averages.mobile.score)}`}
                        >
                          {data.averages.mobile.score?.toFixed(0) || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Trend:
                        </span>
                        <div
                          className={`flex items-center gap-2 ${getTrendColor(data.trends.mobile)}`}
                        >
                          {getTrendIcon(data.trends.mobile)}
                          <span className="font-semibold">
                            {getTrendText(data.trends.mobile)}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Avg FCP:
                          </span>
                          <span className="font-medium">
                            {data.averages.mobile.fcp?.toFixed(2)}s
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Avg LCP:
                          </span>
                          <span className="font-medium">
                            {data.averages.mobile.lcp?.toFixed(2)}s
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Avg TBT:
                          </span>
                          <span className="font-medium">
                            {data.averages.mobile.tbt?.toFixed(0)}ms
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Avg CLS:
                          </span>
                          <span className="font-medium">
                            {data.averages.mobile.cls?.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Desktop Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Desktop Performance
                    </CardTitle>
                    <CardDescription>
                      Average score over {days} days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Average Score:
                        </span>
                        <span
                          className={`text-2xl font-bold ${getScoreColor(data.averages.desktop.score)}`}
                        >
                          {data.averages.desktop.score?.toFixed(0) || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Trend:
                        </span>
                        <div
                          className={`flex items-center gap-2 ${getTrendColor(data.trends.desktop)}`}
                        >
                          {getTrendIcon(data.trends.desktop)}
                          <span className="font-semibold">
                            {getTrendText(data.trends.desktop)}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Avg FCP:
                          </span>
                          <span className="font-medium">
                            {data.averages.desktop.fcp?.toFixed(2)}s
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Avg LCP:
                          </span>
                          <span className="font-medium">
                            {data.averages.desktop.lcp?.toFixed(2)}s
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Avg TBT:
                          </span>
                          <span className="font-medium">
                            {data.averages.desktop.tbt?.toFixed(0)}ms
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Avg CLS:
                          </span>
                          <span className="font-medium">
                            {data.averages.desktop.cls?.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <Tabs defaultValue="scores" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="scores">Performance Scores</TabsTrigger>
                  <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
                </TabsList>

                {/* Performance Scores Chart */}
                <TabsContent value="scores" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Score Trends</CardTitle>
                      <CardDescription>
                        Mobile and desktop scores over time (0-100)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="Mobile"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="Desktop"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Core Web Vitals Chart */}
                <TabsContent value="vitals" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Core Web Vitals Trends</CardTitle>
                      <CardDescription>
                        First Contentful Paint (FCP) and Largest Contentful
                        Paint (LCP) over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={coreWebVitalsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="Mobile FCP"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="Desktop FCP"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="Mobile LCP"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            strokeDasharray="5 5"
                          />
                          <Line
                            type="monotone"
                            dataKey="Desktop LCP"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Scan Count Info */}
              <div className="text-sm text-muted-foreground text-center">
                Showing {data.count} {data.count === 1 ? "scan" : "scans"} from
                the last {days} days
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
