/**
 * Real Intelligence Dashboard
 *
 * Comprehensive domain intelligence dashboard with live data fetching.
 * Displays security scores, WHOIS data, infrastructure, DNS records,
 * technologies, and actionable recommendations.
 *
 * Features:
 * - Real-time data fetching with React Query
 * - Automatic caching and background refresh
 * - Loading states and error handling
 * - Export functionality (PDF, CSV, JSON)
 * - Domain search and filtering
 * - Auto-refresh capabilities
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  intelligenceApi,
  getScoreColor,
  formatExpiryDays,
  getPriorityVariant,
  normalizeIntelligenceReport,
} from "@/lib/intelligence-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Globe,
  Server,
  Code,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Search,
  Clock,
  Database,
  Zap,
} from "lucide-react";

interface RealIntelligenceDashboardProps {
  initialDomain?: string;
}

interface SystemStatusResponse {
  overallHealth: string;
  services: Array<{
    status: string;
  }>;
}

export function RealIntelligenceDashboard({
  initialDomain = "",
}: RealIntelligenceDashboardProps) {
  const [domain, setDomain] = useState(initialDomain);
  const [searchInput, setSearchInput] = useState(initialDomain);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch comprehensive intelligence report
  const {
    data: report,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["intelligence-report", domain],
    queryFn: async () => {
      const data = await intelligenceApi.getComprehensiveReport(domain);
      // Normalize data to ensure all required fields exist with safe defaults
      return normalizeIntelligenceReport(data);
    },
    enabled: !!domain,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds if auto-refresh enabled
  });

  // Fetch system status
  const { data: systemStatus } = useQuery({
    queryKey: ["system-status"],
    queryFn: async (): Promise<SystemStatusResponse> =>
      (await intelligenceApi.getSystemStatus()) as unknown as SystemStatusResponse,
    staleTime: 60 * 1000, // 1 minute
  });

  const handleSearch = () => {
    if (searchInput.trim()) {
      setDomain(searchInput.trim());
    }
  };

  const handleExport = (format: "pdf" | "csv" | "json") => {
    if (!report) return;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${domain}-intelligence-report.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "csv") {
      // CSV export not yet implemented
      console.log("CSV export not yet implemented");
    } else if (format === "pdf") {
      // PDF export not yet implemented
      console.log("PDF export not yet implemented");
    }
  };

  // Safety check: Don't render anything if report structure is invalid
  const isReportValid =
    report &&
    typeof report === "object" &&
    Array.isArray(report.dns) &&
    Array.isArray(report.technologies) &&
    report.security &&
    report.whois &&
    report.infrastructure;

  const dataAvailability = report?.dataAvailability ?? {
    dns: Array.isArray(report?.dns) && report.dns.length > 0,
    whois: Boolean(report?.whois),
    ip: Boolean(
      report?.infrastructure?.ipAddresses?.[0] || report?.infrastructure?.asn,
    ),
    technology:
      Array.isArray(report?.technologies) && report.technologies.length > 0,
    urlscan: false,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intelligence Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive domain intelligence and security analysis
          </p>
        </div>
        {systemStatus && (
          <Badge
            variant={
              systemStatus.overallHealth === "healthy"
                ? "default"
                : "destructive"
            }
          >
            {
              systemStatus.services.filter(
                (service) => service.status === "operational",
              ).length
            }
            /{systemStatus.services.length} Services Online
          </Badge>
        )}
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter domain (e.g., example.com)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={!searchInput.trim()}>
              <Search className="h-4 w-4 mr-2" />
              Analyze
            </Button>
            {domain && (
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            )}
          </div>
          {domain && (
            <div className="flex items-center gap-4 mt-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh (30s)
              </label>
              {report && (
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("json")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("csv")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("pdf")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to fetch intelligence data:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {/* Invalid Report Structure Warning */}
      {report && !isLoading && !isReportValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Invalid report structure received from server. Please try refreshing
            or contact support.
            {!Array.isArray(report.dns) && (
              <div className="text-xs mt-1">Missing or invalid DNS data</div>
            )}
            {!Array.isArray(report.technologies) && (
              <div className="text-xs mt-1">
                Missing or invalid technology data
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Report Content */}
      {isReportValid && !isLoading && (
        <div className="space-y-6">
          {/* Security Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {report.security.overall}
                </div>
                <Badge
                  className="mt-2"
                  variant={
                    report.security.grade.startsWith("A")
                      ? "default"
                      : "destructive"
                  }
                >
                  Grade {report.security.grade}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Issues Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {report.security.issues?.length || 0}
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="destructive" className="text-xs">
                    {report.security.issues?.filter(
                      (i) => i.severity === "critical",
                    ).length || 0}{" "}
                    Critical
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {report.security.issues?.filter(
                      (i) => i.severity === "high",
                    ).length || 0}{" "}
                    High
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Domain Expiry
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.whois ? (
                  <>
                    <div className="text-3xl font-bold">
                      {report.whois.daysUntilExpiry}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      days remaining
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No data available
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Hosting Provider
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {report.infrastructure.hostingProvider}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {report.infrastructure.country ||
                    report.infrastructure.organization ||
                    "Unknown"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="security" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="whois">
                <Globe className="h-4 w-4 mr-2" />
                WHOIS
              </TabsTrigger>
              <TabsTrigger value="infrastructure">
                <Server className="h-4 w-4 mr-2" />
                Infrastructure
              </TabsTrigger>
              <TabsTrigger value="dns">
                <Database className="h-4 w-4 mr-2" />
                DNS
              </TabsTrigger>
              <TabsTrigger value="technology">
                <Code className="h-4 w-4 mr-2" />
                Technology
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                <Zap className="h-4 w-4 mr-2" />
                Actions
              </TabsTrigger>
            </TabsList>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Analysis</CardTitle>
                  <CardDescription>
                    Comprehensive security assessment across multiple categories
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Category Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Object.entries(report.security.categories).map(
                      ([category, score]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">
                              {category}
                            </span>
                            <span className="text-sm font-bold">{score}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${getScoreColor(score)}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {/* Issues */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Security Issues</h3>
                    {!report.security.issues ||
                    report.security.issues.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>No security issues detected</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {report.security.issues.map((issue, index) => (
                          <Alert
                            key={index}
                            variant={
                              issue.severity === "critical" ||
                              issue.severity === "high"
                                ? "destructive"
                                : "default"
                            }
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="font-semibold">
                                    {issue.message}
                                  </span>
                                  <p className="text-sm mt-1">
                                    {issue.recommendation}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    issue.severity === "critical"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {issue.severity}
                                </Badge>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WHOIS Tab */}
            <TabsContent value="whois" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>WHOIS Information</CardTitle>
                  <CardDescription>
                    Domain registration and ownership details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.whois ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Registrar
                        </p>
                        <p className="text-lg font-semibold">
                          {report.whois.registrar}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Registrant
                        </p>
                        <p className="text-lg font-semibold">
                          {report.whois.registrantName || "Private"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Created
                        </p>
                        <p className="text-lg font-semibold">
                          {new Date(
                            report.whois.creationDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Expires
                        </p>
                        <p className="text-lg font-semibold">
                          {new Date(
                            report.whois.expirationDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Updated
                        </p>
                        <p className="text-lg font-semibold">
                          {new Date(
                            report.whois.updatedDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Days Until Expiry
                        </p>
                        <p className="text-lg font-semibold">
                          <span
                            className={
                              formatExpiryDays(report.whois.daysUntilExpiry)
                                .color
                            }
                          >
                            {report.whois.daysUntilExpiry} days
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        WHOIS data not available for this domain
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Infrastructure Tab */}
            <TabsContent value="infrastructure" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Infrastructure Details</CardTitle>
                  <CardDescription>
                    Hosting provider and server information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Hosting Provider
                      </p>
                      <p className="text-lg font-semibold">
                        {report.infrastructure.hostingProvider}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Location
                      </p>
                      <p className="text-lg font-semibold">
                        {report.infrastructure.country || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        IP Address
                      </p>
                      <p className="text-lg font-semibold">
                        {report.infrastructure.ipAddresses?.[0] || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        ASN
                      </p>
                      <p className="text-lg font-semibold">
                        {report.infrastructure.asn}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* DNS Tab */}
            <TabsContent value="dns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>DNS Records</CardTitle>
                  <CardDescription>
                    Domain Name System configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.dns && report.dns.length > 0 ? (
                    <div className="space-y-4">
                      {["A", "AAAA", "MX", "TXT", "NS", "CNAME"].map((type) => {
                        const records = report.dns.filter(
                          (r) => r.type === type,
                        );
                        if (records.length === 0) return null;
                        return (
                          <div key={type}>
                            <h3 className="font-semibold mb-2">
                              {type} Records
                            </h3>
                            <div className="space-y-2">
                              {records.map((record, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                >
                                  <span className="font-mono text-sm">
                                    {record.value}
                                  </span>
                                  <div className="flex gap-2">
                                    {record.priority && (
                                      <Badge variant="outline">
                                        Priority: {record.priority}
                                      </Badge>
                                    )}
                                    <Badge variant="secondary">
                                      TTL: {record.ttl}s
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Alert>
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>No DNS records found</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Technology Tab */}
            <TabsContent value="technology" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Technology Stack</CardTitle>
                  <CardDescription>
                    Detected technologies and frameworks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.technologies.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.technologies.map((tech, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{tech.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {tech.category}
                              </p>
                              {tech.version && (
                                <p className="text-sm mt-1">
                                  Version: {tech.version}
                                </p>
                              )}
                            </div>
                          </div>
                          {tech.eolDate && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                End of Life:{" "}
                                {new Date(tech.eolDate).toLocaleDateString()}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        No technologies detected
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                  <CardDescription>
                    Actionable steps to improve security and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {report.recommendations.map((rec, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{rec.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {rec.description}
                              </p>
                              {rec.impact && (
                                <p className="text-sm mt-2">
                                  <span className="font-medium">Impact:</span>{" "}
                                  {rec.impact}
                                </p>
                              )}
                            </div>
                            <Badge variant={getPriorityVariant(rec.priority)}>
                              {rec.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>
                        No recommendations at this time. Your domain is
                        well-configured!
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Data Availability Footer */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    {dataAvailability.dns ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">DNS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dataAvailability.whois ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">WHOIS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dataAvailability.ip ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">IP Intel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dataAvailability.technology ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Technology</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dataAvailability.urlscan ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">URLScan</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last scanned: {new Date(report.lastScanned).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!domain && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Domain Selected</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Enter a domain name above to start analyzing its security,
              infrastructure, and technology stack.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
