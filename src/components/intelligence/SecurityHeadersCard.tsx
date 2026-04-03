import { Shield, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';

interface SecurityHeadersCardProps {
  headers: {
    'strict-transport-security'?: { present: boolean; value?: string };
    'content-security-policy'?: { present: boolean; value?: string };
    'x-frame-options'?: { present: boolean; value?: string };
    'x-content-type-options'?: { present: boolean; value?: string };
    'x-xss-protection'?: { present: boolean; value?: string };
    'referrer-policy'?: { present: boolean; value?: string };
    'permissions-policy'?: { present: boolean; value?: string };
  };
}

const headerInfo: Record<string, { name: string; description: string; importance: 'critical' | 'high' | 'medium' }> = {
  'strict-transport-security': {
    name: 'Strict-Transport-Security (HSTS)',
    description: 'Forces browsers to use HTTPS connections only, preventing man-in-the-middle attacks.',
    importance: 'critical',
  },
  'content-security-policy': {
    name: 'Content-Security-Policy (CSP)',
    description: 'Prevents XSS attacks by controlling which resources can be loaded on your site.',
    importance: 'critical',
  },
  'x-frame-options': {
    name: 'X-Frame-Options',
    description: 'Prevents clickjacking attacks by controlling whether your site can be embedded in frames.',
    importance: 'high',
  },
  'x-content-type-options': {
    name: 'X-Content-Type-Options',
    description: 'Prevents MIME-sniffing attacks by forcing browsers to respect declared content types.',
    importance: 'high',
  },
  'x-xss-protection': {
    name: 'X-XSS-Protection',
    description: 'Enables browser XSS filtering to block reflected XSS attacks.',
    importance: 'medium',
  },
  'referrer-policy': {
    name: 'Referrer-Policy',
    description: 'Controls how much referrer information is sent with requests, protecting user privacy.',
    importance: 'medium',
  },
  'permissions-policy': {
    name: 'Permissions-Policy',
    description: 'Controls which browser features and APIs can be used on your site.',
    importance: 'medium',
  },
};

export function SecurityHeadersCard({ headers }: SecurityHeadersCardProps) {
  const [expandedHeaders, setExpandedHeaders] = useState<Set<string>>(new Set());

  const toggleHeader = (headerKey: string) => {
    setExpandedHeaders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(headerKey)) {
        newSet.delete(headerKey);
      } else {
        newSet.add(headerKey);
      }
      return newSet;
    });
  };

  // Calculate score
  const totalHeaders = Object.keys(headers).length;
  const presentHeaders = Object.values(headers).filter((h) => h?.present).length;
  const score = totalHeaders > 0 ? Math.round((presentHeaders / totalHeaders) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getImportanceBadge = (importance: 'critical' | 'high' | 'medium') => {
    if (importance === 'critical') {
      return <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 text-xs">Critical</Badge>;
    }
    if (importance === 'high') {
      return <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs">High</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">Medium</Badge>;
  };

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-purple-500/10">
            <Shield className="h-6 w-6 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Security Headers</h3>
            <p className="text-sm text-muted-foreground">
              {presentHeaders} of {totalHeaders} headers present
            </p>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
        </div>

        {/* Headers List */}
        <div className="space-y-3">
          {Object.entries(headers).map(([headerKey, headerData]) => {
            const info = headerInfo[headerKey];
            if (!info) return null;

            const isExpanded = expandedHeaders.has(headerKey);
            const isPresent = headerData?.present || false;

            return (
              <div
                key={headerKey}
                className={`border-2 rounded-lg p-4 transition-colors ${
                  isPresent
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isPresent ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{info.name}</span>
                      {getImportanceBadge(info.importance)}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="ml-auto">
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{info.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {info.description}
                    </p>
                    {isPresent && headerData?.value && (
                      <>
                        <button
                          onClick={() => toggleHeader(headerKey)}
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Hide value
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Show value
                            </>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono break-all">
                            {headerData.value}
                          </div>
                        )}
                      </>
                    )}
                    {!isPresent && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        ⚠️ Missing - Consider implementing this header
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Security Score
            </span>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {presentHeaders}/{totalHeaders}
            </span>
          </div>
          {score < 100 && (
            <p className="text-xs text-muted-foreground mt-2">
              Implementing missing headers will improve your security posture.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
