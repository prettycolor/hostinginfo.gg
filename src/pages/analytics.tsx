/**
 * Analytics Dashboard Page
 *
 * Comprehensive analytics view with performance scoring, cost analysis,
 * hosting recommendations, and multi-domain comparison
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PerformanceScore } from "@/components/intelligence/PerformanceScore";
import { CostAnalysis } from "@/components/intelligence/CostAnalysis";
import { HostingRecommendations } from "@/components/intelligence/HostingRecommendations";
import {
  BarChart3,
  DollarSign,
  Server,
  TrendingUp,
  Search,
  Plus,
  X,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

interface AnalyticsPerformance {
  overall: number;
  grade: string;
  recommendations: unknown[];
}

interface AnalyticsCost {
  monthly: {
    total: {
      typical: number;
    };
  };
  optimizations: Array<{
    savings: number;
  }>;
}

interface AnalyticsRecommendations {
  topPick: {
    provider: string;
    reasoning: string;
    tier: string;
    monthlyPrice: {
      typical: number;
    };
  };
}

interface DomainAnalyticsData {
  domain: string;
  scan: unknown;
  performance: AnalyticsPerformance;
  cost: AnalyticsCost;
  recommendations: AnalyticsRecommendations;
  error?: string;
}

function createDefaultAnalyticsData(domain: string): DomainAnalyticsData {
  return {
    domain,
    scan: null,
    performance: {
      overall: 0,
      grade: "N/A",
      recommendations: [],
    },
    cost: {
      monthly: {
        total: {
          typical: 0,
        },
      },
      optimizations: [],
    },
    recommendations: {
      topPick: {
        provider: "N/A",
        reasoning: "No recommendation data available",
        tier: "N/A",
        monthlyPrice: {
          typical: 0,
        },
      },
    },
  };
}

export default function AnalyticsPage() {
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<
    DomainAnalyticsData[] | null
  >(null);
  const [activeTab, setActiveTab] = useState("performance");

  const addDomain = () => {
    if (newDomain && !domains.includes(newDomain)) {
      setDomains([...domains, newDomain]);
      setNewDomain("");
    }
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter((d) => d !== domain));
  };

  const runAnalytics = async () => {
    if (domains.length === 0) return;

    setLoading(true);
    try {
      // Fetch analytics for all domains
      const results = await Promise.all(
        domains.map(async (domain) => {
          // Fetch latest scan data
          const scanResponse = await fetch(
            `/api/intelligence/scan?domain=${domain}`,
          );
          const scanData = await scanResponse.json();

          if (!scanData.success) {
            return {
              ...createDefaultAnalyticsData(domain),
              error: "Failed to fetch scan data",
            };
          }

          // Calculate performance score
          const performanceResponse = await fetch(
            "/api/intelligence/performance",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(scanData.scan),
            },
          );
          const performanceData = await performanceResponse.json();

          // Analyze costs
          const costResponse = await fetch("/api/intelligence/cost-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scanData.scan),
          });
          const costData = await costResponse.json();

          // Get hosting recommendations
          const recommendationsResponse = await fetch(
            "/api/intelligence/recommendations",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(scanData.scan),
            },
          );
          const recommendationsData = await recommendationsResponse.json();

          return {
            domain: domain,
            scan: scanData.scan ?? null,
            performance:
              performanceData.score ??
              createDefaultAnalyticsData(domain).performance,
            cost:
              costData.costAnalysis ?? createDefaultAnalyticsData(domain).cost,
            recommendations:
              recommendationsData.recommendations ??
              createDefaultAnalyticsData(domain).recommendations,
          };
        }),
      );

      setAnalyticsData(results);
    } catch (error) {
      console.error("Error running analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title={PAGE_META.analytics.title}
        description={PAGE_META.analytics.description}
        keywords={PAGE_META.analytics.keywords}
        noindex={PAGE_META.analytics.noindex}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive domain analytics with performance scoring, cost
          analysis, and hosting recommendations
        </p>
      </div>

      {/* Domain Input */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Analyze Domains</CardTitle>
          <CardDescription>
            Add up to 10 domains to analyze and compare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter domain (e.g., example.com)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addDomain()}
                disabled={domains.length >= 10}
              />
              <Button
                onClick={addDomain}
                disabled={!newDomain || domains.length >= 10}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Domain List */}
            {domains.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="px-3 py-1">
                    {domain}
                    <button
                      onClick={() => removeDomain(domain)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Run Button */}
            <Button
              onClick={runAnalytics}
              disabled={domains.length === 0 || loading}
              size="lg"
              className="w-full"
            >
              <Search className="w-4 h-4 mr-2" />
              {loading
                ? "Analyzing..."
                : `Analyze ${domains.length} Domain${domains.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Results */}
      {analyticsData && analyticsData.length > 0 && (
        <div className="space-y-8">
          {/* Single Domain View */}
          {analyticsData.length === 1 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="performance">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="cost">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cost Analysis
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  <Server className="w-4 h-4 mr-2" />
                  Recommendations
                </TabsTrigger>
                <TabsTrigger value="insights">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Insights
                </TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="mt-6">
                <PerformanceScore score={analyticsData[0].performance} />
              </TabsContent>

              <TabsContent value="cost" className="mt-6">
                <CostAnalysis analysis={analyticsData[0].cost} />
              </TabsContent>

              <TabsContent value="recommendations" className="mt-6">
                <HostingRecommendations
                  recommendations={analyticsData[0].recommendations}
                />
              </TabsContent>

              <TabsContent value="insights" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                    <CardDescription>
                      Summary of findings for {analyticsData[0].domain}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Performance Summary */}
                      <div>
                        <h3 className="font-semibold mb-3">Performance</h3>
                        <div className="flex items-center gap-4">
                          <div className="text-5xl font-bold text-primary">
                            {analyticsData[0].performance.overall}
                          </div>
                          <div>
                            <div className="text-2xl font-bold">
                              Grade: {analyticsData[0].performance.grade}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {
                                analyticsData[0].performance.recommendations
                                  .length
                              }{" "}
                              recommendations
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Cost Summary */}
                      <div>
                        <h3 className="font-semibold mb-3">Cost</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Monthly Cost
                            </div>
                            <div className="text-2xl font-bold">
                              ${analyticsData[0].cost.monthly.total.typical}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Potential Savings
                            </div>
                            <div className="text-2xl font-bold text-green-600">
                              $
                              {analyticsData[0].cost.optimizations.reduce(
                                (sum: number, opt: { savings: number }) =>
                                  sum + opt.savings,
                                0,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top Recommendation */}
                      <div>
                        <h3 className="font-semibold mb-3">
                          Top Hosting Recommendation
                        </h3>
                        <div className="p-4 border rounded-lg">
                          <div className="font-semibold text-lg mb-1">
                            {analyticsData[0].recommendations.topPick.provider}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {analyticsData[0].recommendations.topPick.reasoning}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge>
                              {analyticsData[0].recommendations.topPick.tier}{" "}
                              tier
                            </Badge>
                            <Badge variant="outline">
                              $
                              {
                                analyticsData[0].recommendations.topPick
                                  .monthlyPrice.typical
                              }
                              /mo
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Multi-Domain Comparison */}
          {analyticsData.length > 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Domain Comparison</h2>
              <p className="text-muted-foreground">
                Comparison feature coming soon
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!analyticsData && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Analytics Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add domains above to start analyzing performance, costs, and
                hosting options
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
