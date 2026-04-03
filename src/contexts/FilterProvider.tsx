import { useState, useEffect, type ReactNode } from "react";
import {
  useLocation,
  useSearchParams,
  type SetURLSearchParams,
} from "react-router-dom";
import {
  FilterContext,
  defaultFilters,
  type FilterState,
  type FilterPreset,
  type FilterContextValue,
} from "@/contexts/FilterContext";
import { apiClient } from "@/lib/api-client";

interface FilterProviderProps {
  children: ReactNode;
}

export function FilterProvider({ children }: FilterProviderProps) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDashboardRoute = location.pathname === "/dashboard";
  const [filters, setFiltersState] = useState<FilterState>(() => {
    // Try to load from URL params first (dashboard route only)
    const urlFilters = isDashboardRoute
      ? loadFiltersFromURL(searchParams)
      : null;
    if (urlFilters) return urlFilters;

    // Try to load from localStorage
    const savedFilters = localStorage.getItem("dashboardFilters");
    if (savedFilters) {
      try {
        return sanitizeFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }

    return defaultFilters;
  });

  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem("dashboardFilters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (!isDashboardRoute) {
      setPresets([]);
      setPresetsError(null);
      setPresetsLoading(false);
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setPresets([]);
      setPresetsError(null);
      setPresetsLoading(false);
      return;
    }

    let cancelled = false;

    const loadPresets = async () => {
      try {
        setPresetsLoading(true);
        setPresetsError(null);
        const response = await apiClient.get<{
          presets?: FilterPreset[];
        }>("/filter-presets");

        if (!cancelled) {
          setPresets(Array.isArray(response.presets) ? response.presets : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPresets([]);
          setPresetsError(
            error instanceof Error
              ? error.message
              : "Failed to load filter presets",
          );
        }
      } finally {
        if (!cancelled) {
          setPresetsLoading(false);
        }
      }
    };

    void loadPresets();

    return () => {
      cancelled = true;
    };
  }, [isDashboardRoute]);

  // Sync filters to URL only on dashboard
  useEffect(() => {
    if (!isDashboardRoute) return;
    saveFiltersToURL(filters, setSearchParams);
  }, [filters, setSearchParams, isDashboardRoute]);

  // Remove dashboard-only filter params from non-dashboard routes
  useEffect(() => {
    if (isDashboardRoute) return;

    const cleanedParams = new URLSearchParams(searchParams);
    FILTER_QUERY_KEYS.forEach((key) => cleanedParams.delete(key));

    if (cleanedParams.toString() !== searchParams.toString()) {
      setSearchParams(cleanedParams, { replace: true });
    }
  }, [isDashboardRoute, searchParams, setSearchParams]);

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState(defaultFilters);
  };

  // Calculate active filter count
  const activeFilterCount =
    filters.securityScores.length +
    filters.performanceScores.length +
    filters.technologies.length +
    filters.hostingProviders.length +
    filters.sslStatus.length +
    (filters.dateRange !== "30" ? 1 : 0);

  const isFiltered = activeFilterCount > 0;

  // Preset management functions
  const savePreset = async (name: string) => {
    const response = await apiClient.post<{ preset: FilterPreset }>(
      "/filter-presets",
      {
        name,
        filters,
      },
    );
    setPresets((prev) => [...prev, response.preset]);
  };

  const loadPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      setFiltersState(sanitizeFilters(preset.filters));
    }
  };

  const deletePreset = async (id: string) => {
    await apiClient.delete(`/filter-presets/${id}`);
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePreset = async (id: string, name: string) => {
    const response = await apiClient.patch<{ preset: FilterPreset }>(
      `/filter-presets/${id}`,
      {
        name,
      },
    );
    setPresets((prev) => prev.map((p) => (p.id === id ? response.preset : p)));
  };

  const value: FilterContextValue = {
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    isFiltered,
    presets,
    presetsLoading,
    presetsError,
    savePreset,
    loadPreset,
    deletePreset,
    updatePreset,
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

// Helper functions
function loadFiltersFromURL(searchParams: URLSearchParams): FilterState | null {
  const dateRange = searchParams.get("dateRange");
  if (!dateRange) return null;

  const safeDateRange = DATE_RANGE_VALUES.has(dateRange)
    ? (dateRange as FilterState["dateRange"])
    : "30";

  const sortBy = searchParams.get("sortBy");
  const safeSortBy = SORT_BY_VALUES.has(sortBy || "")
    ? (sortBy as FilterState["sortBy"])
    : "date";

  const sortOrder = searchParams.get("sortOrder");
  const safeSortOrder = SORT_ORDER_VALUES.has(sortOrder || "")
    ? (sortOrder as FilterState["sortOrder"])
    : "desc";

  return sanitizeFilters({
    dateRange: safeDateRange,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    securityScores:
      searchParams.get("securityScores")?.split(",").filter(Boolean) || [],
    performanceScores:
      searchParams.get("performanceScores")?.split(",").filter(Boolean) || [],
    technologies:
      searchParams.get("technologies")?.split(",").filter(Boolean) || [],
    hostingProviders:
      searchParams.get("hostingProviders")?.split(",").filter(Boolean) || [],
    sslStatus: searchParams.get("sslStatus")?.split(",").filter(Boolean) || [],
    sortBy: safeSortBy,
    sortOrder: safeSortOrder,
  });
}

function saveFiltersToURL(
  filters: FilterState,
  setSearchParams: SetURLSearchParams,
) {
  const params = new URLSearchParams();

  params.set("dateRange", filters.dateRange);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.securityScores.length) {
    params.set("securityScores", filters.securityScores.join(","));
  }
  if (filters.performanceScores.length) {
    params.set("performanceScores", filters.performanceScores.join(","));
  }
  if (filters.technologies.length) {
    params.set("technologies", filters.technologies.join(","));
  }
  if (filters.hostingProviders.length) {
    params.set("hostingProviders", filters.hostingProviders.join(","));
  }
  if (filters.sslStatus.length) {
    params.set("sslStatus", filters.sslStatus.join(","));
  }
  params.set("sortBy", filters.sortBy);
  params.set("sortOrder", filters.sortOrder);

  setSearchParams(params, { replace: true });
}

const DATE_RANGE_VALUES = new Set(["30", "60", "90", "180", "custom"]);
const SORT_BY_VALUES = new Set([
  "date",
  "domain",
  "securityScore",
  "performanceScore",
]);
const SORT_ORDER_VALUES = new Set(["asc", "desc"]);
const FILTER_QUERY_KEYS = [
  "dateRange",
  "startDate",
  "endDate",
  "securityScores",
  "performanceScores",
  "technologies",
  "hostingProviders",
  "sslStatus",
  "sortBy",
  "sortOrder",
];

function sanitizeFilters(raw: Partial<FilterState> | Record<string, unknown>) {
  const sortByAliases: Record<string, FilterState["sortBy"]> = {
    score: "performanceScore",
    name: "domain",
  };

  const performanceAliases: Record<string, string> = {
    "0-49": "0-30",
    "50-89": "31-60",
    "90-100": "61-100",
  };

  const dateRange =
    typeof raw.dateRange === "string" && DATE_RANGE_VALUES.has(raw.dateRange)
      ? (raw.dateRange as FilterState["dateRange"])
      : defaultFilters.dateRange;

  const sortByCandidate =
    typeof raw.sortBy === "string" ? raw.sortBy : defaultFilters.sortBy;
  const normalizedSortBy = SORT_BY_VALUES.has(sortByCandidate)
    ? (sortByCandidate as FilterState["sortBy"])
    : sortByAliases[sortByCandidate] || defaultFilters.sortBy;

  const sortOrder =
    typeof raw.sortOrder === "string" && SORT_ORDER_VALUES.has(raw.sortOrder)
      ? (raw.sortOrder as FilterState["sortOrder"])
      : defaultFilters.sortOrder;

  const normalizeStringArray = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];

  return {
    dateRange,
    startDate: typeof raw.startDate === "string" ? raw.startDate : undefined,
    endDate: typeof raw.endDate === "string" ? raw.endDate : undefined,
    securityScores: normalizeStringArray(raw.securityScores),
    performanceScores: normalizeStringArray(raw.performanceScores).map(
      (value) => performanceAliases[value] || value,
    ),
    technologies: normalizeStringArray(raw.technologies),
    hostingProviders: normalizeStringArray(raw.hostingProviders),
    sslStatus: normalizeStringArray(raw.sslStatus),
    sortBy: normalizedSortBy,
    sortOrder,
  } satisfies FilterState;
}
