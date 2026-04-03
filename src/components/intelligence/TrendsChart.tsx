import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ScanDataPoint {
  id: number;
  createdAt: string;
  confidenceScore: number | null;
  techCount: number;
  edgeProvider: string | null;
  originHost: string | null;
}

interface TrendsChartProps {
  scans: ScanDataPoint[];
}

export function TrendsChart({ scans }: TrendsChartProps) {
  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No data available for trends analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort scans by date (oldest first for chart)
  const sortedScans = [...scans].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Calculate statistics
  const confidenceScores = sortedScans
    .map((s) => s.confidenceScore)
    .filter((s): s is number => s !== null);
  const techCounts = sortedScans.map((s) => s.techCount);

  const avgTechCount =
    techCounts.length > 0
      ? Math.round(techCounts.reduce((a, b) => a + b, 0) / techCounts.length)
      : 0;

  const techTrend =
    techCounts.length >= 2
      ? techCounts[techCounts.length - 1] - techCounts[0]
      : 0;

  // Normalize data for visualization (0-100 scale)
  const maxConfidence = Math.max(...confidenceScores, 100);
  const maxTechCount = Math.max(...techCounts, 1);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Scans</CardDescription>
            <CardTitle className="text-3xl">{scans.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Tech Count</CardDescription>
            <CardTitle className="text-3xl">{avgTechCount}</CardTitle>
            {techTrend !== 0 && (
              <div className="flex items-center gap-1 text-sm">
                {techTrend > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600">+{techTrend}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-600">{techTrend}</span>
                  </>
                )}
              </div>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Time Span</CardDescription>
            <CardTitle className="text-3xl">
              {Math.round(
                (new Date(
                  sortedScans[sortedScans.length - 1].createdAt,
                ).getTime() -
                  new Date(sortedScans[0].createdAt).getTime()) /
                  (1000 * 60 * 60 * 24),
              )}
              d
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Confidence Score Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Confidence Score Over Time</CardTitle>
          <CardDescription>
            Tracking detection confidence across scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chart */}
            <div className="relative h-64 border rounded-lg p-4 bg-accent/10">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground pr-2">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>

              {/* Chart area */}
              <div className="ml-10 h-full relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-t border-border/50" />
                  ))}
                </div>

                {/* Line chart */}
                <svg className="absolute inset-0 w-full h-full">
                  {/* Line */}
                  <polyline
                    points={sortedScans
                      .map((scan, index) => {
                        const x = (index / (sortedScans.length - 1 || 1)) * 100;
                        const y =
                          100 -
                          ((scan.confidenceScore || 0) / maxConfidence) * 100;
                        return `${x}%,${y}%`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    className="drop-shadow-md"
                  />

                  {/* Data points */}
                  {sortedScans.map((scan, index) => {
                    const x = (index / (sortedScans.length - 1 || 1)) * 100;
                    const y =
                      100 - ((scan.confidenceScore || 0) / maxConfidence) * 100;
                    return (
                      <g key={scan.id}>
                        <circle
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="4"
                          fill="hsl(var(--primary))"
                          className="drop-shadow-md"
                        />
                        <title>{formatDate(scan.createdAt)}</title>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* X-axis labels */}
              <div className="ml-10 mt-2 flex justify-between text-xs text-muted-foreground">
                {sortedScans.map((scan, index) => {
                  // Show only first, middle, and last labels to avoid crowding
                  if (
                    index === 0 ||
                    index === Math.floor(sortedScans.length / 2) ||
                    index === sortedScans.length - 1
                  ) {
                    return (
                      <span key={scan.id}>{formatDate(scan.createdAt)}</span>
                    );
                  }
                  return <span key={scan.id} />;
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technology Count Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Technology Count Over Time</CardTitle>
          <CardDescription>
            Tracking detected technologies across scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bar chart */}
            <div className="space-y-2">
              {sortedScans.map((scan) => {
                const percentage = (scan.techCount / maxTechCount) * 100;
                return (
                  <div key={scan.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatDate(scan.createdAt)}
                      </span>
                      <span className="font-medium">
                        {scan.techCount} technologies
                      </span>
                    </div>
                    <div className="h-8 bg-accent/20 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        {percentage > 20 && (
                          <span className="text-xs font-medium text-white">
                            {scan.techCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
