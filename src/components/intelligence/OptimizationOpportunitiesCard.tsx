import { Lightbulb, ChevronDown, ChevronUp, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface OptimizationOpportunity {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  savings?: string; // e.g., "1.2s" or "450 KB"
  category: 'images' | 'javascript' | 'css' | 'fonts' | 'network' | 'rendering' | 'other';
  details?: string[];
}

interface OptimizationOpportunitiesCardProps {
  opportunities: OptimizationOpportunity[];
  device: 'mobile' | 'desktop';
}

export function OptimizationOpportunitiesCard({ opportunities, device }: OptimizationOpportunitiesCardProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

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

  const getImpactConfig = (impact: OptimizationOpportunity['impact']) => {
    switch (impact) {
      case 'high':
        return {
          color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
          badgeColor: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
          icon: '🔴',
          label: 'HIGH IMPACT',
        };
      case 'medium':
        return {
          color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
          badgeColor: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
          icon: '🟡',
          label: 'MEDIUM IMPACT',
        };
      case 'low':
        return {
          color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
          badgeColor: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
          icon: '🔵',
          label: 'LOW IMPACT',
        };
    }
  };

  const getCategoryIcon = (category: OptimizationOpportunity['category']) => {
    switch (category) {
      case 'images': return '🖼️';
      case 'javascript': return '📦';
      case 'css': return '🎨';
      case 'fonts': return '🔤';
      case 'network': return '🌐';
      case 'rendering': return '⚡';
      default: return '🔧';
    }
  };

  const getCategoryLabel = (category: OptimizationOpportunity['category']) => {
    switch (category) {
      case 'images': return 'Images';
      case 'javascript': return 'JavaScript';
      case 'css': return 'CSS';
      case 'fonts': return 'Fonts';
      case 'network': return 'Network';
      case 'rendering': return 'Rendering';
      default: return 'Other';
    }
  };

  // Sort opportunities by impact (high -> medium -> low)
  const impactOrder = { high: 0, medium: 1, low: 2 };
  const sortedOpportunities = [...opportunities].sort(
    (a, b) => impactOrder[a.impact] - impactOrder[b.impact]
  );

  // Calculate potential savings
  const totalOpportunities = opportunities.length;
  const highImpactCount = opportunities.filter(o => o.impact === 'high').length;

  if (opportunities.length === 0) {
    return (
      <Card className="border-2 border-green-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Optimization Opportunities</h3>
              <p className="text-sm text-muted-foreground">No major issues found</p>
            </div>
          </div>
          <div className="p-6 bg-green-500/5 border-2 border-green-500/20 rounded-lg text-center">
            <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              Well Optimized!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your page is performing well. Keep monitoring for new optimization opportunities.
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
          <div className="p-3 rounded-lg bg-yellow-500/10">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Optimization Opportunities</h3>
            <p className="text-sm text-muted-foreground">
              {device === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'} - {totalOpportunities} improvement{totalOpportunities !== 1 ? 's' : ''} found
            </p>
          </div>
          {highImpactCount > 0 && (
            <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400">
              {highImpactCount} High Priority
            </Badge>
          )}
        </div>

        {/* Opportunities List */}
        <div className="space-y-4">
          {sortedOpportunities.map((opp, index) => {
            const config = getImpactConfig(opp.impact);
            const isExpanded = expandedItems.has(index);

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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`${config.badgeColor} text-xs font-bold`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs flex items-center gap-1">
                        {getCategoryIcon(opp.category)}
                        {getCategoryLabel(opp.category)}
                      </span>
                      {opp.savings && (
                        <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 text-xs">
                          Save {opp.savings}
                        </Badge>
                      )}
                    </div>
                    <div className="font-semibold text-sm">{opp.title}</div>
                    <p className="text-sm text-muted-foreground mt-1">{opp.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && opp.details && opp.details.length > 0 && (
                  <div className="px-4 pb-4 border-t">
                    <div className="pt-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Details
                      </div>
                      <ul className="space-y-2">
                        {opp.details.map((detail, detailIndex) => (
                          <li
                            key={detailIndex}
                            className="text-sm bg-muted/50 px-3 py-2 rounded flex items-start gap-2"
                          >
                            <span className="text-muted-foreground mt-0.5">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {opportunities.filter((o) => o.impact === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground">High Impact</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {opportunities.filter((o) => o.impact === 'medium').length}
              </div>
              <div className="text-xs text-muted-foreground">Medium Impact</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {opportunities.filter((o) => o.impact === 'low').length}
              </div>
              <div className="text-xs text-muted-foreground">Low Impact</div>
            </div>
          </div>
        </div>

        {/* Action Tip */}
        {highImpactCount > 0 && (
          <div className="mt-6 p-4 bg-orange-500/5 border-2 border-orange-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <div className="font-semibold text-orange-600 dark:text-orange-400 mb-1">
                  Priority Action Required
                </div>
                <p className="text-sm text-muted-foreground">
                  Focus on high-impact optimizations first for the biggest performance gains.
                  These changes can significantly improve your page speed and user experience.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
