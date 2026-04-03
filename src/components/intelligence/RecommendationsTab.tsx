/**
 * Recommendations Tab - Intelligence Dashboard
 *
 * Displays dynamic, context-aware recommendations generated from scan data.
 * Features:
 * - Concise, scannable recommendations (no huge lists)
 * - Grouped by priority (Critical, High, Medium, Low)
 * - Expandable cards with action steps
 * - Context-aware filtering (hides platform-managed items for website builders)
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  Shield,
  Zap,
  Mail,
  Search,
  Server,
  Code,
  ChevronDown,
  ExternalLink,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  generateRecommendations,
  generateRecommendationSummary,
  getPriorityBgColor,
  groupByPriority,
  type Recommendation,
  type ComprehensiveScanData,
} from "@/lib/recommendations";

interface RecommendationsTabProps {
  data: ComprehensiveScanData;
  domain: string;
}

export function RecommendationsTab({
  data,
  domain: _domain,
}: RecommendationsTabProps) {
  // Generate recommendations from scan data
  const recommendations = useMemo(() => {
    return generateRecommendations(data);
  }, [data]);

  // Generate summary stats
  const summary = useMemo(() => {
    return generateRecommendationSummary(recommendations);
  }, [recommendations]);

  // Group by priority
  const grouped = useMemo(() => {
    return groupByPriority(recommendations);
  }, [recommendations]);

  // Empty state
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CheckCircle2 className="h-20 w-20 mx-auto mb-4 text-green-500" />
          <h3 className="text-2xl font-semibold mb-2">All Good!</h3>
          <p className="text-muted-foreground text-lg">
            No critical recommendations at this time.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Your site is configured well. Keep monitoring for changes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Critical */}
            {summary.critical > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                <div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {summary.critical}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
              </div>
            )}

            {/* High */}
            {summary.high > 0 && (
              <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {summary.high}
                  </div>
                  <div className="text-sm text-muted-foreground">High</div>
                </div>
              </div>
            )}

            {/* Medium */}
            {summary.medium > 0 && (
              <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Info className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {summary.medium}
                  </div>
                  <div className="text-sm text-muted-foreground">Medium</div>
                </div>
              </div>
            )}

            {/* Low */}
            {summary.low > 0 && (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Lightbulb className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {summary.low}
                  </div>
                  <div className="text-sm text-muted-foreground">Low</div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Total Recommendations</span>
              <span className="text-sm font-bold">{summary.total}</span>
            </div>
            <Progress value={0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              0/{summary.total} completed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Critical Recommendations */}
      {grouped.critical.length > 0 && (
        <Card className="border-red-500/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-600 dark:text-red-400">
                Critical Priority
              </CardTitle>
              <Badge variant="destructive">{grouped.critical.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grouped.critical.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Priority Recommendations */}
      {grouped.high.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-orange-600 dark:text-orange-400">
                High Priority
              </CardTitle>
              <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                {grouped.high.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grouped.high.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medium Priority Recommendations */}
      {grouped.medium.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Info className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-yellow-600 dark:text-yellow-400">
                Medium Priority
              </CardTitle>
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                {grouped.medium.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grouped.medium.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Priority Recommendations */}
      {grouped.low.length > 0 && (
        <Card className="border-green-500/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lightbulb className="h-6 w-6 text-green-600 dark:text-green-400" />
              <CardTitle className="text-green-600 dark:text-green-400">
                Low Priority
              </CardTitle>
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                {grouped.low.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {grouped.low.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Individual Recommendation Card
 */
function RecommendationCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Security":
        return <Shield className="h-4 w-4" />;
      case "Performance":
        return <Zap className="h-4 w-4" />;
      case "Email":
        return <Mail className="h-4 w-4" />;
      case "SEO":
        return <Search className="h-4 w-4" />;
      case "Infrastructure":
        return <Server className="h-4 w-4" />;
      case "Technology":
        return <Code className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div
      className={`border-2 rounded-lg ${getPriorityBgColor(recommendation.priority)}`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getCategoryIcon(recommendation.category)}
            <h4 className="font-semibold text-lg">{recommendation.title}</h4>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="-mt-1"
          >
            {isExpanded ? "Collapse" : "Expand"}
            <ChevronDown
              className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {/* Issue */}
        <p className="text-sm mb-2">{recommendation.issue}</p>

        {/* Impact */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Impact:</strong> {recommendation.impact}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {recommendation.estimatedTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{recommendation.estimatedTime}</span>
            </div>
          )}
          {recommendation.difficulty && (
            <Badge variant="outline" className="text-xs">
              {recommendation.difficulty}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {recommendation.category}
          </Badge>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-4 bg-background/50">
          {/* Recommendation */}
          <div className="mb-4">
            <h5 className="font-semibold mb-2">Recommendation:</h5>
            <p className="text-sm">{recommendation.recommendation}</p>
          </div>

          {/* Action Steps */}
          {recommendation.actionSteps &&
            recommendation.actionSteps.length > 0 && (
              <div className="mb-4">
                <h5 className="font-semibold mb-3">Action Steps:</h5>
                <div className="space-y-3">
                  {recommendation.actionSteps.map((step) => (
                    <div key={step.step} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm mb-1">{step.description}</p>
                        {step.code && (
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                            <code>{step.code}</code>
                          </pre>
                        )}
                        {step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            {step.linkText || "Learn more"}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Resources */}
          {recommendation.resources && recommendation.resources.length > 0 && (
            <div>
              <h5 className="font-semibold mb-2">Resources:</h5>
              <div className="space-y-2">
                {recommendation.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {resource.title}
                    <Badge variant="outline" className="text-xs">
                      {resource.type}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
