import { Lightbulb, ChevronDown, ChevronUp, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface EmailRecommendation {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'spf' | 'dmarc' | 'dkim' | 'mx' | 'general';
  implementation?: string;
  impact: string;
}

interface EmailRecommendationsCardProps {
  recommendations: EmailRecommendation[];
  compact?: boolean;
}

export function EmailRecommendationsCard({ recommendations, compact = false }: EmailRecommendationsCardProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
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

  const getPriorityConfig = (priority: EmailRecommendation['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
          badgeColor: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
          label: 'Critical',
        };
      case 'high':
        return {
          color: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
          badgeColor: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
          label: 'High',
        };
      case 'medium':
        return {
          color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
          badgeColor: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
          label: 'Medium',
        };
      case 'low':
        return {
          color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
          badgeColor: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
          label: 'Low',
        };
    }
  };

  const getCategoryLabel = (category: EmailRecommendation['category']) => {
    switch (category) {
      case 'spf':
        return 'SPF';
      case 'dmarc':
        return 'DMARC';
      case 'dkim':
        return 'DKIM';
      case 'mx':
        return 'MX';
      case 'general':
        return 'General';
    }
  };

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedRecommendations = [...recommendations].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  const criticalCount = recommendations.filter((r) => r.priority === 'critical').length;
  const highCount = recommendations.filter((r) => r.priority === 'high').length;

  if (recommendations.length === 0) {
    return (
      <Card className={`${compact ? 'border' : 'border-2'} border-green-500/20`}>
        <CardContent className={compact ? 'pt-4' : 'pt-6'}>
          <div className={`flex items-center gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
            <div className="p-3 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-bold`}>Email Recommendations</h3>
              <p className="text-sm text-muted-foreground">No issues found</p>
            </div>
          </div>
          <div className={`${compact ? 'p-4 border' : 'p-6 border-2'} bg-green-500/5 border-green-500/20 rounded-lg text-center`}>
            <CheckCircle2 className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} text-green-500 mx-auto mb-3`} />
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              Excellent Email Configuration
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Email authentication is configured correctly.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'border' : 'border-2'}>
      <CardContent className={compact ? 'pt-4' : 'pt-6'}>
        <div className={`flex items-center gap-3 ${compact ? 'mb-4' : 'mb-6'}`}>
          <div className="p-3 rounded-lg bg-yellow-500/10">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-bold`}>Email Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              {recommendations.length} improvement{recommendations.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {(criticalCount > 0 || highCount > 0) && (
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400">
                  {criticalCount} Critical
                </Badge>
              )}
              {highCount > 0 && (
                <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400">
                  {highCount} High
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className={compact ? 'space-y-2' : 'space-y-4'}>
          {sortedRecommendations.map((rec, index) => {
            const config = getPriorityConfig(rec.priority);
            const isExpanded = expandedItems.has(index);
            const isCopied = copiedIndex === index;

            return (
              <div
                key={index}
                className={`border-2 rounded-lg overflow-hidden transition-all ${config.color}`}
              >
                <button
                  onClick={() => toggleItem(index)}
                  className={`w-full ${compact ? 'p-3' : 'p-4'} flex items-start gap-3 hover:bg-muted/50 transition-colors`}
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`${config.badgeColor} text-xs font-bold`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs">{getCategoryLabel(rec.category)}</span>
                    </div>
                    <div className="font-semibold text-sm">{rec.title}</div>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    {!compact && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-semibold text-muted-foreground">Impact:</span>
                        <span className="text-xs">{rec.impact}</span>
                      </div>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && rec.implementation && (
                  <div className={compact ? 'px-3 pb-3 border-t' : 'px-4 pb-4 border-t'}>
                    <div className={compact ? 'pt-3' : 'pt-4'}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Implementation
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(rec.implementation!, index);
                          }}
                        >
                          {isCopied ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <div className={`${compact ? 'p-3 border' : 'p-4 border-2'} bg-muted/50 rounded-lg font-mono text-sm break-all`}>
                        {rec.implementation}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!compact && (
          <>
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

            {criticalCount > 0 && (
              <div className="mt-6 p-4 bg-red-500/5 border-2 border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-600 dark:text-red-400 mb-1">
                      Critical Issues Require Immediate Attention
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Address critical issues first. They can significantly affect deliverability and spoofing resistance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    Email Security Best Practices
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>- Implement SPF, DKIM, and DMARC together.</li>
                    <li>- Start DMARC in monitoring mode, then enforce.</li>
                    <li>- Use 2048-bit or higher DKIM keys.</li>
                    <li>- Maintain redundant MX records.</li>
                    <li>- Review DMARC reports continuously.</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
