import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Zap, Image, Code, Palette, Network, Gauge } from 'lucide-react';

interface PerformanceDetailsProps {
  device: 'mobile' | 'desktop';
  metrics: {
    fcp?: number;
    lcp?: number;
    tbt?: number;
    cls?: number;
    speedIndex?: number;
  };
  pageMetrics?: {
    loadTime?: number;
    pageSize?: number;
    requests?: number;
    domSize?: number;
    timeToInteractive?: number;
    firstMeaningfulPaint?: number;
  };
  opportunities?: Array<{
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    savings?: string;
    category: 'images' | 'javascript' | 'css' | 'fonts' | 'network' | 'rendering' | 'other';
    details?: string[];
  }>;
}

export function PerformanceDetails({
  device,
  metrics,
  pageMetrics,
  opportunities = [],
}: PerformanceDetailsProps) {
  const getMetricStatus = (value: number | undefined, thresholds: { good: number; needsImprovement: number }) => {
    if (value === undefined) return 'unknown';
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'needs-improvement':
        return 'text-orange-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Good</Badge>;
      case 'needs-improvement':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Needs Improvement</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Poor</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  const getImpactBadge = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Medium Impact</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Low Impact</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'images':
        return <Image className="h-4 w-4" />;
      case 'javascript':
        return <Code className="h-4 w-4" />;
      case 'css':
        return <Palette className="h-4 w-4" />;
      case 'network':
        return <Network className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  // Core Web Vitals thresholds (in milliseconds for timing metrics)
  const lcpStatus = getMetricStatus(metrics.lcp, { good: 2500, needsImprovement: 4000 });
  const fcpStatus = getMetricStatus(metrics.fcp, { good: 1800, needsImprovement: 3000 });
  const tbtStatus = getMetricStatus(metrics.tbt, { good: 200, needsImprovement: 600 });
  const clsStatus = getMetricStatus(metrics.cls ? metrics.cls * 1000 : undefined, { good: 100, needsImprovement: 250 });
  const siStatus = getMetricStatus(metrics.speedIndex, { good: 3400, needsImprovement: 5800 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {device === 'mobile' ? (
            <Smartphone className="h-5 w-5" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
          {device === 'mobile' ? 'Mobile' : 'Desktop'} Performance Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {/* Core Web Vitals */}
          <AccordionItem value="core-web-vitals">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                <span className="font-semibold">Core Web Vitals</span>
                <Badge variant="outline" className="ml-2">Google Metrics</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* LCP */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">Largest Contentful Paint (LCP)</div>
                    <div className="text-sm text-muted-foreground">Time to render largest content</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getStatusColor(lcpStatus)}`}>
                      {metrics.lcp && typeof metrics.lcp === 'number' ? `${(metrics.lcp / 1000).toFixed(2)}s` : 'N/A'}
                    </div>
                    {getStatusBadge(lcpStatus)}
                  </div>
                </div>

                {/* FCP */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">First Contentful Paint (FCP)</div>
                    <div className="text-sm text-muted-foreground">Time to first content render</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getStatusColor(fcpStatus)}`}>
                      {metrics.fcp && typeof metrics.fcp === 'number' ? `${(metrics.fcp / 1000).toFixed(2)}s` : 'N/A'}
                    </div>
                    {getStatusBadge(fcpStatus)}
                  </div>
                </div>

                {/* TBT */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">Total Blocking Time (TBT)</div>
                    <div className="text-sm text-muted-foreground">Time page is blocked from user input</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getStatusColor(tbtStatus)}`}>
                      {metrics.tbt && typeof metrics.tbt === 'number' ? `${metrics.tbt.toFixed(0)}ms` : 'N/A'}
                    </div>
                    {getStatusBadge(tbtStatus)}
                  </div>
                </div>

                {/* CLS */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">Cumulative Layout Shift (CLS)</div>
                    <div className="text-sm text-muted-foreground">Visual stability score</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getStatusColor(clsStatus)}`}>
                      {metrics.cls !== undefined && typeof metrics.cls === 'number' ? metrics.cls.toFixed(3) : 'N/A'}
                    </div>
                    {getStatusBadge(clsStatus)}
                  </div>
                </div>

                {/* Speed Index */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">Speed Index</div>
                    <div className="text-sm text-muted-foreground">How quickly content is visually displayed</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getStatusColor(siStatus)}`}>
                      {metrics.speedIndex && typeof metrics.speedIndex === 'number' ? `${(metrics.speedIndex / 1000).toFixed(2)}s` : 'N/A'}
                    </div>
                    {getStatusBadge(siStatus)}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Page Metrics */}
          {pageMetrics && (
            <AccordionItem value="page-metrics">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold">Page Metrics</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {pageMetrics.loadTime && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Load Time</div>
                      <div className="text-xl font-bold">{(pageMetrics.loadTime / 1000).toFixed(2)}s</div>
                    </div>
                  )}
                  {pageMetrics.pageSize && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Page Size</div>
                      <div className="text-xl font-bold">{(pageMetrics.pageSize / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  )}
                  {pageMetrics.requests && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Requests</div>
                      <div className="text-xl font-bold">{pageMetrics.requests}</div>
                    </div>
                  )}
                  {pageMetrics.domSize && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">DOM Size</div>
                      <div className="text-xl font-bold">{pageMetrics.domSize}</div>
                    </div>
                  )}
                  {pageMetrics.timeToInteractive && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">Time to Interactive</div>
                      <div className="text-xl font-bold">{(pageMetrics.timeToInteractive / 1000).toFixed(2)}s</div>
                    </div>
                  )}
                  {pageMetrics.firstMeaningfulPaint && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">First Meaningful Paint</div>
                      <div className="text-xl font-bold">{(pageMetrics.firstMeaningfulPaint / 1000).toFixed(2)}s</div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Optimization Opportunities */}
          {opportunities.length > 0 && (
            <AccordionItem value="opportunities">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-semibold">Optimization Opportunities</span>
                  <Badge variant="outline" className="ml-2">{opportunities.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {opportunities.map((opp, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(opp.category)}
                          <span className="font-semibold">{opp.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {opp.savings && (
                            <Badge variant="outline" className="text-xs">
                              Save {opp.savings}
                            </Badge>
                          )}
                          {getImpactBadge(opp.impact)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{opp.description}</p>
                      {opp.details && opp.details.length > 0 && (
                        <ul className="text-sm space-y-1 ml-4">
                          {opp.details.map((detail, idx) => (
                            <li key={idx} className="list-disc text-muted-foreground">{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
