import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, TrendingUp, TrendingDown, Minus, Gauge } from 'lucide-react';

interface PerformanceOverviewProps {
  mobileScore: number;
  desktopScore: number;
  mobileMetrics?: {
    fcp?: number;
    lcp?: number;
    tbt?: number;
    cls?: number;
    speedIndex?: number;
  };
  desktopMetrics?: {
    fcp?: number;
    lcp?: number;
    tbt?: number;
    cls?: number;
    speedIndex?: number;
  };
}

export function PerformanceOverview({
  mobileScore,
  desktopScore,
  mobileMetrics,
  desktopMetrics,
}: PerformanceOverviewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/5 border-green-500 shadow-green-500/20';
    if (score >= 50) return 'bg-amber-500/5 border-amber-500 shadow-amber-500/20';
    return 'bg-rose-500/5 border-rose-500 shadow-rose-500/20';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-500 text-white';
    if (score >= 50) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getTrendIcon = (mobileScore: number, desktopScore: number) => {
    const diff = desktopScore - mobileScore;
    if (diff > 10) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (diff < -10) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-indigo-500/10">
            <Gauge className="h-6 w-6 text-indigo-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Performance Scores</h3>
            <p className="text-sm text-muted-foreground">
              Google PageSpeed Insights Analysis
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Lighthouse
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mobile Score */}
          <div
            className={`rounded-xl border-3 p-6 transition-all hover:shadow-xl hover:scale-[1.02] bg-card ${
              getScoreBgColor(mobileScore)
            }`}
          >
            {/* Header with clear label */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Smartphone className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bold text-xl">Mobile Performance</h4>
                  <p className="text-xs text-muted-foreground">Smartphone & Tablet</p>
                </div>
              </div>
              <Badge className={`text-sm font-bold px-3 py-1 ${getScoreBadgeColor(mobileScore)}`}>
                Grade {getScoreGrade(mobileScore)}
              </Badge>
            </div>
            
            {/* Large score display */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className={`text-6xl font-black ${getScoreColor(mobileScore)}`}>
                {mobileScore}
              </span>
              <span className="text-3xl font-bold text-muted-foreground">/100</span>
            </div>

            {/* Core Web Vitals - Only show if data exists */}
            {mobileMetrics && (mobileMetrics.lcp || mobileMetrics.fcp || mobileMetrics.cls) && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Core Web Vitals</p>
                {mobileMetrics.lcp && typeof mobileMetrics.lcp === 'number' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">LCP (Largest Contentful Paint)</span>
                    <span className="text-sm font-bold">
                      {(mobileMetrics.lcp / 1000).toFixed(2)}s
                    </span>
                  </div>
                )}
                {mobileMetrics.fcp && typeof mobileMetrics.fcp === 'number' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">FCP (First Contentful Paint)</span>
                    <span className="text-sm font-bold">
                      {(mobileMetrics.fcp / 1000).toFixed(2)}s
                    </span>
                  </div>
                )}
                {mobileMetrics.cls !== undefined && typeof mobileMetrics.cls === 'number' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">CLS (Cumulative Layout Shift)</span>
                    <span className="text-sm font-bold">
                      {mobileMetrics.cls.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Score */}
          <div
            className={`rounded-xl border-3 p-6 transition-all hover:shadow-xl hover:scale-[1.02] bg-card ${
              getScoreBgColor(desktopScore)
            }`}
          >
            {/* Header with clear label */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Monitor className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-bold text-xl">Desktop Performance</h4>
                  <p className="text-xs text-muted-foreground">Laptop & Desktop</p>
                </div>
              </div>
              <Badge className={`text-sm font-bold px-3 py-1 ${getScoreBadgeColor(desktopScore)}`}>
                Grade {getScoreGrade(desktopScore)}
              </Badge>
            </div>
            
            {/* Large score display */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className={`text-6xl font-black ${getScoreColor(desktopScore)}`}>
                {desktopScore}
              </span>
              <span className="text-3xl font-bold text-muted-foreground">/100</span>
            </div>

            {/* Core Web Vitals - Only show if data exists */}
            {desktopMetrics && (desktopMetrics.lcp || desktopMetrics.fcp || desktopMetrics.cls) && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Core Web Vitals</p>
                {desktopMetrics.lcp && typeof desktopMetrics.lcp === 'number' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">LCP (Largest Contentful Paint)</span>
                    <span className="text-sm font-bold">
                      {(desktopMetrics.lcp / 1000).toFixed(2)}s
                    </span>
                  </div>
                )}
                {desktopMetrics.fcp && typeof desktopMetrics.fcp === 'number' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">FCP (First Contentful Paint)</span>
                    <span className="text-sm font-bold">
                      {(desktopMetrics.fcp / 1000).toFixed(2)}s
                    </span>
                  </div>
                )}
                {desktopMetrics.cls !== undefined && typeof desktopMetrics.cls === 'number' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">CLS (Cumulative Layout Shift)</span>
                    <span className="text-sm font-bold">
                      {desktopMetrics.cls.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comparison */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {getTrendIcon(mobileScore, desktopScore)}
            <span>
              {desktopScore > mobileScore
                ? `Desktop performs ${desktopScore - mobileScore} points better`
                : desktopScore < mobileScore
                ? `Mobile performs ${mobileScore - desktopScore} points better`
                : 'Mobile and desktop performance are similar'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
