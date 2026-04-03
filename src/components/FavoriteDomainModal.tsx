import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

interface PerformanceScanResult {
  mobileScore: number;
  desktopScore: number;
  mobileFcp?: number;
  mobileLcp?: number;
  mobileTbt?: number;
  mobileCls?: number;
  desktopFcp?: number;
  desktopLcp?: number;
  desktopTbt?: number;
  desktopCls?: number;
}

interface SecurityScanResult {
  securityScore: number;
  sslValid: boolean;
  securityHeaders: {
    strictTransportSecurity: boolean;
    contentSecurityPolicy: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
  };
}

interface FavoriteScanResults {
  performance?: PerformanceScanResult | { error: string };
  security?: SecurityScanResult | { error: string };
}

interface FavoriteDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorite: {
    id: number;
    domain: string;
    alias?: string | null;
  } | null;
  onScanComplete?: () => void;
}

export function FavoriteDomainModal({
  open,
  onOpenChange,
  favorite,
  onScanComplete,
}: FavoriteDomainModalProps) {
  const [activeTab, setActiveTab] = useState("performance");
  const [loading, setLoading] = useState(false);
  const [scanResults, setScanResults] = useState<FavoriteScanResults | null>(
    null,
  );

  const handleScan = async (scanType: "performance" | "security") => {
    if (!favorite) return;

    setLoading(true);
    setScanResults(null);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/favorites/scan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          favoriteId: favorite.id,
          scanType,
        }),
      });

      if (!response.ok) {
        throw new Error("Scan failed");
      }

      const data = (await response.json()) as { results?: FavoriteScanResults };
      setScanResults(data.results ?? null);
      toast.success(
        `${scanType === "performance" ? "Performance" : "Security"} scan completed!`,
      );
      onScanComplete?.();
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Failed to complete scan");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <TrendingUp className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan: {favorite?.alias || favorite?.domain}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">
              <Activity className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="full">
              <Shield className="h-4 w-4 mr-2" />
              Full
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Analyze page speed and Core Web Vitals
              </p>
              <Button
                onClick={() => handleScan("performance")}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Run Scan"
                )}
              </Button>
            </div>

            {scanResults?.performance && !scanResults.performance.error && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Mobile Score</h3>
                      {getScoreIcon(scanResults.performance.mobileScore)}
                    </div>
                    <p
                      className={`text-4xl font-bold ${getScoreColor(scanResults.performance.mobileScore)}`}
                    >
                      {scanResults.performance.mobileScore}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Desktop Score</h3>
                      {getScoreIcon(scanResults.performance.desktopScore)}
                    </div>
                    <p
                      className={`text-4xl font-bold ${getScoreColor(scanResults.performance.desktopScore)}`}
                    >
                      {scanResults.performance.desktopScore}
                    </p>
                  </Card>
                </div>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">
                    Core Web Vitals (Mobile)
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">
                        First Contentful Paint
                      </p>
                      <p className="font-medium">
                        {scanResults.performance.mobileFcp?.toFixed(2)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Largest Contentful Paint
                      </p>
                      <p className="font-medium">
                        {scanResults.performance.mobileLcp?.toFixed(2)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Total Blocking Time
                      </p>
                      <p className="font-medium">
                        {scanResults.performance.mobileTbt?.toFixed(0)}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Cumulative Layout Shift
                      </p>
                      <p className="font-medium">
                        {scanResults.performance.mobileCls?.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {scanResults?.performance?.error && (
              <Card className="p-4 border-red-500 bg-red-500/10">
                <p className="text-red-600 dark:text-red-400">
                  {scanResults.performance.error}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Check SSL, security headers, and vulnerabilities
              </p>
              <Button onClick={() => handleScan("security")} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Run Scan"
                )}
              </Button>
            </div>

            {scanResults?.security && !scanResults.security.error && (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Security Score</h3>
                    {getScoreIcon(scanResults.security.securityScore)}
                  </div>
                  <p
                    className={`text-4xl font-bold ${getScoreColor(scanResults.security.securityScore)}`}
                  >
                    {scanResults.security.securityScore}/100
                  </p>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Security Checks</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>SSL Certificate</span>
                      <span
                        className={
                          scanResults.security.sslValid
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {scanResults.security.sslValid
                          ? "✓ Valid"
                          : "✗ Invalid"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Strict-Transport-Security</span>
                      <span
                        className={
                          scanResults.security.securityHeaders
                            .strictTransportSecurity
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {scanResults.security.securityHeaders
                          .strictTransportSecurity
                          ? "✓ Enabled"
                          : "✗ Missing"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Content-Security-Policy</span>
                      <span
                        className={
                          scanResults.security.securityHeaders
                            .contentSecurityPolicy
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {scanResults.security.securityHeaders
                          .contentSecurityPolicy
                          ? "✓ Enabled"
                          : "✗ Missing"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>X-Frame-Options</span>
                      <span
                        className={
                          scanResults.security.securityHeaders.xFrameOptions
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {scanResults.security.securityHeaders.xFrameOptions
                          ? "✓ Enabled"
                          : "✗ Missing"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>X-Content-Type-Options</span>
                      <span
                        className={
                          scanResults.security.securityHeaders
                            .xContentTypeOptions
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {scanResults.security.securityHeaders
                          .xContentTypeOptions
                          ? "✓ Enabled"
                          : "✗ Missing"}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {scanResults?.security?.error && (
              <Card className="p-4 border-red-500 bg-red-500/10">
                <p className="text-red-600 dark:text-red-400">
                  {scanResults.security.error}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="full" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Run both performance and security checks together
              </p>
              <Button onClick={() => handleScan("full")} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Run Full Scan"
                )}
              </Button>
            </div>

            {scanResults?.performance && !scanResults.performance.error && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Mobile Score</h3>
                    {getScoreIcon(scanResults.performance.mobileScore)}
                  </div>
                  <p
                    className={`text-4xl font-bold ${getScoreColor(scanResults.performance.mobileScore)}`}
                  >
                    {scanResults.performance.mobileScore}
                  </p>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Security Score</h3>
                    {scanResults.security &&
                    !scanResults.security.error &&
                    "securityScore" in scanResults.security
                      ? getScoreIcon(scanResults.security.securityScore)
                      : null}
                  </div>
                  <p
                    className={`text-4xl font-bold ${
                      scanResults.security &&
                      !scanResults.security.error &&
                      "securityScore" in scanResults.security
                        ? getScoreColor(scanResults.security.securityScore)
                        : "text-muted-foreground"
                    }`}
                  >
                    {scanResults.security &&
                    !scanResults.security.error &&
                    "securityScore" in scanResults.security
                      ? `${scanResults.security.securityScore}/100`
                      : "N/A"}
                  </p>
                </Card>
              </div>
            )}

            {scanResults?.security && !scanResults.security.error && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Security Checks</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>SSL Certificate</span>
                    <span
                      className={
                        scanResults.security.sslValid
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {scanResults.security.sslValid ? "✓ Valid" : "✗ Invalid"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Strict-Transport-Security</span>
                    <span
                      className={
                        scanResults.security.securityHeaders
                          .strictTransportSecurity
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {scanResults.security.securityHeaders
                        .strictTransportSecurity
                        ? "✓ Enabled"
                        : "✗ Missing"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Content-Security-Policy</span>
                    <span
                      className={
                        scanResults.security.securityHeaders
                          .contentSecurityPolicy
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {scanResults.security.securityHeaders
                        .contentSecurityPolicy
                        ? "✓ Enabled"
                        : "✗ Missing"}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {scanResults?.performance?.error && (
              <Card className="p-4 border-red-500 bg-red-500/10">
                <p className="text-red-600 dark:text-red-400">
                  {scanResults.performance.error}
                </p>
              </Card>
            )}

            {scanResults?.security?.error && (
              <Card className="p-4 border-red-500 bg-red-500/10">
                <p className="text-red-600 dark:text-red-400">
                  {scanResults.security.error}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
