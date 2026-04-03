import { useState } from 'react';
import { HelpCircle, Lightbulb, BookOpen, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';

interface TooltipPatternHubProps {
  variant?: 'floating-button' | 'inline-section' | 'popover-icon' | 'side-sheet' | 'full-modal';
}

const patterns = [
  {
    id: 'minimal',
    name: 'Minimal',
    icon: '🧘',
    description: 'Clean UI, headings only',
    conversion: '⭐⭐ (2-5%)',
    ux: '⭐⭐⭐⭐⭐',
    bestFor: 'Technical users, developers',
    color: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    icon: '⚖️',
    description: 'Headings + key metrics',
    conversion: '⭐⭐⭐⭐ (8-12%)',
    ux: '⭐⭐⭐⭐',
    bestFor: 'Most users, SaaS products',
    color: 'bg-green-500/10 border-green-500/20',
    recommended: true,
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    icon: '💪',
    description: 'Everywhere + upsell banners',
    conversion: '⭐⭐⭐⭐⭐ (15-25%)',
    ux: '⭐⭐⭐',
    bestFor: 'Enterprise sales, max conversion',
    color: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    id: 'educational',
    name: 'Educational',
    icon: '📚',
    description: 'Headings + explainer sections',
    conversion: '⭐⭐⭐ (5-8%)',
    ux: '⭐⭐⭐⭐⭐',
    bestFor: 'Trust-building, content marketing',
    color: 'bg-purple-500/10 border-purple-500/20',
  },
];

// Floating Button Component (Bottom-right corner)
export function FloatingTooltipButton() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Lightbulb className="h-6 w-6" />
          <span className="sr-only">View Tooltip Patterns</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Tooltip Integration Patterns
          </SheetTitle>
          <SheetDescription>
            Choose the perfect tooltip pattern for your security tab
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Quick Pattern Cards */}
          <div className="grid grid-cols-1 gap-3">
            {patterns.map((pattern) => (
              <Card key={pattern.id} className={`${pattern.color} border-2`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{pattern.icon}</span>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {pattern.name}
                          {pattern.recommended && (
                            <Badge variant="default" className="bg-green-500">
                              Recommended
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {pattern.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion:</span>
                    <span className="font-medium">{pattern.conversion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UX:</span>
                    <span className="font-medium">{pattern.ux}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Best for:</span>
                    <p className="text-xs font-medium mt-1">{pattern.bestFor}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* View Full Demo Button */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <BookOpen className="h-8 w-8 mx-auto text-primary" />
                <h3 className="font-semibold">Want to see all patterns in action?</h3>
                <p className="text-sm text-muted-foreground">
                  View the interactive demo with live examples, code snippets, and A/B testing recommendations.
                </p>
                <Button asChild className="w-full">
                  <Link to="/security-tab-demo">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Interactive Demo
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Inline Accordion Section (For main page)
export function InlineTooltipSection() {
  return (
    <Card className="border-2 border-blue-500/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-500" />
          <CardTitle>💡 Tooltip Integration Patterns</CardTitle>
        </div>
        <CardDescription>
          Learn how to integrate tooltips into your security tab for better user experience and conversion
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {patterns.map((pattern) => (
            <AccordionItem key={pattern.id} value={pattern.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <span className="text-2xl">{pattern.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pattern.name}</span>
                      {pattern.recommended && (
                        <Badge variant="default" className="bg-green-500 text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{pattern.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-11 space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Conversion:</span>
                      <p className="font-medium">{pattern.conversion}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">User Experience:</span>
                      <p className="font-medium">{pattern.ux}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Best for:</span>
                    <p className="font-medium">{pattern.bestFor}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-4 pt-4 border-t">
          <Button asChild variant="outline" className="w-full">
            <Link to="/security-tab-demo">
              <BookOpen className="h-4 w-4 mr-2" />
              View Full Interactive Demo
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Popover Icon (Contextual help)
export function TooltipPatternPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Tooltip pattern help</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Tooltip Patterns Available
            </h4>
            <p className="text-xs text-muted-foreground">
              Choose how to display tooltips in your security tab
            </p>
          </div>

          <div className="space-y-2">
            {patterns.map((pattern) => (
              <div key={pattern.id} className="flex items-start gap-2 text-xs">
                <span className="text-lg">{pattern.icon}</span>
                <div>
                  <p className="font-medium">
                    {pattern.name}
                    {pattern.recommended && (
                      <Badge variant="default" className="ml-1 bg-green-500 text-[10px] px-1 py-0">
                        ⭐
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground">{pattern.conversion}</p>
                </div>
              </div>
            ))}
          </div>

          <Button asChild size="sm" className="w-full">
            <Link to="/security-tab-demo">
              <ExternalLink className="h-3 w-3 mr-2" />
              View Full Demo
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Full Modal Dialog (Focused learning)
export function TooltipPatternModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Lightbulb className="h-4 w-4 mr-2" />
          Tooltip Patterns
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Tooltip Integration Patterns
          </DialogTitle>
          <DialogDescription>
            Choose the perfect pattern for your security tab based on your audience and goals
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="minimal">Minimal</TabsTrigger>
            <TabsTrigger value="balanced">Balanced</TabsTrigger>
            <TabsTrigger value="aggressive">Aggressive</TabsTrigger>
            <TabsTrigger value="educational">Educational</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((pattern) => (
                <Card key={pattern.id} className={`${pattern.color} border-2`}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{pattern.icon}</span>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {pattern.name}
                          {pattern.recommended && (
                            <Badge variant="default" className="bg-green-500">
                              ⭐ Recommended
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {pattern.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversion:</span>
                      <span className="font-medium">{pattern.conversion}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">UX:</span>
                      <span className="font-medium">{pattern.ux}</span>
                    </div>
                    <div className="pt-2 border-t text-sm">
                      <span className="text-muted-foreground">Best for:</span>
                      <p className="font-medium mt-1">{pattern.bestFor}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <BookOpen className="h-10 w-10 mx-auto text-primary" />
                  <h3 className="font-semibold text-lg">Ready to see them in action?</h3>
                  <p className="text-sm text-muted-foreground">
                    Visit our interactive demo to see live examples, implementation code, and A/B testing recommendations.
                  </p>
                  <Button asChild size="lg" className="w-full">
                    <Link to="/security-tab-demo">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Interactive Demo
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {patterns.map((pattern) => (
            <TabsContent key={pattern.id} value={pattern.id} className="space-y-4">
              <Card className={`${pattern.color} border-2`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{pattern.icon}</span>
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        {pattern.name}
                        {pattern.recommended && (
                          <Badge variant="default" className="bg-green-500">
                            ⭐ Recommended
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{pattern.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Conversion Potential</h4>
                      <p className="text-2xl font-bold">{pattern.conversion}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">User Experience</h4>
                      <p className="text-2xl font-bold">{pattern.ux}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Best For</h4>
                    <p className="text-muted-foreground">{pattern.bestFor}</p>
                  </div>

                  <div className="pt-4 border-t">
                    <Button asChild className="w-full">
                      <Link to="/security-tab-demo">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        See {pattern.name} Pattern in Action
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Main Hub Component (All-in-one)
export default function TooltipPatternHub({ variant = 'floating-button' }: TooltipPatternHubProps) {
  switch (variant) {
    case 'floating-button':
      return <FloatingTooltipButton />;
    case 'inline-section':
      return <InlineTooltipSection />;
    case 'popover-icon':
      return <TooltipPatternPopover />;
    case 'full-modal':
      return <TooltipPatternModal />;
    default:
      return <FloatingTooltipButton />;
  }
}
