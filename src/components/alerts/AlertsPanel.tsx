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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Info,
  Shield,
  TrendingDown,
  Wifi,
  Archive,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: number;
  domain: string;
  type: "uptime" | "performance" | "security" | "ssl" | "dns" | "technology";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

interface AlertsPanelProps {
  userId?: number;
  compact?: boolean;
}

export function AlertsPanel({
  userId: _userId,
  compact = false,
}: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`/api/alerts?filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchAlerts();
    const interval = setInterval(() => {
      void fetchAlerts();
    }, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const markAsRead = async (alertId: number) => {
    try {
      await fetch(`/api/alerts/${alertId}/read`, { method: "POST" });
      setAlerts(
        alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)),
      );
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }
  };

  const archiveAlert = async (alertId: number) => {
    try {
      await fetch(`/api/alerts/${alertId}/archive`, { method: "POST" });
      setAlerts(alerts.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error("Failed to archive alert:", error);
    }
  };

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === "critical")
      return <AlertCircle className="w-5 h-5 text-red-600" />;

    switch (type) {
      case "uptime":
        return <Wifi className="w-5 h-5 text-orange-600" />;
      case "performance":
        return <TrendingDown className="w-5 h-5 text-yellow-600" />;
      case "security":
        return <Shield className="w-5 h-5 text-red-600" />;
      case "ssl":
        return <Shield className="w-5 h-5 text-orange-600" />;
      case "dns":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Critical
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Low
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Alerts</CardTitle>
            <Badge variant="secondary">{unreadCount} unread</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 border rounded-lg ${
                    !alert.isRead
                      ? "bg-primary/5 border-primary/20"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getAlertIcon(alert.type, alert.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {alert.title}
                          </span>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {alert.domain}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(alert.id)}
                      className="h-6 w-6 p-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {alerts.length > 5 && (
            <Button variant="outline" className="w-full mt-3" size="sm">
              View All Alerts
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {criticalCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3m</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>
                Monitor and manage your domain alerts
              </CardDescription>
            </div>
            <Tabs
              value={filter}
              onValueChange={(v) =>
                setFilter(v as "all" | "unread" | "critical")
              }
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="critical">Critical</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <p className="text-lg font-medium mb-2">All Clear!</p>
              <p className="text-muted-foreground">No alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    !alert.isRead
                      ? "bg-primary/5 border-primary/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {getAlertIcon(alert.type, alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{alert.title}</h3>
                          {getSeverityBadge(alert.severity)}
                          {!alert.isRead && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {alert.domain}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(alert.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(alert.id)}
                          title="Mark as read"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveAlert(alert.id)}
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
