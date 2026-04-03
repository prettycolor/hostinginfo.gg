/**
 * SEO Checklist Frontend Types
 */

export type ScanStatus = "pending" | "running" | "completed" | "failed";
export type Decision = "ready" | "fix_first" | "not_ready";
export type ChecklistItemStatus =
  | "good"
  | "needs_work"
  | "critical"
  | "unknown";
export type ChecklistCategoryKey =
  | "access"
  | "mobile_speed"
  | "page_basics"
  | "site_health"
  | "tracking";

export interface ScanResult {
  scan_id: string;
  status: ScanStatus;
  created_at: string;
  completed_at: string | null;
  target?: {
    host: string;
    input_url: string;
    final_url: string;
    redirect_chain: string[];
  };
  decision?: Decision;
  summary?: {
    headline: string;
    topReasons: string[];
    topFixes: string[];
  };
  score?: {
    total: number;
    categories: {
      access: number;
      mobile_speed: number;
      page_basics: number;
      site_health: number;
      tracking: number;
    };
  };
  checklist?: {
    access: ChecklistItem[];
    mobile_speed: ChecklistItem[];
    page_basics: ChecklistItem[];
    site_health: ChecklistItem[];
    tracking: ChecklistItem[];
  };
  evidence?: unknown;
  errors?: string[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistItemStatus;
  why: string;
  fix: string | null;
  evidence: {
    url: string;
    foundValue: unknown;
    whatThisMeans: string;
  } | null;
}

export interface ScanHistoryItem {
  scan_id: string;
  domain: string;
  decision: Decision | null;
  total_score: number | null;
  status: ScanStatus;
  created_at: string;
}
