import { Mail, Shield, CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface EmailSecurityScoreProps {
  emailData: {
    mx: Array<{ exchange: string; priority: number }>;
    spf: {
      record: string | null;
      valid: boolean;
      configured?: boolean;
    };
    dmarc: {
      record: string | null;
      policy: string | null;
      valid: boolean;
      configured?: boolean;
    };
    dkim: {
      hasRecord: boolean;
      configured?: boolean;
    };
  };
}

interface ScoreBreakdown {
  category: string;
  points: number;
  maxPoints: number;
  status: 'complete' | 'partial' | 'missing';
  icon: React.ReactNode;
  details: string;
}

export function EmailSecurityScore({ emailData }: EmailSecurityScoreProps) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isNextStepsOpen, setIsNextStepsOpen] = useState(false);

  // Calculate score based on gamification strategy
  const calculateScore = () => {
    let score = 0;
    const breakdown: ScoreBreakdown[] = [];

    // SPF Configuration (30 points)
    let spfPoints = 0;
    if (emailData.spf?.record) {
      spfPoints += 20; // SPF exists
      if (emailData.spf?.valid) {
        spfPoints += 10; // SPF valid
      }
    }
    score += spfPoints;
    breakdown.push({
      category: 'SPF Record',
      points: spfPoints,
      maxPoints: 30,
      status: spfPoints === 30 ? 'complete' : spfPoints > 0 ? 'partial' : 'missing',
      icon: spfPoints === 30 ? <CheckCircle2 className="h-4 w-4" /> : spfPoints > 0 ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />,
      details: spfPoints === 30 ? 'Fully configured and valid' : spfPoints > 0 ? 'Exists but needs validation' : 'Not configured',
    });

    // DMARC Policy (30 points)
    let dmarcPoints = 0;
    if (emailData.dmarc?.record) {
      dmarcPoints += 15; // DMARC exists
      const policy = emailData.dmarc?.policy?.toLowerCase();
      if (policy === 'reject') {
        dmarcPoints += 15; // Full protection
      } else if (policy === 'quarantine') {
        dmarcPoints += 10; // Partial protection
      } else if (policy === 'none') {
        dmarcPoints += 5; // Monitoring only
      }
    }
    score += dmarcPoints;
    breakdown.push({
      category: 'DMARC Policy',
      points: dmarcPoints,
      maxPoints: 30,
      status: dmarcPoints === 30 ? 'complete' : dmarcPoints > 0 ? 'partial' : 'missing',
      icon: dmarcPoints === 30 ? <CheckCircle2 className="h-4 w-4" /> : dmarcPoints > 0 ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />,
      details: dmarcPoints === 30 ? 'Policy: reject (full protection)' : dmarcPoints >= 25 ? 'Policy: quarantine (partial)' : dmarcPoints > 0 ? `Policy: ${emailData.dmarc?.policy || 'none'}` : 'Not configured',
    });

    // DKIM Configuration (25 points)
    let dkimPoints = 0;
    if (emailData.dkim?.hasRecord) {
      dkimPoints += 20; // DKIM detected
      if (emailData.dkim?.configured) {
        dkimPoints += 5; // DKIM valid
      }
    }
    score += dkimPoints;
    breakdown.push({
      category: 'DKIM Signature',
      points: dkimPoints,
      maxPoints: 25,
      status: dkimPoints === 25 ? 'complete' : dkimPoints > 0 ? 'partial' : 'missing',
      icon: dkimPoints === 25 ? <CheckCircle2 className="h-4 w-4" /> : dkimPoints > 0 ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />,
      details: dkimPoints === 25 ? 'Detected and valid' : dkimPoints > 0 ? 'Detected but needs validation' : 'Not configured',
    });

    // MX Records (15 points)
    let mxPoints = 0;
    if (emailData.mx && emailData.mx.length > 0) {
      mxPoints += 10; // MX exists
      if (emailData.mx.length > 1) {
        mxPoints += 5; // Multiple MX (redundancy)
      }
    }
    score += mxPoints;
    breakdown.push({
      category: 'MX Records',
      points: mxPoints,
      maxPoints: 15,
      status: mxPoints === 15 ? 'complete' : mxPoints > 0 ? 'partial' : 'missing',
      icon: mxPoints === 15 ? <CheckCircle2 className="h-4 w-4" /> : mxPoints > 0 ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />,
      details: mxPoints === 15 ? `${emailData.mx.length} records (redundant)` : mxPoints > 0 ? '1 record (no redundancy)' : 'Not configured',
    });

    return { score, breakdown };
  };

  const { score, breakdown } = calculateScore();

  // Determine grade based on score
  const getGrade = (score: number): { grade: string; color: string; status: string } => {
    if (score >= 95) return { grade: 'A+', color: 'text-green-600 dark:text-green-400', status: 'Excellent' };
    if (score >= 90) return { grade: 'A', color: 'text-green-600 dark:text-green-400', status: 'Excellent' };
    if (score >= 85) return { grade: 'A-', color: 'text-green-600 dark:text-green-400', status: 'Very Good' };
    if (score >= 80) return { grade: 'B+', color: 'text-lime-600 dark:text-lime-400', status: 'Good' };
    if (score >= 75) return { grade: 'B', color: 'text-lime-600 dark:text-lime-400', status: 'Good' };
    if (score >= 70) return { grade: 'B-', color: 'text-yellow-600 dark:text-yellow-400', status: 'Fair' };
    if (score >= 65) return { grade: 'C+', color: 'text-yellow-600 dark:text-yellow-400', status: 'Fair' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-600 dark:text-orange-400', status: 'Needs Work' };
    if (score >= 55) return { grade: 'C-', color: 'text-orange-600 dark:text-orange-400', status: 'Needs Work' };
    if (score >= 50) return { grade: 'D', color: 'text-red-600 dark:text-red-400', status: 'Poor' };
    return { grade: 'F', color: 'text-red-600 dark:text-red-400', status: 'Critical' };
  };

  const gradeInfo = getGrade(score);

  // Calculate next steps to improve score
  const getNextSteps = () => {
    const steps: Array<{ action: string; points: number; priority: 'high' | 'medium' | 'low' }> = [];

    breakdown.forEach((item) => {
      const pointsAvailable = item.maxPoints - item.points;
      if (pointsAvailable > 0) {
        let action = '';
        let priority: 'high' | 'medium' | 'low' = 'medium';

        if (item.category === 'SPF Record') {
          if (item.points === 0) {
            action = 'Add SPF record to prevent email spoofing';
            priority = 'high';
          } else {
            action = 'Validate SPF record syntax';
            priority = 'medium';
          }
        } else if (item.category === 'DMARC Policy') {
          if (item.points === 0) {
            action = 'Configure DMARC policy for email authentication';
            priority = 'high';
          } else if (item.points < 30) {
            action = `Upgrade DMARC policy to "reject" for full protection`;
            priority = 'medium';
          }
        } else if (item.category === 'DKIM Signature') {
          if (item.points === 0) {
            action = 'Enable DKIM for email signature verification';
            priority = 'high';
          } else {
            action = 'Validate DKIM signature configuration';
            priority = 'low';
          }
        } else if (item.category === 'MX Records') {
          if (item.points === 0) {
            action = 'Configure MX records for email delivery';
            priority = 'high';
          } else {
            action = 'Add backup MX record for redundancy';
            priority = 'low';
          }
        }

        if (action) {
          steps.push({ action, points: pointsAvailable, priority });
        }
      }
    });

    // Sort by priority (high first) then by points (highest first)
    return steps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.points - a.points;
    });
  };

  const nextSteps = getNextSteps();
  const potentialScore = score + nextSteps.reduce((sum, step) => sum + step.points, 0);
  const potentialGrade = getGrade(potentialScore);

  // Progress bar color based on score
  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-blue-500/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">Email Security Score</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              SPF, DKIM, DMARC, and MX configuration analysis
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="p-6 rounded-lg bg-card border-2 border-border">
          <div className="text-center space-y-4">
            {/* Score and Grade */}
            <div className="space-y-2">
              <div className="text-5xl font-bold">{score}/100</div>
              <div className="flex items-center justify-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-2xl px-4 py-1 font-bold ${gradeInfo.color} border-current`}
                >
                  {gradeInfo.grade}
                </Badge>
                <span className="text-sm text-muted-foreground">({gradeInfo.status})</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${getProgressColor(score)} transition-all duration-1000 ease-out rounded-full`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">{score}% Complete</div>
            </div>
          </div>
        </div>

        {/* Score Breakdown - Collapsible */}
        <Collapsible open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <h4 className="font-semibold text-sm text-muted-foreground">📊 Score Breakdown</h4>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  isBreakdownOpen ? 'transform rotate-180' : ''
                }`}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {breakdown.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                item.status === 'complete'
                  ? 'bg-green-500/10 border-green-500/30'
                  : item.status === 'partial'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 ${
                    item.status === 'complete'
                      ? 'text-green-600 dark:text-green-400'
                      : item.status === 'partial'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{item.category}</span>
                    <span className="font-bold text-sm whitespace-nowrap">
                      {item.points}/{item.maxPoints} pts
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.details}</p>
                  {item.points < item.maxPoints && (
                    <p className="text-xs font-medium mt-1 text-orange-600 dark:text-orange-400">
                      +{item.maxPoints - item.points} pts available
                    </p>
                  )}
                </div>
              </div>
            </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Next Steps - Collapsible */}
        {nextSteps.length > 0 && (
          <Collapsible open={isNextStepsOpen} onOpenChange={setIsNextStepsOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">🎯 Next Steps to Improve</h4>
                  {score < 90 && (
                    <Badge variant="outline" className="text-xs">
                      Target: A Grade (90+)
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isNextStepsOpen ? 'transform rotate-180' : ''
                  }`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-3">
              {nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div
                    className={`mt-0.5 ${
                      step.priority === 'high'
                        ? 'text-red-600 dark:text-red-400'
                        : step.priority === 'medium'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {step.priority === 'high' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{step.action}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold whitespace-nowrap">
                    +{step.points} pts
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Potential Score */}
        {potentialScore > score && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Potential Score: <span className="font-bold">{potentialScore}/100</span>{' '}
                  <Badge variant="outline" className={`${potentialGrade.color} border-current ml-1`}>
                    {potentialGrade.grade}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete all recommendations to reach {potentialGrade.status.toLowerCase()} status
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Perfect Score Achievement */}
        {score === 100 && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏆</div>
              <div className="flex-1">
                <p className="font-bold text-green-600 dark:text-green-400">
                  Perfect Email Security!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All email security protocols are properly configured
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
