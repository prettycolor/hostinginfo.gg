/**
 * Intelligence Accordion Component
 *
 * Comprehensive intelligence display using all analysis engines
 */

import { useState } from "react";
import {
  ChevronDown,
  Code,
  Database,
  Shield,
  Zap,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PerformanceIssue {
  severity: string;
  title: string;
  description: string;
  recommendation: string;
}

interface TechnologyCategory {
  name: string;
  count: number;
  technologies: Array<{
    name: string;
    version?: string;
  }>;
}

interface SecurityConcern {
  severity: string;
  technology: string;
  issue: string;
  recommendation: string;
}

interface CostOptimization {
  title: string;
  description: string;
  savings: number;
}

interface HostingRecommendation {
  provider: string;
  plan: string;
  pricing: {
    monthly: number;
  };
  score: number;
}

interface IntelligenceScanData {
  performance?: {
    grade?: string;
    metrics?: {
      loadTime?: number;
      ttfb?: number;
      lcp?: number;
      score?: number;
    };
    strengths?: string[];
    issues?: PerformanceIssue[];
    insights?: string[];
  };
  techStack?: {
    totalTechnologies?: number;
    complexity?: string;
    modernityScore?: number;
    categories?: TechnologyCategory[];
    securityConcerns?: SecurityConcern[];
    insights?: string[];
  };
  dns?: {
    provider?: string;
    nameservers?: string[];
    insights?: string[];
    health?: {
      grade?: string;
      status?: string;
      score?: number;
    };
    configuration?: {
      hasCDN?: boolean;
      hasDNSSEC?: boolean;
      hasLoadBalancer?: boolean;
      hasFailover?: boolean;
    };
  };
  costAnalysis?: {
    insights?: string[];
    monthly?: {
      hosting?: { typical?: number };
      cdn?: { typical?: number };
      total?: { typical?: number };
    };
    annual?: {
      total?: { typical?: number };
    };
    optimizations?: CostOptimization[];
  };
  hostingRecommendations?: {
    insights?: string[];
    currentHosting?: {
      provider?: string;
      tier?: string;
      estimatedCost?: number;
    };
    topPick?: {
      score?: number;
      provider?: string;
      plan?: string;
      pricing?: {
        monthly?: number;
      };
      features?: string[];
      migrationDifficulty?: string;
      estimatedMigrationTime?: string;
    };
    recommendations?: HostingRecommendation[];
  };
}

interface IntelligenceAccordionProps {
  scanData: IntelligenceScanData;
}

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: {
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
}

function AccordionSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  badge,
}: AccordionSectionProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-primary">{icon}</div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="p-4 bg-card border-t border-border">{children}</div>
      )}
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical")
    return <XCircle className="h-4 w-4 text-destructive" />;
  if (severity === "warning" || severity === "high")
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <Info className="h-4 w-4 text-blue-500" />;
}

