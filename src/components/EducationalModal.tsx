import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, AlertTriangle, Info, Code, BookOpen } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface EducationalContent {
  title: string;
  description: string;
  category: 'security' | 'performance' | 'email' | 'dns' | 'ssl';
  importance: 'critical' | 'high' | 'medium' | 'low';
  sections: {
    title: string;
    content: string;
    icon?: React.ReactNode;
  }[];
  whatItIs?: string;
  whyItMatters?: string;
  howToFix?: string;
  example?: string;
  products?: {
    name: string;
    description: string;
    link?: string;
  }[];
  resources?: {
    title: string;
    url: string;
  }[];
}

interface EducationalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: EducationalContent | null;
  hideProducts?: boolean;
}

export function EducationalModal({ open, onOpenChange, content, hideProducts = false }: EducationalModalProps) {
  if (!content) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'performance': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'email': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'dns': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'ssl': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Info className="h-4 w-4 text-blue-600" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0">
        {/* Header - Fixed */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-2xl">{content.title}</DialogTitle>
                <Badge variant="outline" className={getCategoryColor(content.category)}>
                  {content.category.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-1">
                  {getImportanceIcon(content.importance)}
                  <span className="text-xs font-medium capitalize">{content.importance}</span>
                </div>
              </div>
              <DialogDescription className="text-base">
                {content.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          <div className="space-y-6 pr-4">
            {/* Quick Summary Sections */}
            {content.whatItIs && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  What It Is
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{content.whatItIs}</p>
              </div>
            )}

            {content.whyItMatters && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Why It Matters
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{content.whyItMatters}</p>
              </div>
            )}

            {content.howToFix && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  How to Fix
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{content.howToFix}</p>
              </div>
            )}

            {content.example && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-600" />
                  Example
                </h3>
                <div className="bg-muted p-4 rounded-lg border">
                  <code className="text-xs font-mono whitespace-pre-wrap break-all">{content.example}</code>
                </div>
              </div>
            )}

            {/* Detailed Sections (Accordion) */}
            {content.sections.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Learn More</h3>
                <Accordion type="single" collapsible className="w-full">
                  {content.sections.map((section, index) => (
                    <AccordionItem key={index} value={`section-${index}`}>
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {section.icon}
                          {section.title}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {section.content}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Product Recommendations */}
            {!hideProducts && content.products && content.products.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Recommended Solutions</h3>
                <div className="space-y-2">
                  {content.products.map((product, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{product.name}</h4>
                          <p className="text-xs text-muted-foreground">{product.description}</p>
                        </div>
                        {product.link && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={product.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Resources */}
            {content.resources && content.resources.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Additional Resources</h3>
                <div className="space-y-2">
                  {content.resources.map((resource, index) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {resource.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - Fixed */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Click outside or press ESC to close
            </p>
            <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export type for use in other components
export type { EducationalContent };
