/**
 * Filter Chips Component
 * Displays active filters as removable chips/badges
 */

import { useFilters } from '@/contexts/FilterContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterChipsProps {
  onFilterRemove?: () => void;
}

export function FilterChips({ onFilterRemove }: FilterChipsProps) {
  const { filters, setFilters, resetFilters, isFiltered } = useFilters();

  if (!isFiltered) return null;

  const handleRemoveSecurityScore = (score: string) => {
    setFilters({
      securityScores: filters.securityScores.filter(s => s !== score),
    });
    onFilterRemove?.();
  };

  const handleRemovePerformanceScore = (range: string) => {
    setFilters({
      performanceScores: filters.performanceScores.filter(r => r !== range),
    });
    onFilterRemove?.();
  };

  const handleRemoveTechnology = (tech: string) => {
    setFilters({
      technologies: filters.technologies.filter(t => t !== tech),
    });
    onFilterRemove?.();
  };

  const handleRemoveHostingProvider = (provider: string) => {
    setFilters({
      hostingProviders: filters.hostingProviders.filter(p => p !== provider),
    });
    onFilterRemove?.();
  };

  const handleRemoveSSLStatus = (status: string) => {
    setFilters({
      sslStatus: filters.sslStatus.filter(s => s !== status),
    });
    onFilterRemove?.();
  };

  const handleRemoveDateRange = () => {
    setFilters({ dateRange: '30' });
    onFilterRemove?.();
  };

  const handleClearAll = () => {
    resetFilters();
    onFilterRemove?.();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {/* Date Range */}
      {filters.dateRange !== '30' && (
        <Badge variant="secondary" className="gap-1">
          Last {filters.dateRange} days
          <button
            onClick={handleRemoveDateRange}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Security Scores */}
      {filters.securityScores.map((score) => (
        <Badge key={score} variant="secondary" className="gap-1">
          Security: {score}
          <button
            onClick={() => handleRemoveSecurityScore(score)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Performance Scores */}
      {filters.performanceScores.map((range) => (
        <Badge key={range} variant="secondary" className="gap-1">
          Performance: {range}
          <button
            onClick={() => handleRemovePerformanceScore(range)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Technologies */}
      {filters.technologies.map((tech) => (
        <Badge key={tech} variant="secondary" className="gap-1">
          Tech: {tech}
          <button
            onClick={() => handleRemoveTechnology(tech)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Hosting Providers */}
      {filters.hostingProviders.map((provider) => (
        <Badge key={provider} variant="secondary" className="gap-1">
          Host: {provider}
          <button
            onClick={() => handleRemoveHostingProvider(provider)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* SSL Status */}
      {filters.sslStatus.map((status) => (
        <Badge key={status} variant="secondary" className="gap-1">
          SSL: {status}
          <button
            onClick={() => handleRemoveSSLStatus(status)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Clear All Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearAll}
        className="h-6 text-xs"
      >
        Clear all
      </Button>
    </div>
  );
}
