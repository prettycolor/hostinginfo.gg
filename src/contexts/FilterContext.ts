import { createContext, useContext } from "react";

export interface FilterState {
  dateRange: "30" | "60" | "90" | "180" | "custom";
  startDate?: string;
  endDate?: string;
  securityScores: string[]; // ['A', 'B', 'C', 'D', 'F']
  performanceScores: string[]; // ['0-30', '31-60', '61-100']
  technologies: string[]; // ['WordPress', 'Shopify', etc.]
  hostingProviders: string[]; // ['HostingInfo', 'Bluehost', etc.]
  sslStatus: string[]; // ['valid', 'expired', 'expiring']
  sortBy: "date" | "domain" | "securityScore" | "performanceScore";
  sortOrder: "asc" | "desc";
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
  updatedAt: string;
}

export interface FilterContextValue {
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  isFiltered: boolean;
  // Presets
  presets: FilterPreset[];
  presetsLoading: boolean;
  presetsError: string | null;
  savePreset: (name: string) => Promise<void>;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => Promise<void>;
  updatePreset: (id: string, name: string) => Promise<void>;
}

export const defaultFilters: FilterState = {
  dateRange: "30",
  securityScores: [],
  performanceScores: [],
  technologies: [],
  hostingProviders: [],
  sslStatus: [],
  sortBy: "date",
  sortOrder: "desc",
};

const FilterContext = createContext<FilterContextValue | undefined>(undefined);
export { FilterContext };

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within FilterProvider");
  }
  return context;
}
