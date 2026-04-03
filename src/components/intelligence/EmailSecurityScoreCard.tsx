import { Mail, Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

interface EmailSecurityScoreCardProps {
  score: number; // 0-100
  grade: string; // A-F
  categories: {
    spf: { score: number; weight: number };
    dmarc: { score: number; weight: number };
    dkim: { score: number; weight: number };
    mx: { score: number; weight: number };
  };
}

export function EmailSecurityScoreCard({ score, grade, categories }: EmailSecurityScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

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

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400';
    if (grade.startsWith('B')) return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
    if (grade.startsWith('C')) return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400';
    if (grade.startsWith('D')) return 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400';
    return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
  };

  const getCategoryIcon = (category: keyof typeof categories) => {
    switch (category) {
      case 'spf': return '🛡️';
      case 'dmarc': return '🔒';
      case 'dkim': return '✅';
      case 'mx': return '📧';
    }
  };

  const getCategoryName = (category: keyof typeof categories) => {
    switch (category) {
      case 'spf': return 'SPF Record';
      case 'dmarc': return 'DMARC Policy';
      case 'dkim': return 'DKIM Signature';
      case 'mx': return 'MX Records';
    }
  };

  // Calculate circumference for circular progress
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-blue-500/10">
            <Mail className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Email Security Score</h3>
            <p className="text-sm text-muted-foreground">
              Overall email authentication & deliverability
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Circular Gauge */}
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="20"
                />
                {/* Progress circle */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="20"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-5xl font-bold ${getScoreColor(animatedScore)}`}>
                  {animatedScore}
                </div>
                <Badge variant="outline" className={`${getGradeColor(grade)} text-2xl font-bold px-3 py-1 mt-2`}>
                  {grade}
                </Badge>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-4">
            {Object.entries(categories).map(([key, cat]) => {
              const categoryKey = key as keyof typeof categories;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getCategoryIcon(categoryKey)}</span>
                    <span className="text-sm font-medium flex-1">{getCategoryName(categoryKey)}</span>
                    <span className="text-sm font-bold">{cat.score}/100</span>
                    <span className="text-xs text-muted-foreground">({Math.round(cat.weight * 100)}%)</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                        cat.score >= 90 ? 'bg-green-500' :
                        cat.score >= 75 ? 'bg-blue-500' :
                        cat.score >= 60 ? 'bg-yellow-500' :
                        cat.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                {Object.values(categories).filter(c => c.score >= 90).length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-2xl font-bold">
                  {Object.values(categories).filter(c => c.score >= 90).length}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Passing</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {Object.values(categories).filter(c => c.score >= 60 && c.score < 90).length}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Needs Work</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">
                  {Object.values(categories).filter(c => c.score < 60).length}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Failing</div>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {score < 90 && (
          <div className="mt-6 p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  Improve Your Email Security
                </div>
                <p className="text-sm text-muted-foreground">
                  Implementing proper email authentication (SPF, DMARC, DKIM) protects your domain from
                  spoofing, improves deliverability, and builds trust with recipients.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
