import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Lightbulb,
  AlertTriangle,
  Zap,
  TrendingUp,
  Info,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

interface AIInsight {
  id: string;
  type:
    | "security"
    | "performance"
    | "optimization"
    | "prediction"
    | "explanation";
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: {
    score?: number;
    metric?: string;
    business?: string;
  };
  recommendation: {
    summary: string;
    steps?: string[];
    timeEstimate?: string;
    difficulty?: "easy" | "medium" | "hard";
    codeSnippet?: string;
    learnMoreUrl?: string;
  };
  relatedTab?: string;
}

interface AIInsightsProps {
  insights: AIInsight[];
  loading: boolean;
  summary?: {
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    estimatedImpact: string;
  };
  gptEnhanced?: boolean;
  upgradePrompt?: string;
  onTabChange?: (tab: string) => void;
}

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export function AIInsights({
  insights,
  loading,
  summary,
  gptEnhanced,
  upgradePrompt,
  onTabChange,
}: AIInsightsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Track when insights are viewed
  useEffect(() => {
    if (insights.length > 0) {
      trackEvent(
        "AI Insights",
        "Viewed",
        `${insights.length} insights`,
        summary?.criticalCount || 0,
      );
    }
  }, [insights, summary]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "medium":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "low":
        return <Lightbulb className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string): BadgeVariant => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "security":
        return <AlertTriangle className="h-4 w-4" />;
      case "performance":
        return <Zap className="h-4 w-4" />;
      case "optimization":
        return <TrendingUp className="h-4 w-4" />;
      case "prediction":
        return <TrendingUp className="h-4 w-4" />;
      case "explanation":
        return <Info className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);

    // Track code copy
    const insight = insights.find((i) => i.id === id);
    if (insight) {
      trackEvent("AI Insights", "Code Copied", insight.category);
    }
  };

  const handleTabChange = (tab: string, _insightId: string) => {
    if (onTabChange) {
      onTabChange(tab);

      // Track tab navigation
      trackEvent("AI Insights", "Tab Navigated", tab);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Generating AI Insights...
          </CardTitle>
          <CardDescription>
            Analyzing your domain and generating personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <CardDescription>
            No insights available yet. Scan a domain to get personalized
            recommendations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              AI-Powered Insights
              {gptEnhanced && (
                <Badge variant="secondary" className="ml-2">
                  <Zap className="h-3 w-3 mr-1" />
                  GPT-4 Enhanced
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {gptEnhanced
                ? "Hybrid AI analysis: Rule-based insights + GPT-4 intelligence"
                : "Intelligent recommendations powered by AI analysis"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{summary.totalIssues}</div>
                <div className="text-sm text-muted-foreground">
                  Total Insights
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">
                  {summary.criticalCount}
                </div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">
                  {summary.highCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  High Priority
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {summary.estimatedImpact}
                </div>
                <div className="text-sm text-muted-foreground">
                  Potential Gain
                </div>
              </div>
            </div>

            {/* Upgrade Prompt for Free Users */}
            {upgradePrompt && (
              <Alert className="mt-4">
                <Zap className="h-4 w-4" />
                <AlertTitle>Unlock GPT-4 Enhanced Insights</AlertTitle>
                <AlertDescription>
                  {upgradePrompt}
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      trackEvent("AI Insights", "Upgrade Clicked", "GPT-4")
                    }
                  >
                    Upgrade Now
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insights List */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Prioritized by impact and urgency</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {insights.map((insight) => (
              <AccordionItem
                key={insight.id}
                value={insight.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger
                  className="hover:no-underline"
                  onClick={() => {
                    trackEvent(
                      "AI Insights",
                      "Expanded",
                      `${insight.priority} - ${insight.category}`,
                    );
                  }}
                >
                  <div className="flex items-start gap-3 text-left w-full">
                    {getPriorityIcon(insight.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{insight.title}</span>
                        <Badge
                          variant={getPriorityColor(insight.priority)}
                          className="text-xs"
                        >
                          {insight.priority}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          {getTypeIcon(insight.type)}
                          {insight.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {/* Impact Section */}
                  {insight.impact.business && (
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertTitle>Business Impact</AlertTitle>
                      <AlertDescription>
                        {insight.impact.business}
                        {insight.impact.score && (
                          <div className="mt-2 font-semibold text-primary">
                            Potential improvement: +{insight.impact.score}{" "}
                            {insight.impact.metric}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Recommendation Section */}
                  <div className="space-y-3">
                    <div className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      How to Fix
                    </div>
                    <p className="text-sm">{insight.recommendation.summary}</p>

                    {insight.recommendation.steps && (
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        {insight.recommendation.steps.map((step, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}

                    {insight.recommendation.codeSnippet && (
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                          <code>{insight.recommendation.codeSnippet}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() =>
                            copyToClipboard(
                              insight.recommendation.codeSnippet!,
                              insight.id,
                            )
                          }
                        >
                          {copiedId === insight.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {insight.recommendation.timeEstimate && (
                        <span>⏱️ {insight.recommendation.timeEstimate}</span>
                      )}
                      {insight.recommendation.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {insight.recommendation.difficulty}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {insight.relatedTab && onTabChange && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleTabChange(insight.relatedTab!, insight.id)
                        }
                      >
                        View in {insight.relatedTab} tab
                      </Button>
                    )}
                    {insight.recommendation.learnMoreUrl && (
                      <Button size="sm" variant="ghost" asChild>
                        <a
                          href={insight.recommendation.learnMoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Learn More <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
