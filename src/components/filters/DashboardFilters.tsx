/**
 * Dashboard Filters Component
 * Comprehensive filtering UI for dashboard scans
 */

import { useEffect, useState } from "react";
import { useFilters } from "@/contexts/FilterContext";
import type { FilterState } from "@/contexts/FilterContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Filter,
  X,
  ChevronDown,
  Calendar,
  Shield,
  Zap,
  Code,
  Server,
  Lock,
} from "lucide-react";
import { FilterPresets } from "./FilterPresets";
import { apiClient } from "@/lib/api-client";

interface DashboardFiltersProps {
  onApply?: () => void;
  controlsDisabled?: boolean;
}

interface FilterOptionsResponse {
  technologies?: string[];
  hostingProviders?: string[];
  securityGrades?: string[];
  performanceRanges?: Array<{
    label: string;
    value: string;
  }>;
}

const DEFAULT_TECHNOLOGIES = [
  "WordPress",
  "Shopify",
  "Wix",
  "Squarespace",
  "Webflow",
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "PHP",
  "Node.js",
  "Python",
];

const DEFAULT_HOSTING_PROVIDERS = [
  "GoDaddy",
  "Bluehost",
  "HostGator",
  "SiteGround",
  "WP Engine",
  "Kinsta",
  "Cloudflare",
  "AWS",
  "Google Cloud",
  "DigitalOcean",
  "Vercel",
  "Netlify",
];

const DEFAULT_PERFORMANCE_RANGES = [
  { value: "0-30", label: "Poor (0-30)" },
  { value: "31-60", label: "Needs Improvement (31-60)" },
  { value: "61-100", label: "Good (61-100)" },
];

