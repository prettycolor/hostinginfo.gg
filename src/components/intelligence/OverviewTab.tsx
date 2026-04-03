import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Shield,
  Zap,
  Mail,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Server,
  Globe,
  SearchCheck,
  Loader2,
} from "lucide-react";
import {
  generateRecommendations,
  generateRecommendationSummary,
} from "@/lib/recommendations";
import type {
  ComprehensiveScanData,
  Recommendation,
} from "@/lib/recommendations/types";
import { CriticalIssuesModal } from "./CriticalIssuesModal";
import { MigrationSupportPanel } from "./MigrationSupportPanel";

type CriticalIssueObject = {
  id?: string;
  severity?: string;
  title?: string;
  description?: string;
  issue?: string;
  message?: string;
};

type CriticalIssue = string | CriticalIssueObject;

type NormalizedCriticalIssue = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
};

type OverviewEmailData = NonNullable<ComprehensiveScanData["email"]> & {
  securityGateway?: {
    detected?: boolean;
    provider?: string;
  };
};

type OverviewSecurityData = NonNullable<ComprehensiveScanData["security"]> & {
  malware?: {
    threats?: unknown[];
    isMalwareDetected?: boolean;
    isPhishingDetected?: boolean;
    isBlacklisted?: boolean;
  };
};

type OverviewPerformanceData = NonNullable<
  ComprehensiveScanData["performance"]
> & {
  mobile?: { score?: number };
  desktop?: { score?: number };
};

type OverviewTechnologyData = NonNullable<ComprehensiveScanData["technology"]> &
  Record<string, unknown> & {
    wordpress?: { detected?: boolean };
    server?: { type?: string; builderType?: string | null };
    serverType?: string;
  };

interface ModalRecommendation {
  id: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  action: string;
  estimatedTime?: string;
}

interface OverviewTabProps {
  data: ComprehensiveScanData & {
    overallScore: number;
    overallGrade: string;
    criticalIssues: CriticalIssue[];
    provider?: { provider?: string | null } | null;
    performance?: OverviewPerformanceData | null;
    email?: OverviewEmailData | null;
    ssl?: ComprehensiveScanData["ssl"] | null;
    security?: OverviewSecurityData | null;
    malware?: {
      threats?: unknown[];
      isMalwareDetected?: boolean;
      isPhishingDetected?: boolean;
      isBlacklisted?: boolean;
    } | null;
    geolocation?: { city?: string; country?: string } | null;
    technology?: OverviewTechnologyData | null;
    confidence: number;
    dataCompleteness: number;
    scanCompletionPercent?: number;
    performanceScanLoading?: boolean;
  };
  domain: string;
  isWebsiteBuilder?: boolean;
  builderType?: string | null;
}

