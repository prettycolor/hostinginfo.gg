/**
 * Scheduled Reports Component
 * 
 * Manage scheduled reports with create, edit, delete, and manual trigger
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Play, Trash2, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Schedule {
  id: number;
  name: string;
  domain: string;
  frequency: string;
  format: string;
  enabled: boolean;
  nextRun: string;
  lastRun: string | null;
}

export function ScheduledReports() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  async function fetchSchedules() {
    try {
      const response = await fetch('/api/reports/scheduled');
      const data = await response.json();
      
      if (data.success) {
        setSchedules(data.schedules);
      } else {
        toast.error('Failed to load scheduled reports');
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(scheduleId: number, enabled: boolean) {
    setActioningId(scheduleId);

    try {
      const response = await fetch(`/api/reports/scheduled/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Schedule ${enabled ? 'enabled' : 'disabled'}`);
        setSchedules(schedules.map(s => 
          s.id === scheduleId ? { ...s, enabled } : s
        ));
      } else {
        toast.error(data.error || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    } finally {
      setActioningId(null);
    }
  }

  async function handleRunNow(scheduleId: number) {
    setActioningId(scheduleId);

    try {
      const response = await fetch(`/api/reports/scheduled/${scheduleId}/run`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Report generated successfully!');
        fetchSchedules(); // Refresh to update lastRun
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error running schedule:', error);
      toast.error('Failed to generate report');
    } finally {
      setActioningId(null);
    }
  }

  async function handleDelete(scheduleId: number) {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    setActioningId(scheduleId);

    try {
      const response = await fetch(`/api/reports/scheduled/${scheduleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Schedule deleted successfully');
        setSchedules(schedules.filter(s => s.id !== scheduleId));
      } else {
        toast.error(data.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    } finally {
      setActioningId(null);
    }
  }

  function getFrequencyBadge(frequency: string) {
    const colors: Record<string, string> = {
      daily: 'bg-blue-500',
      weekly: 'bg-green-500',
      monthly: 'bg-purple-500',
    };
    return colors[frequency] || 'bg-gray-500';
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

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No scheduled reports</p>
          <p className="text-sm text-muted-foreground">Create a schedule to automate report generation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Reports</CardTitle>
        <CardDescription>
          {schedules.length} {schedules.length === 1 ? 'schedule' : 'schedules'} configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium truncate">{schedule.name}</h3>
                  <Badge 
                    className={`${getFrequencyBadge(schedule.frequency)} text-white uppercase text-xs`}
                  >
                    {schedule.frequency}
                  </Badge>
                  <Badge variant="outline" className="uppercase text-xs">
                    {schedule.format}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {schedule.domain}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Next: {new Date(schedule.nextRun).toLocaleString()}
                  </span>
                  {schedule.lastRun && (
                    <span>
                      Last: {new Date(schedule.lastRun).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(enabled) => handleToggle(schedule.id, enabled)}
                    disabled={actioningId === schedule.id}
                  />
                  <Label className="text-xs">
                    {schedule.enabled ? 'Enabled' : 'Disabled'}
                  </Label>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunNow(schedule.id)}
                  disabled={actioningId === schedule.id}
                >
                  {actioningId === schedule.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(schedule.id)}
                  disabled={actioningId === schedule.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
