import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { getUserDisplayName } from "@/lib/user-display";
import { useTerminalStore } from "@/lib/terminal/terminal-store";
import { getUserTier, getTierStyles } from "@/lib/tier-system";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Search,
  Globe,
  Clock,
  Shield,
  Zap,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Eye,
  ExternalLink,
  Plus,
  Users,
  Activity,
  CheckCircle2,
  Calculator,
  Sparkles,
  Star,
  Server,
  Layers,
} from "lucide-react";
import { DashboardIntelligenceWorkspace } from "@/components/intelligence/DashboardIntelligenceWorkspace";
import { LevelingXpBar } from "@/components/LevelingXpBar";
import {
  FavoritesTab,
  type FavoriteDomainRecord,
} from "@/components/FavoritesTab";
import { DashboardFilters } from "@/components/filters/DashboardFilters";
import { useFilters } from "@/contexts/FilterContext";
import { apiClient } from "@/lib/api-client";
import { normalizeScanDomainInput } from "@/lib/domain-input";

interface ScanHistoryItem {
  id: number;
  domain: string;
  scanType: string;
  scanData: unknown;
  createdAt: string;
  sslValid?: boolean | null;
  sslExpiryDate?: string | null;
}

interface DomainStats {
  domain: string;
  totalScans: number;
  lastScan: string;
  avgMobileScore: number;
  avgDesktopScore: number;
  avgSecurityScore: number;
  trend: "up" | "down" | "stable";
  issues: number;
  verified: boolean;
}

interface PerformanceHistoryItem {
  scanDate: string;
  mobileScore: number;
  desktopScore: number;
  mobileLcp: number;
  desktopLcp: number;
}

interface PerformanceScanJob {
  jobId?: string;
  status?: "queued" | "processing" | "completed" | "failed";
  pollAfterMs?: number;
  result?: Record<string, unknown>;
  error?: string;
  message?: string;
}

interface IntelligenceScan {
  id: number;
  domain: string;
  edgeProvider: string | null;
  originHost: string | null;
  confidenceScore: number | null;
  techCount: number;
  createdAt: string;
}

interface DashboardFavoriteRecord {
  id: number;
  domain: string;
}

type DashboardSecurityIssueSeverity = "critical" | "warning" | "info";

interface DashboardSecurityIssueSummary {
  id: string;
  message: string;
  severity: DashboardSecurityIssueSeverity;
  occurrences: number;
  lastDetectedAt: string | null;
}

function severityPriority(severity: DashboardSecurityIssueSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function inferSecurityIssueSeverity(
  message: string,
): DashboardSecurityIssueSeverity {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("critical") ||
    normalized.includes("invalid") ||
    normalized.includes("expired") ||
    normalized.includes("no https") ||
    normalized.includes("unable to connect") ||
    normalized.includes("timeout") ||
    normalized.includes("malware") ||
    normalized.includes("phishing") ||
    normalized.includes("blacklist")
  ) {
    return "critical";
  }

  if (
    normalized.includes("missing") ||
    normalized.includes("warning") ||
    normalized.includes("outdated") ||
    normalized.includes("weak") ||
    normalized.includes("recommend") ||
    normalized.includes("consider")
  ) {
    return "warning";
  }

  return "info";
}

function normalizeSecurityIssueMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title =
    typeof record.title === "string"
      ? record.title.trim()
      : typeof record.issue === "string"
        ? record.issue.trim()
        : typeof record.message === "string"
          ? record.message.trim()
          : typeof record.name === "string"
            ? record.name.trim()
            : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const action = typeof record.action === "string" ? record.action.trim() : "";

  if (title && description) {
    return description.toLowerCase().startsWith(title.toLowerCase())
      ? description
      : `${title}: ${description}`;
  }

  if (title) {
    return title;
  }

  if (description) {
    return description;
  }

  return action || null;
}

function collectIssueCandidates(payload: Record<string, unknown>): unknown[] {
  const issues = Array.isArray(payload.issues) ? payload.issues : [];
  const criticalIssues = Array.isArray(payload.criticalIssues)
    ? payload.criticalIssues
    : [];
  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations
    : [];

  return [...issues, ...criticalIssues, ...recommendations];
}

function extractSecurityIssuesFromScan(scan: ScanHistoryItem): string[] {
  const scanData = parseScanPayload(scan.scanData);
  const securityData = asRecord(scanData.securityData);
  const securityRecord = asRecord(scanData.security);

  const normalizedIssues = new Set<string>();
  const candidates = [
    ...collectIssueCandidates(securityData),
    ...collectIssueCandidates(securityRecord),
  ];

  candidates.forEach((candidate) => {
    const message = normalizeSecurityIssueMessage(candidate);
    if (message) {
      normalizedIssues.add(message);
    }
  });

  return Array.from(normalizedIssues);
}

function buildSecurityIssueSummary(
  scans: ScanHistoryItem[],
): DashboardSecurityIssueSummary[] {
  const summaryByMessage = new Map<string, DashboardSecurityIssueSummary>();

  scans.forEach((scan) => {
    const scanIssues = extractSecurityIssuesFromScan(scan);

    scanIssues.forEach((issueMessage) => {
      const issueKey = issueMessage.trim().toLowerCase();
      if (!issueKey) return;

      const severity = inferSecurityIssueSeverity(issueMessage);
      const existing = summaryByMessage.get(issueKey);

      if (existing) {
        existing.occurrences += 1;
        if (
          scan.createdAt &&
          (!existing.lastDetectedAt ||
            new Date(scan.createdAt).getTime() >
              new Date(existing.lastDetectedAt).getTime())
        ) {
          existing.lastDetectedAt = scan.createdAt;
        }

        if (severityPriority(severity) < severityPriority(existing.severity)) {
          existing.severity = severity;
        }
        return;
      }

      summaryByMessage.set(issueKey, {
        id: `${issueKey}-${scan.id}`,
        message: issueMessage,
        severity,
        occurrences: 1,
        lastDetectedAt: scan.createdAt || null,
      });
    });
  });

  return Array.from(summaryByMessage.values()).sort((a, b) => {
    const severityDiff =
      severityPriority(a.severity) - severityPriority(b.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }

    if (a.occurrences !== b.occurrences) {
      return b.occurrences - a.occurrences;
    }

    const aTime = a.lastDetectedAt ? new Date(a.lastDetectedAt).getTime() : 0;
    const bTime = b.lastDetectedAt ? new Date(b.lastDetectedAt).getTime() : 0;
    if (aTime !== bTime) {
      return bTime - aTime;
    }

    return a.message.localeCompare(b.message);
  });
}

function getRolling30DayIntelligenceDomains(
  scans: IntelligenceScan[],
  maxCount: number = 30,
): IntelligenceScan[] {
  const cutoffTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const uniqueDomains = new Set<string>();
  const filteredScans: IntelligenceScan[] = [];

  for (const scan of scans) {
    const createdAtTimestamp = Date.parse(scan.createdAt);
    if (
      !Number.isFinite(createdAtTimestamp) ||
      createdAtTimestamp < cutoffTimestamp
    ) {
      continue;
    }

    const domainKey = scan.domain?.trim().toLowerCase();
    if (!domainKey || uniqueDomains.has(domainKey)) {
      continue;
    }

    uniqueDomains.add(domainKey);
    filteredScans.push(scan);

    if (filteredScans.length >= maxCount) {
      break;
    }
  }

  return filteredScans;
}

