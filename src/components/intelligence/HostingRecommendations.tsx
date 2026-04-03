/**
 * Hosting Recommendations Component
 *
 * Displays AI-powered hosting recommendations with migration paths
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useState } from "react";

interface HostingRecommendationsProps {
  recommendations: {
    currentSetup: {
      hosting: string;
      cdn: string;
      estimatedCost: number;
      tier: string;
    };
    recommendations: Array<{
      provider: string;
      tier: "budget" | "mid" | "premium" | "enterprise";
      monthlyPrice: { min: number; max: number; typical: number };
      bestFor: string[];
      pros: string[];
      cons: string[];
      migrationDifficulty: "easy" | "moderate" | "complex";
      estimatedDowntime: string;
      confidence: number;
      reasoning: string;
    }>;
    topPick: {
      provider: string;
      tier: "budget" | "mid" | "premium" | "enterprise";
      monthlyPrice: { min: number; max: number; typical: number };
      bestFor: string[];
      pros: string[];
      cons: string[];
      migrationDifficulty: "easy" | "moderate" | "complex";
      estimatedDowntime: string;
      confidence: number;
      reasoning: string;
    };
    insights: string[];
    migrationPath: {
      steps: string[];
      estimatedTime: string;
      riskLevel: "low" | "medium" | "high";
      backupStrategy: string;
    };
  };
}

export function HostingRecommendations({
  recommendations,
}: HostingRecommendationsProps) {
  const [selectedProvider, setSelectedProvider] = useState(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "mid":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "budget":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-600";
      case "moderate":
        return "text-yellow-600";
      case "complex":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const selected = recommendations.recommendations[selectedProvider];

  return (
    <div className="space-y-6">
      {/* Current Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Current Setup</CardTitle>
          <CardDescription>
            Your existing hosting infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Server className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  Hosting Provider
                </div>
                <div className="font-semibold">
                  {recommendations.currentSetup.hosting}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  Estimated Cost
                </div>
                <div className="font-semibold">
                  {formatCurrency(recommendations.currentSetup.estimatedCost)}
                  /mo
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Hosting Providers</CardTitle>
          <CardDescription>
            Top {recommendations.recommendations.length} recommendations based
            on your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Provider Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {recommendations.recommendations.map((rec, index) => (
              <button
                key={index}
                onClick={() => setSelectedProvider(index)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedProvider === index
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {rec.provider}
                {index === 0 && (
                  <Badge className="ml-2" variant="secondary">
                    Top Pick
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Selected Provider Details */}
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">{selected.provider}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={getTierColor(selected.tier)}>
                    {selected.tier} tier
                  </Badge>
                </div>
                <p className="text-muted-foreground">{selected.reasoning}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {formatCurrency(selected.monthlyPrice.typical)}
                </div>
                <div className="text-sm text-muted-foreground">per month</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Range: {formatCurrency(selected.monthlyPrice.min)} -{" "}
                  {formatCurrency(selected.monthlyPrice.max)}
                </div>
              </div>
            </div>

            {/* Best For */}
            <div>
              <h4 className="font-semibold mb-2">Best For</h4>
              <div className="flex flex-wrap gap-2">
                {selected.bestFor.map((item, index) => (
                  <Badge key={index} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Pros
                </h4>
                <ul className="space-y-2">
                  {selected.pros.map((pro, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Cons
                </h4>
                <ul className="space-y-2">
                  {selected.cons.map((con, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Migration Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Migration Difficulty
                </div>
                <div
                  className={`font-semibold ${getDifficultyColor(selected.migrationDifficulty)}`}
                >
                  {selected.migrationDifficulty.charAt(0).toUpperCase() +
                    selected.migrationDifficulty.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Estimated Downtime
                </div>
                <div className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {selected.estimatedDowntime}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migration Path */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Path</CardTitle>
          <CardDescription>
            Step-by-step guide to migrate to {selected.provider}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Migration Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Estimated Time
                </div>
                <div className="font-semibold">
                  {recommendations.migrationPath.estimatedTime}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Risk Level
                </div>
                <div
                  className={`font-semibold ${getRiskColor(recommendations.migrationPath.riskLevel)}`}
                >
                  {recommendations.migrationPath.riskLevel
                    .charAt(0)
                    .toUpperCase() +
                    recommendations.migrationPath.riskLevel.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Backup Strategy
                </div>
                <div className="font-semibold text-sm">
                  {recommendations.migrationPath.backupStrategy}
                </div>
              </div>
            </div>

            {/* Migration Steps */}
            <div>
              <h4 className="font-semibold mb-4">Migration Steps</h4>
              <ol className="space-y-3">
                {recommendations.migrationPath.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm">{step.replace(/^\d+\.\s*/, "")}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Warning */}
            {recommendations.migrationPath.riskLevel !== "low" && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h5 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                    Important Migration Considerations
                  </h5>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    This migration has a{" "}
                    {recommendations.migrationPath.riskLevel} risk level. We
                    recommend thorough testing in a staging environment before
                    production deployment.
                    {recommendations.migrationPath.backupStrategy}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {recommendations.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>
              Important observations about your hosting options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-sm flex-1">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
