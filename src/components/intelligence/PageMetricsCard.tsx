import { Clock, FileText, Network, Zap, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PageMetricsCardProps {
  metrics: {
    loadTime?: number; // Total page load time (ms)
    pageSize?: number; // Total page size (bytes)
    requests?: number; // Number of HTTP requests
    domSize?: number; // Number of DOM elements
    timeToInteractive?: number; // Time to Interactive (ms)
    firstMeaningfulPaint?: number; // First Meaningful Paint (ms)
  };
  device: 'mobile' | 'desktop';
}

export function PageMetricsCard({ metrics, device }: PageMetricsCardProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getLoadTimeStatus = (ms: number) => {
    if (ms <= 2000) return { label: 'Fast', color: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' };
    if (ms <= 4000) return { label: 'Moderate', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' };
    return { label: 'Slow', color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' };
  };

  const getPageSizeStatus = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb <= 1) return { label: 'Lightweight', color: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' };
    if (mb <= 3) return { label: 'Average', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' };
    return { label: 'Heavy', color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' };
  };

  const getRequestsStatus = (count: number) => {
    if (count <= 50) return { label: 'Optimized', color: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' };
    if (count <= 100) return { label: 'Moderate', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' };
    return { label: 'Too Many', color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' };
  };

  const getDomSizeStatus = (count: number) => {
    if (count <= 800) return { label: 'Lean', color: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' };
    if (count <= 1500) return { label: 'Average', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' };
    return { label: 'Complex', color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' };
  };

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-purple-500/10">
            <Zap className="h-6 w-6 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Page Metrics</h3>
            <p className="text-sm text-muted-foreground">
              {device === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'} Page Statistics
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Load Time */}
          {metrics.loadTime !== undefined && (
            <div className="p-4 rounded-lg border-2 bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-muted-foreground">Load Time</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button>
                            <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Total time from initial request to page fully loaded</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {formatTime(metrics.loadTime)}
                  </div>
                  <Badge variant="outline" className={getLoadTimeStatus(metrics.loadTime).color}>
                    {getLoadTimeStatus(metrics.loadTime).label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Page Size */}
          {metrics.pageSize !== undefined && (
            <div className="p-4 rounded-lg border-2 bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-muted-foreground">Page Size</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button>
                            <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Total size of all resources downloaded (HTML, CSS, JS, images, etc.)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {formatBytes(metrics.pageSize)}
                  </div>
                  <Badge variant="outline" className={getPageSizeStatus(metrics.pageSize).color}>
                    {getPageSizeStatus(metrics.pageSize).label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* HTTP Requests */}
          {metrics.requests !== undefined && (
            <div className="p-4 rounded-lg border-2 bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Network className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-muted-foreground">HTTP Requests</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button>
                            <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Number of HTTP requests made to load the page. Fewer is better.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {metrics.requests}
                  </div>
                  <Badge variant="outline" className={getRequestsStatus(metrics.requests).color}>
                    {getRequestsStatus(metrics.requests).label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* DOM Size */}
          {metrics.domSize !== undefined && (
            <div className="p-4 rounded-lg border-2 bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-muted-foreground">DOM Elements</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button>
                            <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Number of HTML elements in the page. Simpler DOM = faster rendering.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {metrics.domSize.toLocaleString()}
                  </div>
                  <Badge variant="outline" className={getDomSizeStatus(metrics.domSize).color}>
                    {getDomSizeStatus(metrics.domSize).label}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Timing Metrics */}
        {(metrics.timeToInteractive !== undefined || metrics.firstMeaningfulPaint !== undefined) && (
          <div className="mt-6 pt-6 border-t">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Timing Metrics
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.timeToInteractive !== undefined && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Time to Interactive</span>
                  <span className="text-lg font-bold">{formatTime(metrics.timeToInteractive)}</span>
                </div>
              )}
              {metrics.firstMeaningfulPaint !== undefined && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">First Meaningful Paint</span>
                  <span className="text-lg font-bold">{formatTime(metrics.firstMeaningfulPaint)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Tips */}
        <div className="mt-6 p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                Performance Tips
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Keep page size under 1MB for optimal mobile performance</li>
                <li>• Reduce HTTP requests by combining files and using sprites</li>
                <li>• Minimize DOM complexity (aim for &lt;800 elements)</li>
                <li>• Target load time under 2 seconds for best user experience</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
