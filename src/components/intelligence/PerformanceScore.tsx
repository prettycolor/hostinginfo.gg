/**
 * Performance Score Component
 *
 * Displays performance score with circular gauge and breakdown
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

interface PerformanceScoreProps {
  score: {
    overall: number;
    security: number;
    technology: number;
    infrastructure: number;
    reliability: number;
    grade: string;
    breakdown: Array<{
      category: string;
      score: number;
      weight: number;
      factors: Array<{
        name: string;
        impact: "positive" | "negative" | "neutral";
        points: number;
        description: string;
      }>;
    }>;
    recommendations: Array<{
      priority: "critical" | "high" | "medium" | "low";
      category: string;
      issue: string;
      recommendation: string;
      potentialGain: number;
    }>;
  };
}

export function PerformanceScore({ score }: PerformanceScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score on mount
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score.overall / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(score.overall, current + increment);
      setAnimatedScore(Math.round(current));

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedScore(score.overall);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score.overall]);

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-600";
    if (grade.startsWith("B")) return "text-blue-600";
    if (grade.startsWith("C")) return "text-yellow-600";
    if (grade.startsWith("D")) return "text-orange-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority: string) => {
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

  const getCategoryIcon = (_category: string) => {
    // Simple icon representation
    return "📊";
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Score</CardTitle>
          <CardDescription>
            Overall domain performance assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {/* Circular Score Gauge */}
            <div className="relative w-48 h-48">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 200 200"
              >
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="20"
                />
                {/* Progress circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="20"
                  strokeDasharray={`${(animatedScore / 100) * 502.65} 502.65`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                  className={`text-5xl font-bold ${getGradeColor(score.grade)}`}
                >
                  {animatedScore}
                </div>
                <div
                  className={`text-3xl font-bold ${getGradeColor(score.grade)}`}
                >
                  {score.grade}
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="flex-1 ml-8 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Security</span>
                  <span className="text-sm font-bold">
                    {score.security}/100
                  </span>
                </div>
                <Progress value={score.security} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Technology</span>
                  <span className="text-sm font-bold">
                    {score.technology}/100
                  </span>
                </div>
                <Progress value={score.technology} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Infrastructure</span>
                  <span className="text-sm font-bold">
                    {score.infrastructure}/100
                  </span>
                </div>
                <Progress value={score.infrastructure} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Reliability</span>
                  <span className="text-sm font-bold">
                    {score.reliability}/100
                  </span>
                </div>
                <Progress value={score.reliability} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Actionable improvements to boost your score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {score.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    {rec.priority === "critical" || rec.priority === "high" ? (
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {rec.category}
                      </span>
                    </div>
                    <h4 className="font-semibold mb-1">{rec.issue}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {rec.recommendation}
                    </p>
                    {rec.potentialGain > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          +{rec.potentialGain} points potential gain
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
          <CardDescription>
            Detailed factors contributing to your score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {score.breakdown.map((category, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span>{getCategoryIcon(category.category)}</span>
                    {category.category}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Weight: {Math.round(category.weight * 100)}%
                    </span>
                    <span className="font-bold">{category.score}/100</span>
                  </div>
                </div>
                <div className="space-y-2 ml-8">
                  {category.factors.map((factor, factorIndex) => (
                    <div
                      key={factorIndex}
                      className="flex items-start gap-2 text-sm"
                    >
                      {factor.impact === "positive" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                      ) : factor.impact === "negative" ? (
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{factor.name}</span>
                          {factor.points !== 0 && (
                            <span
                              className={`text-xs font-medium ${
                                factor.points > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {factor.points > 0 ? "+" : ""}
                              {factor.points}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {factor.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
