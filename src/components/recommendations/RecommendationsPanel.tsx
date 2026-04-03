import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  Lightbulb,
  TrendingUp,
  Zap,
  Shield,
  Gauge,
  Code,
  Server,
  X,
} from "lucide-react";

interface Recommendation {
  id: number;
  domain: string;
  category: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  impactScore: number;
  difficulty: "easy" | "moderate" | "hard";
  estimatedTime: string;
  implementationGuide: string;
  status: "active" | "completed" | "dismissed";
  createdAt: string;
}

interface RecommendationsPanelProps {
  userId?: number;
  domain?: string;
  compact?: boolean;
}

export function RecommendationsPanel({
  userId: _userId,
  domain,
  compact = false,
}: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [filter, setFilter] = useState<
    "all" | "performance" | "security" | "seo"
  >("all");

  const fetchRecommendations = useCallback(async () => {
    try {
      const url = domain
        ? `/api/recommendations?domain=${domain}&filter=${filter}`
        : `/api/recommendations?filter=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  }, [domain, filter]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  const markAsCompleted = async (recId: number) => {
    try {
      await fetch(`/api/recommendations/${recId}/complete`, { method: "POST" });
      setRecommendations(
        recommendations.map((r) =>
          r.id === recId ? { ...r, status: "completed" } : r,
        ),
      );
    } catch (error) {
      console.error("Failed to mark recommendation as completed:", error);
    }
  };

  const dismissRecommendation = async (recId: number) => {
    try {
      await fetch(`/api/recommendations/${recId}/dismiss`, { method: "POST" });
      setRecommendations(recommendations.filter((r) => r.id !== recId));
    } catch (error) {
      console.error("Failed to dismiss recommendation:", error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "performance":
        return <Gauge className="w-5 h-5 text-blue-600" />;
      case "security":
        return <Shield className="w-5 h-5 text-red-600" />;
      case "seo":
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case "hosting":
        return <Server className="w-5 h-5 text-purple-600" />;
      case "code":
        return <Code className="w-5 h-5 text-orange-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Critical
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Low
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Easy
          </Badge>
        );
      case "moderate":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600"
          >
            Moderate
          </Badge>
        );
      case "hard":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            Hard
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const activeRecs = recommendations.filter((r) => r.status === "active");
  const completedRecs = recommendations.filter((r) => r.status === "completed");
  const avgImpact =
    activeRecs.length > 0
      ? Math.round(
          activeRecs.reduce((sum, r) => sum + r.impactScore, 0) /
            activeRecs.length,
        )
      : 0;

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Top Recommendations</CardTitle>
            <Badge variant="secondary">{activeRecs.length} active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeRecs.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getCategoryIcon(rec.category)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{rec.title}</span>
                      {getPriorityBadge(rec.priority)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {rec.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Impact: {rec.impactScore}/100
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {rec.estimatedTime}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsCompleted(rec.id)}
                    className="h-8 w-8 p-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {activeRecs.length > 3 && (
            <Button variant="outline" className="w-full mt-3" size="sm">
              View All Recommendations
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRecs.length}</div>
            <p className="text-xs text-muted-foreground">Recommendations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedRecs.length}
            </div>
            <p className="text-xs text-muted-foreground">Implemented</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Impact</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgImpact}/100</div>
            <p className="text-xs text-muted-foreground">
              Potential improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5h</div>
            <p className="text-xs text-muted-foreground">To implement all</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                AI-powered suggestions to improve your domains
              </CardDescription>
            </div>
            <Tabs
              value={filter}
              onValueChange={(v) =>
                setFilter(v as "all" | "performance" | "security" | "seo")
              }
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Analyzing your domains...</p>
            </div>
          ) : activeRecs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <p className="text-lg font-medium mb-2">All Optimized!</p>
              <p className="text-muted-foreground">
                No recommendations at this time
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeRecs.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRec(rec)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {getCategoryIcon(rec.category)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{rec.title}</h3>
                          {getPriorityBadge(rec.priority)}
                          {getDifficultyBadge(rec.difficulty)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {rec.description}
                        </p>
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Impact Score
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={rec.impactScore}
                                className="w-24 h-2"
                              />
                              <span className="font-medium">
                                {rec.impactScore}/100
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Estimated Time
                            </div>
                            <div className="font-medium">
                              {rec.estimatedTime}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Category
                            </div>
                            <div className="font-medium capitalize">
                              {rec.category}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsCompleted(rec.id);
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissRecommendation(rec.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Implementation Guide Modal */}
      {selectedRec && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedRec.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {selectedRec.description}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRec(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {getPriorityBadge(selectedRec.priority)}
                {getDifficultyBadge(selectedRec.difficulty)}
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {selectedRec.estimatedTime}
                </Badge>
                <Badge variant="outline">
                  <Zap className="w-3 h-3 mr-1" />
                  Impact: {selectedRec.impactScore}/100
                </Badge>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Implementation Guide</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selectedRec.implementationGuide}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => markAsCompleted(selectedRec.id)}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Completed
                </Button>
                <Button variant="outline" onClick={() => setSelectedRec(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
