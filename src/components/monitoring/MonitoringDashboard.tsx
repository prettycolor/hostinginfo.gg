import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Globe,
  Settings,
  XCircle,
  Zap,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonitoredDomain {
  id: number;
  domain: string;
  status: "up" | "down" | "degraded";
  uptime: number;
  responseTime: number;
  lastCheck: string;
  enabled: boolean;
  checkInterval: number;
  regions: string[];
}

interface UptimeCheck {
  timestamp: string;
  status: "up" | "down" | "degraded";
  responseTime: number;
  region: string;
}

interface MonitoringDashboardProps {
  userId?: number;
}

export function MonitoringDashboard({
  userId: _userId,
}: MonitoringDashboardProps) {
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<MonitoredDomain | null>(
    null,
  );
  const [uptimeData, setUptimeData] = useState<UptimeCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  const fetchMonitoredDomains = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring/domains");
      if (response.ok) {
        const data = await response.json();
        setDomains(data.domains || []);
        setSelectedDomain((prev) => prev ?? data.domains?.[0] ?? null);
      }
    } catch (error) {
      console.error("Failed to fetch monitored domains:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUptimeData = useCallback(
    async (domain: string) => {
      try {
        const response = await fetch(
          `/api/monitoring/uptime/${domain}?range=${timeRange}`,
        );
        if (response.ok) {
          const data = await response.json();
          setUptimeData(data.checks || []);
        }
      } catch (error) {
        console.error("Failed to fetch uptime data:", error);
      }
    },
    [timeRange],
  );

  // Fetch monitored domains
  useEffect(() => {
    void fetchMonitoredDomains();
    const interval = setInterval(() => {
      void fetchMonitoredDomains();
    }, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchMonitoredDomains]);

  // Fetch uptime data when domain is selected
  useEffect(() => {
    if (selectedDomain) {
      void fetchUptimeData(selectedDomain.domain);
    }
  }, [selectedDomain, fetchUptimeData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "up":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "down":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "degraded":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "up":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Operational
          </Badge>
        );
      case "down":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Down
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            Degraded
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const calculateAverageResponseTime = () => {
    if (uptimeData.length === 0) return 0;
    const sum = uptimeData.reduce((acc, check) => acc + check.responseTime, 0);
    return Math.round(sum / uptimeData.length);
  };

  const calculateUptime = () => {
    if (uptimeData.length === 0) return 100;
    const upChecks = uptimeData.filter((check) => check.status === "up").length;
    return ((upChecks / uptimeData.length) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Monitored Domains</CardTitle>
          <CardDescription>
            You haven't set up monitoring for any domains yet. Configure
            monitoring to track uptime and performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Configure Monitoring
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domains.length}</div>
            <p className="text-xs text-muted-foreground">
              {domains.filter((d) => d.enabled).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {domains.filter((d) => d.status === "up").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (domains.filter((d) => d.status === "up").length /
                  domains.length) *
                100
              ).toFixed(1)}
              % uptime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {
                domains.filter(
                  (d) => d.status === "degraded" || d.status === "down",
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {domains.filter((d) => d.status === "down").length} down,{" "}
              {domains.filter((d) => d.status === "degraded").length} degraded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                domains.reduce((acc, d) => acc + d.responseTime, 0) /
                  domains.length,
              )}
              ms
            </div>
            <p className="text-xs text-muted-foreground">Across all domains</p>
          </CardContent>
        </Card>
      </div>

      {/* Domain List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Monitored Domains</CardTitle>
            <CardDescription>Click to view details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {domains.map((domain) => (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain)}
                className={`w-full p-3 rounded-lg border transition-colors text-left ${
                  selectedDomain?.id === domain.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(domain.status)}
                    <span className="font-medium">{domain.domain}</span>
                  </div>
                  {getStatusBadge(domain.status)}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{domain.uptime}% uptime</span>
                  <span>{domain.responseTime}ms</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Domain Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedDomain?.domain}</CardTitle>
                <CardDescription>
                  Real-time monitoring and performance metrics
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs
              value={timeRange}
              onValueChange={(v) => setTimeRange(v as "24h" | "7d" | "30d")}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="24h">24 Hours</TabsTrigger>
                <TabsTrigger value="7d">7 Days</TabsTrigger>
                <TabsTrigger value="30d">30 Days</TabsTrigger>
              </TabsList>

              <TabsContent value={timeRange} className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {calculateUptime()}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Uptime
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold">
                      {calculateAverageResponseTime()}ms
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Avg Response
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold">
                      {uptimeData.length}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Checks
                    </div>
                  </div>
                </div>

                {/* Response Time Chart */}
                <div>
                  <h3 className="text-sm font-medium mb-4">
                    Response Time Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={uptimeData}>
                      <defs>
                        <linearGradient
                          id="responseTime"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                        labelFormatter={(value) =>
                          new Date(value).toLocaleString()
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="responseTime"
                        stroke="#3b82f6"
                        fill="url(#responseTime)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Status History */}
                <div>
                  <h3 className="text-sm font-medium mb-4">Status History</h3>
                  <div className="space-y-2">
                    {uptimeData.slice(0, 10).map((check, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(check.status)}
                          <div>
                            <div className="text-sm font-medium">
                              {new Date(check.timestamp).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {check.region}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          {check.responseTime}ms
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