export function OverviewTab({
  data,
  domain,
  isWebsiteBuilder = false,
  builderType = null,
}: OverviewTabProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedCompletion, setAnimatedCompletion] = useState(0);
  const animatedCompletionRef = useRef(0);
  const [issuesModalOpen, setIssuesModalOpen] = useState(false);
  const scanCompletionPercent = Math.round(
    Math.min(Math.max(data.scanCompletionPercent ?? 0, 0), 100),
  );
  const scanComplete = scanCompletionPercent >= 100 || data.overallScore > 0;

  // Generate recommendations to get accurate issue counts
  const recommendations = useMemo<Recommendation[]>(() => {
    return generateRecommendations(data);
  }, [data]);

  const modalRecommendations = useMemo<ModalRecommendation[]>(() => {
    return recommendations.map((rec) => ({
      id: rec.id,
      category: rec.category,
      priority: rec.priority,
      title: rec.title,
      description: rec.issue,
      impact: rec.impact,
      action: rec.recommendation,
      estimatedTime: rec.estimatedTime,
    }));
  }, [recommendations]);

  const recommendationSummary = useMemo(() => {
    return generateRecommendationSummary(recommendations);
  }, [recommendations]);

  const normalizedCriticalIssues = useMemo<NormalizedCriticalIssue[]>(() => {
    const normalizeSeverity = (
      severity: string | undefined,
    ): NormalizedCriticalIssue["severity"] => {
      const value = severity?.toLowerCase();
      if (value === "critical") return "critical";
      if (value === "high") return "high";
      if (value === "medium") return "medium";
      if (value === "low") return "low";
      return "critical";
    };

    return (data.criticalIssues || [])
      .map((rawIssue, index) => {
        if (typeof rawIssue === "string") {
          const cleaned = rawIssue.replace(/^🚨\s*/, "").trim();
          if (!cleaned) return null;

          const sourceMatch = cleaned.match(/^([^:]+):\s+(.+)$/);
          if (sourceMatch) {
            const source = sourceMatch[1].trim();
            const details = sourceMatch[2].trim();
            return {
              id: `critical-${index}`,
              severity: "critical",
              title: `${source} Alert`,
              description: details || cleaned,
            };
          }

          return {
            id: `critical-${index}`,
            severity: "critical",
            title: cleaned,
            description: cleaned,
          };
        }

        const title =
          typeof rawIssue.title === "string" && rawIssue.title.trim()
            ? rawIssue.title.trim()
            : typeof rawIssue.issue === "string" && rawIssue.issue.trim()
              ? rawIssue.issue.trim()
              : typeof rawIssue.message === "string" && rawIssue.message.trim()
                ? rawIssue.message.trim()
                : typeof rawIssue.description === "string" &&
                    rawIssue.description.trim()
                  ? rawIssue.description.trim()
                  : "";

        const description =
          typeof rawIssue.description === "string" &&
          rawIssue.description.trim()
            ? rawIssue.description.trim()
            : title;

        if (!title && !description) return null;

        return {
          id:
            typeof rawIssue.id === "string" && rawIssue.id.trim()
              ? rawIssue.id
              : `critical-${index}`,
          severity: normalizeSeverity(rawIssue.severity),
          title: title || description,
          description: description || title,
        };
      })
      .filter((issue): issue is NormalizedCriticalIssue => issue !== null);
  }, [data.criticalIssues]);

  const criticalIssueMessages = useMemo(() => {
    return normalizedCriticalIssues.map((issue) => issue.description);
  }, [normalizedCriticalIssues]);

  // Animate score on mount
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = data.overallScore / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(data.overallScore, current + increment);
      setAnimatedScore(Math.round(current));

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedScore(data.overallScore);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [data.overallScore]);

  useEffect(() => {
    animatedCompletionRef.current = animatedCompletion;
  }, [animatedCompletion]);

  // Smoothly animate completion progress updates as scan phases settle.
  useEffect(() => {
    const targetCompletion = Math.round(
      Math.min(Math.max(data.scanCompletionPercent ?? 0, 0), 100),
    );
    const startCompletion = animatedCompletionRef.current;

    if (startCompletion === targetCompletion) {
      return;
    }

    const duration = 450;
    const steps = 24;
    const increment = (targetCompletion - startCompletion) / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedCompletion(targetCompletion);
        return;
      }

      const nextValue = startCompletion + increment * step;
      setAnimatedCompletion(Math.round(nextValue));
    }, duration / steps);

    return () => clearInterval(timer);
  }, [data.scanCompletionPercent]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getGradeBadgeColor = (grade: string) => {
    if (grade === "Pending")
      return "bg-muted text-muted-foreground border border-border";
    if (grade === "A") return "bg-green-500 text-white";
    if (grade === "B") return "bg-blue-500 text-white";
    if (grade === "C") return "bg-yellow-500 text-white";
    if (grade === "D") return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  // Combine critical issues from report + high priority recommendations
  const criticalIssuesFromReport = normalizedCriticalIssues.length;
  const highPriorityRecommendations = recommendationSummary.high;

  // Check for malware threats (critical severity)
  const malwareData = data.malware ?? data.security?.malware;
  const malwareThreats = malwareData?.threats?.length || 0;
  const hasMalware = Boolean(
    malwareData?.isMalwareDetected ||
    malwareData?.isPhishingDetected ||
    malwareData?.isBlacklisted,
  );

  // If no structured critical issues were provided, fallback to raw malware threat count.
  const criticalCount =
    criticalIssuesFromReport > 0
      ? criticalIssuesFromReport
      : hasMalware
        ? malwareThreats
        : 0;
  const highCount = highPriorityRecommendations;
  const mediumCount = recommendationSummary.medium;
  const totalIssues = criticalCount + highCount + mediumCount;

  return (
    <div className="space-y-6">
      {/* Hero Score Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-stretch justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <SearchCheck className="h-8 w-8 text-primary" />
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold">
                        Overall Security & Performance Score
                      </h2>
                      {isWebsiteBuilder && builderType && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-sm">
                            <Server className="h-3 w-3 mr-1" />
                            Managed Platform: {builderType}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  {scanComplete ? (
                    <Badge
                      className={`${getGradeBadgeColor(data.overallGrade)} text-base px-3 py-1 self-start`}
                    >
                      Grade {data.overallGrade}
                    </Badge>
                  ) : (
                    <div className="h-8 w-24 rounded-md bg-muted animate-pulse self-start" />
                  )}
                </div>

                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="text-6xl font-bold text-primary">
                      {animatedCompletion}%
                    </div>
                    {data.performanceScanLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Scan Complete
                  </div>
                </div>
              </div>
              <Progress value={animatedCompletion} className="mt-4 h-3" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                {scanComplete ? (
                  <div
                    className={`text-3xl font-bold ${getScoreColor(animatedScore)}`}
                  >
                    {animatedScore}/100
                  </div>
                ) : (
                  <div className="h-10 w-24 mx-auto bg-background animate-pulse rounded-md" />
                )}
                <div className="text-sm text-muted-foreground mt-1">
                  Overall Score
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Technology Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Technology
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isWebsiteBuilder ? (
              <div>
                <Badge className="mb-2 bg-purple-500 text-white">
                  Website Builder
                </Badge>
                <div className="font-semibold">
                  {builderType || "Managed Platform"}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Fully Managed
                </div>
              </div>
            ) : data.technology?.wordpress?.detected ? (
              <div>
                <MigrationSupportPanel
                  technology={data.technology}
                  compact
                  showSupportButton={false}
                />
              </div>
            ) : (
              <div>
                {(() => {
                  const serverType = (
                    data.technology?.server?.type ||
                    data.technology?.serverType ||
                    "Unknown"
                  ).toString();
                  const isUnknown = serverType.toLowerCase() === "unknown";
                  return (
                    <>
                      <div className="font-semibold">{serverType}</div>
                      <div className="text-sm text-muted-foreground">
                        {isUnknown ? "Platform Unverified" : "Not Wordpress"}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hosting Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Hosting Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">
              {data.provider?.provider || "Unknown"}
            </div>
            <div className="text-sm text-muted-foreground">
              {data.geolocation?.city && data.geolocation?.country
                ? `${data.geolocation.city}, ${data.geolocation.country}`
                : data.geolocation?.country ||
                  data.geolocation?.city ||
                  "Location Unknown"}
            </div>
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.performance?.mobile && data.performance?.desktop ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Mobile</span>
                  <span
                    className={`font-semibold ${getScoreColor(data.performance.mobile.score)}`}
                  >
                    {data.performance.mobile.score}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Desktop</span>
                  <span
                    className={`font-semibold ${getScoreColor(data.performance.desktop.score)}`}
                  >
                    {data.performance.desktop.score}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Issues Card - Clickable */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => setIssuesModalOpen(true)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalIssues > 0 ? (
              <div className="space-y-1">
                {criticalCount > 0 && (
                  <div className="flex items-center justify-between group">
                    <span className="text-sm">Critical Issues</span>
                    <Badge
                      variant="destructive"
                      className="group-hover:scale-110 transition-transform"
                    >
                      {criticalCount}
                    </Badge>
                  </div>
                )}
                {highCount > 0 && (
                  <div className="flex items-center justify-between group">
                    <span className="text-sm">High Priority</span>
                    <Badge className="bg-orange-500 text-white group-hover:scale-110 transition-transform">
                      {highCount}
                    </Badge>
                  </div>
                )}
                {mediumCount > 0 && (
                  <div className="flex items-center justify-between group">
                    <span className="text-sm">Medium Priority</span>
                    <Badge className="bg-yellow-500 text-white group-hover:scale-110 transition-transform">
                      {mediumCount}
                    </Badge>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click to view details
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">No issues found</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Issues Modal */}
        <CriticalIssuesModal
          open={issuesModalOpen}
          onOpenChange={setIssuesModalOpen}
          criticalIssues={criticalIssueMessages}
          recommendations={modalRecommendations}
          domain={domain}
        />
      </div>

      {/* Security & Email Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* SSL */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm">SSL Certificate</span>
              </div>
              {data.ssl?.valid ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Invalid
                </Badge>
              )}
            </div>

            {/* WAF */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Web Application Firewall</span>
                </div>
                {data.security?.waf?.detected || isWebsiteBuilder ? (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {isWebsiteBuilder
                      ? "Managed"
                      : data.security?.waf?.provider || "Protected"}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Detected
                  </Badge>
                )}
              </div>
              {isWebsiteBuilder && builderType && (
                <p className="text-xs text-muted-foreground ml-6">
                  Integrated security managed by {builderType}
                </p>
              )}
              {!isWebsiteBuilder &&
                data.security?.waf?.detected &&
                data.security?.waf?.provider && (
                  <p className="text-xs text-muted-foreground ml-6">
                    Protected by {data.security.waf.provider}
                  </p>
                )}
            </div>

            {/* DDoS Protection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">DDoS Protection</span>
                </div>
                {data.security?.ddos?.protected || isWebsiteBuilder ? (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {isWebsiteBuilder ? "Managed" : "Active"}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Protected
                  </Badge>
                )}
              </div>
              {isWebsiteBuilder && builderType && (
                <p className="text-xs text-muted-foreground ml-6">
                  DDoS protection managed by {builderType}
                </p>
              )}
              {!isWebsiteBuilder &&
                data.security?.ddos?.protected &&
                data.security?.ddos?.provider && (
                  <p className="text-xs text-muted-foreground ml-6">
                    Protected by {data.security.ddos.provider} via{" "}
                    {data.security.ddos.method === "waf"
                      ? "WAF integration"
                      : "dedicated service"}
                  </p>
                )}
            </div>

            {/* Security Score - Only show for non-website-builder sites */}
            {!isWebsiteBuilder && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Security Score</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={data.security?.score || 0}
                    className="w-24 h-2"
                  />
                  <span
                    className={`font-semibold ${getScoreColor(data.security?.score || 0)}`}
                  >
                    {data.security?.score || 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* SPF */}
            <div className="flex items-center justify-between">
              <span className="text-sm">SPF Record</span>
              {data.email?.spf?.configured ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Missing
                </Badge>
              )}
            </div>

            {/* DMARC */}
            <div className="flex items-center justify-between">
              <span className="text-sm">DMARC Record</span>
              {data.email?.dmarc?.configured ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Missing
                </Badge>
              )}
            </div>

            {/* DKIM */}
            <div className="flex items-center justify-between">
              <span className="text-sm">DKIM Record</span>
              {data.email?.dkim?.configured ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Missing
                </Badge>
              )}
            </div>

            {/* Email Security Gateway */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Security Gateway</span>
                {(() => {
                  const securityGateway = data.email?.securityGateway;
                  if (securityGateway?.detected) {
                    return (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Protected
                      </Badge>
                    );
                  }
                  return (
                    <Badge variant="outline">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not Configured
                    </Badge>
                  );
                })()}
              </div>
              {(() => {
                const securityGateway = data.email?.securityGateway;
                if (securityGateway?.detected && securityGateway?.provider) {
                  return (
                    <p className="text-xs text-muted-foreground ml-6">
                      {securityGateway.provider}
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Email Score */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Email Security</span>
              <span className="font-semibold">
                {
                  [
                    data.email?.spf?.configured,
                    data.email?.dmarc?.configured,
                    data.email?.dkim?.configured,
                  ].filter(Boolean).length
                }
                /3
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues List */}
      {normalizedCriticalIssues.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Critical Issues Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {normalizedCriticalIssues.slice(0, 5).map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                >
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{issue.title}</span>
                      <Badge
                        variant={
                          issue.severity === "critical"
                            ? "destructive"
                            : "outline"
                        }
                        className={
                          issue.severity === "high"
                            ? "bg-orange-500 text-white"
                            : ""
                        }
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {issue.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
