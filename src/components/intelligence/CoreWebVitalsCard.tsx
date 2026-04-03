import { Gauge, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CoreWebVitalsCardProps {
  metrics: {
    fcp?: { value: number; score: number }; // First Contentful Paint (ms)
    lcp?: { value: number; score: number }; // Largest Contentful Paint (ms)
    tbt?: { value: number; score: number }; // Total Blocking Time (ms)
    cls?: { value: number; score: number }; // Cumulative Layout Shift
    si?: { value: number; score: number };  // Speed Index (ms)
  };
  device: 'mobile' | 'desktop';
}

const metricInfo = {
  fcp: {
    name: 'First Contentful Paint',
    description: 'Time until the first text or image is painted',
    unit: 'ms',
    goodThreshold: 1800,
    needsImprovementThreshold: 3000,
  },
  lcp: {
    name: 'Largest Contentful Paint',
    description: 'Time until the largest text or image is painted',
    unit: 'ms',
    goodThreshold: 2500,
    needsImprovementThreshold: 4000,
  },
  tbt: {
    name: 'Total Blocking Time',
    description: 'Total time the page is blocked from responding to user input',
    unit: 'ms',
    goodThreshold: 200,
    needsImprovementThreshold: 600,
  },
  cls: {
    name: 'Cumulative Layout Shift',
    description: 'Measures visual stability - how much content shifts during load',
    unit: '',
    goodThreshold: 0.1,
    needsImprovementThreshold: 0.25,
  },
  si: {
    name: 'Speed Index',
    description: 'How quickly content is visually displayed during page load',
    unit: 'ms',
    goodThreshold: 3400,
    needsImprovementThreshold: 5800,
  },
};

export function CoreWebVitalsCard({ metrics, device }: CoreWebVitalsCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/10 border-green-500/20';
    if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Good', color: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' };
    if (score >= 50) return { label: 'Needs Improvement', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' };
    return { label: 'Poor', color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' };
  };

  const formatValue = (key: keyof typeof metrics, value: number) => {
    const info = metricInfo[key];
    if (key === 'cls') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}${info.unit}`;
  };

  const getThresholdStatus = (key: keyof typeof metrics, value: number) => {
    const info = metricInfo[key];
    if (value <= info.goodThreshold) return 'good';
    if (value <= info.needsImprovementThreshold) return 'needs-improvement';
    return 'poor';
  };

  // Calculate average score
  const scores = Object.values(metrics).map(m => m?.score || 0).filter(s => s > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <Gauge className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Core Web Vitals</h3>
            <p className="text-sm text-muted-foreground">
              {device === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'} Performance Metrics
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>
              {avgScore}
            </div>
            <div className="text-xs text-muted-foreground">Avg Score</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-4">
          {Object.entries(metrics).map(([key, metric]) => {
            if (!metric) return null;
            const info = metricInfo[key as keyof typeof metrics];
            const badge = getScoreBadge(metric.score);
            const status = getThresholdStatus(key as keyof typeof metrics, metric.value);

            return (
              <div
                key={key}
                className={`p-4 rounded-lg border-2 ${getScoreBgColor(metric.score)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{info.name}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{info.description}</p>
                            <div className="mt-2 text-xs space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span>Good: ≤ {info.goodThreshold}{info.unit}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <span>Needs Improvement: ≤ {info.needsImprovementThreshold}{info.unit}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span>Poor: &gt; {info.needsImprovementThreshold}{info.unit}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Badge variant="outline" className={badge.color}>
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>
                        {formatValue(key as keyof typeof metrics, metric.value)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Score: <span className={`font-semibold ${getScoreColor(metric.score)}`}>{metric.score}</span>/100
                      </div>
                      <div className="text-xs text-muted-foreground">{status}</div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            metric.score >= 90 ? 'bg-green-500' :
                            metric.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${metric.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Overall Assessment
              </div>
              <div className="flex items-center gap-2">
                {avgScore >= 90 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      Excellent Performance
                    </span>
                  </>
                ) : avgScore >= 50 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                      Room for Improvement
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      Needs Optimization
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">Metrics Passing</div>
              <div className="text-2xl font-bold">
                {scores.filter(s => s >= 90).length}/{scores.length}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