function toDashboardFavoriteRecords(
  favorites: Array<{ id: number; domain: string }>,
): DashboardFavoriteRecord[] {
  return favorites.map((favorite) => ({
    id: favorite.id,
    domain: favorite.domain,
  }));
}

function areDashboardFavoritesEqual(
  current: DashboardFavoriteRecord[],
  next: DashboardFavoriteRecord[],
): boolean {
  if (current.length !== next.length) {
    return false;
  }

  for (let index = 0; index < current.length; index += 1) {
    const currentFavorite = current[index];
    const nextFavorite = next[index];

    if (
      currentFavorite?.id !== nextFavorite?.id ||
      currentFavorite?.domain !== nextFavorite?.domain
    ) {
      return false;
    }
  }

  return true;
}

function buildScanHistoryQuery(filters: {
  dateRange: string;
  startDate?: string;
  endDate?: string;
  securityScores: string[];
  performanceScores: string[];
  technologies: string[];
  hostingProviders: string[];
  sslStatus: string[];
  sortBy: string;
  sortOrder: string;
}) {
  const params = new URLSearchParams();

  if (filters.dateRange === "custom" && filters.startDate && filters.endDate) {
    params.set("startDate", filters.startDate);
    params.set("endDate", filters.endDate);
  } else {
    params.set("days", filters.dateRange || "30");
  }

  if (filters.securityScores.length) {
    params.set("securityScore", filters.securityScores.join(","));
  }
  if (filters.performanceScores.length) {
    params.set("performanceScore", filters.performanceScores.join(","));
  }
  if (filters.technologies.length) {
    params.set("technology", filters.technologies.join(","));
  }
  if (filters.hostingProviders.length) {
    params.set("hostingProvider", filters.hostingProviders.join(","));
  }
  if (filters.sslStatus.length) {
    params.set("sslStatus", filters.sslStatus.join(","));
  }

  params.set("sortBy", filters.sortBy || "date");
  params.set("sortOrder", filters.sortOrder || "desc");

  return params.toString();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseScanPayload(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }

  return asRecord(value);
}

