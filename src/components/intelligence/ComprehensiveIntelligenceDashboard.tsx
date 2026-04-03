/**
 * Comprehensive Intelligence Dashboard
 *
 * Enhanced dashboard that integrates all Phase 3 intelligence features:
 * - Executive Summary with Health Score
 * - Risk Assessment
 * - Domain Expiry Monitoring
 * - Registrar Analysis
 * - WHOIS Historical Tracking
 * - Domain Ownership Correlation
 * - Security Posture Scoring
 * - Infrastructure Attribution
 * - Recommendations & Action Items
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Server,
  Globe,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Download,
  RefreshCw,
} from "lucide-react";

interface ComprehensiveIntelligenceDashboardProps {
  domain: string;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface DashboardRiskFactor {
  severity: string;
  description: string;
  category: string;
  impact: string;
  likelihood: string;
  mitigation: string;
}

interface DashboardRecommendation {
  priority: string;
  title: string;
  category: string;
  description: string;
  impact: string;
  effort: string;
  timeframe: string;
}

interface DashboardActionItem {
  id: string;
  priority: string;
  title: string;
  status: string;
  description: string;
  dueDate?: string;
}

interface DashboardReport {
  generatedAt: string;
  executiveSummary: {
    overallHealthScore: number;
    criticalIssues: number;
    highPriorityIssues: number;
    mediumPriorityIssues: number;
    lowPriorityIssues: number;
    keyFindings: string[];
    topRecommendations: string[];
  };
  riskAssessment: {
    overallRisk: string;
    riskScore: number;
    riskFactors: DashboardRiskFactor[];
    mitigationPriority: string[];
  };
  recommendations: DashboardRecommendation[];
  actionItems: DashboardActionItem[];
  metadata: {
    completeness: number;
    dataSourcesUsed: string[];
    generationTime: number;
    version: string;
  };
  intelligenceModules: {
    domainExpiry?: unknown;
    securityPosture?: unknown;
    infrastructureAttribution?: unknown;
    registrarAnalysis?: unknown;
  };
}

export default function ComprehensiveIntelligenceDashboard({
  domain,
}: ComprehensiveIntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch comprehensive report
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["comprehensive-report", domain],
    queryFn: async (): Promise<DashboardReport> => {
      const response = await fetch(`/api/intelligence/report/${domain}`);
      if (!response.ok) throw new Error("Failed to fetch report");
      return (await response.json()) as DashboardReport;
    },
    enabled: !!domain,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            Generating comprehensive intelligence report...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load intelligence report. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!report) return null;

  const {
    executiveSummary,
    riskAssessment,
    recommendations,
    actionItems,
    metadata,
  } = report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Intelligence Report
          </h2>
          <p className="text-muted-foreground">
            Comprehensive analysis for {domain}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executiveSummary.overallHealthScore}/100
            </div>
            <Progress
              value={executiveSummary.overallHealthScore}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {getHealthGrade(executiveSummary.overallHealthScore)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executiveSummary.criticalIssues}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {riskAssessment.overallRisk}
            </div>
            <Badge
              variant={getRiskVariant(riskAssessment.overallRisk)}
              className="mt-2"
            >
              Score: {riskAssessment.riskScore}/100
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metadata.completeness}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Key Findings Alert */}
      {executiveSummary.criticalIssues > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Issues Detected</AlertTitle>
          <AlertDescription>
            {executiveSummary.criticalIssues} critical issue(s) require
            immediate attention. Review the recommendations below.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="modules">Intelligence</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Findings</CardTitle>
              <CardDescription>
                Top insights from the intelligence analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {executiveSummary.keyFindings.map(
                (finding: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                    <span className="text-sm">{finding}</span>
                  </div>
                ),
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Recommendations</CardTitle>
              <CardDescription>
                Priority actions to improve domain health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {executiveSummary.topRecommendations.map(
                (rec: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ),
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Issue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <IssueRow
                  label="Critical"
                  count={executiveSummary.criticalIssues}
                  variant="destructive"
                />
                <IssueRow
                  label="High Priority"
                  count={executiveSummary.highPriorityIssues}
                  variant="warning"
                />
                <IssueRow
                  label="Medium Priority"
                  count={executiveSummary.mediumPriorityIssues}
                  variant="default"
                />
                <IssueRow
                  label="Low Priority"
                  count={executiveSummary.lowPriorityIssues}
                  variant="secondary"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metadata.dataSourcesUsed.map(
                    (source: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{source}</span>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription>
                Overall Risk:{" "}
                <Badge variant={getRiskVariant(riskAssessment.overallRisk)}>
                  {riskAssessment.overallRisk.toUpperCase()}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {riskAssessment.riskFactors.map((risk, index: number) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityVariant(risk.severity)}>
                        {risk.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{risk.description}</span>
                    </div>
                    <Badge variant="outline">{risk.category}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Impact:</strong> {risk.impact}
                    </p>
                    <p>
                      <strong>Likelihood:</strong>{" "}
                      {risk.likelihood.replace("_", " ")}
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded text-sm">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mitigation Priority</CardTitle>
              <CardDescription>Recommended order of action</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {riskAssessment.mitigationPriority.map(
                  (item: string, index: number) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-bold text-primary">
                        {index + 1}.
                      </span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ),
                )}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.map((rec, index: number) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityVariant(rec.priority)}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                    <CardTitle className="text-lg">{rec.title}</CardTitle>
                  </div>
                  <Badge variant="outline">{rec.category}</Badge>
                </div>
                <CardDescription>{rec.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium">Impact</p>
                    <p className="text-sm text-muted-foreground">
                      {rec.impact}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Effort</p>
                    <Badge variant="secondary">
                      {rec.effort.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Timeframe</p>
                    <Badge variant="outline">
                      {rec.timeframe.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>
                {actionItems.length} action(s) pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actionItems.map((action) => (
                  <div
                    key={action.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityVariant(action.priority)}>
                          {action.priority.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{action.title}</span>
                      </div>
                      <Badge variant="secondary">
                        {action.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                    {action.dueDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Due: {new Date(action.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intelligence Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Domain Expiry */}
            {report.intelligenceModules.domainExpiry && (
              <ModuleCard
                title="Domain Expiry"
                icon={<Clock className="h-4 w-4" />}
                data={report.intelligenceModules.domainExpiry}
              />
            )}

            {/* Security Posture */}
            {report.intelligenceModules.securityPosture && (
              <ModuleCard
                title="Security Posture"
                icon={<Shield className="h-4 w-4" />}
                data={report.intelligenceModules.securityPosture}
              />
            )}

            {/* Infrastructure */}
            {report.intelligenceModules.infrastructureAttribution && (
              <ModuleCard
                title="Infrastructure"
                icon={<Server className="h-4 w-4" />}
                data={report.intelligenceModules.infrastructureAttribution}
              />
            )}

            {/* Registrar */}
            {report.intelligenceModules.registrarAnalysis && (
              <ModuleCard
                title="Registrar Analysis"
                icon={<Globe className="h-4 w-4" />}
                data={report.intelligenceModules.registrarAnalysis}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>Report generated in {metadata.generationTime}ms</div>
            <div>Version {metadata.version}</div>
            <div>{new Date(report.generatedAt).toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function IssueRow({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: BadgeVariant;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Badge variant={variant}>{count}</Badge>
    </div>
  );
}

function ModuleCard({
  title,
  icon,
  data,
}: {
  title: string;
  icon: React.ReactNode;
  data: unknown;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

// Helper Functions
function getHealthGrade(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Poor";
  return "Critical";
}

function getRiskVariant(risk: string) {
  switch (risk) {
    case "critical":
      return "destructive";
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    case "minimal":
      return "secondary";
    default:
      return "default";
  }
}

function getSeverityVariant(severity: string) {
  switch (severity) {
    case "critical":
      return "destructive";
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "default";
  }
}

function getPriorityVariant(priority: string) {
  switch (priority) {
    case "critical":
      return "destructive";
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "default";
  }
}
