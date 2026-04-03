/**
 * Cost Analysis Component
 * 
 * Displays hosting cost breakdown and optimization opportunities
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Lightbulb, Server, Globe } from 'lucide-react';

interface CostAnalysisProps {
  analysis: {
    monthly: {
      hosting: { min: number; max: number; typical: number };
      cdn: { min: number; max: number; typical: number };
      total: { min: number; max: number; typical: number };
    };
    annual: {
      hosting: { min: number; max: number; typical: number };
      cdn: { min: number; max: number; typical: number };
      total: { min: number; max: number; typical: number };
    };
    breakdown: Array<{
      category: string;
      provider: string;
      cost: number;
      tier: string;
    }>;
    optimizations: Array<{
      type: 'cost_reduction' | 'performance_improvement' | 'feature_upgrade';
      priority: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      description: string;
      currentCost: number;
      potentialCost: number;
      savings: number;
      savingsPercent: number;
    }>;
    insights: string[];
  };
}

export function CostAnalysis({ analysis }: CostAnalysisProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getOptimizationIcon = (type: string) => {
    switch (type) {
      case 'cost_reduction': return <TrendingDown className="w-5 h-5 text-green-600" />;
      case 'performance_improvement': return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'feature_upgrade': return <Lightbulb className="w-5 h-5 text-yellow-600" />;
      default: return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const totalSavings = analysis.optimizations.reduce((sum, opt) => sum + opt.savings, 0);

  return (
    <div className="space-y-6">
      {/* Cost Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(analysis.monthly.total.typical)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Range: {formatCurrency(analysis.monthly.total.min)} - {formatCurrency(analysis.monthly.total.max)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Annual Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(analysis.annual.total.typical)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Range: {formatCurrency(analysis.annual.total.min)} - {formatCurrency(analysis.annual.total.max)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Potential Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(totalSavings)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per month</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>Current infrastructure costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {item.category === 'Hosting' ? (
                    <Server className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Globe className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-semibold">{item.category}</div>
                    <div className="text-sm text-muted-foreground">{item.provider}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(item.cost)}/mo</div>
                  <Badge variant="outline" className="mt-1">
                    {item.tier}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Opportunities */}
      {analysis.optimizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Opportunities</CardTitle>
            <CardDescription>Ways to reduce costs or improve performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.optimizations.map((opt, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    {getOptimizationIcon(opt.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getPriorityColor(opt.priority)}>
                        {opt.priority}
                      </Badge>
                      <Badge variant="outline">
                        {opt.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h4 className="font-semibold mb-1">{opt.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{opt.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current: </span>
                        <span className="font-medium">{formatCurrency(opt.currentCost)}/mo</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Potential: </span>
                        <span className="font-medium">{formatCurrency(opt.potentialCost)}/mo</span>
                      </div>
                      {opt.savings > 0 && (
                        <div className="flex items-center gap-1 text-green-600 font-medium">
                          <TrendingDown className="w-4 h-4" />
                          Save {formatCurrency(opt.savings)}/mo ({opt.savingsPercent}%)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Insights</CardTitle>
            <CardDescription>Key observations about your hosting costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
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