export function DashboardFilters({
  onApply,
  controlsDisabled = false,
}: DashboardFiltersProps) {
  const { filters, setFilters, resetFilters, activeFilterCount } = useFilters();
  const [showFilters, setShowFilters] = useState(false);
  const [options, setOptions] = useState<FilterOptionsResponse>({
    technologies: DEFAULT_TECHNOLOGIES,
    hostingProviders: DEFAULT_HOSTING_PROVIDERS,
    securityGrades: ["A", "B", "C", "D", "F"],
    performanceRanges: DEFAULT_PERFORMANCE_RANGES,
  });

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      try {
        const response = await apiClient.get<FilterOptionsResponse>(
          "/scan-history/filter-options",
        );

        if (!cancelled) {
          setOptions({
            technologies: response.technologies?.length
              ? response.technologies
              : DEFAULT_TECHNOLOGIES,
            hostingProviders: response.hostingProviders?.length
              ? response.hostingProviders
              : DEFAULT_HOSTING_PROVIDERS,
            securityGrades: response.securityGrades?.length
              ? response.securityGrades
              : ["A", "B", "C", "D", "F"],
            performanceRanges: response.performanceRanges?.length
              ? response.performanceRanges
              : DEFAULT_PERFORMANCE_RANGES,
          });
        }
      } catch (error) {
        console.error("Failed to load dashboard filter options:", error);
      }
    };

    if (!controlsDisabled) {
      void loadOptions();
    }

    return () => {
      cancelled = true;
    };
  }, [controlsDisabled]);

  const asDateRange = (value: string): FilterState["dateRange"] =>
    value as FilterState["dateRange"];
  const asSortBy = (value: string): FilterState["sortBy"] =>
    value as FilterState["sortBy"];
  const asSortOrder = (value: string): FilterState["sortOrder"] =>
    value as FilterState["sortOrder"];

  const handleDateRangeChange = (value: string) => {
    setFilters({ dateRange: asDateRange(value) });
    onApply?.();
  };

  const handleSecurityScoreToggle = (score: string) => {
    const current = filters.securityScores;
    const updated = current.includes(score)
      ? current.filter((s) => s !== score)
      : [...current, score];
    setFilters({ securityScores: updated });
    onApply?.();
  };

  const handlePerformanceScoreToggle = (range: string) => {
    const current = filters.performanceScores;
    const updated = current.includes(range)
      ? current.filter((r) => r !== range)
      : [...current, range];
    setFilters({ performanceScores: updated });
    onApply?.();
  };

  const handleTechnologyToggle = (tech: string) => {
    const current = filters.technologies;
    const updated = current.includes(tech)
      ? current.filter((t) => t !== tech)
      : [...current, tech];
    setFilters({ technologies: updated });
    onApply?.();
  };

  const handleHostingProviderToggle = (provider: string) => {
    const current = filters.hostingProviders;
    const updated = current.includes(provider)
      ? current.filter((p) => p !== provider)
      : [...current, provider];
    setFilters({ hostingProviders: updated });
    onApply?.();
  };

  const handleSSLStatusToggle = (status: string) => {
    const current = filters.sslStatus;
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilters({ sslStatus: updated });
    onApply?.();
  };

  const handleSortChange = (sortBy: string) => {
    setFilters({ sortBy: asSortBy(sortBy) });
    onApply?.();
  };

  const handleSortOrderChange = (sortOrder: string) => {
    setFilters({ sortOrder: asSortOrder(sortOrder) });
    onApply?.();
  };

  const handleResetFilters = () => {
    resetFilters();
    onApply?.();
  };

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!controlsDisabled) {
                setShowFilters(!showFilters);
              }
            }}
            disabled={controlsDisabled}
            className="gap-2 disabled:bg-muted/40 disabled:border-border disabled:text-muted-foreground disabled:opacity-70"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </Button>

          <FilterPresets disabled />
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Scans</CardTitle>
            <CardDescription>
              Refine your scan history with advanced filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Label>
                <Select
                  value={filters.dateRange}
                  onValueChange={handleDateRangeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 180 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Security Score Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Score
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {filters.securityScores.length > 0
                        ? `${filters.securityScores.length} selected`
                        : "All grades"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      {options.securityGrades?.map((score) => (
                        <div
                          key={score}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`security-${score}`}
                            checked={filters.securityScores.includes(score)}
                            onCheckedChange={() =>
                              handleSecurityScoreToggle(score)
                            }
                          />
                          <label
                            htmlFor={`security-${score}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Grade {score}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Performance Score Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Performance Score
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {filters.performanceScores.length > 0
                        ? `${filters.performanceScores.length} selected`
                        : "All ranges"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      {options.performanceRanges?.map((range) => (
                        <div
                          key={range.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`performance-${range.value}`}
                            checked={filters.performanceScores.includes(
                              range.value,
                            )}
                            onCheckedChange={() =>
                              handlePerformanceScoreToggle(range.value)
                            }
                          />
                          <label
                            htmlFor={`performance-${range.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {range.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Technology Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Technology
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {filters.technologies.length > 0
                        ? `${filters.technologies.length} selected`
                        : "All technologies"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {options.technologies?.map((tech) => (
                        <div key={tech} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tech-${tech}`}
                            checked={filters.technologies.includes(tech)}
                            onCheckedChange={() => handleTechnologyToggle(tech)}
                          />
                          <label
                            htmlFor={`tech-${tech}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {tech}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hosting Provider Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Hosting Provider
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {filters.hostingProviders.length > 0
                        ? `${filters.hostingProviders.length} selected`
                        : "All providers"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {options.hostingProviders?.map((provider) => (
                        <div
                          key={provider}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`provider-${provider}`}
                            checked={filters.hostingProviders.includes(
                              provider,
                            )}
                            onCheckedChange={() =>
                              handleHostingProviderToggle(provider)
                            }
                          />
                          <label
                            htmlFor={`provider-${provider}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {provider}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* SSL Status Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  SSL Status
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {filters.sslStatus.length > 0
                        ? `${filters.sslStatus.length} selected`
                        : "All statuses"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      {[
                        { value: "valid", label: "Valid" },
                        { value: "expiring", label: "Expiring Soon" },
                        { value: "expired", label: "Expired" },
                      ].map((status) => (
                        <div
                          key={status.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`ssl-${status.value}`}
                            checked={filters.sslStatus.includes(status.value)}
                            onCheckedChange={() =>
                              handleSSLStatusToggle(status.value)
                            }
                          />
                          <label
                            htmlFor={`ssl-${status.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {status.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Sort Options */}
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={handleSortChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="domain">Domain Name</SelectItem>
                      <SelectItem value="securityScore">
                        Security Score
                      </SelectItem>
                      <SelectItem value="performanceScore">
                        Performance Score
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={handleSortOrderChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
