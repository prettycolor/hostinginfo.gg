/**
 * Report Generator Component
 * 
 * UI for generating new reports with template selection and format options
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
}

export function ReportGenerator() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [format, setFormat] = useState<string>('pdf');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Load templates on mount
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
      setLoadingTemplates(false);
    }
  }

  async function handleGenerate() {
    if (!selectedTemplate || !domain) {
      toast.error('Please select a template and enter a domain');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          domain,
          format,
          scanData: {}, // Scan data fetching pending
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Report generated successfully!');
        
        // Download the report
        const downloadUrl = `/api/reports/${data.report.id}/download`;
        window.open(downloadUrl, '_blank');
        
        // Reset form
        setDomain('');
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Report
        </CardTitle>
        <CardDescription>
          Create a new report using a template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label htmlFor="template">Report Template</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {loadingTemplates ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading templates...
                </div>
              ) : (
                templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedTemplateData && (
            <p className="text-sm text-muted-foreground">
              {selectedTemplateData.description}
            </p>
          )}
        </div>

        {/* Domain Input */}
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={loading || !selectedTemplate || !domain}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
