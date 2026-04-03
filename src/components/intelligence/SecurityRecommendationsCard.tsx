import { AlertTriangle, ChevronDown, ChevronUp, Copy, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SecurityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  recommendation: string;
  implementation?: string;
  potentialImpact?: string;
}

interface SecurityRecommendationsCardProps {
  recommendations: SecurityRecommendation[];
}

export function SecurityRecommendationsCard({ recommendations }: SecurityRecommendationsCardProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getPriorityConfig = (priority: SecurityRecommendation['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
          badgeColor: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
          icon: '🔴',
          label: 'CRITICAL',
        };
      case 'high':
        return {
          color: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
          badgeColor: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
          icon: '🟠',
          label: 'HIGH',
        };
      case 'medium':
        return {
          color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
          badgeColor: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
          icon: '🟡',
          label: 'MEDIUM',
        };
      case 'low':
        return {
          color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
          badgeColor: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
          icon: '🔵',
          label: 'LOW',
        };
    }
  };

  // Sort recommendations by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedRecommendations = [...recommendations].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  if (recommendations.length === 0) {
    return (
      <Card className="border-2 border-green-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Security Recommendations</h3>
              <p className="text-sm text-muted-foreground">No issues found</p>
            </div>
          </div>
          <div className="p-6 bg-green-500/5 border-2 border-green-500/20 rounded-lg text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              Excellent Security Posture!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your site follows security best practices. Keep monitoring for new threats.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-orange-500/10">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Security Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              {recommendations.length} issue{recommendations.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {/* Recommendations List */}
        <div className="space-y-4">
          {sortedRecommendations.map((rec, index) => {
            const config = getPriorityConfig(rec.priority);
            const isExpanded = expandedItems.has(index);
            const isCopied = copiedIndex === index;

            return (
              <div
                key={index}
                className={`border-2 rounded-lg overflow-hidden transition-all ${config.color}`}
              >
                {/* Header */}
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-2xl mt-0.5">{config.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`${config.badgeColor} text-xs font-bold`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{rec.category}</span>
                    </div>
                    <div className="font-semibold text-sm">{rec.issue}</div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground mt-1" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground mt-1" />
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t">
                    {/* Recommendation */}
                    <div className="pt-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Recommendation
                      </div>
                      <p className="text-sm">{rec.recommendation}</p>
                    </div>

                    {/* Implementation */}
                    {rec.implementation && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Implementation
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(rec.implementation!, index)}
                            className="h-7 text-xs"
                          >
                            {isCopied ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                          <code>{rec.implementation}</code>
                        </pre>
                      </div>
                    )}

                    {/* Potential Impact */}
                    {rec.potentialImpact && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Potential Impact
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.potentialImpact}</p>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          // In a real implementation, this could open a modal with more details
                          // or link to documentation
                          console.log('Fix this issue:', rec.issue);
                        }}
                      >
                        Learn How to Fix This
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {recommendations.filter((r) => r.priority === 'critical').length}
              </div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {recommendations.filter((r) => r.priority === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground">High</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {recommendations.filter((r) => r.priority === 'medium').length}
              </div>
              <div className="text-xs text-muted-foreground">Medium</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {recommendations.filter((r) => r.priority === 'low').length}
              </div>
              <div className="text-xs text-muted-foreground">Low</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