export default function IntelligenceAccordion({
  scanData,
}: IntelligenceAccordionProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["performance"]),
  );

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const performance = scanData.performance;
  const techStack = scanData.techStack;
  const dns = scanData.dns;
  const costAnalysis = scanData.costAnalysis;
  const hostingRecs = scanData.hostingRecommendations;

  return (
    <div className="space-y-4">
      {/* Performance Analysis */}
      <AccordionSection
        title="Performance Analysis"
        icon={<Zap className="h-5 w-5" />}
        isOpen={openSections.has("performance")}
        onToggle={() => toggleSection("performance")}
        badge={{
          text: `Grade ${performance?.grade || "N/A"}`,
          variant:
            performance?.grade === "A" || performance?.grade === "B"
              ? "default"
              : "destructive",
        }}
      >
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Load Time</p>
              <p className="text-2xl font-bold">
                {performance?.metrics?.loadTime || 0}ms
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">TTFB</p>
              <p className="text-2xl font-bold">
                {performance?.metrics?.ttfb || 0}ms
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">LCP</p>
              <p className="text-2xl font-bold">
                {performance?.metrics?.lcp || 0}ms
              </p>
            </div>
          </div>

          {/* Score Progress */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Performance Score</span>
              <span className="text-sm font-bold">
                {performance?.metrics?.score || 0}/100
              </span>
            </div>
            <Progress
              value={performance?.metrics?.score || 0}
              className="h-2"
            />
          </div>

          {/* Strengths */}
          {performance?.strengths && performance.strengths.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {performance.strengths.map((strength: string, i: number) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-green-500 mt-0.5">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues */}
          {performance?.issues && performance.issues.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Issues Found</h4>
              <div className="space-y-2">
                {performance.issues.map((issue, i: number) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-start gap-2">
                      <SeverityIcon severity={issue.severity} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{issue.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {issue.description}
                        </p>
                        <p className="text-xs text-primary mt-1">
                          💡 {issue.recommendation}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {performance?.insights && performance.insights.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold mb-2 text-sm">Key Insights</h4>
              <ul className="space-y-1">
                {performance.insights.map((insight: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Technology Stack */}
      <AccordionSection
        title="Technology Stack"
        icon={<Code className="h-5 w-5" />}
        isOpen={openSections.has("techStack")}
        onToggle={() => toggleSection("techStack")}
        badge={{
          text: `${techStack?.totalTechnologies || 0} technologies`,
          variant: "secondary",
        }}
      >
        <div className="space-y-4">
          {/* Complexity & Modernity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Complexity</p>
              <p className="text-lg font-bold capitalize">
                {techStack?.complexity || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Modernity Score</p>
              <p className="text-lg font-bold">
                {techStack?.modernityScore || 0}/100
              </p>
            </div>
          </div>

          {/* Categories */}
          {techStack?.categories && techStack.categories.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Technologies by Category</h4>
              <div className="space-y-3">
                {techStack.categories.map((category, i: number) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{category.name}</h5>
                      <Badge variant="outline">{category.count}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {category.technologies.map((tech, j: number) => (
                        <Badge key={j} variant="secondary">
                          {tech.name} {tech.version && `v${tech.version}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Concerns */}
          {techStack?.securityConcerns &&
            techStack.securityConcerns.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-destructive" />
                  Security Concerns
                </h4>
                <div className="space-y-2">
                  {techStack.securityConcerns.map((concern, i: number) => (
                    <Card key={i} className="p-3 border-destructive/50">
                      <div className="flex items-start gap-2">
                        <SeverityIcon severity={concern.severity} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {concern.technology}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {concern.issue}
                          </p>
                          <p className="text-xs text-primary mt-1">
                            💡 {concern.recommendation}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

          {/* Insights */}
          {techStack?.insights && techStack.insights.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold mb-2 text-sm">Insights</h4>
              <ul className="space-y-1">
                {techStack.insights.map((insight: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* DNS Infrastructure */}
      <AccordionSection
        title="DNS Infrastructure"
        icon={<Database className="h-5 w-5" />}
        isOpen={openSections.has("dns")}
        onToggle={() => toggleSection("dns")}
        badge={{
          text: `Grade ${dns?.health?.grade || "N/A"}`,
          variant:
            dns?.health?.grade === "A" || dns?.health?.grade === "B"
              ? "default"
              : "destructive",
        }}
      >
        <div className="space-y-4">
          {/* Provider & Health */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">DNS Provider</p>
              <p className="text-lg font-bold">{dns?.provider || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Health Status</p>
              <p className="text-lg font-bold capitalize">
                {dns?.health?.status || "N/A"}
              </p>
            </div>
          </div>

          {/* Health Score */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">DNS Health Score</span>
              <span className="text-sm font-bold">
                {dns?.health?.score || 0}/100
              </span>
            </div>
            <Progress value={dns?.health?.score || 0} className="h-2" />
          </div>

          {/* Configuration */}
          {dns?.configuration && (
            <div>
              <h4 className="font-semibold mb-2">Configuration</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  {dns.configuration.hasCDN ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">CDN</span>
                </div>
                <div className="flex items-center gap-2">
                  {dns.configuration.hasDNSSEC ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">DNSSEC</span>
                </div>
                <div className="flex items-center gap-2">
                  {dns.configuration.hasLoadBalancer ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">Load Balancer</span>
                </div>
                <div className="flex items-center gap-2">
                  {dns.configuration.hasFailover ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">Failover</span>
                </div>
              </div>
            </div>
          )}

          {/* Nameservers */}
          {dns?.nameservers && dns.nameservers.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">
                Nameservers ({dns.nameservers.length})
              </h4>
              <div className="space-y-1">
                {dns.nameservers.map((ns: string, i: number) => (
                  <div
                    key={i}
                    className="text-sm font-mono bg-muted/50 rounded px-2 py-1"
                  >
                    {ns}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {dns?.insights && dns.insights.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold mb-2 text-sm">Insights</h4>
              <ul className="space-y-1">
                {dns.insights.map((insight: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Cost Analysis */}
      <AccordionSection
        title="Cost Analysis"
        icon={<DollarSign className="h-5 w-5" />}
        isOpen={openSections.has("cost")}
        onToggle={() => toggleSection("cost")}
        badge={{
          text: `$${costAnalysis?.monthly?.total?.typical || 0}/mo`,
          variant: "secondary",
        }}
      >
        <div className="space-y-4">
          {/* Monthly Costs */}
          <div>
            <h4 className="font-semibold mb-2">Monthly Costs</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Hosting</span>
                <span className="font-bold">
                  ${costAnalysis?.monthly?.hosting?.typical || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">CDN</span>
                <span className="font-bold">
                  ${costAnalysis?.monthly?.cdn?.typical || 0}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  ${costAnalysis?.monthly?.total?.typical || 0}/mo
                </span>
              </div>
            </div>
          </div>

          {/* Annual Estimate */}
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Estimated Annual Cost</span>
              <span className="font-bold text-xl">
                ${costAnalysis?.annual?.total?.typical || 0}/year
              </span>
            </div>
          </div>

          {/* Optimizations */}
          {costAnalysis?.optimizations &&
            costAnalysis.optimizations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">
                  Cost Optimization Opportunities
                </h4>
                <div className="space-y-2">
                  {costAnalysis.optimizations.map((optimization, i: number) => (
                    <Card key={i} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {optimization.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {optimization.description}
                          </p>
                        </div>
                        {optimization.savings > 0 && (
                          <Badge variant="default" className="bg-green-500">
                            Save ${optimization.savings}/mo
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

          {/* Insights */}
          {costAnalysis?.insights && costAnalysis.insights.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold mb-2 text-sm">Insights</h4>
              <ul className="space-y-1">
                {costAnalysis.insights.map((insight: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Hosting Recommendations */}
      <AccordionSection
        title="Hosting Recommendations"
        icon={<TrendingUp className="h-5 w-5" />}
        isOpen={openSections.has("hosting")}
        onToggle={() => toggleSection("hosting")}
        badge={{
          text: `${hostingRecs?.recommendations?.length || 0} options`,
          variant: "secondary",
        }}
      >
        <div className="space-y-4">
          {/* Current Hosting */}
          {hostingRecs?.currentHosting && (
            <div className="border border-border rounded-lg p-3">
              <h4 className="font-semibold mb-2">Current Hosting</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Provider
                  </span>
                  <span className="font-medium">
                    {hostingRecs.currentHosting.provider}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tier</span>
                  <Badge variant="outline" className="capitalize">
                    {hostingRecs.currentHosting.tier}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Est. Cost
                  </span>
                  <span className="font-medium">
                    ${hostingRecs.currentHosting.estimatedCost}/mo
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top Pick */}
          {hostingRecs?.topPick && (
            <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg">🏆 Top Recommendation</h4>
                <Badge variant="default">
                  Score: {hostingRecs.topPick.score}/100
                </Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="font-bold text-xl">
                    {hostingRecs.topPick.provider}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hostingRecs.topPick.plan}
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    ${hostingRecs.topPick.pricing.monthly}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Key Features:</p>
                  <ul className="space-y-1">
                    {hostingRecs.topPick.features
                      .slice(0, 4)
                      .map((feature: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {hostingRecs.topPick.migrationDifficulty}
                  </Badge>
                  <span className="text-muted-foreground">
                    {hostingRecs.topPick.estimatedMigrationTime}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Other Recommendations */}
          {hostingRecs?.recommendations &&
            hostingRecs.recommendations.length > 1 && (
              <div>
                <h4 className="font-semibold mb-2">Other Options</h4>
                <div className="space-y-2">
                  {hostingRecs.recommendations
                    .slice(1, 4)
                    .map((recommendation, i: number) => (
                      <Card key={i} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold">
                              {recommendation.provider}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {recommendation.plan}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="font-bold">
                                ${recommendation.pricing.monthly}/mo
                              </span>
                              <Badge variant="outline" className="text-xs">
                                Score: {recommendation.score}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}

          {/* Insights */}
          {hostingRecs?.insights && hostingRecs.insights.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold mb-2 text-sm">Insights</h4>
              <ul className="space-y-1">
                {hostingRecs.insights.map((insight: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionSection>
    </div>
  );
}
