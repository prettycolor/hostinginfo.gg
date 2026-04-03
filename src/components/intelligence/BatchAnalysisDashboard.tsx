/**
 * Batch Analysis Dashboard Component
 * 
 * Comprehensive batch domain analysis system with:
 * - Job creation and management
 * - Real-time progress tracking
 * - Results table with sorting/filtering
 * - Statistics visualization
 * - Export functionality
 * - Job history
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlayCircle,
  StopCircle,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';

// Types
interface BatchJob {
  id: string;
  name: string;
  domains: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  completed: number;
  failed: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface BatchResult {
  domain: string;
  status: 'success' | 'failed';
  securityScore?: number;
  grade?: string;
  issueCount?: number;
  hostingProvider?: string;
  registrar?: string;
  error?: string;
}

interface BatchStatistics {
  totalDomains: number;
  successfulScans: number;
  failedScans: number;
  averageSecurityScore: number;
  averageIssueCount: number;
  topHostingProviders: Array<{ name: string; count: number }>;
  topRegistrars: Array<{ name: string; count: number }>;
  gradeDistribution: Record<string, number>;
}

export function BatchAnalysisDashboard() {
  const [jobName, setJobName] = useState('');
  const [domainList, setDomainList] = useState('');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('domain');
  const queryClient = useQueryClient();

  // Fetch batch jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery<BatchJob[]>({
    queryKey: ['batchJobs'],
    queryFn: async () => {
      const response = await fetch('/api/intelligence/batch/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds for progress updates
  });

  // Fetch job results
  const { data: results, isLoading: resultsLoading } = useQuery<BatchResult[]>({
    queryKey: ['batchResults', selectedJob],
    queryFn: async () => {
      if (!selectedJob) return [];
      const response = await fetch(`/api/intelligence/batch/jobs/${selectedJob}/results`);
      if (!response.ok) throw new Error('Failed to fetch results');
      return response.json();
    },
    enabled: !!selectedJob,
  });

  // Fetch job statistics
  const { data: statistics } = useQuery<BatchStatistics>({
    queryKey: ['batchStatistics', selectedJob],
    queryFn: async () => {
      if (!selectedJob) return null;
      const response = await fetch(`/api/intelligence/batch/jobs/${selectedJob}/statistics`);
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    },
    enabled: !!selectedJob,
  });

  // Create batch job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: { name: string; domains: string[] }) => {
      const response = await fetch('/api/intelligence/batch/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create job');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchJobs'] });
      setJobName('');
      setDomainList('');
    },
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/intelligence/batch/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to cancel job');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchJobs'] });
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/intelligence/batch/jobs/${jobId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete job');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchJobs'] });
      if (selectedJob === deleteJobMutation.variables) {
        setSelectedJob(null);
      }
    },
  });

  // Handle job creation
  const handleCreateJob = () => {
    const domains = domainList
      .split('\n')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    if (!jobName || domains.length === 0) {
      alert('Please provide a job name and at least one domain');
      return;
    }

    createJobMutation.mutate({ name: jobName, domains });
  };

  // Export results
  const handleExport = (format: 'json' | 'csv') => {
    if (!results || results.length === 0) return;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(results, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-results-${selectedJob}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export
      const headers = ['Domain', 'Status', 'Security Score', 'Grade', 'Issues', 'Hosting', 'Registrar'];
      const rows = results.map((r) => [
        r.domain,
        r.status,
        r.securityScore?.toString() || 'N/A',
        r.grade || 'N/A',
        r.issueCount?.toString() || 'N/A',
        r.hostingProvider || 'N/A',
        r.registrar || 'N/A',
      ]);
      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-results-${selectedJob}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Filter and sort results
  const filteredResults = results?.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const sortedResults = filteredResults?.sort((a, b) => {
    switch (sortBy) {
      case 'domain':
        return a.domain.localeCompare(b.domain);
      case 'score':
        return (b.securityScore || 0) - (a.securityScore || 0);
      case 'issues':
        return (b.issueCount || 0) - (a.issueCount || 0);
      default:
        return 0;
    }
  });

  // Get status badge variant
  const getStatusBadge = (status: BatchJob['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Get grade badge color
  const getGradeBadge = (grade?: string) => {
    if (!grade) return <Badge variant="secondary">N/A</Badge>;
    const color =
      grade === 'A+' || grade === 'A'
        ? 'bg-green-500'
        : grade === 'B'
        ? 'bg-blue-500'
        : grade === 'C'
        ? 'bg-yellow-500'
        : 'bg-red-500';
    return <Badge className={color}>{grade}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Batch Domain Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Analyze multiple domains simultaneously and track progress in real-time
        </p>
      </div>

      {/* Create Job Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Batch Job</CardTitle>
          <CardDescription>
            Enter a job name and list of domains (one per line) to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Job Name</label>
            <Input
              placeholder="e.g., Q1 2026 Security Audit"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Domains (one per line)
            </label>
            <Textarea
              placeholder="example.com&#10;google.com&#10;github.com"
              value={domainList}
              onChange={(e) => setDomainList(e.target.value)}
              rows={6}
            />
            <p className="text-sm text-muted-foreground mt-2">
              {domainList.split('\n').filter((d) => d.trim()).length} domains
            </p>
          </div>
          <Button
            onClick={handleCreateJob}
            disabled={createJobMutation.isPending}
            className="w-full"
          >
            {createJobMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Creating Job...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Create and Start Job
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Jobs</CardTitle>
          <CardDescription>View and manage your batch analysis jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedJob === job.id ? 'border-primary bg-accent' : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedJob(job.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{job.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {job.total} domains • Created {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                      {job.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelJobMutation.mutate(job.id);
                          }}
                        >
                          <StopCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {(job.status === 'completed' || job.status === 'cancelled') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteJobMutation.mutate(job.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {job.status === 'running' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {job.completed} / {job.total} completed
                        </span>
                        <span>{Math.round(job.progress)}%</span>
                      </div>
                      <Progress value={job.progress} />
                    </div>
                  )}
                  {job.status === 'completed' && (
                    <div className="flex gap-4 text-sm mt-2">
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {job.completed} successful
                      </span>
                      {job.failed > 0 && (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {job.failed} failed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                No batch jobs yet. Create your first job above to get started.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Job Details */}
      {selectedJob && (
        <>
          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalDomains}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statistics.successfulScans} successful
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Avg Security Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.averageSecurityScore.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Out of 100
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Avg Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.averageIssueCount.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per domain
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((statistics.successfulScans / statistics.totalDomains) * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statistics.failedScans} failed
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Analysis Results</CardTitle>
                  <CardDescription>
                    Detailed results for each domain in the batch
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="score">Score</SelectItem>
                      <SelectItem value="issues">Issues</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('json')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sortedResults && sortedResults.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Security Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Hosting</TableHead>
                      <TableHead>Registrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResults.map((result) => (
                      <TableRow key={result.domain}>
                        <TableCell className="font-medium">{result.domain}</TableCell>
                        <TableCell>
                          {result.status === 'success' ? (
                            <Badge className="bg-green-500">Success</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.securityScore !== undefined ? (
                            <span className="font-semibold">{result.securityScore}</span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{getGradeBadge(result.grade)}</TableCell>
                        <TableCell>
                          {result.issueCount !== undefined ? (
                            <span>{result.issueCount}</span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.hostingProvider || (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.registrar || (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    No results available yet. Results will appear as the job progresses.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
