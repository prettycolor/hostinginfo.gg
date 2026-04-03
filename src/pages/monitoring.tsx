import { MonitoringDashboard } from "@/components/monitoring/MonitoringDashboard";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Settings, TrendingUp, Activity } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <SEOHead
        title={PAGE_META.monitoring.title}
        description={PAGE_META.monitoring.description}
        keywords={PAGE_META.monitoring.keywords}
        noindex={PAGE_META.monitoring.noindex}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Domain Monitoring</h1>
          <p className="text-muted-foreground text-lg">
            Real-time uptime tracking, performance monitoring, and instant
            alerts
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Alerts
          </Button>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <Activity className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Real-Time Monitoring</CardTitle>
            <CardDescription>
              Track uptime and performance across multiple regions with 5-minute
              checks
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Bell className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Instant Alerts</CardTitle>
            <CardDescription>
              Get notified immediately via email, SMS, or Slack when issues are
              detected
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <TrendingUp className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>
              Analyze trends, identify patterns, and optimize your
              infrastructure
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Main Monitoring Dashboard */}
      <MonitoringDashboard />
    </div>
  );
}
