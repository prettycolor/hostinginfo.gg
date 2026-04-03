/**
 * Intelligence Dashboard Component
 *
 * Main dashboard view for displaying comprehensive intelligence analysis results.
 * Shows summary metrics, insights, and detailed breakdowns from all engines.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Progress } from '../ui/progress';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  DollarSign,
  Zap,
} from 'lucide-react';
import type { IntelligenceReport } from '../../lib/intelligence-orchestrator';

interface DashboardInsight {
  type: 'critical' | 'warning' | 'info' | 'success';
  category: string;
  title: string;
  description: string;
  action?: string;
}

interface IntelligenceDashboardProps {
  report: IntelligenceReport;
  insights?: DashboardInsight[];
  onRescan?: () => void;
}

interface PerformanceMetricRow {
  name: string;
  value: string;
  status: 'good' | 'warning';
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

const getInsightIcon = (type: DashboardInsight['type']) => {
  switch (type) {
    case 'critical':
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'success':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    default:
      return <Info className="h-5 w-5 text-blue-600" />;
  }
};

const getInsightVariant = (type: DashboardInsight['type']): 'default' | 'destructive' => {
  return type === 'critical' ? 'destructive' : 'default';
};

export function IntelligenceDashboard({ report, insights = [], onRescan }: IntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const technologyList = report.techStack.categories.flatMap((category) => category.technologies);
  const performanceMetrics: PerformanceMetricRow[] = [
    {
      name: 'Load Time',
      value: `${(report.performance.metrics.loadTime / 1000).toFixed(2)}s`,
      status: report.performance.metrics.loadTime <= 2000 ? 'good' : 'warning',
    },
    {
      name: 'TTFB',
      value: `${report.performance.metrics.ttfb}ms`,
      status: report.performance.metrics.ttfb <= 400 ? 'good' : 'warning',
    },
    {
      name: 'FCP',
      value: `${report.performance.metrics.fcp}ms`,
      status: report.performance.metrics.fcp <= 1800 ? 'good' : 'warning',
    },
    {
      name: 'LCP',
      value: `${report.performance.metrics.lcp}ms`,
      status: report.performance.metrics.lcp <= 2500 ? 'good' : 'warning',
    },
    {
      name: 'CLS',
      value: report.performance.metrics.cls.toFixed(2),
      status: report.performance.metrics.cls <= 0.1 ? 'good' : 'warning',
    },
    {
      name: 'FID',
      value: `${report.performance.metrics.fid}ms`,
      status: report.performance.metrics.fid <= 100 ? 'good' : 'warning',
    },
  ];
  const savingsRecommendations = report.hostingRecommendations.recommendations
    .map((recommendation) => ({
      recommendation,
      monthlySavings:
        report.hostingRecommendations.currentSetup.estimatedCost -
        recommendation.monthlyPrice.typical,
    }))
    .filter((item) => item.monthlySavings > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{report.domain}</h2>
          <p className="text-muted-foreground">
            Scanned {new Date(report.scannedAt).toLocaleString()}
          </p>
        </div>
        {onRescan && (
          <Button onClick={onRescan}>
            <Zap className="mr-2 h-4 w-4" />
            Rescan
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(report.summary.overallScore)}`}>
              {report.summary.overallScore}/100
            </div>
            <Progress value={report.summary.overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.criticalIssues}</div>
            <p className="text-xs text-muted-foreground">{report.summary.warnings} warnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${report.summary.estimatedMonthlyCost}</div>
            {report.summary.potentialSavings > 0 && (
              <p className="text-xs text-green-600">Save ${report.summary.potentialSavings}/mo</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.recommendations}</div>
            <p className="text-xs text-muted-foreground">actionable insights</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Key Insights</h3>
          {insights.map((insight, index) => (
            <Alert key={index} variant={getInsightVariant(insight.type)}>
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <AlertTitle className="mb-1">
                    {insight.title}
                    <Badge variant="outline" className="ml-2">
                      {insight.category}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>{insight.description}</AlertDescription>
                  {insight.action && (
                    <Button variant="link" className="h-auto p-0 mt-2">
                      {insight.action}
                      {' ->'}
                    </Button>
                  )}
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="technology">Technology</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Core Web Vitals and performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Overall Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(report.performanceScore.overall)}`}>
                    {report.performanceScore.overall}/100
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Security Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(report.performanceScore.security)}`}>
                    {report.performanceScore.security}/100
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Infrastructure Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(report.performanceScore.infrastructure)}`}>
                    {report.performanceScore.infrastructure}/100
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technology Stack</CardTitle>
              <CardDescription>{report.techStack.totalTechnologies} technologies detected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {technologyList.slice(0, 10).map((tech, index) => (
                  <Badge key={index} variant="secondary">
                    {tech.name} {tech.version && `v${tech.version}`}
                  </Badge>
                ))}
                {technologyList.length > 10 && (
                  <Badge variant="outline">+{technologyList.length - 10} more</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DNS and Infrastructure</CardTitle>
              <CardDescription>DNS configuration and hosting details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">DNS Score</span>
                <span className={`font-semibold ${getScoreColor(report.dns.securityScore)}`}>
                  {report.dns.securityScore}/100
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">DNSSEC</span>
                <Badge variant={report.dns.configuration.hasDNSSEC ? 'default' : 'secondary'}>
                  {report.dns.configuration.hasDNSSEC ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nameservers</span>
                <span className="font-semibold">{report.dns.nameservers.length}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Detailed performance analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {performanceMetrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <Badge variant={metric.status === 'good' ? 'default' : 'secondary'}>
                      {metric.value}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {report.performance.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Issues</CardTitle>
                <CardDescription>{report.performance.issues.length} issue(s) identified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.performance.issues.map((issue, index) => (
                  <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{issue.title}</AlertTitle>
                    <AlertDescription>{issue.description}</AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="technology" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Technologies</CardTitle>
              <CardDescription>
                {report.techStack.totalTechnologies} technologies across {report.techStack.categories.length}{' '}
                categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.techStack.categories.map((category, index) => (
                  <div key={index}>
                    <h4 className="font-semibold mb-2">{category.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {category.technologies.map((tech, techIndex) => (
                        <Badge key={techIndex} variant="secondary">
                          {tech.name} {tech.version && `v${tech.version}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modernization Score</CardTitle>
              <CardDescription>How modern is your technology stack?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Modernization</span>
                  <span className={`text-lg font-bold ${getScoreColor(report.techStack.modernityScore)}`}>
                    {report.techStack.modernityScore}/100
                  </span>
                </div>
                <Progress value={report.techStack.modernityScore} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DNS Configuration</CardTitle>
              <CardDescription>Domain Name System setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Nameservers</h4>
                <div className="space-y-1">
                  {report.dns.nameservers.length > 0 ? (
                    report.dns.nameservers.map((nameserver, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {nameserver}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No nameservers detected</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Records</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">A Records</span>
                    <Badge variant="outline">{report.dns.records.a.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">MX Records</span>
                    <Badge variant="outline">{report.dns.records.mx.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">TXT Records</span>
                    <Badge variant="outline">{report.dns.records.txt.length}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Estimated monthly hosting costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.costAnalysis.breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.category}</span>
                  <span className="font-semibold">${item.cost}/mo</span>
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${report.summary.estimatedMonthlyCost}/mo</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {report.summary.potentialSavings > 0 && savingsRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Savings Opportunities</CardTitle>
                <CardDescription>
                  Potential monthly savings: ${report.summary.potentialSavings}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {savingsRecommendations.map((item, index) => (
                    <Alert key={index}>
                      <DollarSign className="h-4 w-4" />
                      <AlertTitle>{item.recommendation.provider}</AlertTitle>
                      <AlertDescription>
                        {item.recommendation.reasoning}
                        <div className="mt-2 font-semibold text-green-600">
                          Save ${Math.round(item.monthlySavings)}/mo
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
