import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Shield, Lock, CheckCircle2, Tag } from "lucide-react";
import { toast } from "sonner";

interface PremiumFeaturesProps {
  domain: string;
  isVerified: boolean;
}

export default function PremiumFeatures({
  domain,
  isVerified,
}: PremiumFeaturesProps) {
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);
  const [clientTag, setClientTag] = useState("");
  const [loading, setLoading] = useState(false);

  const handleToggleMonitoring = async (enabled: boolean) => {
    if (!isVerified) {
      toast.error("Please verify domain ownership first");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      const response = await fetch("/api/monitoring/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain, enabled, clientTag: clientTag || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update monitoring");
      }

      setMonitoringEnabled(enabled);
      toast.success(
        data.message ||
          (enabled
            ? "Automated monitoring enabled"
            : "Automated monitoring disabled"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update monitoring settings",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmailAlerts = async (enabled: boolean) => {
    if (!isVerified) {
      toast.error("Please verify domain ownership first");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/alerts/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain, enabled }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update alerts");
      }

      setEmailAlertsEnabled(enabled);
      toast.success(
        data.message ||
          (enabled ? "Email alerts enabled" : "Email alerts disabled"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update alert settings",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Automated Monitoring (FREE)
          {isVerified && (
            <Badge
              variant="default"
              className="bg-green-500 hover:bg-green-600"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isVerified
            ? "Manage automated monitoring and alerts for this domain - completely free!"
            : "Verify domain ownership to unlock automated monitoring features"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isVerified && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Verification Required</strong>
              <br />
              Claim and verify this domain to enable FREE automated monitoring
              and email alerts.
            </AlertDescription>
          </Alert>
        )}

        {/* Automated Monitoring */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="monitoring" className="text-base font-medium">
                  Automated Monitoring
                </Label>
                {!isVerified && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically scan this domain daily to track performance trends
              </p>
            </div>
            <Switch
              id="monitoring"
              checked={monitoringEnabled}
              onCheckedChange={handleToggleMonitoring}
              disabled={!isVerified || loading}
            />
          </div>

          {monitoringEnabled && isVerified && (
            <>
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  Daily scans scheduled at 2:00 AM UTC. Next scan in ~
                  {Math.floor(Math.random() * 12) + 1} hours.
                </AlertDescription>
              </Alert>

              {/* Client Tag for Monthly Reports */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="clientTag" className="text-sm font-medium">
                    Client Tag (Optional)
                  </Label>
                </div>
                <Input
                  id="clientTag"
                  placeholder="e.g., Acme Corp, Client A, Production Sites"
                  value={clientTag}
                  onChange={(e) => setClientTag(e.target.value)}
                  disabled={loading}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Tag this domain to receive monthly performance reports grouped
                  by client. Perfect for agencies managing multiple client
                  websites.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Email Alerts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="alerts" className="text-base font-medium">
                  Email Alerts
                </Label>
                {!isVerified && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified of critical issues: malware, downtime, major
                performance crashes
              </p>
            </div>
            <Switch
              id="alerts"
              checked={emailAlertsEnabled}
              onCheckedChange={handleToggleEmailAlerts}
              disabled={!isVerified || loading}
            />
          </div>

          {emailAlertsEnabled && isVerified && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <Bell className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                <strong>Critical Alert Triggers (No Spam!):</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>🚨 Malware or malicious code detected</li>
                  <li>🔴 Website downtime (unreachable)</li>
                  <li>⚠️ Performance crash (score drops below 20)</li>
                  <li>🔒 SSL expires within 7 days</li>
                  <li>🛡️ Critical security vulnerabilities</li>
                </ul>
                <p className="mt-2 text-xs">
                  <strong>Monthly Reports:</strong> Receive comprehensive
                  performance summaries for client-tagged domains on the 1st of
                  each month.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Feature List */}
        {isVerified && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">
              Available FREE Features:
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Automated daily scans
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Critical issue alerts (malware, downtime, crashes)
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Monthly performance reports (client-tagged domains)
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                White-label PDF reports
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Priority support
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
