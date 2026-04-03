/**
 * Template Manager Component
 * 
 * View and manage report templates (system and custom)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  isSystem: boolean;
  isCustom: boolean;
  sections?: string[];
}

export function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const response = await fetch('/api/reports/templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        toast.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  function getTypeBadge(type: string) {
    const colors: Record<string, string> = {
      performance: 'bg-blue-500',
      security: 'bg-red-500',
      uptime: 'bg-green-500',
      comprehensive: 'bg-purple-500',
      comparison: 'bg-orange-500',
    };
    return colors[type] || 'bg-gray-500';
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const systemTemplates = templates.filter(t => t.isSystem);
  const customTemplates = templates.filter(t => t.isCustom);

  return (
    <div className="space-y-6">
      {/* System Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            System Templates
          </CardTitle>
          <CardDescription>
            Pre-built templates for common reporting needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {systemTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium">{template.name}</h3>
                  </div>
                  <Badge 
                    className={`${getTypeBadge(template.type)} text-white text-xs`}
                  >
                    {template.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
                {template.sections && template.sections.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.sections.slice(0, 3).map((section, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {section}
                      </Badge>
                    ))}
                    {template.sections.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.sections.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Templates</CardTitle>
            <CardDescription>
              Your custom report templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {customTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-medium">{template.name}</h3>
                    </div>
                    <Badge 
                      className={`${getTypeBadge(template.type)} text-white text-xs`}
                    >
                      {template.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
