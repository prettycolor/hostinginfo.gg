import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Recommendation {
  id: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
  estimatedTime?: string;
}

interface CriticalIssuesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criticalIssues: string[];
  recommendations: Recommendation[];
  domain: string;
}

export function CriticalIssuesModal({
  open,
  onOpenChange,
  criticalIssues,
  recommendations,
  domain,
}: CriticalIssuesModalProps) {
  // Filter recommendations by priority
  const criticalRecommendations = recommendations.filter(r => r.priority === 'critical');
  const highRecommendations = recommendations.filter(r => r.priority === 'high');
  const mediumRecommendations = recommendations.filter(r => r.priority === 'medium');

  const getPriorityIcon = (priority: string) => {
    if (priority === 'critical') return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (priority === 'high') return <AlertCircle className="h-5 w-5 text-orange-500" />;
    return <Info className="h-5 w-5 text-yellow-500" />;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'critical') return <Badge variant="destructive">CRITICAL</Badge>;
    if (priority === 'high') return <Badge className="bg-orange-500 text-white">HIGH</Badge>;
    return <Badge className="bg-yellow-500 text-white">MEDIUM</Badge>;
  };

  const totalIssues = criticalRecommendations.length + highRecommendations.length + mediumRecommendations.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                Issues Found for {domain}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {totalIssues} issue{totalIssues !== 1 ? 's' : ''} requiring attention
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)] px-6 pb-6">
          <div className="space-y-6">
            {/* Critical Issues from Report */}
            {criticalIssues.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-lg font-semibold">Critical Security Alerts</h3>
                  <Badge variant="destructive">{criticalIssues.length}</Badge>
                </div>
                <div className="space-y-2">
                  {criticalIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border-2 border-red-500/20 bg-red-500/5"
                    >
                      <p className="text-sm text-foreground">{issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical Priority Recommendations */}
            {criticalRecommendations.length > 0 && (
              <>
                {criticalIssues.length > 0 && <Separator />}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-semibold">Critical Priority Actions</h3>
                    <Badge variant="destructive">{criticalRecommendations.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {criticalRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 rounded-lg border-2 border-red-500/20 bg-red-500/5 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(rec.priority)}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground">{rec.title}</h4>
                              {getPriorityBadge(rec.priority)}
                              <Badge variant="outline" className="text-xs">
                                {rec.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="font-medium text-foreground">Impact:</span>{' '}
                                <span className="text-muted-foreground">{rec.impact}</span>
                              </p>
                              <p className="text-sm">
                                <span className="font-medium text-foreground">Action:</span>{' '}
                                <span className="text-muted-foreground">{rec.action}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* High Priority Recommendations */}
            {highRecommendations.length > 0 && (
              <>
                {(criticalIssues.length > 0 || criticalRecommendations.length > 0) && <Separator />}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">High Priority Actions</h3>
                    <Badge className="bg-orange-500 text-white">{highRecommendations.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {highRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(rec.priority)}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground">{rec.title}</h4>
                              {getPriorityBadge(rec.priority)}
                              <Badge variant="outline" className="text-xs">
                                {rec.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="font-medium text-foreground">Impact:</span>{' '}
                                <span className="text-muted-foreground">{rec.impact}</span>
                              </p>
                              <p className="text-sm">
                                <span className="font-medium text-foreground">Action:</span>{' '}
                                <span className="text-muted-foreground">{rec.action}</span>
                              </p>
                              {rec.estimatedTime && (
                                <p className="text-xs text-muted-foreground">
                                  Estimated time: {rec.estimatedTime}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Medium Priority Recommendations */}
            {mediumRecommendations.length > 0 && (
              <>
                {(criticalIssues.length > 0 || criticalRecommendations.length > 0 || highRecommendations.length > 0) && <Separator />}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold">Medium Priority Actions</h3>
                    <Badge className="bg-yellow-500 text-white">{mediumRecommendations.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {mediumRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(rec.priority)}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground">{rec.title}</h4>
                              {getPriorityBadge(rec.priority)}
                              <Badge variant="outline" className="text-xs">
                                {rec.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="font-medium text-foreground">Impact:</span>{' '}
                                <span className="text-muted-foreground">{rec.impact}</span>
                              </p>
                              <p className="text-sm">
                                <span className="font-medium text-foreground">Action:</span>{' '}
                                <span className="text-muted-foreground">{rec.action}</span>
                              </p>
                              {rec.estimatedTime && (
                                <p className="text-xs text-muted-foreground">
                                  Estimated time: {rec.estimatedTime}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* No Issues */}
            {totalIssues === 0 && criticalIssues.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                  <AlertTriangle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                <p className="text-sm text-muted-foreground">
                  Your domain configuration looks healthy!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
