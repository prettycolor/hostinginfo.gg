/**
 * Reports List Component
 * 
 * Display list of generated reports with download and delete actions
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize } from '@/lib/format-utils';

interface Report {
  id: number;
  title: string;
  domain: string;
  format: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

export function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports);
      } else {
        toast.error('Failed to load reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(reportId: number) {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    setDeletingId(reportId);

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Report deleted successfully');
        setReports(reports.filter(r => r.id !== reportId));
      } else {
        toast.error(data.error || 'Failed to delete report');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  }

  function handleDownload(reportId: number) {
    window.open(`/api/reports/${reportId}/download`, '_blank');
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

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No reports yet</p>
          <p className="text-sm text-muted-foreground">Generate your first report to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Reports</CardTitle>
        <CardDescription>
          {reports.length} {reports.length === 1 ? 'report' : 'reports'} generated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{report.title}</h3>
                  <Badge variant="outline" className="uppercase text-xs">
                    {report.format}
                  </Badge>
                  {report.status === 'completed' && (
                    <Badge variant="default" className="text-xs">
                      Ready
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {report.domain} • {formatFileSize(report.fileSize)} • {new Date(report.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(report.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(report.id)}
                  disabled={deletingId === report.id}
                >
                  {deletingId === report.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
