import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Server,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Database,
  Activity,
} from 'lucide-react';

interface IntelligenceTabProps {
  domain: string;
}

interface SecurityScore {
  overallScore: number;
  grade: string;
  riskLevel: string;
  categories: {
    sslTls: { score: number; weight: number };
    securityHeaders: { score: number; weight: number };
    dnsSecurity: { score: number; weight: number };
    emailSecurity: { score: number; weight: number };
    vulnerabilityAssessment: { score: number; weight: number };
    threatIntelligence: { score: number; weight: number };
  };
  findings: Array<{
    category: string;
    severity: string;
    finding: string;
    impact: string;
  }>;
  recommendations: Array<{
    priority: string;
    recommendation: string;
    impact: string;
    effort: string;
  }>;
}

interface InfrastructureAttribution {
  hostingProvider: {
    name: string;
    type: string;
    confidence: number;
  };
  cdnProvider?: {
    name: string;
    confidence: number;
  };
  isSharedHosting: boolean;
  serverLocation: {
    city: string;
    country: string;
    region: string;
  };
}

export function IntelligenceTab({ domain }: IntelligenceTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [securityScore, setSecurityScore] = useState<SecurityScore | null>(null);
  const [infrastructure, setInfrastructure] = useState<InfrastructureAttribution | null>(null);

  useEffect(() => {
    if (!domain) {
      setLoading(false);
      return;
    }

    const fetchIntelligence = async () => {
      setLoading(true);
      setError(null);

      try {
        const domainParam = encodeURIComponent(domain.trim().toLowerCase());

        // Fetch security score
        const securityRes = await fetch(`/api/intelligence/security/score/${domainParam}`);
        if (securityRes.ok) {
          const securityData = await securityRes.json();
          setSecurityScore(securityData);
        }

        // Fetch infrastructure attribution
        const infraRes = await fetch(`/api/intelligence/infrastructure/${domainParam}`);
        if (infraRes.ok) {
          const infraData = await infraRes.json();
          setInfrastructure(infraData);
        }
      } catch (err) {
        console.error('Error fetching intelligence:', err);
        setError('Failed to load intelligence data');
      } finally {
        setLoading(false);
      }
    };

    fetchIntelligence();
  }, [domain]);

  if (!domain) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Enter a domain above to view intelligence analysis</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Posture Analysis */}
      {securityScore && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overall Security Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Posture Score
              </CardTitle>
              <CardDescription>Comprehensive security assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold">{securityScore.overallScore}</div>
                  <div className="text-sm text-muted-foreground">out of 100</div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={securityScore.grade.startsWith('A') ? 'default' : 'destructive'}
                    className="text-lg px-4 py-1"
                  >
                    {securityScore.grade}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    {securityScore.riskLevel} Risk
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SSL/TLS</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(securityScore.categories.sslTls.score / 25) * 100}
                      className="w-24 h-2"
                    />
                    <span className="text-sm font-bold w-8 text-right">
                      {securityScore.categories.sslTls.score}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Security Headers</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(securityScore.categories.securityHeaders.score / 20) * 100}
                      className="w-24 h-2"
                    />
                    <span className="text-sm font-bold w-8 text-right">
                      {securityScore.categories.securityHeaders.score}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">DNS Security</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(securityScore.categories.dnsSecurity.score / 15) * 100}
                      className="w-24 h-2"
                    />
                    <span className="text-sm font-bold w-8 text-right">
                      {securityScore.categories.dnsSecurity.score}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email Security</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(securityScore.categories.emailSecurity.score / 15) * 100}
                      className="w-24 h-2"
                    />
                    <span className="text-sm font-bold w-8 text-right">
                      {securityScore.categories.emailSecurity.score}
                    </span>
                  </div>
                </div>
              </div>

              {securityScore.findings.filter((f) => f.severity === 'Critical' || f.severity === 'High')
                .length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {securityScore.findings.filter((f) => f.severity === 'Critical').length} Critical
                    Findings
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {securityScore.findings
                      .filter((f) => f.severity === 'Critical')
                      .slice(0, 2)
                      .map((f) => f.finding)
                      .join(' • ')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Infrastructure Attribution */}
          {infrastructure && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Infrastructure Attribution
                </CardTitle>
                <CardDescription>Hosting and CDN detection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Hosting Provider</span>
                    <Badge variant="secondary">{infrastructure.hostingProvider.type}</Badge>
                  </div>
                  <div className="text-lg font-bold">{infrastructure.hostingProvider.name}</div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Confidence: {infrastructure.hostingProvider.confidence}%</span>
                    <span>•</span>
                    <span>
                      {infrastructure.serverLocation.city}, {infrastructure.serverLocation.country}
                    </span>
                  </div>
                </div>

                {infrastructure.cdnProvider && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">CDN Provider</span>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="text-lg font-bold">{infrastructure.cdnProvider.name}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Confidence: {infrastructure.cdnProvider.confidence}%
                    </div>
                  </div>
                )}

                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Shared Hosting</span>
                    {infrastructure.isSharedHosting ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {infrastructure.isSharedHosting
                      ? 'Resources shared with other sites'
                      : 'Dedicated infrastructure - Not shared'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top Recommendations */}
      {securityScore && securityScore.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Security Recommendations
            </CardTitle>
            <CardDescription>Prioritized actions to improve security posture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityScore.recommendations.slice(0, 5).map((rec, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Badge
                      variant={rec.priority === 'Critical' || rec.priority === 'High' ? 'destructive' : 'secondary'}
                      className="mt-0.5"
                    >
                      {rec.priority}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">{rec.recommendation}</div>
                      <div className="text-xs text-muted-foreground">
                        Impact: {rec.impact} • Effort: {rec.effort}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!securityScore && !infrastructure && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No intelligence data available for this domain</p>
            <p className="text-sm mt-2">Try scanning the domain first to collect data</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
