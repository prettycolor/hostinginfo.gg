import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Download,
  Globe,
  Layers,
  RefreshCw,
  Search,
  Server,
  Shield,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  type DomainIntelligence,
  getPriorityVariant,
  getScoreColor,
  normalizeIntelligenceReport,
} from "@/lib/intelligence-api";
import { normalizeScanDomainInput } from "@/lib/domain-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface IntelligenceScanSummary {
  id: number;
  domain: string;
  edgeProvider: string | null;
  originHost: string | null;
  confidenceScore: number | null;
  techCount: number;
  createdAt: string;
}

interface DashboardIntelligenceWorkspaceProps {
  selectedDomain?: string | null;
  onScanSaved?: () => void;
}

function formatExpiryDays(days: number | null | undefined) {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    return "Unavailable";
  }
  if (days < 0) return "Expired";
  if (days === 0) return "0 days";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function DashboardIntelligenceWorkspace({
  selectedDomain = null,
  onScanSaved,
}: DashboardIntelligenceWorkspaceProps) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(selectedDomain || "");
  const [runningScan, setRunningScan] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<IntelligenceScanSummary[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [report, setReport] = useState<DomainIntelligence | null>(null);

  useEffect(() => {
    setSearchInput(selectedDomain || "");
  }, [selectedDomain]);

  const loadRecentScans = useCallback(async () => {
    try {
      const response = await apiClient.get<{
        scans?: IntelligenceScanSummary[];
      }>("/intelligence/scans?limit=12");
      setRecentScans(Array.isArray(response.scans) ? response.scans : []);
    } catch (loadError) {
      console.error("Failed to load intelligence scans:", loadError);
    }
  }, []);

  useEffect(() => {
    void loadRecentScans();
  }, [loadRecentScans]);

  const runScan = async () => {
    const domain = normalizeScanDomainInput(searchInput);
    if (!domain) {
      setError("Enter a valid domain to analyze.");
      return;
    }

    try {
      setRunningScan(true);
      setError(null);
      const response = await apiClient.post<{
        scan: { id: number; domain: string };
        report: unknown;
      }>("/intelligence/scans/run", {
        domain,
      });

      setSelectedScanId(response.scan.id);
      setReport(normalizeIntelligenceReport(response.report));
      setSearchInput(response.scan.domain);
      await loadRecentScans();
      onScanSaved?.();
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Failed to run intelligence scan",
      );
    } finally {
      setRunningScan(false);
    }
  };

  const handleSelectScan = async (scanId: number, domainFromList?: string) => {
    try {
      setLoadingReport(true);
      setError(null);
      if (domainFromList) {
        setSearchInput(domainFromList);
      }
      const response = await apiClient.get<{
        report: unknown;
      }>(`/intelligence/scans/${scanId}`);

      setSelectedScanId(scanId);
      const normalizedReport = normalizeIntelligenceReport(response.report);
      setReport(normalizedReport);
      if (normalizedReport?.domain) {
        setSearchInput(normalizedReport.domain);
      }
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Failed to load saved intelligence scan",
      );
    } finally {
      setLoadingReport(false);
    }
  };

  const visibleRecommendations = useMemo(
    () => report?.recommendations.slice(0, 6) || [],
    [report],
  );

  const visibleTechnologies = useMemo(
    () => report?.technologies.slice(0, 12) || [],
    [report],
  );

  const visibleDns = useMemo(() => report?.dns.slice(0, 10) || [], [report]);

  const technologyMetrics = useMemo(() => {
    const technologies = report?.technologies || [];
    const total = technologies.length;
    const versioned = technologies.filter((technology) =>
      Boolean(technology.version),
    ).length;
    const atRisk = technologies.filter((technology) => technology.isEOL).length;
    const avgConfidence =
      total > 0
        ? Math.round(
            technologies.reduce(
              (sum, technology) => sum + technology.confidence,
              0,
            ) / total,
          )
        : 0;

    return {
      total,
      versioned,
      atRisk,
      avgConfidence,
    };
  }, [report]);

  const technologyCategoryCounts = useMemo(() => {
    const categoryMap = new Map<string, number>();
    for (const technology of report?.technologies || []) {
      const category = technology.category || "Technology";
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }

    return Array.from(categoryMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [report]);

  const atRiskTechnologies = useMemo(
    () => (report?.technologies || []).filter((technology) => technology.isEOL),
    [report],
  );

  const technologyRelatedIssues = useMemo(() => {
    const issueMatchPattern =
      /technolog|version|outdated|end[- ]of[- ]life|eol|wordpress|php|cve/i;

    return (report?.security.issues || []).filter((issue) => {
      if (/tech/i.test(issue.category)) {
        return true;
      }
      return issueMatchPattern.test(`${issue.message} ${issue.recommendation}`);
    });
  }, [report]);

  const technologyCoverage = useMemo(() => {
    const availability = report?.dataAvailability;
    return [
      {
        label: "Technology Signals",
        status: availability?.technology,
      },
      {
        label: "DNS Signals",
        status: availability?.dns,
      },
      {
        label: "WHOIS Signals",
        status: availability?.whois,
      },
      {
        label: "IP Signals",
        status: availability?.ip,
      },
      {
        label: "URLScan Signals",
        status: availability?.urlscan,
      },
    ];
  }, [report]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-500" />
            Intelligence Workspace
          </CardTitle>
          <CardDescription>
            Run authenticated scans, keep account history, and review saved
            domain intelligence from one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter domain (example.com)"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void runScan();
                  }
                }}
                className="pl-9"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Button
                type="button"
                onClick={() => void runScan()}
                disabled={runningScan}
              >
                {runningScan ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  "Analyze"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const domain =
                    normalizeScanDomainInput(searchInput) || selectedDomain;
                  navigate(
                    domain
                      ? `/intelligence?domain=${encodeURIComponent(domain)}`
                      : "/intelligence",
                  );
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Open Full Page
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Account Scans</CardTitle>
            <CardDescription>
              Your latest saved intelligence runs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentScans.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No saved intelligence scans yet.
              </div>
            ) : (
              recentScans.map((scan) => (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => void handleSelectScan(scan.id, scan.domain)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedScanId === scan.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{scan.domain}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(scan.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {scan.confidenceScore !== null && (
                      <Badge variant="outline">{scan.confidenceScore}%</Badge>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {scan.edgeProvider && (
                      <span>Edge: {scan.edgeProvider}</span>
                    )}
                    {scan.originHost && <span>Origin: {scan.originHost}</span>}
                    <span>{scan.techCount} techs</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loadingReport && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
              <Skeleton className="h-80 w-full" />
            </div>
          )}

          {!loadingReport && !report && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="mb-4 h-14 w-14 text-muted-foreground" />
                <h3 className="text-xl font-semibold">No report selected</h3>
                <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                  Run a new intelligence scan or pick one from your recent saved
                  scans to load it into the dashboard workspace.
                </p>
              </CardContent>
            </Card>
          )}

          {!loadingReport && report && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-cyan-500" />
                    {report.domain}
                  </CardTitle>
                  <CardDescription>
                    Last scanned {new Date(report.lastScanned).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Security</p>
                    <p
                      className={`mt-2 text-3xl font-bold ${getScoreColor(report.security.overall)}`}
                    >
                      {report.security.overall}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Grade {report.security.grade}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Expiry</p>
                    <p className="mt-2 text-3xl font-bold">
                      {formatExpiryDays(report.whois.daysUntilExpiry)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Registrar: {report.whois.registrar || "Unknown"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Hosting</p>
                    <p className="mt-2 text-xl font-semibold">
                      {report.infrastructure.hostingProvider}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.infrastructure.datacenterLocation ||
                        "Location unavailable"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                      Technologies
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                      {report.technologies.length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.dns.length} DNS records captured
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visibleRecommendations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No recommendations returned for this scan.
                      </p>
                    ) : (
                      visibleRecommendations.map((recommendation) => (
                        <div
                          key={recommendation.id}
                          className="rounded-lg border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {recommendation.title}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {recommendation.description}
                              </p>
                            </div>
                            <Badge
                              variant={getPriorityVariant(
                                recommendation.priority,
                              )}
                            >
                              {recommendation.priority}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-blue-500" />
                      Infrastructure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        Hosting Provider
                      </span>
                      <span>{report.infrastructure.hostingProvider}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">CDN</span>
                      <span>{report.infrastructure.cdn || "Not detected"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">ASN</span>
                      <span>{report.infrastructure.asn || "Unavailable"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">IPs</span>
                      <span>
                        {report.infrastructure.ipAddresses.length
                          ? report.infrastructure.ipAddresses.join(", ")
                          : "Unavailable"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Technologies</CardTitle>
                    <CardDescription>
                      Frameworks, servers, runtimes, hosting, and security
                      services inferred from this scan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleTechnologies.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No technologies detected.
                      </p>
                    ) : (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Total Technologies
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {technologyMetrics.total}
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Version Identified
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {technologyMetrics.versioned}
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              At Risk (EOL)
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {technologyMetrics.atRisk}
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Avg Confidence
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {technologyMetrics.avgConfidence}%
                            </p>
                          </div>
                        </div>

                        {technologyCategoryCounts.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Categories
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {technologyCategoryCounts.map(
                                ([category, count]) => (
                                  <Badge key={category} variant="outline">
                                    {category}: {count}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {visibleTechnologies.map((technology) => (
                            <div
                              key={`${technology.name}-${technology.category}-${technology.version || "na"}`}
                              className="rounded-lg border p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {technology.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {technology.category}
                                    {technology.version
                                      ? ` • v${technology.version}`
                                      : ""}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <Badge variant="outline">
                                    {technology.confidence}%
                                  </Badge>
                                  {technology.isEOL && (
                                    <Badge variant="destructive">EOL</Badge>
                                  )}
                                </div>
                              </div>
                              {technology.eolDate && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  End of life:{" "}
                                  {new Date(
                                    technology.eolDate,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {report &&
                          report.technologies.length >
                            visibleTechnologies.length && (
                            <p className="text-xs text-muted-foreground">
                              Showing {visibleTechnologies.length} of{" "}
                              {report.technologies.length} detected
                              technologies.
                            </p>
                          )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Technology Signals</CardTitle>
                      <CardDescription>
                        Coverage and risk evidence from this scan.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {technologyCoverage.map((coverage) => (
                          <div
                            key={coverage.label}
                            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                          >
                            <span className="text-sm">{coverage.label}</span>
                            <Badge
                              variant={
                                coverage.status === true
                                  ? "default"
                                  : coverage.status === false
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {coverage.status === true
                                ? "Available"
                                : coverage.status === false
                                  ? "Missing"
                                  : "Unknown"}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 rounded-lg border p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          At Risk Technologies
                        </p>
                        {atRiskTechnologies.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No end-of-life technologies detected.
                          </p>
                        ) : (
                          atRiskTechnologies.slice(0, 5).map((technology) => (
                            <div
                              key={`risk-${technology.name}-${technology.version || "na"}`}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="truncate">
                                {technology.name}
                                {technology.version
                                  ? ` v${technology.version}`
                                  : ""}
                              </span>
                              <Badge variant="destructive">EOL</Badge>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="space-y-2 rounded-lg border p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Related Security Findings
                        </p>
                        {technologyRelatedIssues.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No technology-specific security findings in this
                            report.
                          </p>
                        ) : (
                          technologyRelatedIssues
                            .slice(0, 4)
                            .map((issue, idx) => (
                              <div
                                key={`${issue.category}-${idx}`}
                                className="rounded-md border px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">
                                    {issue.message}
                                  </p>
                                  <Badge
                                    variant={getPriorityVariant(issue.severity)}
                                  >
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {issue.recommendation}
                                </p>
                              </div>
                            ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>DNS Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {visibleDns.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No DNS records collected.
                        </p>
                      ) : (
                        visibleDns.map((record, index) => (
                          <div
                            key={`${record.type}-${record.value}-${index}`}
                            className="rounded-lg border p-3 text-sm"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <Badge variant="outline">{record.type}</Badge>
                              <span className="truncate text-muted-foreground">
                                {record.value}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