function processDomainStats(history: ScanHistoryItem[]): DomainStats[] {
  const domainMap = new Map<string, ScanHistoryItem[]>();

  // Group scans by domain
  history.forEach((scan) => {
    const existing = domainMap.get(scan.domain) || [];
    existing.push(scan);
    domainMap.set(scan.domain, existing);
  });

  // Calculate stats for each domain
  const stats: DomainStats[] = [];
  domainMap.forEach((scans, domain) => {
    const sortedScans = scans.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    let totalMobile = 0;
    let totalDesktop = 0;
    let totalSecurity = 0;
    let issueCount = 0;

    scans.forEach((scan) => {
      const data = parseScanPayload(scan.scanData);
      const performanceData = asRecord(data.performanceData);
      const mobile = asRecord(performanceData.mobile);
      const desktop = asRecord(performanceData.desktop);
      const securityData = asRecord(data.securityData);
      const securityIssues = Array.isArray(securityData.issues)
        ? securityData.issues
        : [];

      if (Object.keys(performanceData).length > 0) {
        totalMobile += Number(mobile.score || 0);
        totalDesktop += Number(desktop.score || 0);
      }

      if (Object.keys(securityData).length > 0) {
        totalSecurity += Number(securityData.score || 0);
        issueCount += securityIssues.length;
      }
    });

    const count = scans.length;
    const avgMobile = Math.round(totalMobile / count);
    const avgDesktop = Math.round(totalDesktop / count);
    const avgSecurity = Math.round(totalSecurity / count);

    // Calculate trend (compare last 2 scans)
    let trend: "up" | "down" | "stable" = "stable";
    if (scans.length >= 2) {
      const latest = parseScanPayload(sortedScans[0].scanData);
      const previous = parseScanPayload(sortedScans[1].scanData);
      const latestPerformance = asRecord(latest.performanceData);
      const previousPerformance = asRecord(previous.performanceData);
      const latestMobile = asRecord(latestPerformance.mobile);
      const previousMobile = asRecord(previousPerformance.mobile);

      const latestScore = Number(latestMobile.score || 0);
      const previousScore = Number(previousMobile.score || 0);

      if (latestScore > previousScore + 5) trend = "up";
      else if (latestScore < previousScore - 5) trend = "down";
    }

    stats.push({
      domain,
      totalScans: count,
      lastScan: sortedScans[0].createdAt,
      avgMobileScore: avgMobile,
      avgDesktopScore: avgDesktop,
      avgSecurityScore: avgSecurity,
      trend,
      issues: issueCount,
      verified: false, // Domain verification check pending
    });
  });

  return stats;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { filters } = useFilters();

  const [loading, setLoading] = useState(true);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [domainStats, setDomainStats] = useState<DomainStats[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [manualSelectedDomain, setManualSelectedDomain] = useState<
    string | null
  >(null);
  const [performanceHistory, setPerformanceHistory] = useState<
    PerformanceHistoryItem[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentIntelligenceScans, setRecentIntelligenceScans] = useState<
    IntelligenceScan[]
  >([]);
  const [favoriteRecords, setFavoriteRecords] = useState<
    DashboardFavoriteRecord[]
  >([]);
  const [showAllIntelligenceScansDialog, setShowAllIntelligenceScansDialog] =
    useState(false);
  const [showSecurityIssuesDialog, setShowSecurityIssuesDialog] =
    useState(false);
  const [allIntelligenceScans, setAllIntelligenceScans] = useState<
    IntelligenceScan[]
  >([]);
  const [allIntelligenceScansLoading, setAllIntelligenceScansLoading] =
    useState(false);
  const [allIntelligenceScansError, setAllIntelligenceScansError] = useState<
    string | null
  >(null);
  const [timeRange, setTimeRange] = useState("30");
  const [mainTab, setMainTab] = useState("clients");
  const [activeTab, setActiveTab] = useState("overview");
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);
  const [claimedDomains, setClaimedDomains] = useState<Record<string, boolean>>(
    {},
  );
  const [levelingStats, setLevelingStats] = useState<{
    level: number;
    progress: {
      currentLevelXp: number;
      nextLevelXp: number;
      progress: number;
    };
  } | null>(null);

  const { token: authToken, user } = useAuth();
  const { openTerminal } = useTerminalStore();
  const displayName = getUserDisplayName(user);
  const favoriteIdByDomain = useMemo(
    () =>
      new Map(
        favoriteRecords.map(
          (favorite) => [favorite.domain, favorite.id] as const,
        ),
      ),
    [favoriteRecords],
  );

  const fetchWithTimeout = useCallback(
    async (
      url: string,
      init?: RequestInit,
      timeoutMs: number = 20000,
    ): Promise<Response | null> => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } catch (error) {
        console.error(`[Dashboard Rescan] Request failed (${url}):`, error);
        return null;
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [],
  );

  const parseJsonSafe = useCallback(async <T,>(response: Response | null) => {
    if (!response?.ok || !("json" in response)) {
      return null as T | null;
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      console.error("[Dashboard Rescan] Failed to parse response JSON:", error);
      return null as T | null;
    }
  }, []);

  const createUnavailablePerformanceResult = useCallback((message: string) => {
    return {
      mobile: { score: 0, error: message },
      desktop: { score: 0, error: message },
      error: message,
    } as Record<string, unknown>;
  }, []);

  const getPerformanceUnavailableMessage = useCallback(
    (result: Record<string, unknown> | null): string | null => {
      if (!result) {
        return null;
      }

      const resultError =
        typeof result.error === "string" ? result.error : undefined;
      const mobileError =
        typeof asRecord(result.mobile).error === "string"
          ? String(asRecord(result.mobile).error)
          : undefined;
      const desktopError =
        typeof asRecord(result.desktop).error === "string"
          ? String(asRecord(result.desktop).error)
          : undefined;

      return resultError || (mobileError && desktopError ? mobileError : null);
    },
    [],
  );

  const runAsyncPerformanceScan = useCallback(
    async (
      domain: string,
      headers: HeadersInit,
    ): Promise<Record<string, unknown>> => {
      const startResponse = await fetchWithTimeout(
        "/api/scan/performance",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ domain, async: true }),
        },
        20000,
      );

      if (!startResponse) {
        return createUnavailablePerformanceResult(
          "Performance scan failed to start",
        );
      }

      if (!startResponse.ok) {
        const payload = await parseJsonSafe<PerformanceScanJob>(startResponse);
        return createUnavailablePerformanceResult(
          payload?.message ||
            payload?.error ||
            `Performance scan failed to start (${startResponse.status})`,
        );
      }

      const startedJob = await parseJsonSafe<PerformanceScanJob>(startResponse);
      if (!startedJob?.jobId) {
        return createUnavailablePerformanceResult(
          "Performance scan returned an invalid job response",
        );
      }

      if (startedJob.status === "completed" && startedJob.result) {
        return startedJob.result;
      }

      if (startedJob.status === "failed") {
        return createUnavailablePerformanceResult(
          startedJob.error || "Performance scan failed",
        );
      }

      const pollDeadline = Date.now() + 180000;
      const pollInterval = Math.max(1000, startedJob.pollAfterMs ?? 2000);
      const retryablePollStatuses = new Set([429, 502, 503, 504, 524]);

      while (Date.now() < pollDeadline) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, pollInterval),
        );

        const pollResponse = await fetchWithTimeout(
          `/api/scan/performance?jobId=${encodeURIComponent(startedJob.jobId)}`,
          { headers },
          20000,
        );

        if (!pollResponse) {
          continue;
        }

        if (!pollResponse.ok && pollResponse.status !== 202) {
          if (retryablePollStatuses.has(pollResponse.status)) {
            console.warn(
              `[Dashboard Rescan] Transient performance polling status ${pollResponse.status}, retrying`,
            );
            continue;
          }
          const payload = await parseJsonSafe<PerformanceScanJob>(pollResponse);
          return createUnavailablePerformanceResult(
            payload?.message ||
              payload?.error ||
              `Performance scan polling failed (${pollResponse.status})`,
          );
        }

        const polledJob = await parseJsonSafe<PerformanceScanJob>(pollResponse);
        if (!polledJob) {
          continue;
        }

        if (polledJob.status === "completed" && polledJob.result) {
          return polledJob.result;
        }

        if (polledJob.status === "failed") {
          return createUnavailablePerformanceResult(
            polledJob.error || "Performance scan failed",
          );
        }
      }

      return createUnavailablePerformanceResult(
        "Performance scan timed out while waiting for job completion",
      );
    },
    [createUnavailablePerformanceResult, fetchWithTimeout, parseJsonSafe],
  );

  const loadRecentIntelligenceScans = useCallback(async () => {
    const token = authToken || localStorage.getItem("auth_token");
    if (!token) {
      setRecentIntelligenceScans([]);
      return;
    }

    try {
      const intelligenceResponse = await fetch(
        "/api/intelligence/scans?limit=100",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (intelligenceResponse.ok) {
        const intelligenceData = await intelligenceResponse.json();
        const scans = Array.isArray(intelligenceData.scans)
          ? intelligenceData.scans
          : [];
        setRecentIntelligenceScans(getRolling30DayIntelligenceDomains(scans));
      }
    } catch (error) {
      console.error("Error loading intelligence scans:", error);
    }
  }, [authToken]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = authToken || localStorage.getItem("auth_token");

      if (!token) {
        console.warn("⚠️ Dashboard: No token found");
        // Don't redirect - ProtectedRoute handles this
        return;
      }

      console.log("✅ Dashboard: Loading data with token");

      // Load scan history
      console.log("📡 Dashboard: Fetching scan history...");
      const historyQuery = buildScanHistoryQuery(filters);
      const historyResponse = await fetch(`/api/scan-history?${historyQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(
        "📡 Dashboard: Scan history response:",
        historyResponse.status,
      );

      if (historyResponse.ok) {
        const response = await historyResponse.json();
        const history = response.data || []; // Extract data array from response
        setScanHistory(history);

        console.log(
          "✅ Dashboard: Scan history loaded:",
          history.length,
          "scans",
        );

        // Process domain statistics
        const stats = processDomainStats(history);
        setDomainStats(stats);

        setSelectedDomain((current) => {
          if (current && stats.some((item) => item.domain === current)) {
            return current;
          }
          return stats[0]?.domain ?? null;
        });
      }

      // Load recent intelligence scans
      await loadRecentIntelligenceScans();

      // Load leveling stats
      try {
        const levelingResponse = await fetch("/api/leveling/stats", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (levelingResponse.ok) {
          const levelingData = await levelingResponse.json();
          console.log("Leveling stats loaded:", levelingData);
          setLevelingStats(levelingData);
        } else {
          console.error(
            "Failed to load leveling stats:",
            levelingResponse.status,
          );
        }
      } catch (error) {
        console.error("Error loading leveling stats:", error);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [authToken, filters, loadRecentIntelligenceScans]);

  const loadClaimedDomains = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch("/api/domains/claimed", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const claimedMap: Record<string, boolean> = {};
        const domains = Array.isArray(data.domains)
          ? (data.domains as Array<{ domain: string; isVerified?: boolean }>)
          : [];
        domains.forEach((d) => {
          if (d.isVerified) {
            claimedMap[d.domain] = true;
          }
        });
        setClaimedDomains(claimedMap);
      }
    } catch (error) {
      console.error("Failed to load claimed domains:", error);
    }
  }, []);

  const loadFavoriteDomains = useCallback(async () => {
    const token = authToken || localStorage.getItem("auth_token");
    if (!token) {
      setFavoriteRecords([]);
      return;
    }

    try {
      const favorites =
        await apiClient.get<Array<{ id: number; domain: string }>>(
          "/favorites",
        );
      const nextFavoriteRecords = Array.isArray(favorites)
        ? toDashboardFavoriteRecords(favorites)
        : [];

      setFavoriteRecords((current) =>
        areDashboardFavoritesEqual(current, nextFavoriteRecords)
          ? current
          : nextFavoriteRecords,
      );
    } catch (error) {
      console.error("Failed to load favorites:", error);
      setFavoriteRecords([]);
    }
  }, [authToken]);

  const handleFavoritesChange = useCallback(
    (favorites: FavoriteDomainRecord[]) => {
      const nextFavoriteRecords = toDashboardFavoriteRecords(favorites);

      setFavoriteRecords((current) =>
        areDashboardFavoritesEqual(current, nextFavoriteRecords)
          ? current
          : nextFavoriteRecords,
      );
    },
    [],
  );

  const handleToggleFavorite = async (
    domain: string,
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event?.stopPropagation();

    const favoriteId = favoriteIdByDomain.get(domain);

    try {
      if (favoriteId) {
        await apiClient.delete(`/favorites/${favoriteId}`);
        setFavoriteRecords((current) =>
          current.filter((favorite) => favorite.domain !== domain),
        );
      } else {
        await apiClient.post("/favorites", { domain });
        await loadFavoriteDomains();
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleManualDomainSelection = useCallback((domain: string | null) => {
    setSelectedDomain(domain);
    setManualSelectedDomain(domain);
  }, []);

  const handleDDCClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Direct navigation with state to enable smart back button
    navigate("/ddc-calculator", { state: { from: "/dashboard" } });
  };

  const loadAllIntelligenceScans = async () => {
    const token = authToken || localStorage.getItem("auth_token");
    if (!token) {
      setAllIntelligenceScans([]);
      setAllIntelligenceScansError(
        "Authentication required to view scan history.",
      );
      return;
    }

    try {
      setAllIntelligenceScansLoading(true);
      setAllIntelligenceScansError(null);

      const response = await fetch("/api/intelligence/scans?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch intelligence scans (${response.status})`,
        );
      }

      const data = await response.json();
      const scans = Array.isArray(data.scans) ? data.scans : [];
      setAllIntelligenceScans(getRolling30DayIntelligenceDomains(scans));
    } catch (error) {
      console.error("Error loading all intelligence scans:", error);
      setAllIntelligenceScans([]);
      setAllIntelligenceScansError("Unable to load recent intelligence scans.");
    } finally {
      setAllIntelligenceScansLoading(false);
    }
  };

  const handleOpenAllIntelligenceScans = () => {
    setShowAllIntelligenceScansDialog(true);
    void loadAllIntelligenceScans();
  };

  const loadPerformanceHistory = useCallback(
    async (domain: string) => {
      try {
        const response = await fetch(
          `/api/scan/performance/history?domain=${encodeURIComponent(domain)}&limit=${encodeURIComponent(timeRange)}`,
        );
        if (response.ok) {
          const data = await response.json();
          const historyRows = Array.isArray(data?.history) ? data.history : [];

          const normalizedHistory: PerformanceHistoryItem[] = historyRows.map(
            (row: Record<string, unknown>) => ({
              scanDate: String(row.scanDate ?? row.date ?? ""),
              mobileScore: Number(row.mobileScore ?? 0),
              desktopScore: Number(row.desktopScore ?? 0),
              mobileLcp: Number(row.mobileLcp ?? 0),
              desktopLcp: Number(row.desktopLcp ?? 0),
            }),
          );

          setPerformanceHistory(normalizedHistory);
        } else {
          setPerformanceHistory([]);
        }
      } catch (error) {
        console.error("Error loading performance history:", error);
        setPerformanceHistory([]);
      }
    },
    [timeRange],
  );

  const handleDashboardRescan = useCallback(
    async (domainInput: string | null) => {
      if (isRescanning) {
        return;
      }

      const cleanDomain = normalizeScanDomainInput(domainInput || "");
      if (!cleanDomain) {
        setRescanError("Select a valid domain before rescanning.");
        return;
      }

      setIsRescanning(true);
      setRescanError(null);

      const scanContextHeader = { "X-Scan-Context": "dashboard-rescan" };
      const scanJsonHeaders = {
        "Content-Type": "application/json",
        ...scanContextHeader,
      };
      const token =
        authToken ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("authToken");

      try {
        let isReachable = true;
        const reachabilityResponse = await fetchWithTimeout(
          `/api/scan/reachability?domain=${encodeURIComponent(cleanDomain)}`,
          { headers: scanContextHeader },
          15000,
        );

        if (reachabilityResponse?.ok) {
          const reachabilityPayload = await parseJsonSafe<{
            reachable?: boolean;
          }>(reachabilityResponse);
          if (reachabilityPayload?.reachable === false) {
            isReachable = false;
          }
        }

        const performancePromise = isReachable
          ? runAsyncPerformanceScan(cleanDomain, scanJsonHeaders)
          : Promise.resolve(
              createUnavailablePerformanceResult(
                "Site is offline. Performance checks require a reachable web page.",
              ),
            );

        const [
          technologyResponse,
          dnsResponse,
          whoisResponse,
          emailResponse,
          sslResponse,
          securityResponse,
          geolocationResponse,
          malwareResponse,
        ] = await Promise.all([
          isReachable
            ? fetchWithTimeout(
                "/api/scan/technology",
                {
                  method: "POST",
                  headers: scanJsonHeaders,
                  body: JSON.stringify({ domain: cleanDomain }),
                },
                30000,
              )
            : Promise.resolve(null),
          fetchWithTimeout(
            "/api/scan/dns",
            {
              method: "POST",
              headers: scanJsonHeaders,
              body: JSON.stringify({ domain: cleanDomain }),
            },
            45000,
          ),
          fetchWithTimeout(
            "/api/scan/whois",
            {
              method: "POST",
              headers: scanJsonHeaders,
              body: JSON.stringify({ domain: cleanDomain }),
            },
            45000,
          ),
          isReachable
            ? fetchWithTimeout(
                "/api/scan/email",
                {
                  method: "POST",
                  headers: scanJsonHeaders,
                  body: JSON.stringify({ domain: cleanDomain }),
                },
                35000,
              )
            : Promise.resolve(null),
          isReachable
            ? fetchWithTimeout(
                "/api/scan/ssl",
                {
                  method: "POST",
                  headers: scanJsonHeaders,
                  body: JSON.stringify({ domain: cleanDomain }),
                },
                35000,
              )
            : Promise.resolve(null),
          isReachable
            ? fetchWithTimeout(
                "/api/scan/security",
                {
                  method: "POST",
                  headers: scanJsonHeaders,
                  body: JSON.stringify({ domain: cleanDomain }),
                },
                45000,
              )
            : Promise.resolve(null),
          isReachable
            ? fetchWithTimeout(
                "/api/scan/geolocation",
                {
                  method: "POST",
                  headers: scanJsonHeaders,
                  body: JSON.stringify({ domain: cleanDomain }),
                },
                30000,
              )
            : Promise.resolve(null),
          isReachable
            ? fetchWithTimeout(
                "/api/scan/malware",
                {
                  method: "POST",
                  headers: scanJsonHeaders,
                  body: JSON.stringify({ domain: cleanDomain }),
                },
                30000,
              )
            : Promise.resolve(null),
        ]);

        const [
          technologyResult,
          dnsResult,
          whoisResult,
          emailResult,
          sslResult,
          securityResult,
          geolocationResult,
          malwareResult,
        ] = await Promise.all([
          parseJsonSafe<Record<string, unknown>>(technologyResponse),
          parseJsonSafe<Record<string, unknown>>(dnsResponse),
          parseJsonSafe<Record<string, unknown>>(whoisResponse),
          parseJsonSafe<Record<string, unknown>>(emailResponse),
          parseJsonSafe<Record<string, unknown>>(sslResponse),
          parseJsonSafe<Record<string, unknown>>(securityResponse),
          parseJsonSafe<Record<string, unknown>>(geolocationResponse),
          parseJsonSafe<Record<string, unknown>>(malwareResponse),
        ]);

        const performanceResult = await performancePromise;

        let providerResult: Record<string, unknown> | null = null;
        if (dnsResult && geolocationResult) {
          const dnsRecords = asRecord(dnsResult.records);
          const providerResponse = await fetchWithTimeout(
            "/api/scan/provider",
            {
              method: "POST",
              headers: scanJsonHeaders,
              body: JSON.stringify({
                domain: cleanDomain,
                nameservers: Array.isArray(dnsRecords.NS) ? dnsRecords.NS : [],
                isp: geolocationResult.isp,
                organization: geolocationResult.organization,
                isWebsiteBuilder: Boolean(
                  asRecord(technologyResult?.server).isWebsiteBuilder,
                ),
                builderType:
                  asRecord(technologyResult?.server).builderType || null,
              }),
            },
            30000,
          );
          providerResult =
            await parseJsonSafe<Record<string, unknown>>(providerResponse);
        }

        const sslRecord = asRecord(sslResult);
        const securityRecord = asRecord(securityResult);
        const performanceRecord = asRecord(performanceResult);
        const performanceMobile = asRecord(performanceRecord.mobile);
        const performanceDesktop = asRecord(performanceRecord.desktop);
        const technologyRecord = asRecord(technologyResult);
        const technologyWordpress = asRecord(technologyRecord.wordpress);
        const technologyServer = asRecord(technologyRecord.server);
        const technologyHosting = asRecord(technologyRecord.hosting);
        const whoisRecord = asRecord(whoisResult);
        const emailRecord = asRecord(emailResult);
        const emailSpf = asRecord(emailRecord.spf);
        const emailDkim = asRecord(emailRecord.dkim);
        const emailDmarc = asRecord(emailRecord.dmarc);
        const malwareRecord = asRecord(malwareResult);

        const sslValid =
          typeof sslRecord.valid === "boolean" ? sslRecord.valid : null;
        const sslExpired =
          typeof sslRecord.expired === "boolean" ? sslRecord.expired : null;
        const sslExpiryDate =
          typeof sslRecord.validTo === "string" ? sslRecord.validTo : null;
        const sslIssuer =
          typeof sslRecord.issuer === "string" ? sslRecord.issuer : null;

        const performanceUnavailableMessage =
          getPerformanceUnavailableMessage(performanceRecord);
        const hasUsablePerformanceData = !performanceUnavailableMessage;

        if (token) {
          const compactScanSnapshot = {
            domain: cleanDomain,
            sslValid,
            sslExpiryDate,
            ssl: sslResult
              ? {
                  hasSSL:
                    typeof sslRecord.hasSSL === "boolean"
                      ? sslRecord.hasSSL
                      : null,
                  valid: sslValid,
                  expired: sslExpired,
                  validTo: sslExpiryDate,
                  issuer: sslIssuer,
                }
              : null,
            performanceData: hasUsablePerformanceData
              ? {
                  mobile: { score: Number(performanceMobile.score || 0) },
                  desktop: { score: Number(performanceDesktop.score || 0) },
                }
              : null,
            securityData: securityResult
              ? {
                  score: Number(securityRecord.score || 0),
                  grade:
                    typeof securityRecord.grade === "string"
                      ? securityRecord.grade
                      : null,
                  issues: Array.isArray(securityRecord.issues)
                    ? securityRecord.issues.slice(0, 12)
                    : Array.isArray(securityRecord.recommendations)
                      ? securityRecord.recommendations.slice(0, 12)
                      : [],
                }
              : null,
            technologyData: technologyResult
              ? {
                  wordpress: {
                    detected: Boolean(technologyWordpress.detected),
                    version:
                      typeof technologyWordpress.version === "string"
                        ? technologyWordpress.version
                        : null,
                  },
                  server: {
                    type:
                      typeof technologyServer.type === "string"
                        ? technologyServer.type
                        : null,
                    isWebsiteBuilder: Boolean(
                      technologyServer.isWebsiteBuilder,
                    ),
                    builderType:
                      typeof technologyServer.builderType === "string"
                        ? technologyServer.builderType
                        : null,
                  },
                  hosting: {
                    provider:
                      typeof technologyHosting.provider === "string"
                        ? technologyHosting.provider
                        : null,
                  },
                }
              : null,
            whoisData: whoisResult
              ? {
                  registrar:
                    typeof whoisRecord.registrar === "string"
                      ? whoisRecord.registrar
                      : null,
                  expiryDate:
                    typeof whoisRecord.expiryDate === "string"
                      ? whoisRecord.expiryDate
                      : null,
                }
              : null,
            emailData: emailResult
              ? {
                  spf: { configured: Boolean(emailSpf.configured) },
                  dkim: { configured: Boolean(emailDkim.configured) },
                  dmarc: { configured: Boolean(emailDmarc.configured) },
                }
              : null,
            providerData: providerResult
              ? {
                  provider:
                    typeof providerResult.provider === "string"
                      ? providerResult.provider
                      : null,
                }
              : null,
            malwareData: malwareResult
              ? {
                  isMalware: Boolean(malwareRecord.isMalware),
                  isPhishing: Boolean(malwareRecord.isPhishing),
                  isBlacklisted: Boolean(malwareRecord.isBlacklisted),
                }
              : null,
          };

          await fetch("/api/scan-history", {
            method: "POST",
            headers: {
              ...scanJsonHeaders,
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              domain: cleanDomain,
              scanType: "full",
              scanData: compactScanSnapshot,
            }),
          });
        }

        if (hasUsablePerformanceData) {
          await fetch("/api/scan/performance/history", {
            method: "POST",
            headers: scanJsonHeaders,
            body: JSON.stringify({
              domain: cleanDomain,
              mobile: performanceMobile,
              desktop: performanceDesktop,
            }),
          });
        }

        const scansCompleted: string[] = [];
        if (securityResult) scansCompleted.push("security");
        if (hasUsablePerformanceData) scansCompleted.push("performance");
        if (dnsResult) scansCompleted.push("dns");
        if (sslResult) scansCompleted.push("ssl");
        if (emailResult) scansCompleted.push("email");
        if (malwareResult) scansCompleted.push("malware");
        if (whoisResult) scansCompleted.push("whois");
        if (technologyResult) scansCompleted.push("technology");
        if (geolocationResult) scansCompleted.push("geolocation");
        if (providerResult) scansCompleted.push("provider");

        await fetch("/api/scan/complete", {
          method: "POST",
          headers: {
            ...scanJsonHeaders,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            domain: cleanDomain,
            scansCompleted,
          }),
        });

        await loadDashboardData();
        await loadPerformanceHistory(cleanDomain);
        setSelectedDomain(cleanDomain);
      } catch (error) {
        console.error("[Dashboard Rescan] Failed:", error);
        setRescanError(
          error instanceof Error ? error.message : "Failed to rescan domain.",
        );
      } finally {
        setIsRescanning(false);
      }
    },
    [
      authToken,
      createUnavailablePerformanceResult,
      fetchWithTimeout,
      getPerformanceUnavailableMessage,
      isRescanning,
      loadDashboardData,
      loadPerformanceHistory,
      parseJsonSafe,
      runAsyncPerformanceScan,
    ],
  );

  useEffect(() => {
    void loadDashboardData();
    void loadClaimedDomains();
    void loadFavoriteDomains();
  }, [loadDashboardData, loadClaimedDomains, loadFavoriteDomains]);

  useEffect(() => {
    if (selectedDomain) {
      void loadPerformanceHistory(selectedDomain);
    }
  }, [selectedDomain, loadPerformanceHistory]);

  useEffect(() => {
    setShowSecurityIssuesDialog(false);
  }, [selectedDomain]);

  const filteredRecentIntelligenceScans = recentIntelligenceScans
    .filter((scan) => {
      if (!searchQuery) {
        return true;
      }

      const query = searchQuery.toLowerCase();
      return (
        scan.domain.toLowerCase().includes(query) ||
        scan.edgeProvider?.toLowerCase().includes(query) ||
        scan.originHost?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const direction = filters.sortOrder === "asc" ? 1 : -1;

      switch (filters.sortBy) {
        case "domain":
          return a.domain.localeCompare(b.domain) * direction;
        case "date":
        default:
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            direction
          );
      }
    });

  const selectedDomainData = domainStats.find(
    (d) => d.domain === selectedDomain,
  );
  const selectedDomainScans = scanHistory.filter(
    (s) => s.domain === selectedDomain,
  );
  const selectedDomainSecurityIssues = useMemo(() => {
    return buildSecurityIssueSummary(selectedDomainScans);
  }, [selectedDomainScans]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getIssueBadgeLabel = (severity: DashboardSecurityIssueSeverity) => {
    if (severity === "critical") return "Critical";
    if (severity === "warning") return "Warning";
    return "Info";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title={PAGE_META.dashboard.title}
        description={PAGE_META.dashboard.description}
        keywords={PAGE_META.dashboard.keywords}
      />

      <div className="pro-dashboard-theme min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="relative bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left: User Profile + Title */}
              <div className="flex items-center gap-4">
                {/* User Avatar with Tier Border */}
                {user && (
                  <div className="relative">
                    <div
                      className="relative w-16 h-16 rounded-full overflow-hidden"
                      style={{
                        border: `3px solid ${getUserTier(user.level || 1).borderColor}`,
                        boxShadow: getTierStyles(
                          getUserTier(user.level || 1).name,
                        ).boxShadow,
                      }}
                    >
                      <img
                        src={
                          user.avatarImagePath ||
                          "/avatars/default/shutterstock_2518667991_avatar_01.png"
                        }
                        alt="User Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Level Badge */}
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center border-2 border-background shadow-lg">
                      {user.level || 1}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Pro Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Welcome back, {displayName}
                  </p>
                  {/* XP Bar */}
                  <div className="flex items-center gap-2 mt-2">
                    {levelingStats && levelingStats.progress ? (
                      <>
                        <div className="w-[200px]">
                          <Progress
                            value={levelingStats.progress.progress}
                            className="h-2.5 bg-muted"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {levelingStats.progress.currentLevelXp.toLocaleString()}{" "}
                          /{" "}
                          {levelingStats.progress.nextLevelXp.toLocaleString()}{" "}
                          XP
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-[200px]">
                          <Progress value={0} className="h-2.5 bg-muted" />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                          0 / 100 XP
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Logo + Action Buttons */}
              <div className="flex items-center gap-4">
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {user?.isAdmin ? (
                    <Button
                      onClick={() => navigate("/admin")}
                      variant="outline"
                      size="sm"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => setMainTab("intelligence")}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Scan
                  </Button>
                  <Button
                    onClick={loadDashboardData}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Logo with hover animation - EXACT MATCH to other pages */}
                <div
                  className="relative group cursor-pointer"
                  onClick={() => openTerminal()}
                  title="Click to open HT Terminal 🔧"
                >
                  {/* Spinning gradient glow background */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-spin-slow" />

                  {/* Pulsing ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 dark:border-purple-500/50 group-hover:border-purple-500/60 animate-pulse" />

                  {/* Logo container */}
                  <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-purple-300/20 dark:border-purple-600/30 group-hover:border-purple-400/40 dark:group-hover:border-purple-500/50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 shadow-lg group-hover:shadow-2xl group-hover:shadow-purple-500/50">
                    <img
                      src="/assets/placeholder.png"
                      alt="HostingInfo Logo"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-125"
                    />

                    {/* Shine effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Quick Action Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Domain Calculator CTA */}
            <Card className="relative overflow-hidden bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="relative p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                      <Calculator className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        Domain Calculator
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Calculate domain savings - 552 extensions
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDDCClick}
                    className="group relative flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold overflow-hidden transition-all w-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_100%] animate-gradient" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </div>
                    <Sparkles className="h-5 w-5 relative text-white" />
                    <span className="relative text-white">Open Calculator</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Web Archives CTA */}
            <Card className="relative overflow-hidden bg-white/5 dark:bg-white/5 backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="relative p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl shadow-lg">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        Web Archives
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Browse historical snapshots of websites
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/archives")}
                    className="group relative flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold overflow-hidden transition-all w-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 bg-[length:200%_100%] animate-gradient" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </div>
                    <Clock className="h-5 w-5 relative text-white" />
                    <span className="relative text-white">Browse Archives</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs
            value={mainTab}
            onValueChange={setMainTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3 max-w-3xl">
              <TabsTrigger
                value="clients"
                className="group relative isolate w-full justify-center overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none transition-transform duration-0 group-hover:duration-700 group-hover:ease-in-out group-hover:translate-x-full" />
                <span className="relative z-10 flex w-full items-center justify-center">
                  <Globe className="h-4 w-4 mr-2" />
                  Domains
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="group relative isolate w-full justify-center overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none transition-transform duration-0 group-hover:duration-700 group-hover:ease-in-out group-hover:translate-x-full" />
                <span className="relative z-10 flex w-full items-center justify-center">
                  <Star className="h-4 w-4 mr-2" />
                  Favorites
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="intelligence"
                className="group relative isolate w-full justify-center overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none transition-transform duration-0 group-hover:duration-700 group-hover:ease-in-out group-hover:translate-x-full" />
                <span className="relative z-10 flex w-full items-center justify-center">
                  <Layers className="h-4 w-4 mr-2" />
                  Intelligence
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clients" className="space-y-6">
              {/* Dashboard Filters */}
              <DashboardFilters />

              {/* Overview Stats */}
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Domains
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {domainStats.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {scanHistory.length} total scans
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg Performance
                    </CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(
                        domainStats.reduce(
                          (acc, d) => acc + d.avgMobileScore,
                          0,
                        ) / domainStats.length || 0,
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mobile score average
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Security Issues
                    </CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {domainStats.reduce((acc, d) => acc + d.issues, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all domains
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Monitoring
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {
                        domainStats.filter((d) => {
                          const daysSinceLastScan =
                            (Date.now() - new Date(d.lastScan).getTime()) /
                            (1000 * 60 * 60 * 24);
                          return daysSinceLastScan <= 7;
                        }).length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scanned in last 7 days
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Leveling System XP Bar */}
              <LevelingXpBar />

              {/* Main Content */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Intelligence Domain List */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle>Recent Scans</CardTitle>
                        <CardDescription>
                          Recent intelligence scans
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenAllIntelligenceScans}
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        View All
                      </Button>
                    </div>

                    {/* Search */}
                    <div className="space-y-2 pt-4">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search recent intelligence scans..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredRecentIntelligenceScans.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No recent intelligence scans found</p>
                        <Button
                          onClick={() => navigate("/intelligence")}
                          variant="outline"
                          size="sm"
                          className="mt-4"
                        >
                          Run Intelligence Scan
                        </Button>
                      </div>
                    ) : (
                      filteredRecentIntelligenceScans.map((scan) => (
                        <div
                          key={scan.id}
                          onClick={() =>
                            handleManualDomainSelection(scan.domain)
                          }
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedDomain === scan.domain
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate">
                                  {scan.domain}
                                </h3>
                                {claimedDomains[scan.domain] && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-500 hover:bg-green-600 text-xs"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Last intelligence scan:{" "}
                                {new Date(scan.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(event) =>
                                void handleToggleFavorite(scan.domain, event)
                              }
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  favoriteIdByDomain.has(scan.domain)
                                    ? "fill-yellow-500 text-yellow-500"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </Button>
                          </div>

                          <div className="space-y-2 mt-2">
                            <div className="flex flex-wrap gap-2">
                              {scan.confidenceScore !== null && (
                                <Badge variant="outline" className="text-xs">
                                  {scan.confidenceScore}% confidence
                                </Badge>
                              )}
                              {scan.techCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {scan.techCount} technologies
                                </Badge>
                              )}
                              {scan.edgeProvider && (
                                <Badge variant="secondary" className="text-xs">
                                  {scan.edgeProvider}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Client Details */}
                <Card className="lg:col-span-2">
                  {selectedDomain && selectedDomainData ? (
                    <>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              {selectedDomain}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  window.open(
                                    `https://${selectedDomain}`,
                                    "_blank",
                                  )
                                }
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </CardTitle>
                            <CardDescription>
                              {selectedDomainData.totalScans} scans • Last
                              scanned{" "}
                              {new Date(
                                selectedDomainData.lastScan,
                              ).toLocaleString()}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) =>
                                void handleToggleFavorite(selectedDomain, event)
                              }
                            >
                              <Star
                                className={`h-4 w-4 mr-2 ${
                                  favoriteIdByDomain.has(selectedDomain)
                                    ? "fill-yellow-500 text-yellow-500"
                                    : ""
                                }`}
                              />
                              {favoriteIdByDomain.has(selectedDomain)
                                ? "Remove Favorite"
                                : "Add Favorite"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isRescanning}
                              onClick={() =>
                                void handleDashboardRescan(selectedDomain)
                              }
                            >
                              {isRescanning ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Rescanning...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Rescan
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        {rescanError && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{rescanError}</AlertDescription>
                          </Alert>
                        )}

                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                          <TabsList className="!grid h-12 w-full grid-cols-3 p-1">
                            <TabsTrigger
                              value="overview"
                              className="h-full w-full px-0 text-center leading-none"
                            >
                              Overview
                            </TabsTrigger>
                            <TabsTrigger
                              value="performance"
                              className="h-full w-full px-0 text-center leading-none"
                            >
                              Performance
                            </TabsTrigger>
                            <TabsTrigger
                              value="history"
                              className="h-full w-full px-0 text-center leading-none"
                            >
                              History
                            </TabsTrigger>
                          </TabsList>

                          {/* Overview Tab */}
                          <TabsContent
                            value="overview"
                            className="space-y-4 bg-transparent"
                          >
                            <div className="grid gap-4 md:grid-cols-3">
                              <Card className="shadow-none">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium">
                                    Mobile Score
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div
                                    className={`text-3xl font-bold ${getScoreColor(selectedDomainData.avgMobileScore)}`}
                                  >
                                    {selectedDomainData.avgMobileScore}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Average across{" "}
                                    {selectedDomainData.totalScans} scans
                                  </p>
                                </CardContent>
                              </Card>

                              <Card className="shadow-none">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium">
                                    Desktop Score
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div
                                    className={`text-3xl font-bold ${getScoreColor(selectedDomainData.avgDesktopScore)}`}
                                  >
                                    {selectedDomainData.avgDesktopScore}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Average across{" "}
                                    {selectedDomainData.totalScans} scans
                                  </p>
                                </CardContent>
                              </Card>

                              <Card
                                className="shadow-none cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20 focus-within:ring-2 focus-within:ring-primary/40"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  setShowSecurityIssuesDialog(true)
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    setShowSecurityIssuesDialog(true);
                                  }
                                }}
                                aria-label={`View security issues for ${selectedDomain}`}
                              >
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium">
                                    Security Score
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div
                                    className={`text-3xl font-bold ${getScoreColor(selectedDomainData.avgSecurityScore)}`}
                                  >
                                    {selectedDomainData.avgSecurityScore}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {selectedDomainData.issues} issues detected
                                  </p>
                                  <p className="text-xs text-muted-foreground/80 mt-1">
                                    Click to view details
                                  </p>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Quick Actions */}
                            <Card className="shadow-none">
                              <CardHeader>
                                <CardTitle className="text-sm">
                                  Quick Actions
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="grid gap-2 md:grid-cols-2">
                                <Button
                                  variant="outline"
                                  className="justify-start"
                                  disabled={isRescanning}
                                  onClick={() =>
                                    void handleDashboardRescan(selectedDomain)
                                  }
                                >
                                  {isRescanning ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Rescanning...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Run New Scan
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  className="justify-start"
                                  onClick={() => setActiveTab("performance")}
                                >
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  View Performance
                                </Button>
                                <Button
                                  variant="outline"
                                  className="justify-start"
                                  onClick={() =>
                                    window.open(
                                      `https://${selectedDomain}`,
                                      "_blank",
                                    )
                                  }
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Visit Website
                                </Button>
                                <Button
                                  variant="outline"
                                  className="justify-start"
                                  onClick={() => setActiveTab("history")}
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  View History
                                </Button>
                              </CardContent>
                            </Card>
                          </TabsContent>

                          {/* Performance Tab */}
                          <TabsContent
                            value="performance"
                            className="space-y-4 bg-transparent"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold">
                                Performance Trends
                              </h3>
                              <Select
                                value={timeRange}
                                onValueChange={setTimeRange}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="7">7 days</SelectItem>
                                  <SelectItem value="30">30 days</SelectItem>
                                  <SelectItem value="90">90 days</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {performanceHistory.length > 0 ? (
                              <>
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">
                                      Performance Scores
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <ResponsiveContainer
                                      width="100%"
                                      height={250}
                                    >
                                      <LineChart data={performanceHistory}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="scanDate"
                                          tickFormatter={(date) =>
                                            new Date(date).toLocaleDateString()
                                          }
                                        />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip
                                          labelFormatter={(date) =>
                                            new Date(date).toLocaleString()
                                          }
                                        />
                                        <Legend />
                                        <Line
                                          type="monotone"
                                          dataKey="mobileScore"
                                          stroke="#8b5cf6"
                                          name="Mobile"
                                          strokeWidth={2}
                                        />
                                        <Line
                                          type="monotone"
                                          dataKey="desktopScore"
                                          stroke="#06b6d4"
                                          name="Desktop"
                                          strokeWidth={2}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">
                                      Largest Contentful Paint (LCP)
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <ResponsiveContainer
                                      width="100%"
                                      height={250}
                                    >
                                      <AreaChart data={performanceHistory}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="scanDate"
                                          tickFormatter={(date) =>
                                            new Date(date).toLocaleDateString()
                                          }
                                        />
                                        <YAxis />
                                        <Tooltip
                                          labelFormatter={(date) =>
                                            new Date(date).toLocaleString()
                                          }
                                          formatter={(
                                            value: number | undefined,
                                          ) =>
                                            value
                                              ? `${value.toFixed(2)}s`
                                              : "N/A"
                                          }
                                        />
                                        <Legend />
                                        <Area
                                          type="monotone"
                                          dataKey="mobileLcp"
                                          stroke="#8b5cf6"
                                          fill="#8b5cf6"
                                          fillOpacity={0.3}
                                          name="Mobile LCP"
                                        />
                                        <Area
                                          type="monotone"
                                          dataKey="desktopLcp"
                                          stroke="#06b6d4"
                                          fill="#06b6d4"
                                          fillOpacity={0.3}
                                          name="Desktop LCP"
                                        />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </CardContent>
                                </Card>
                              </>
                            ) : (
                              <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  No performance history available. Run multiple
                                  scans over time to see trends.
                                </AlertDescription>
                              </Alert>
                            )}
                          </TabsContent>

                          {/* History Tab */}
                          <TabsContent
                            value="history"
                            className="space-y-4 bg-transparent"
                          >
                            <div className="space-y-2">
                              {selectedDomainScans.map((scan) => {
                                const scanDataRecord = parseScanPayload(
                                  scan.scanData,
                                );
                                const performanceData = asRecord(
                                  scanDataRecord.performanceData,
                                );
                                const mobileData = asRecord(
                                  performanceData.mobile,
                                );
                                const desktopData = asRecord(
                                  performanceData.desktop,
                                );
                                const securityData = asRecord(
                                  scanDataRecord.securityData,
                                );
                                const mobileScore = Number(
                                  mobileData.score || 0,
                                );
                                const desktopScore = Number(
                                  desktopData.score || 0,
                                );
                                const securityScore = Number(
                                  securityData.score || 0,
                                );
                                const scanSsl =
                                  scanDataRecord.ssl &&
                                  typeof scanDataRecord.ssl === "object" &&
                                  !Array.isArray(scanDataRecord.ssl)
                                    ? (scanDataRecord.ssl as Record<
                                        string,
                                        unknown
                                      >)
                                    : {};
                                const sslValid =
                                  typeof scan.sslValid === "boolean"
                                    ? scan.sslValid
                                    : typeof scanDataRecord.sslValid ===
                                        "boolean"
                                      ? scanDataRecord.sslValid
                                      : typeof scanSsl.valid === "boolean"
                                        ? scanSsl.valid
                                        : null;
                                const sslExpiryValue =
                                  typeof scan.sslExpiryDate === "string"
                                    ? scan.sslExpiryDate
                                    : typeof scanDataRecord.sslExpiryDate ===
                                        "string"
                                      ? scanDataRecord.sslExpiryDate
                                      : typeof scanSsl.validTo === "string"
                                        ? scanSsl.validTo
                                        : typeof scanSsl.expiresAt === "string"
                                          ? scanSsl.expiresAt
                                          : null;
                                const sslExpiryDate = sslExpiryValue
                                  ? new Date(sslExpiryValue)
                                  : null;
                                const hasValidExpiryDate =
                                  sslExpiryDate &&
                                  !Number.isNaN(sslExpiryDate.getTime());

                                return (
                                  <Card key={scan.id}>
                                    <CardContent className="pt-6">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                              {new Date(
                                                scan.createdAt,
                                              ).toLocaleString()}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {scan.scanType}
                                            </Badge>
                                          </div>

                                          <div className="grid grid-cols-4 gap-4 mt-3">
                                            <div>
                                              <p className="text-xs text-muted-foreground">
                                                Mobile
                                              </p>
                                              <p
                                                className={`text-lg font-bold ${getScoreColor(mobileScore)}`}
                                              >
                                                {mobileData.score || "N/A"}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">
                                                Desktop
                                              </p>
                                              <p
                                                className={`text-lg font-bold ${getScoreColor(desktopScore)}`}
                                              >
                                                {desktopData.score || "N/A"}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">
                                                Security
                                              </p>
                                              <p
                                                className={`text-lg font-bold ${getScoreColor(securityScore)}`}
                                              >
                                                {securityData.score || "N/A"}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">
                                                SSL
                                              </p>
                                              <p
                                                className={`text-lg font-bold ${
                                                  sslValid === true
                                                    ? "text-emerald-500"
                                                    : sslValid === false
                                                      ? "text-red-500"
                                                      : "text-muted-foreground"
                                                }`}
                                              >
                                                {sslValid === true
                                                  ? "Valid"
                                                  : sslValid === false
                                                    ? "Invalid"
                                                    : "Unknown"}
                                              </p>
                                              {sslValid === true &&
                                                hasValidExpiryDate && (
                                                  <p className="text-[11px] text-muted-foreground">
                                                    Exp{" "}
                                                    {sslExpiryDate.toLocaleDateString()}
                                                  </p>
                                                )}
                                            </div>
                                          </div>
                                        </div>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            navigate(
                                              `/?domain=${scan.domain}&scanId=${scan.id}`,
                                            )
                                          }
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </>
                  ) : (
                    <CardContent className="flex items-center justify-center h-96">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">
                          Select a client to view details
                        </p>
                        <p className="text-sm">
                          Choose a domain from the list to see performance
                          metrics and history
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="favorites" className="space-y-6">
              <FavoritesTab
                selectedDomain={selectedDomain}
                onSelectDomain={handleManualDomainSelection}
                onFavoritesChange={handleFavoritesChange}
              />
            </TabsContent>

            <TabsContent value="intelligence" className="space-y-6">
              <DashboardIntelligenceWorkspace
                selectedDomain={manualSelectedDomain}
                onScanSaved={() => {
                  void loadDashboardData();
                }}
              />
            </TabsContent>
          </Tabs>

          <Dialog
            open={showSecurityIssuesDialog}
            onOpenChange={setShowSecurityIssuesDialog}
          >
            <DialogContent className="w-[92vw] max-w-[640px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security Issues
                </DialogTitle>
                <DialogDescription>
                  {selectedDomain
                    ? `Detected issues for ${selectedDomain}.`
                    : "Detected issues for the selected domain."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {selectedDomainSecurityIssues.length > 0 ? (
                  selectedDomainSecurityIssues.map((issue) => (
                    <Card key={issue.id} className="shadow-none">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm leading-relaxed">
                            {issue.message}
                          </p>
                          <Badge
                            variant={
                              issue.severity === "critical"
                                ? "destructive"
                                : "outline"
                            }
                            className={
                              issue.severity === "warning"
                                ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                                : issue.severity === "info"
                                  ? "border-sky-500/40 text-sky-600 dark:text-sky-400"
                                  : undefined
                            }
                          >
                            {getIssueBadgeLabel(issue.severity)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Seen in {issue.occurrences} scan
                          {issue.occurrences === 1 ? "" : "s"}
                          {issue.lastDetectedAt
                            ? ` • Last seen ${new Date(issue.lastDetectedAt).toLocaleString()}`
                            : ""}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <AlertDescription>
                      No issue details were found in scan history for this
                      domain.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showAllIntelligenceScansDialog}
            onOpenChange={setShowAllIntelligenceScansDialog}
          >
            <DialogContent className="w-[92vw] max-w-[640px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Recent Intelligence Scans
                </DialogTitle>
                <DialogDescription>
                  Rolling 30-day history, showing up to 30 unique domains from
                  your account.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {allIntelligenceScansLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <Skeleton key={idx} className="h-16 w-full" />
                    ))}
                  </div>
                ) : allIntelligenceScansError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {allIntelligenceScansError}
                    </AlertDescription>
                  </Alert>
                ) : allIntelligenceScans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No intelligence scans found in the last 30 days.
                  </p>
                ) : (
                  <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-2">
                    {allIntelligenceScans.map((scan) => (
                      <button
                        key={scan.id}
                        type="button"
                        className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        onClick={() => {
                          setShowAllIntelligenceScansDialog(false);
                          navigate(`/intelligence?domain=${scan.domain}`);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium truncate">
                                {scan.domain}
                              </p>
                              {scan.confidenceScore && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {scan.confidenceScore}% confidence
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {scan.edgeProvider && (
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {scan.edgeProvider}
                                </span>
                              )}
                              {scan.originHost && (
                                <span className="flex items-center gap-1">
                                  <Server className="h-3 w-3" />
                                  {scan.originHost}
                                </span>
                              )}
                              {scan.techCount > 0 && (
                                <span>{scan.techCount} technologies</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(scan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <p className="text-xs text-muted-foreground">
                    List is limited to 30 domains within the last 30 days.
                  </p>
                  <Button
                    onClick={() => setShowAllIntelligenceScansDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {/* End Main Content */}
      </div>
      {/* End min-h-screen wrapper */}
    </>
  );
}
