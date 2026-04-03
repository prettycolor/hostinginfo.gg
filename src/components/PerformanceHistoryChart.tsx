import { useState, useEffect, useCallback } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Smartphone, Monitor, Clock } from "lucide-react";
import { Spinner } from "@/components/Spinner";

interface PerformanceHistoryChartProps {
  domain: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryRecord {
  date: string;
  mobileScore: number;
  desktopScore: number;
  mobileFcp: number;
  mobileLcp: number;
  mobileTbt: number;
  mobileCls: number;
  mobileSpeedIndex: number;
  desktopFcp: number;
  desktopLcp: number;
  desktopTbt: number;
  desktopCls: number;
  desktopSpeedIndex: number;
}

export function PerformanceHistoryChart({
  domain,
  open,
  onOpenChange,
}: PerformanceHistoryChartProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/scan/performance/history?domain=${encodeURIComponent(domain)}&limit=365`,
      );
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    if (open && domain) {
      void fetchHistory();
    }
  }, [open, domain, fetchHistory]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Transform data for chart
  const chartData = history.map((record) => ({
    date: formatDate(record.date),
    Mobile: record.mobileScore,
    Desktop: record.desktopScore,
  }));

  // Calculate statistics
  const stats =
    history.length > 0
      ? {
          avgMobile: Math.round(
            history.reduce((sum, r) => sum + r.mobileScore, 0) / history.length,
          ),
          avgDesktop: Math.round(
            history.reduce((sum, r) => sum + r.desktopScore, 0) /
              history.length,
          ),
          latestMobile: history[history.length - 1]?.mobileScore || 0,
          latestDesktop: history[history.length - 1]?.desktopScore || 0,
          trend:
            history.length > 1
              ? history[history.length - 1].mobileScore - history[0].mobileScore
              : 0,
        }
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance History
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {domain} - Last 365 days
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-3 text-muted-foreground">
                Loading history...
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="p-8 text-center rounded-lg border border-dashed">
              <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No History Yet</h3>
              <p className="text-sm text-muted-foreground">
                Performance history will appear here after your first scan.
              </p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <>
              {/* Statistics Cards */}
              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium">Mobile</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {stats.latestMobile}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {stats.avgMobile}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium">Desktop</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {stats.latestDesktop}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {stats.avgDesktop}
                    </div>
                  </div>
                </div>
              )}

              {/* Chart */}
              <div className="p-4 rounded-lg border bg-card">
                <h3 className="font-semibold mb-4">
                  Performance Scores Over Time
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Mobile"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Desktop"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ fill: "#a855f7", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Core Web Vitals Tabs */}
              <Tabs defaultValue="lcp" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="lcp">LCP</TabsTrigger>
                  <TabsTrigger value="fcp">FCP</TabsTrigger>
                  <TabsTrigger value="tbt">TBT</TabsTrigger>
                  <TabsTrigger value="cls">CLS</TabsTrigger>
                </TabsList>

                <TabsContent value="lcp" className="mt-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-2">
                      Largest Contentful Paint
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Time until largest content element is rendered
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={history.map((r) => ({
                          date: formatDate(r.date),
                          Mobile: r.mobileLcp / 1000,
                          Desktop: r.desktopLcp / 1000,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          label={{
                            value: "seconds",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Mobile"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="Desktop"
                          stroke="#a855f7"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="fcp" className="mt-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-2">
                      First Contentful Paint
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Time until first content is rendered
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={history.map((r) => ({
                          date: formatDate(r.date),
                          Mobile: r.mobileFcp / 1000,
                          Desktop: r.desktopFcp / 1000,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          label={{
                            value: "seconds",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Mobile"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="Desktop"
                          stroke="#a855f7"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="tbt" className="mt-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-2">Total Blocking Time</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Time page is blocked from responding to user input
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={history.map((r) => ({
                          date: formatDate(r.date),
                          Mobile: r.mobileTbt,
                          Desktop: r.desktopTbt,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          label={{
                            value: "ms",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Mobile"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="Desktop"
                          stroke="#a855f7"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="cls" className="mt-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-2">
                      Cumulative Layout Shift
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Visual stability - lower is better
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={history.map((r) => ({
                          date: formatDate(r.date),
                          Mobile: r.mobileCls,
                          Desktop: r.desktopCls,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          className="text-xs"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          label={{
                            value: "score",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Mobile"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="Desktop"
                          stroke="#a855f7"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
