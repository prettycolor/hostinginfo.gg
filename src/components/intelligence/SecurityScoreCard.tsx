import { Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

interface SecurityScoreCardProps {
  score: number; // 0-100
  grade: string; // A+, A, B+, B, C, D, F
  categories?: {
    sslTls?: { score: number; weight: number };
    headers?: { score: number; weight: number };
    waf?: { score: number; weight: number };
    malware?: { score: number; weight: number };
    reputation?: { score: number; weight: number };
  };
  trend?: 'up' | 'down' | 'stable';
  layout?: 'stacked' | 'horizontal';
}

export function SecurityScoreCard({
  score,
  grade,
  categories,
  trend,
  layout = 'stacked',
}: SecurityScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const isHorizontal = layout === 'horizontal';

  // Animate score on mount
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(score, current + increment);
      setAnimatedScore(Math.round(current));

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedScore(score);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);
  // Determine grade color
  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400';
    if (grade.startsWith('B')) return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
    if (grade.startsWith('C')) return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400';
    if (grade.startsWith('D')) return 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400';
    return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
  };

  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Determine progress bar color
  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const renderCategoryBreakdown = () => {
    if (!categories) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Category Breakdown
        </h4>
        
        {categories.sslTls && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">SSL/TLS Security</span>
              <span className={getScoreColor(categories.sslTls.score)}>
                {categories.sslTls.score}/100
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${getProgressColor(categories.sslTls.score)} transition-all duration-500`}
                style={{ width: `${categories.sslTls.score}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Weight: {categories.sslTls.weight}%
            </div>
          </div>
        )}

        {categories.headers && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Security Headers</span>
              <span className={getScoreColor(categories.headers.score)}>
                {categories.headers.score}/100
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${getProgressColor(categories.headers.score)} transition-all duration-500`}
                style={{ width: `${categories.headers.score}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Weight: {categories.headers.weight}%
            </div>
          </div>
        )}

        {categories.waf && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">WAF Protection</span>
              <span className={getScoreColor(categories.waf.score)}>
                {categories.waf.score}/100
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${getProgressColor(categories.waf.score)} transition-all duration-500`}
                style={{ width: `${categories.waf.score}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Weight: {categories.waf.weight}%
            </div>
          </div>
        )}

        {categories.malware && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Malware Scan</span>
              <span className={getScoreColor(categories.malware.score)}>
                {categories.malware.score}/100
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${getProgressColor(categories.malware.score)} transition-all duration-500`}
                style={{ width: `${categories.malware.score}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Weight: {categories.malware.weight}%
            </div>
          </div>
        )}

        {categories.reputation && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Domain Reputation</span>
              <span className={getScoreColor(categories.reputation.score)}>
                {categories.reputation.score}/100
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${getProgressColor(categories.reputation.score)} transition-all duration-500`}
                style={{ width: `${categories.reputation.score}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Weight: {categories.reputation.weight}%
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-2">
      <CardContent className={`pt-6 ${isHorizontal ? 'space-y-6' : ''}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <Shield className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Security Score</h3>
            <p className="text-sm text-muted-foreground">Overall security posture</p>
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
              {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
            </div>
          )}
        </div>

        {isHorizontal ? (
          <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
            <div>
              {/* Circular Score Display */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  {/* Circular progress background */}
                  <svg className="transform -rotate-90" width="160" height="160">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-muted/20"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - animatedScore / 100)}`}
                      className={`${getScoreColor(animatedScore)} transition-all duration-500`}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Score text in center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-4xl font-bold ${getScoreColor(animatedScore)}`}>
                      {animatedScore}
                    </div>
                    <div className="text-sm text-muted-foreground">out of 100</div>
                  </div>
                </div>
              </div>

              {/* Grade Badge */}
              <div className="flex justify-center">
                <Badge
                  variant="outline"
                  className={`text-lg font-bold px-4 py-2 ${getGradeColor(grade)}`}
                >
                  Grade: {grade}
                </Badge>
              </div>
            </div>

            {renderCategoryBreakdown()}
          </div>
        ) : (
          <>
            {/* Circular Score Display */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                {/* Circular progress background */}
                <svg className="transform -rotate-90" width="160" height="160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted/20"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - animatedScore / 100)}`}
                    className={`${getScoreColor(animatedScore)} transition-all duration-500`}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Score text in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-4xl font-bold ${getScoreColor(animatedScore)}`}>
                    {animatedScore}
                  </div>
                  <div className="text-sm text-muted-foreground">out of 100</div>
                </div>
              </div>
            </div>

            {/* Grade Badge */}
            <div className="flex justify-center mb-6">
              <Badge
                variant="outline"
                className={`text-lg font-bold px-4 py-2 ${getGradeColor(grade)}`}
              >
                Grade: {grade}
              </Badge>
            </div>

            {renderCategoryBreakdown()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
