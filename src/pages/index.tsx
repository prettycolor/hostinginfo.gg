"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useProgressiveRetry } from "@/hooks/useProgressiveRetry";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { HeroIntro } from "@/components/HeroIntro";
import SiteIntro from "@/components/SiteIntro";
import {
  shouldShowIntro,
  markIntroSeen,
  INTRO_KEYS,
} from "@/lib/intro-manager";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";
import {
  Search,
  Server,
  Globe,
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  FileText,
  AlertCircle,
  Shield,
  ArrowRightLeft,
  Zap,
  MapPin,
  Smartphone,
  Monitor,
  GitCompare,
  Plus,
  X as XIcon,
  Lightbulb,
  Info,
  // Download,
  FileDown,
  ExternalLink,
  HelpCircle,
  Lock,
  Key,
  Eye,
  Database,
  Image as ImageIcon,
  Code,
  Trash2,
  Rocket,
  TrendingUp,
  Copy,
  BookOpen,
  Network,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoIcon } from "@/components/InfoIcon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
// Theme toggle removed - dark mode only
import { CopyButton } from "@/components/CopyButton";
// import { ExportButton } from '@/components/ExportButton';
// import { Skeleton } from '@/components/ui/skeleton';
import { ScanHistory } from "@/components/ScanHistory";
import { SecurityReport } from "@/components/SecurityReport";
import { PerformanceHistoryChart } from "@/components/PerformanceHistoryChart";

import {
  checkRateLimit,
  recordScan,
  addScanToHistory,
} from "@/lib/scan-history";
import { normalizeScanDomainInput } from "@/lib/domain-input";
import { exportSecurityReportToPDF } from "@/lib/export-pdf";
import { educationalContent } from "@/lib/educational-content";
import {
  EducationalModal,
  type EducationalContent,
} from "@/components/EducationalModal";
import { useAuth } from "@/lib/auth-context";

interface TechnologyResult {
  wordpress: {
    detected: boolean;
    version: string | null;
    confidence: number;
    methods: string[];
    certainty?: "confirmed" | "likely" | "unverified" | "none";
    detectionScore?: number;
    detectionSignalCount?: number;
    detectionSignals?: string[];
    detectionVisibility?: "full" | "limited";
    versionUncertain?: boolean;
    versionReliability?: "low" | "medium" | "high";
  };
  php: {
    detected: boolean;
    version: string | null;
    confidence: number;
    methods: string[];
  };
  server: {
    type: string | null;
    confidence: number;
    methods: string[];
    isWebsiteBuilder?: boolean;
    builderType?: string | null;
  };
  hosting: { provider: string | null; confidence: number; methods: string[] };
  controlPanel: {
    recommendation:
      | "managed-upgrade"
      | "needs-updates"
      | "paid-support"
      | "cpanel"
      | "unknown";
    reason: string;
    confidence: number;
    migrationBenefits?: string[];
    needsPaidSupport?: boolean;
  };
}

interface DNSResult {
  domain: string;
  records: {
    A: string[];
    AAAA: string[];
    MX: Array<{ exchange: string; priority: number }>;
    TXT: string[];
    NS: string[];
    CNAME: string[];
    CAA?: string[];
  };
  subdomains?: string[];
  subdomainCount?: number;
  errors: Record<string, string>;
}

interface WhoisResult {
  domain: string;
  registrar: string | null;
  registrarUrl: string | null;
  registrarRaw?: string | null;
  registrarFriendly?: string | null;
  registrarInferenceConfidence?: number;
  registrarInferenceMethod?: string;
  registrarInferenceReason?: string;
  createdDate: string | null;
  expiryDate: string | null;
  updatedDate: string | null;
  nameServers: string[];
  status: string[];
  registrantOrg: string | null;
  registrantCountry: string | null;
  dnssec: string | null;
  error?: string;
}

interface EmailResult {
  domain: string;
  mx: Array<{ exchange: string; priority: number }>;
  spf: {
    record: string | null;
    valid: boolean;
    includes: string[];
    configured?: boolean;
  };
  dmarc: {
    record: string | null;
    policy: string | null;
    valid: boolean;
    configured?: boolean;
  };
  dkim: {
    hasRecord: boolean;
    note: string;
    configured?: boolean;
    record?: string;
  };
  recommendation: {
    status: "good" | "warning" | "critical" | "unknown";
    message: string;
    issues: string[];
  };
  providers?: string[];
  securityServices?: string[];
  securityGateway?: {
    detected?: boolean;
    provider?: string;
  };
}

interface SSLResult {
  [key: string]: unknown;
}

interface PerformanceResult {
  mobile: {
    score: number;
    grade: string;
    color: "green" | "orange" | "red";
    metrics: {
      fcp: { value: number; score: number; displayValue: string };
      lcp: { value: number; score: number; displayValue: string };
      tbt: { value: number; score: number; displayValue: string };
      cls: { value: number; score: number; displayValue: string };
      speedIndex: { value: number; score: number; displayValue: string };
    };
    opportunities?: Array<{
      title: string;
      description: string;
      savings: string;
    }>;
    error?: string;
  };
  desktop: {
    score: number;
    grade: string;
    color: "green" | "orange" | "red";
    metrics: {
      fcp: { value: number; score: number; displayValue: string };
      lcp: { value: number; score: number; displayValue: string };
      tbt: { value: number; score: number; displayValue: string };
      cls: { value: number; score: number; displayValue: string };
      speedIndex: { value: number; score: number; displayValue: string };
    };
    opportunities?: Array<{
      title: string;
      description: string;
      savings: string;
    }>;
    error?: string;
  };
  totalPagesScanned?: number;
  diagnostics?: {
    totalRequests?: number;
    successfulRequests?: number;
    failedRequests?: number;
    partialResults?: boolean;
  };
  error?: string;
  _cache?: {
    cached: boolean;
    timestamp: string;
  };
}

interface PerformanceJobResponse {
  jobId: string;
  domain: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress?: number;
  pollAfterMs?: number;
  result?: PerformanceResult;
  error?: string;
}

interface SecurityResult {
  securityHeaders: Record<
    string,
    {
      present?: boolean;
      value?: string;
      recommendation?: string;
      [key: string]: unknown;
    }
  >;
  waf: {
    detected: boolean;
    provider: string | null;
    confidence: number;
    evidence?: string[];
  };
  score: number;
  grade: string;
  recommendations: string[];
  serverHeader: string;
  error?: string;
}

interface GeolocationResult {
  ipAddress: string;
  location: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    coordinates: { latitude: number; longitude: number };
    timezone: string;
  } | null;
  isp?: string;
  organization?: string;
  asn?: string;
  asnName?: string;
  distances?: {
    closest: { city: string; distance: number };
    cities: Record<string, number>;
  };
  error?: string;
}

interface ProviderResult {
  provider: string;
  category: string;
  confidence: number;
  methods: string[];
  nameservers: string[];
}

interface MalwareResult {
  domain: string;
  isBlacklisted: boolean;
  isMalware: boolean;
  isPhishing: boolean;
  threats: Array<{
    source: string;
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    detectedAt?: string;
  }>;
  checks: {
    googleSafeBrowsing: {
      checked: boolean;
      clean: boolean;
      error: string | null;
    };
    phishTank: { checked: boolean; clean: boolean; error: string | null };
    urlhaus: { checked: boolean; clean: boolean; error: string | null };
    virusTotal: { checked: boolean; clean: boolean; error: string | null };
  };
  lastChecked: string;
  error?: string;
}

interface ComparisonData {
  domain: string;
  technology: TechnologyResult | null;
  dns: DNSResult | null;
  email: EmailResult | null;
  performance: PerformanceResult | null;
  security: SecurityResult | null;
  geolocation: GeolocationResult | null;
  provider: ProviderResult | null;
  malware: MalwareResult | null;
}

export default function HomePage() {
  const { user, token } = useAuth();

  // Site intro animation state (with 75-minute expiry)
  const [showIntro, setShowIntro] = useState(() => {
    return shouldShowIntro(INTRO_KEYS.SITE);
  });
  const [introComplete, setIntroComplete] = useState(false);

  const handleIntroComplete = () => {
    markIntroSeen(INTRO_KEYS.SITE);
    setIntroComplete(true);
    setTimeout(() => setShowIntro(false), 100);
  };

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // Store token in localStorage
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_token_timestamp", Date.now().toString());
      // Legacy key for any old code paths.
      localStorage.setItem("token", token);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show success message (optional)
      console.log("OAuth authentication successful");
    }
  }, []);

  const [domain, setDomain] = useState("");
  const [activeTab, setActiveTab] = useState("hosting");
  const [isSearching, setIsSearching] = useState(false);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);
  const [rawTechnologyData, setRawTechnologyData] =
    useState<TechnologyResult | null>(null);

  // Use progressive retry hook for technology data
  const { data: technologyData } = useProgressiveRetry(
    rawTechnologyData,
    domain,
  );
  const [dnsData, setDNSData] = useState<DNSResult | null>(null);
  const [whoisData, setWhoisData] = useState<WhoisResult | null>(null);
  const [emailData, setEmailData] = useState<EmailResult | null>(null);
  // const [sslData, setSSLData] = useState<SSLResult | null>(null); // Removed - no longer needed
  const [performanceData, setPerformanceData] =
    useState<PerformanceResult | null>(null);
  const [securityData, setSecurityData] = useState<SecurityResult | null>(null);
  const [geolocationData, setGeolocationData] =
    useState<GeolocationResult | null>(null);
  const [providerData, setProviderData] = useState<ProviderResult | null>(null);
  const [malwareData, setMalwareData] = useState<MalwareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState<string>("");
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [showNoFirewallDialog, setShowNoFirewallDialog] = useState(false);
  const [showSecuritySheet, setShowSecuritySheet] = useState(false);
  const [showComparisonSheet, setShowComparisonSheet] = useState(false);
  const [educationalModalOpen, setEducationalModalOpen] = useState(false);
  const [showPerformanceHistory, setShowPerformanceHistory] = useState(false);
  const [showPaidSupportDetails, setShowPaidSupportDetails] = useState(false);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [favoriteDomains, setFavoriteDomains] = useState<string[]>([]);
  const [modalContent, setModalContent] = useState<EducationalContent | null>(
    null,
  );
  const normalizedFavoriteDomain = normalizeScanDomainInput(domain);
  const isCurrentDomainFavorite =
    Boolean(normalizedFavoriteDomain) &&
    favoriteDomains.includes(normalizedFavoriteDomain);

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDomains, setComparisonDomains] = useState<string[]>([
    "",
    "",
  ]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState<boolean[]>([]);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const renderInlineComparison = false as boolean;

  const parseMajorMinorVersion = (
    version: string | null | undefined,
  ): number | null => {
    if (!version) return null;
    const parsed = Number.parseFloat(version.split(".").slice(0, 2).join("."));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const noFirewallPrimaryRisks = [
    { id: "sql-injection", label: "SQL injection attacks" },
    { id: "xss", label: "Cross-site scripting (XSS)" },
    { id: "ddos", label: "Exposed to DDoS attacks" },
    { id: "brute-force", label: "Brute force attacks" },
  ];
  const noFirewallInsightRisks = [
    { id: "no-waf", label: "No Web Application Firewall (WAF)" },
    { id: "no-cdn", label: "No CDN protection detected" },
    { id: "ddos", label: "Exposed to DDoS attacks" },
    { id: "malware-bots", label: "Higher risk of malware and bot abuse" },
  ];
  const noFirewallExposureList = [
    ...new Map(
      [...noFirewallPrimaryRisks, ...noFirewallInsightRisks].map((entry) => [
        entry.id,
        entry,
      ]),
    ).values(),
  ];

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
        console.error(`[SCAN] Request failed (${url}):`, error);
        return null;
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [],
  );

  const parseJsonSafe = useCallback(
    async <T,>(response: Response | null, label: string): Promise<T | null> => {
      if (!response?.ok || !("json" in response)) return null;

      try {
        return (await response.json()) as T;
      } catch (error) {
        console.error(`[SCAN] Failed to parse ${label} response:`, error);
        return null;
      }
    },
    [],
  );

  const createUnavailablePerformanceResult = useCallback(
    (message: string): PerformanceResult => ({
      mobile: {
        score: 0,
        grade: "F",
        color: "red",
        metrics: {
          fcp: { value: 0, score: 0, displayValue: "N/A" },
          lcp: { value: 0, score: 0, displayValue: "N/A" },
          tbt: { value: 0, score: 0, displayValue: "N/A" },
          cls: { value: 0, score: 0, displayValue: "N/A" },
          speedIndex: { value: 0, score: 0, displayValue: "N/A" },
        },
        error: message,
      },
      desktop: {
        score: 0,
        grade: "F",
        color: "red",
        metrics: {
          fcp: { value: 0, score: 0, displayValue: "N/A" },
          lcp: { value: 0, score: 0, displayValue: "N/A" },
          tbt: { value: 0, score: 0, displayValue: "N/A" },
          cls: { value: 0, score: 0, displayValue: "N/A" },
          speedIndex: { value: 0, score: 0, displayValue: "N/A" },
        },
        error: message,
      },
      error: message,
    }),
    [],
  );

  const isExpectedOfflinePerformanceError = useCallback(
    (message: string | null | undefined): boolean => {
      if (!message) return false;

      const normalized = message.toLowerCase();
      const offlineSignals = [
        "site is offline",
        "failed_document_request",
        "err_connection_failed",
        "err_name_not_resolved",
        "dns_probe_finished_nxdomain",
        "unable to reliably load the page",
        "unable to connect",
        "connection failed",
      ];

      return offlineSignals.some((signal) => normalized.includes(signal));
    },
    [],
  );

  const getPerformanceUnavailableMessage = useCallback(
    (result: PerformanceResult | null): string | null => {
      if (!result) return null;

      return (
        result.error ||
        (result.mobile?.error && result.desktop?.error
          ? result.mobile.error
          : null) ||
        null
      );
    },
    [],
  );

  const isOfflinePerformanceResult = useCallback(
    (result: PerformanceResult | null): boolean =>
      isExpectedOfflinePerformanceError(
        getPerformanceUnavailableMessage(result),
      ),
    [getPerformanceUnavailableMessage, isExpectedOfflinePerformanceError],
  );

  const runAsyncPerformanceScan = useCallback(
    async (
      cleanDomain: string,
      headers: HeadersInit,
    ): Promise<PerformanceResult> => {
      const startResponse = await fetchWithTimeout(
        "/api/scan/performance",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ domain: cleanDomain, async: true }),
        },
        20000,
      );

      if (!startResponse) {
        return createUnavailablePerformanceResult(
          "Performance scan failed to start",
        );
      }

      if (!startResponse.ok) {
        let message = `Performance scan failed to start (${startResponse.status})`;
        try {
          const payload = (await startResponse.json()) as {
            message?: string;
            error?: string;
          };
          message = payload?.message || payload?.error || message;
        } catch {
          // Keep fallback message when body is not JSON
        }
        return createUnavailablePerformanceResult(message);
      }

      const startedJob = await parseJsonSafe<PerformanceJobResponse>(
        startResponse,
        "performance-start",
      );
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
              `[Homepage] Transient performance polling status ${pollResponse.status}, retrying`,
            );
            continue;
          }
          let message = `Performance scan polling failed (${pollResponse.status})`;
          try {
            const payload = (await pollResponse.json()) as {
              message?: string;
              error?: string;
            };
            message = payload?.message || payload?.error || message;
          } catch {
            // Keep fallback message when body is not JSON
          }
          return createUnavailablePerformanceResult(message);
        }

        const polledJob = await parseJsonSafe<PerformanceJobResponse>(
          pollResponse,
          "performance-poll",
        );
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

  useEffect(() => {
    if (!token) {
      setFavoriteDomains([]);
      return;
    }

    let cancelled = false;

    const loadFavorites = async () => {
      try {
        const response = await fetch("/api/favorites", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | unknown[]
          | { favorites?: unknown[] }
          | null;
        const rawFavorites = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.favorites)
            ? payload.favorites
            : [];

        const normalizedDomains = Array.from(
          new Set(
            rawFavorites
              .map((entry) => {
                const value =
                  typeof entry === "string"
                    ? entry
                    : entry && typeof entry === "object"
                      ? (entry as { domain?: unknown }).domain
                      : null;

                if (typeof value !== "string") {
                  return null;
                }

                return normalizeScanDomainInput(value);
              })
              .filter((value): value is string => Boolean(value)),
          ),
        );

        if (!cancelled) {
          setFavoriteDomains(normalizedDomains);
        }
      } catch (error) {
        console.error("[Homepage] Failed to load favorites:", error);
      }
    };

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAddFavorite = useCallback(async () => {
    const cleanDomain = normalizeScanDomainInput(domain);
    if (!cleanDomain) {
      toast.error("Enter a valid domain first");
      return;
    }

    if (!token) {
      toast.error("Sign in to add favorites");
      return;
    }

    try {
      setIsAddingFavorite(true);
      setDomain(cleanDomain);

      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: cleanDomain }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        const message =
          payload?.error ||
          payload?.message ||
          `Failed to add favorite (${response.status})`;

        if (
          response.status === 409 ||
          message.toLowerCase().includes("already")
        ) {
          setFavoriteDomains((current) =>
            current.includes(cleanDomain) ? current : [...current, cleanDomain],
          );
          toast.info(`${cleanDomain} is already in your favorites`);
          return;
        }

        throw new Error(message);
      }

      setFavoriteDomains((current) =>
        current.includes(cleanDomain) ? current : [...current, cleanDomain],
      );
      toast.success(`${cleanDomain} added to favorites`);
    } catch (favoriteError) {
      toast.error(
        favoriteError instanceof Error
          ? favoriteError.message
          : "Failed to add favorite",
      );
    } finally {
      setIsAddingFavorite(false);
    }
  }, [domain, token]);

  const handleSearch = async () => {
    // Trim the domain first
    const trimmedDomain = domain.trim();
    if (!trimmedDomain) return;

    const cleanDomain = normalizeScanDomainInput(trimmedDomain);
    if (!cleanDomain) {
      setError("Please enter a valid domain or URL (subdomains supported).");
      return;
    }

    // Keep input normalized so copy/pasted URLs become hostnames.
    setDomain(cleanDomain);

    // Check rate limit
    const rateCheck = checkRateLimit(cleanDomain);
    if (!rateCheck.allowed) {
      setRateLimitMessage(
        `Please wait ${rateCheck.waitTime} seconds before scanning this domain again`,
      );
      setTimeout(() => setRateLimitMessage(null), 3000);
      return;
    }

    setIsSearching(true);
    setError(null);
    setScanNotice(null);
    setRateLimitMessage(null);
    setScanProgress(0);
    setScanStage("Checking site reachability...");
    setShowPaidSupportDetails(false);
    setShowNoFirewallDialog(false);
    const analyzeContextHeader = { "X-Scan-Context": "homepage-analyze" };
    const analyzeJsonHeaders = {
      "Content-Type": "application/json",
      ...analyzeContextHeader,
    };

    // Check if site is reachable before scanning
    // Default to reachable - only mark unreachable if we're certain
    let isReachable = true;
    let reachabilityMessage = "";
    try {
      const reachabilityResponse = await fetch(
        `/api/scan/reachability?domain=${encodeURIComponent(cleanDomain)}`,
        { headers: analyzeContextHeader },
      );

      // If the API call itself fails, assume site is reachable and continue
      if (!reachabilityResponse.ok) {
        console.warn("Reachability API failed, assuming site is reachable");
        isReachable = true;
      } else {
        const reachabilityResult = await reachabilityResponse.json();

        // Only mark as unreachable if we got a definitive negative result
        if (reachabilityResult.reachable === false) {
          isReachable = false;
          reachabilityMessage = reachabilityResult.isParked
            ? `Domain "${cleanDomain}" appears to be parked or not configured. Showing DNS and WHOIS data only.`
            : `Unable to connect to "${cleanDomain}". Showing DNS and WHOIS data only.`;
        }
      }
    } catch (reachabilityError) {
      console.error("Reachability check failed:", reachabilityError);
      // Continue with full scan if reachability check itself fails (assume reachable)
      isReachable = true;
    }

    setScanProgress(5);
    setScanStage("");

    // Clear previous performance data when starting new scan
    setPerformanceData(null);
    setIsPerformanceLoading(false);

    try {
      // Record this scan for rate limiting
      recordScan(cleanDomain);

      // Run fast scans in parallel, Performance scan independently
      setScanStage("Scanning all services...");
      setScanProgress(10);

      // Start Performance scan independently (runs in background) - only if reachable
      setIsPerformanceLoading(isReachable);
      const performancePromise = isReachable
        ? runAsyncPerformanceScan(cleanDomain, analyzeJsonHeaders)
        : Promise.resolve(
            createUnavailablePerformanceResult(
              "Site is offline. Performance checks require a reachable web page.",
            ),
          );

      // Fetch scans based on reachability
      // If unreachable, only fetch DNS and WHOIS (domain-level data)
      const [
        techResponse,
        initialDnsResponse,
        whoisResponse,
        emailResponse,
        sslResponse,
        initialSecurityResponse,
        geolocationResponse,
        malwareResponse,
      ] = await Promise.all([
        isReachable
          ? fetchWithTimeout("/api/scan/technology", {
              method: "POST",
              headers: analyzeJsonHeaders,
              body: JSON.stringify({ domain: cleanDomain }),
            })
          : Promise.resolve(null),
        fetchWithTimeout(
          "/api/scan/dns",
          {
            method: "POST",
            headers: analyzeJsonHeaders,
            body: JSON.stringify({ domain: cleanDomain }),
          },
          45000,
        ),
        fetchWithTimeout(
          "/api/scan/whois",
          {
            method: "POST",
            headers: analyzeJsonHeaders,
            body: JSON.stringify({ domain: cleanDomain }),
          },
          45000,
        ),
        isReachable
          ? fetchWithTimeout("/api/scan/email", {
              method: "POST",
              headers: analyzeJsonHeaders,
              body: JSON.stringify({ domain: cleanDomain }),
            })
          : Promise.resolve(null),
        isReachable
          ? fetchWithTimeout("/api/scan/ssl", {
              method: "POST",
              headers: analyzeJsonHeaders,
              body: JSON.stringify({ domain: cleanDomain }),
            })
          : Promise.resolve(null),
        isReachable
          ? fetchWithTimeout(
              "/api/scan/security",
              {
                method: "POST",
                headers: analyzeJsonHeaders,
                body: JSON.stringify({ domain: cleanDomain }),
              },
              40000,
            )
          : Promise.resolve(null),
        isReachable
          ? fetchWithTimeout("/api/scan/geolocation", {
              method: "POST",
              headers: analyzeJsonHeaders,
              body: JSON.stringify({ domain: cleanDomain }),
            })
          : Promise.resolve(null),
        isReachable
          ? fetchWithTimeout("/api/scan/malware", {
              method: "POST",
              headers: analyzeJsonHeaders,
              body: JSON.stringify({ domain: cleanDomain }),
            })
          : Promise.resolve(null),
      ]);
      let dnsResponse = initialDnsResponse;
      let securityResponse = initialSecurityResponse;

      // Retry critical modules once to reduce transient timeout warnings.
      if (!dnsResponse?.ok) {
        console.warn("[SCAN] DNS API failed first attempt, retrying once...");
        dnsResponse = await fetchWithTimeout(
          "/api/scan/dns",
          {
            method: "POST",
            headers: analyzeJsonHeaders,
            body: JSON.stringify({ domain: cleanDomain }),
          },
          60000,
        );
      }

      if (isReachable && !securityResponse?.ok) {
        console.warn(
          "[SCAN] Security API failed first attempt, retrying once...",
        );
        securityResponse = await fetchWithTimeout(
          "/api/scan/security",
          {
            method: "POST",
            headers: analyzeJsonHeaders,
            body: JSON.stringify({ domain: cleanDomain }),
          },
          55000,
        );
      }

      setScanProgress(50);
      setScanStage("Processing results...");

      // Log any failed API calls
      if (!techResponse?.ok)
        console.error(
          "[SCAN] Tech API failed:",
          techResponse?.status ?? "no response",
        );
      if (!dnsResponse?.ok)
        console.error(
          "[SCAN] DNS API failed:",
          dnsResponse?.status ?? "no response",
        );
      if (!whoisResponse?.ok)
        console.error(
          "[SCAN] WHOIS API failed:",
          whoisResponse?.status ?? "no response",
        );
      if (!emailResponse?.ok)
        console.error(
          "[SCAN] Email API failed:",
          emailResponse?.status ?? "no response",
        );
      if (!sslResponse?.ok)
        console.error(
          "[SCAN] SSL API failed:",
          sslResponse?.status ?? "no response",
        );
      if (!securityResponse?.ok)
        console.error(
          "[SCAN] Security API failed:",
          securityResponse?.status ?? "no response",
        );
      if (!geolocationResponse?.ok)
        console.error(
          "[SCAN] Geo API failed:",
          geolocationResponse?.status ?? "no response",
        );
      if (!malwareResponse?.ok)
        console.error(
          "[SCAN] Malware API failed:",
          malwareResponse?.status ?? "no response",
        );

      // Parse fast results in parallel
      const [
        techResult,
        dnsResult,
        whoisResult,
        emailResult,
        sslResult,
        securityResult,
        geolocationResult,
        malwareResult,
      ] = await Promise.all([
        parseJsonSafe<TechnologyResult>(techResponse, "technology"),
        parseJsonSafe<DNSResult>(dnsResponse, "dns"),
        parseJsonSafe<WhoisResult>(whoisResponse, "whois"),
        parseJsonSafe<EmailResult>(emailResponse, "email"),
        parseJsonSafe<SSLResult>(sslResponse, "ssl"),
        parseJsonSafe<SecurityResult>(securityResponse, "security"),
        parseJsonSafe<GeolocationResult>(geolocationResponse, "geolocation"),
        parseJsonSafe<MalwareResult>(malwareResponse, "malware"),
      ]);

      setScanProgress(70);

      const providerPromise: Promise<ProviderResult | null> =
        dnsResult && geolocationResult
          ? fetchWithTimeout("/api/scan/provider", {
              method: "POST",
              headers: analyzeJsonHeaders,
              body: JSON.stringify({
                domain: cleanDomain,
                nameservers: dnsResult.records?.NS || [],
                isp: geolocationResult.isp,
                organization: geolocationResult.organization,
                isWebsiteBuilder: techResult?.server?.isWebsiteBuilder || false,
                builderType: techResult?.server?.builderType || null,
              }),
            }).then((response) =>
              parseJsonSafe<ProviderResult>(response, "provider"),
            )
          : Promise.resolve(null);

      setScanProgress(90);

      // Update state with fast results immediately (show 4 tabs right away)
      console.log("[SCAN DEBUG] Results:", {
        tech: techResult,
        dns: dnsResult,
        whois: whoisResult,
        email: emailResult,
        security: securityResult,
        geo: geolocationResult,
        malware: malwareResult,
      });
      setRawTechnologyData(techResult);
      setDNSData(
        dnsResult ?? {
          domain: cleanDomain,
          records: { A: [], AAAA: [], MX: [], TXT: [], NS: [], CNAME: [] },
          subdomains: [],
          subdomainCount: 0,
          errors: { general: "DNS scan timed out or failed" },
        },
      );
      setWhoisData(
        whoisResult ?? {
          domain: cleanDomain,
          registrar: null,
          registrarUrl: null,
          registrarRaw: null,
          registrarFriendly: null,
          registrarInferenceConfidence: 0,
          registrarInferenceMethod: "none",
          registrarInferenceReason: "",
          createdDate: null,
          expiryDate: null,
          updatedDate: null,
          nameServers: [],
          status: [],
          registrantOrg: null,
          registrantCountry: null,
          dnssec: null,
          error: "WHOIS scan timed out or failed",
        },
      );
      setEmailData(emailResult);
      // setSSLData(sslResult); // Removed - no longer needed
      setSecurityData(
        securityResult ?? {
          securityHeaders: {},
          waf: {
            detected: false,
            provider: null,
            confidence: 0,
          },
          score: 0,
          grade: "F",
          recommendations: [],
          serverHeader: "Unknown",
          error: "Security scan timed out or failed",
        },
      );
      setGeolocationData(geolocationResult);
      setProviderData(null);
      setMalwareData(malwareResult);
      setScanProgress(100);

      providerPromise
        .then((providerResult) => {
          if (providerResult) {
            setProviderData(providerResult);
          }
        })
        .catch((providerError) => {
          console.error("[SCAN] Provider detection failed:", providerError);
        });

      // Show appropriate completion message
      if (!isReachable && reachabilityMessage) {
        setScanStage("DNS and WHOIS scan complete!");
        setScanNotice(reachabilityMessage);
      } else {
        setScanStage("Complete! Performance scan running...");
        const rateLimitedScans = [
          dnsResponse?.status === 429 ? "DNS" : null,
          whoisResponse?.status === 429 ? "WHOIS" : null,
          securityResponse?.status === 429 ? "Security" : null,
        ].filter(Boolean);
        const degradedScans = [
          !dnsResult ? "DNS" : null,
          !whoisResult ? "WHOIS" : null,
          !securityResult ? "Security" : null,
        ].filter(Boolean);
        if (rateLimitedScans.length > 0) {
          setError(
            `Rate limit reached for: ${rateLimitedScans.join(", ")}. Please wait a minute and try again.`,
          );
        } else if (degradedScans.length > 0) {
          setError(
            `Some scan modules timed out: ${degradedScans.join(", ")}. You can re-run analyze for a fresh attempt.`,
          );
        }
      }

      // Wait for Performance scan to complete in background
      performancePromise
        .then(async (performanceResult) => {
          const providerResult = await providerPromise.catch(
            (providerError) => {
              console.error(
                "[SCAN] Provider resolution failed:",
                providerError,
              );
              return null;
            },
          );

          if (!performanceResult) {
            setPerformanceData(
              createUnavailablePerformanceResult(
                "Performance scan timed out or failed",
              ),
            );
            setIsPerformanceLoading(false);
            setScanStage("Scan complete with partial data");
            setScanNotice(
              "Performance scan timed out or failed. Other scan modules still completed.",
            );
            return;
          }

          setPerformanceData(performanceResult);
          setIsPerformanceLoading(false);

          const performanceUnavailableMessage =
            getPerformanceUnavailableMessage(performanceResult);

          if (performanceUnavailableMessage) {
            setScanStage("Scan complete with partial data");
            if (
              isExpectedOfflinePerformanceError(performanceUnavailableMessage)
            ) {
              setScanNotice(
                "Performance checks were skipped because the site appears offline or unreachable. Other scan modules still completed.",
              );
            } else {
              setScanNotice(
                `Performance module unavailable: ${performanceUnavailableMessage}`,
              );
            }
          } else {
            setScanStage("All scans complete!");
          }

          const hasUsablePerformanceData = !performanceUnavailableMessage;

          // Save to history with all data including performance
          addScanToHistory({
            domain: cleanDomain,
            timestamp: Date.now(),
            technology: techResult,
            dns: dnsResult,
            email: emailResult,
            ssl: sslResult,
            performance: hasUsablePerformanceData ? performanceResult : null,
            security: securityResult,
            geolocation: geolocationResult,
            provider: providerResult,
          });

          const authToken =
            localStorage.getItem("auth_token") ||
            localStorage.getItem("authToken");

          // Persist authenticated scans so dashboard/account history stays in sync.
          if (authToken) {
            try {
              const sslValid =
                typeof sslResult?.valid === "boolean" ? sslResult.valid : null;
              const sslExpired =
                typeof sslResult?.expired === "boolean"
                  ? sslResult.expired
                  : null;
              const sslExpiryDate =
                typeof sslResult?.validTo === "string"
                  ? sslResult.validTo
                  : null;
              const sslIssuer =
                typeof sslResult?.issuer === "string" ? sslResult.issuer : null;
              const preferredHostingProvider =
                providerResult?.provider ??
                techResult?.hosting?.provider ??
                techResult?.server?.builderType ??
                null;

              const compactScanSnapshot = {
                domain: cleanDomain,
                hostingProvider: preferredHostingProvider,
                sslValid,
                sslExpiryDate,
                ssl: sslResult
                  ? {
                      hasSSL:
                        typeof sslResult.hasSSL === "boolean"
                          ? sslResult.hasSSL
                          : null,
                      valid: sslValid,
                      expired: sslExpired,
                      validTo: sslExpiryDate,
                      issuer: sslIssuer,
                    }
                  : null,
                performanceData: hasUsablePerformanceData
                  ? {
                      mobile: { score: performanceResult.mobile?.score ?? 0 },
                      desktop: { score: performanceResult.desktop?.score ?? 0 },
                    }
                  : null,
                securityData: securityResult
                  ? {
                      score: securityResult.score ?? 0,
                      grade: securityResult.grade ?? null,
                      issues: Array.isArray(securityResult.recommendations)
                        ? securityResult.recommendations.slice(0, 12)
                        : [],
                    }
                  : null,
                technologyData: techResult
                  ? {
                      wordpress: {
                        detected: Boolean(techResult.wordpress?.detected),
                        version: techResult.wordpress?.version ?? null,
                      },
                      server: {
                        type: techResult.server?.type ?? null,
                        isWebsiteBuilder: Boolean(
                          techResult.server?.isWebsiteBuilder,
                        ),
                        builderType: techResult.server?.builderType ?? null,
                      },
                      hosting: {
                        provider: preferredHostingProvider,
                      },
                    }
                  : null,
                whoisData: whoisResult
                  ? {
                      registrar: whoisResult.registrar ?? null,
                      expiryDate: whoisResult.expiryDate ?? null,
                    }
                  : null,
                emailData: emailResult
                  ? {
                      spf: { configured: Boolean(emailResult.spf?.configured) },
                      dkim: {
                        configured: Boolean(emailResult.dkim?.configured),
                      },
                      dmarc: {
                        configured: Boolean(emailResult.dmarc?.configured),
                      },
                    }
                  : null,
                providerData: preferredHostingProvider
                  ? { provider: preferredHostingProvider }
                  : null,
                malwareData: malwareResult
                  ? {
                      isMalware: Boolean(malwareResult.isMalware),
                      isPhishing: Boolean(malwareResult.isPhishing),
                      isBlacklisted: Boolean(malwareResult.isBlacklisted),
                    }
                  : null,
              };

              const historyResponse = await fetch("/api/scan-history", {
                method: "POST",
                headers: {
                  ...analyzeJsonHeaders,
                  Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                  domain: cleanDomain,
                  scanType: "full",
                  scanData: compactScanSnapshot,
                }),
              });

              if (!historyResponse.ok) {
                const historyErrorText = await historyResponse
                  .text()
                  .catch(() => "");
                console.error(
                  "Failed to save scan history:",
                  historyResponse.status,
                  historyErrorText,
                );
              }
            } catch (err) {
              console.error("Failed to save scan history:", err);
            }
          }

          // Save performance data to database for historical tracking
          if (hasUsablePerformanceData) {
            try {
              await fetch("/api/scan/performance/history", {
                method: "POST",
                headers: analyzeJsonHeaders,
                body: JSON.stringify({
                  domain: cleanDomain,
                  mobile: performanceResult.mobile,
                  desktop: performanceResult.desktop,
                }),
              });
            } catch (err) {
              console.error("Failed to save performance history:", err);
            }
          }

          // Award XP for completing the full scan
          try {
            const scansCompleted = [];
            if (securityResult) scansCompleted.push("security");
            if (hasUsablePerformanceData) scansCompleted.push("performance");
            if (dnsResult) scansCompleted.push("dns");
            if (sslResult) scansCompleted.push("ssl");
            if (emailResult) scansCompleted.push("email");
            if (malwareResult) scansCompleted.push("malware");
            if (whoisResult) scansCompleted.push("whois");
            if (techResult) scansCompleted.push("technology");
            if (geolocationResult) scansCompleted.push("geolocation");
            if (providerResult) scansCompleted.push("provider");

            const xpResponse = await fetch("/api/scan/complete", {
              method: "POST",
              headers: {
                ...analyzeJsonHeaders,
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              },
              body: JSON.stringify({
                domain: cleanDomain,
                scansCompleted,
              }),
            });

            if (xpResponse.ok) {
              const xpResult = await xpResponse.json();
              console.log("[XP] Scan complete:", xpResult);

              // Dispatch custom event to update XP bar in real-time
              window.dispatchEvent(
                new CustomEvent("scan-complete", { detail: xpResult }),
              );

              if (xpResult.leveledUp) {
                window.dispatchEvent(
                  new CustomEvent("level-up", {
                    detail: {
                      newLevel: xpResult.newLevel,
                      xpAwarded: xpResult.xpAwarded,
                    },
                  }),
                );
                console.log(`🎉 Level up! Now level ${xpResult.newLevel}`);

                // Show level-up toast
                toast.success(`🎉 Level Up!`, {
                  description: `You've reached Level ${xpResult.newLevel}! +${xpResult.xpAwarded} XP`,
                  duration: 5000,
                });
              } else if (xpResult.xpAwarded > 0) {
                window.dispatchEvent(
                  new CustomEvent("xp-updated", {
                    detail: {
                      xpAwarded: xpResult.xpAwarded,
                      totalXp: xpResult.totalXp,
                    },
                  }),
                );

                // Show XP gain toast
                toast.success(`+${xpResult.xpAwarded} XP`, {
                  description: `Scan completed successfully!`,
                  duration: 3000,
                });
              }
            }
          } catch (err) {
            console.error("Failed to award XP:", err);
            // Don't show error toast for XP - it's not critical
          }
        })
        .catch((err) => {
          console.error("Performance scan failed:", err);
          setPerformanceData(null);
          setIsPerformanceLoading(false);
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setScanProgress(0);
      setScanStage("");
    } finally {
      setIsSearching(false);
      // Clear progress after a short delay (but keep showing performance status)
      setTimeout(() => {
        if (!scanStage.includes("Performance")) {
          setScanProgress(0);
          setScanStage("");
        }
      }, 1500);
    }
  };

  const isPerformanceMarkedOffline =
    isOfflinePerformanceResult(performanceData);

  const handleSelectFromHistory = (selectedDomain: string) => {
    setDomain(selectedDomain);
    handleSearch();
  };

  // Helper function to determine the best value in comparison
  const getBestIndex = (
    values: (number | null | undefined)[],
    higherIsBetter: boolean = true,
  ): number => {
    const validValues = values.map((v, i) => ({
      value: v ?? -Infinity,
      index: i,
    }));
    if (higherIsBetter) {
      return validValues.reduce((best, curr) =>
        curr.value > best.value ? curr : best,
      ).index;
    } else {
      return validValues.reduce((best, curr) =>
        curr.value < best.value && curr.value !== -Infinity ? curr : best,
      ).index;
    }
  };

  const handleExportComparison = async () => {
    if (comparisonData.length < 2) return;

    try {
      setError("");

      // Generate PDF on client side using jsPDF
      const { exportComparisonPDF } =
        await import("@/lib/comparison-pdf-export");
      await exportComparisonPDF(comparisonData);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Failed to export comparison PDF");
    }
  };

  const handleComparisonScan = async () => {
    // Trim all domains and filter out empty ones
    const trimmedDomains = comparisonDomains.map((d) => d.trim());
    const normalizedComparisonDomains = trimmedDomains.map((value) => {
      if (!value) return "";
      return normalizeScanDomainInput(value);
    });
    const invalidDomains = trimmedDomains.filter(
      (value, index) => Boolean(value) && !normalizedComparisonDomains[index],
    );

    if (invalidDomains.length > 0) {
      setError(
        "Please enter valid domains or URLs for all comparison inputs (subdomains supported).",
      );
      return;
    }

    const validDomains = normalizedComparisonDomains.filter(
      (value): value is string => Boolean(value),
    );
    if (validDomains.length < 2) {
      setError(
        "Please enter at least two valid domains or URLs (subdomains supported).",
      );
      return;
    }

    // Update state with normalized domains
    setComparisonDomains(
      normalizedComparisonDomains.map((value) => value ?? ""),
    );

    setComparisonLoading(validDomains.map(() => true));
    setComparisonData([]);
    setError(null);
    setScanNotice(null);

    try {
      const results = await Promise.all(
        validDomains.map(async (domainToScan) => {
          const cleanDomain = domainToScan;
          const comparisonContextHeader = {
            "X-Scan-Context": "homepage-compare",
          };
          const comparisonJsonHeaders = {
            "Content-Type": "application/json",
            ...comparisonContextHeader,
          };

          try {
            // Check reachability first
            const reachabilityResponse = await fetch(
              `/api/scan/reachability?domain=${encodeURIComponent(cleanDomain)}`,
              { headers: comparisonContextHeader },
            );
            const reachabilityResult = await reachabilityResponse.json();

            if (!reachabilityResult.reachable) {
              throw new Error(
                reachabilityResult.isParked
                  ? `Domain "${cleanDomain}" is parked or not configured`
                  : `Unable to connect to "${cleanDomain}": ${reachabilityResult.error || "Connection failed"}`,
              );
            }

            // Fetch all scans in parallel for each domain
            const [
              techResponse,
              dnsResponse,
              emailResponse,
              securityResponse,
              geolocationResponse,
              performanceResult,
            ] = await Promise.all([
              fetch("/api/scan/technology", {
                method: "POST",
                headers: comparisonJsonHeaders,
                body: JSON.stringify({ domain: cleanDomain }),
              }),
              fetch("/api/scan/dns", {
                method: "POST",
                headers: comparisonJsonHeaders,
                body: JSON.stringify({ domain: cleanDomain }),
              }),
              fetch("/api/scan/email", {
                method: "POST",
                headers: comparisonJsonHeaders,
                body: JSON.stringify({ domain: cleanDomain }),
              }),
              fetch("/api/scan/security", {
                method: "POST",
                headers: comparisonJsonHeaders,
                body: JSON.stringify({ domain: cleanDomain }),
              }),
              fetch("/api/scan/geolocation", {
                method: "POST",
                headers: comparisonJsonHeaders,
                body: JSON.stringify({ domain: cleanDomain }),
              }),
              runAsyncPerformanceScan(cleanDomain, comparisonJsonHeaders),
            ]);

            const [
              techResult,
              dnsResult,
              emailResult,
              securityResult,
              geolocationResult,
            ] = await Promise.all([
              techResponse.ok ? techResponse.json() : null,
              dnsResponse.ok ? dnsResponse.json() : null,
              emailResponse.ok ? emailResponse.json() : null,
              securityResponse.ok ? securityResponse.json() : null,
              geolocationResponse.ok ? geolocationResponse.json() : null,
            ]);

            // Get provider detection
            let providerResult = null;
            if (dnsResult && geolocationResult) {
              const providerResponse = await fetch("/api/scan/provider", {
                method: "POST",
                headers: comparisonJsonHeaders,
                body: JSON.stringify({
                  domain: cleanDomain,
                  nameservers: dnsResult.records?.NS || [],
                  isp: geolocationResult.isp,
                  organization: geolocationResult.organization,
                  isWebsiteBuilder:
                    techResult?.server?.isWebsiteBuilder || false,
                  builderType: techResult?.server?.builderType || null,
                }),
              });
              if (providerResponse.ok) {
                providerResult = await providerResponse.json();
              }
            }

            return {
              domain: cleanDomain,
              technology: techResult,
              dns: dnsResult,
              email: emailResult,
              performance: performanceResult,
              security: securityResult,
              geolocation: geolocationResult,
              provider: providerResult,
              malware: null,
            };
          } catch (err) {
            console.error(`Scan failed for ${cleanDomain}:`, err);
            return {
              domain: cleanDomain,
              technology: null,
              dns: null,
              email: null,
              performance: null,
              security: null,
              geolocation: null,
              provider: null,
              malware: null,
            };
          }
        }),
      );

      setComparisonData(results);
      // Open the comparison sheet after successful scan
      setShowComparisonSheet(true);
      // Scroll to top for better UX
      setTimeout(() => {
        comparisonRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison scan failed");
    } finally {
      setComparisonLoading(validDomains.map(() => false));
    }
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title={PAGE_META.home.title}
        description={PAGE_META.home.description}
        keywords={PAGE_META.home.keywords}
      />

      {/* Site intro animation */}
      {showIntro && <SiteIntro onComplete={handleIntroComplete} />}

      <TooltipProvider>
        <div
          className="min-h-screen bg-background"
          style={{
            opacity: showIntro && !introComplete ? 0 : 1,
            transition: "opacity 0.3s ease-in",
          }}
        >
          {/* Hero Section */}
          <div className="relative overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

            <div className="relative z-0 container mx-auto px-4 py-16 md:py-24">
              {/* Comparison Mode, History & Guide - Top Right */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex flex-wrap gap-2 justify-end max-w-[140px] sm:max-w-none">
                <Button
                  variant={comparisonMode ? "default" : "outline"}
                  size="icon"
                  onClick={() => {
                    setComparisonMode(!comparisonMode);
                    if (!comparisonMode) {
                      // Reset comparison data when entering comparison mode
                      setComparisonDomains(["", ""]);
                      setComparisonData([]);
                      setComparisonLoading([]);
                    }
                  }}
                  className="h-9 w-9 sm:h-10 sm:w-10 relative overflow-hidden group border-2 shadow-sm flex items-center justify-center"
                  title={
                    comparisonMode ? "Exit Comparison Mode" : "Compare Domains"
                  }
                >
                  <GitCompare className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <ScanHistory onSelectDomain={handleSelectFromHistory} />
                <Link to="/guide">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 relative overflow-hidden group border-2 shadow-sm flex items-center justify-center hover:border-amber-500/50 hover:bg-amber-500/10"
                    title="User Guide"
                  >
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                  </Button>
                </Link>
              </div>

              {/* Epic Hero Intro */}
              <HeroIntro />

              {/* Search Bar - Single or Comparison Mode */}
              <div className="max-w-3xl mx-auto mb-8">
                {!comparisonMode ? (
                  // Single Domain Mode
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Enter domain name (e.g., example.com)"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !isSearching &&
                            domain.trim()
                          ) {
                            e.preventDefault();
                            handleSearch();
                          }
                        }}
                        className="pl-10 h-14 text-lg bg-card border-border"
                      />
                    </div>
                    <Button
                      size="lg"
                      onClick={() => handleSearch()}
                      disabled={isSearching || !domain.trim()}
                      className="h-14 px-8 w-full sm:w-auto relative overflow-hidden group transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-primary/70 hover:-translate-y-1 active:scale-95"
                    >
                      {/* Shimmer effect */}
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></span>
                      {/* Glow pulse */}
                      <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/30 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></span>
                      {/* Border glow */}
                      <span className="absolute inset-0 rounded-md border-2 border-white/0 group-hover:border-white/30 transition-colors duration-500"></span>
                      <span className="relative z-10 flex items-center">
                        {isSearching ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-5 w-5 group-hover:rotate-12 group-hover:scale-125 transition-transform duration-300" />
                            Analyze
                          </>
                        )}
                      </span>
                    </Button>
                    {user && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => void handleAddFavorite()}
                        disabled={
                          isSearching ||
                          isAddingFavorite ||
                          !normalizedFavoriteDomain ||
                          isCurrentDomainFavorite
                        }
                        className="h-14 px-6 w-full sm:w-auto"
                      >
                        <Star
                          className={`mr-2 h-5 w-5 ${
                            isCurrentDomainFavorite
                              ? "fill-yellow-500 text-yellow-500"
                              : ""
                          }`}
                        />
                        {isAddingFavorite
                          ? "Saving..."
                          : isCurrentDomainFavorite
                            ? "Favorited"
                            : "Add Favorite"}
                      </Button>
                    )}
                  </div>
                ) : (
                  // Comparison Mode - Multiple Domains
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Compare Domains</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (comparisonDomains.length < 4) {
                            setComparisonDomains([...comparisonDomains, ""]);
                          }
                        }}
                        disabled={comparisonDomains.length >= 4}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Domain
                      </Button>
                    </div>

                    {comparisonDomains.map((compDomain, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder={`Domain ${index + 1} (e.g., example.com)`}
                            value={compDomain}
                            onChange={(e) => {
                              const newDomains = [...comparisonDomains];
                              newDomains[index] = e.target.value;
                              setComparisonDomains(newDomains);
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                !isSearching &&
                                comparisonDomains.every((d) => d.trim())
                              ) {
                                e.preventDefault();
                                handleComparisonScan();
                              }
                            }}
                            className="pl-10 h-12 bg-card border-border"
                          />
                        </div>
                        {comparisonDomains.length > 2 && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newDomains = comparisonDomains.filter(
                                (_, i) => i !== index,
                              );
                              setComparisonDomains(newDomains);
                            }}
                            className="h-12 w-12"
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    <Button
                      size="lg"
                      onClick={() => handleComparisonScan()}
                      disabled={
                        comparisonDomains.filter((d) => d.trim()).length < 2 ||
                        comparisonLoading.some((l) => l)
                      }
                      className="w-full h-12 relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center">
                        {comparisonLoading.some((l) => l) ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Scanning...
                          </>
                        ) : (
                          <>
                            <GitCompare className="mr-2 h-5 w-5" />
                            Compare{" "}
                            {
                              comparisonDomains.filter((d) => d.trim()).length
                            }{" "}
                            Domains
                          </>
                        )}
                      </span>
                    </Button>
                  </div>
                )}
                {error && (
                  <div className="mt-4 p-6 bg-red-500/10 border-2 border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-sans">
                          {error}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                {scanNotice && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">
                        {scanNotice}
                      </p>
                    </div>
                  </div>
                )}
                {rateLimitMessage && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400">
                    {rateLimitMessage}
                  </div>
                )}

                {/* Progress Bar */}
                {isSearching && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">
                        {scanStage}
                      </span>
                      <span className="text-primary font-bold">
                        {scanProgress}%
                      </span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      {/* Background glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 animate-pulse"></div>
                      {/* Progress fill */}
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${scanProgress}%` }}
                      >
                        {/* Shimmer effect */}
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]"
                          style={{
                            backgroundSize: "200% 100%",
                            animation: "shimmer 1.5s ease-in-out infinite",
                          }}
                        ></div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 shadow-[0_0_10px_2px_rgba(88,101,242,0.5)]"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Comparison Tab Button - Shows when comparison data exists */}
              {comparisonData.length > 0 && !showComparisonSheet && (
                <button
                  onClick={() => setShowComparisonSheet(true)}
                  className="fixed right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-primary to-primary/80 text-primary-foreground px-3 py-6 rounded-l-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:px-4 z-50 group"
                  title="View Domain Comparison"
                >
                  <div className="flex flex-col items-center gap-2">
                    <GitCompare className="h-5 w-5" />
                    <span className="text-xs font-semibold writing-mode-vertical-rl rotate-180">
                      Compare
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {comparisonData.length}
                    </Badge>
                  </div>
                </button>
              )}

              {/* Comparison Results - Removed inline, now in sheet */}
              {renderInlineComparison &&
                comparisonMode &&
                comparisonData.length > 0 && (
                  <div className="max-w-7xl mx-auto mb-12">
                    <Card
                      className="border-border bg-card/50 backdrop-blur"
                      ref={comparisonRef}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <GitCompare className="h-6 w-6 text-primary" />
                              Domain Comparison
                            </CardTitle>
                            <CardDescription>
                              Side-by-side comparison of {comparisonData.length}{" "}
                              domains
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleExportComparison}
                              className="gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Export as Image
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setComparisonMode(false);
                                setComparisonData([]);
                                setComparisonDomains(["", ""]);
                              }}
                              className="gap-2"
                            >
                              <XIcon className="h-4 w-4" />
                              Exit Comparison
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <div
                            className="grid gap-4"
                            style={{
                              gridTemplateColumns: `repeat(${comparisonData.length}, minmax(300px, 1fr))`,
                            }}
                          >
                            {comparisonData.map((data, index) => {
                              // Calculate best indices for highlighting
                              const securityScores = comparisonData.map(
                                (d) => d.security?.score,
                              );
                              const performanceScores = comparisonData.map(
                                (d) => d.performance?.mobile?.score,
                              );
                              const bestSecurityIndex = getBestIndex(
                                securityScores,
                                true,
                              );
                              const bestPerformanceIndex = getBestIndex(
                                performanceScores,
                                true,
                              );

                              return (
                                <div key={index} className="space-y-4">
                                  {/* Domain Header */}
                                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h3 className="font-bold text-lg truncate">
                                        {data.domain}
                                      </h3>
                                      {data.technology?.server
                                        ?.isWebsiteBuilder && (
                                        <Badge
                                          variant="secondary"
                                          className="shrink-0 text-xs"
                                        >
                                          Website Builder
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-2 mt-2"
                                      onClick={() => {
                                        // Exit comparison mode and load this domain's details
                                        setDomain(data.domain);
                                        setRawTechnologyData(data.technology);
                                        setDNSData(data.dns);
                                        setEmailData(data.email);
                                        setPerformanceData(data.performance);
                                        setSecurityData(data.security);
                                        setGeolocationData(data.geolocation);
                                        setProviderData(data.provider);
                                        setComparisonMode(false);
                                        setComparisonData([]);
                                        setActiveTab("hosting");
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        });
                                      }}
                                    >
                                      <Search className="h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>

                                  {/* Hosting Provider */}
                                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Hosting Provider
                                    </div>
                                    <div className="font-semibold">
                                      {data.provider?.provider ||
                                        data.technology?.hosting?.provider ||
                                        "Unknown"}
                                    </div>
                                  </div>

                                  {/* WordPress Version - Only show for actual WordPress sites */}
                                  {!data.technology?.server?.isWebsiteBuilder &&
                                    data.technology?.wordpress.detected &&
                                    (() => {
                                      const wpVersion =
                                        data.technology.wordpress.version;
                                      const wpVersionUncertain =
                                        data.technology?.wordpress
                                          ?.versionUncertain ??
                                        data.technology?.wordpress
                                          ?.versionReliability === "low";
                                      const wpVersionNum = wpVersion
                                        ? parseFloat(
                                            wpVersion
                                              .split(".")
                                              .slice(0, 2)
                                              .join("."),
                                          )
                                        : 0;
                                      const isOutdated =
                                        wpVersionNum > 0 && wpVersionNum < 6.4;
                                      const isCritical =
                                        wpVersionNum > 0 && wpVersionNum < 5.0;

                                      return (
                                        <div
                                          className={`p-4 rounded-lg border ${
                                            isCritical
                                              ? "bg-red-500/10 border-red-500/30"
                                              : isOutdated
                                                ? "bg-orange-500/10 border-orange-500/30"
                                                : "bg-muted/50 border-border"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="text-xs text-muted-foreground">
                                              WordPress (public signal)
                                            </div>
                                            {isCritical && (
                                              <Badge
                                                variant="destructive"
                                                className="text-xs"
                                              >
                                                Critical
                                              </Badge>
                                            )}
                                            {isOutdated && !isCritical && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs bg-orange-500"
                                              >
                                                Outdated
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="font-semibold">
                                            {wpVersionUncertain
                                              ? "Version uncertain"
                                              : wpVersion ||
                                                "Version uncertain"}
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            Based on publicly exposed
                                            assets/feeds; actual core version
                                            may differ.
                                          </div>
                                        </div>
                                      );
                                    })()}

                                  {/* PHP Version - Only show for actual WordPress sites */}
                                  {!data.technology?.server?.isWebsiteBuilder &&
                                    data.technology?.php.detected &&
                                    (() => {
                                      const phpVersion =
                                        data.technology.php.version;
                                      const phpVersionNum = phpVersion
                                        ? parseFloat(
                                            phpVersion
                                              .split(".")
                                              .slice(0, 2)
                                              .join("."),
                                          )
                                        : 0;
                                      const isOutdated =
                                        phpVersionNum > 0 &&
                                        phpVersionNum < 7.4;
                                      const isCritical =
                                        phpVersionNum > 0 &&
                                        phpVersionNum < 7.0;

                                      return (
                                        <div
                                          className={`p-4 rounded-lg border ${
                                            isCritical
                                              ? "bg-red-500/10 border-red-500/30"
                                              : isOutdated
                                                ? "bg-orange-500/10 border-orange-500/30"
                                                : "bg-muted/50 border-border"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="text-xs text-muted-foreground">
                                              PHP Version
                                            </div>
                                            {isCritical && (
                                              <Badge
                                                variant="destructive"
                                                className="text-xs"
                                              >
                                                Critical
                                              </Badge>
                                            )}
                                            {isOutdated && !isCritical && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs bg-orange-500"
                                              >
                                                Outdated
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="font-semibold">
                                            {phpVersion || "Detected"}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                  {/* Security Score */}
                                  {data.security && (
                                    <div
                                      className={`p-4 rounded-lg border ${
                                        index === bestSecurityIndex
                                          ? "bg-green-500/10 border-green-500/30 ring-2 ring-green-500/20"
                                          : "bg-muted/50 border-border"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-xs text-muted-foreground">
                                          Security Score
                                        </div>
                                        {index === bestSecurityIndex && (
                                          <Badge
                                            variant="default"
                                            className="bg-green-600 text-xs"
                                          >
                                            Best
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="font-bold text-2xl">
                                          {data.security.score}
                                        </div>
                                        <Badge
                                          variant={
                                            data.security.grade === "A" ||
                                            data.security.grade === "B"
                                              ? "default"
                                              : "destructive"
                                          }
                                        >
                                          {data.security.grade}
                                        </Badge>
                                      </div>
                                    </div>
                                  )}

                                  {/* Performance Score */}
                                  {data.performance?.mobile && (
                                    <div
                                      className={`p-4 rounded-lg border ${
                                        index === bestPerformanceIndex
                                          ? "bg-green-500/10 border-green-500/30 ring-2 ring-green-500/20"
                                          : "bg-muted/50 border-border"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-xs text-muted-foreground">
                                          Performance (Mobile)
                                        </div>
                                        {index === bestPerformanceIndex && (
                                          <Badge
                                            variant="default"
                                            className="bg-green-600 text-xs"
                                          >
                                            Best
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="font-bold text-2xl">
                                          {data.performance.mobile.score}
                                        </div>
                                        <Badge
                                          variant={
                                            data.performance.mobile.color ===
                                            "green"
                                              ? "default"
                                              : "destructive"
                                          }
                                        >
                                          {data.performance.mobile.grade}
                                        </Badge>
                                      </div>
                                    </div>
                                  )}

                                  {/* Server Location */}
                                  {data.geolocation?.location && (
                                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Server Location
                                      </div>
                                      <div className="font-semibold text-sm">
                                        {data.geolocation.location.city},{" "}
                                        {data.geolocation.location.country}
                                      </div>
                                    </div>
                                  )}

                                  {/* Email Security */}
                                  {data.email && (
                                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                      <div className="text-xs text-muted-foreground mb-2">
                                        Email Security
                                      </div>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex items-center gap-2">
                                          {data.email.spf.configured ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <XCircle className="h-3 w-3 text-red-500" />
                                          )}
                                          <span>SPF</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {data.email.dmarc.configured ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <XCircle className="h-3 w-3 text-red-500" />
                                          )}
                                          <span>DMARC</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {data.email.dkim.configured ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <XCircle className="h-3 w-3 text-red-500" />
                                          )}
                                          <span>DKIM</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

              {/* Tabs */}
              <div className="max-w-5xl mx-auto">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-card/50 backdrop-blur">
                    <TabsTrigger
                      value="hosting"
                      className="flex items-center gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden isolate group"
                    >
                      {/* Glow effect - only show on inactive tabs */}
                      {activeTab !== "hosting" && (
                        <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
                      )}
                      <Server className="h-5 w-5 relative z-10 group-hover:rotate-[360deg] group-hover:scale-125 transition-transform duration-700" />
                      <span className="font-semibold relative z-10">
                        Hosting
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="dns"
                      className="flex items-center gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden isolate group"
                    >
                      {/* Glow effect - only show on inactive tabs */}
                      {activeTab !== "dns" && (
                        <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
                      )}
                      <Globe className="h-5 w-5 relative z-10 group-hover:rotate-[720deg] group-hover:scale-125 transition-transform duration-1000" />
                      <span className="font-semibold relative z-10">DNS</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="whois"
                      className="flex items-center gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden isolate group"
                    >
                      {/* Glow effect - only show on inactive tabs */}
                      {activeTab !== "whois" && (
                        <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
                      )}
                      <FileText className="h-5 w-5 relative z-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500" />
                      <span className="font-semibold relative z-10">WHOIS</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="email"
                      className="flex items-center gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden isolate group"
                    >
                      {/* Glow effect - only show on inactive tabs */}
                      {activeTab !== "email" && (
                        <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
                      )}
                      <Mail className="h-5 w-5 relative z-10 group-hover:scale-150 group-hover:-rotate-12 transition-transform duration-500" />
                      <span className="font-semibold relative z-10">Email</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="flex items-center gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden isolate group"
                    >
                      {/* Glow effect - only show on inactive tabs */}
                      {activeTab !== "security" && (
                        <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
                      )}
                      <Shield className="h-5 w-5 relative z-10 group-hover:rotate-12 group-hover:scale-125 transition-transform duration-500" />
                      <span className="font-semibold relative z-10">
                        Security
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="performance"
                      className="flex items-center gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 relative overflow-hidden isolate group"
                    >
                      {/* Glow effect - only show on inactive tabs */}
                      {activeTab !== "performance" && (
                        <span className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
                      )}
                      {isPerformanceLoading && !performanceData ? (
                        <Loader2 className="h-5 w-5 relative z-10 animate-spin text-primary" />
                      ) : (
                        <Zap className="h-5 w-5 relative z-10 group-hover:scale-125 transition-transform duration-500" />
                      )}
                      <span className="font-semibold relative z-10">
                        {isPerformanceMarkedOffline
                          ? "Site Offline"
                          : "Performance"}
                      </span>
                      {isPerformanceLoading && !performanceData && (
                        <span className="relative z-10 text-xs bg-primary/20 px-2 py-0.5 rounded-full animate-pulse">
                          Loading...
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab Content */}
                  <div className="mt-8">
                    <TabsContent value="hosting" className="space-y-6">
                      <Card className="border-border bg-card/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Server className="h-6 w-6 text-primary" />
                            Hosting Analysis
                          </CardTitle>
                          <CardDescription>
                            Discover hosting provider, server details, and
                            control panel requirements
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {!technologyData ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <Server className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">
                                Enter a domain above to analyze hosting details
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* CRITICAL MALWARE/BLACKLIST ALERT - TOP PRIORITY */}
                              {malwareData &&
                                (malwareData.isBlacklisted ||
                                  malwareData.isMalware ||
                                  malwareData.isPhishing) && (
                                  <div className="p-6 rounded-lg border-2 bg-gradient-to-br from-red-500/30 via-red-500/20 to-red-600/20 border-red-500/60 shadow-xl animate-pulse">
                                    <div className="flex items-start gap-4">
                                      <div className="p-3 rounded-lg bg-red-500/30 border border-red-500/50">
                                        <AlertTriangle className="h-8 w-8 text-red-500" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h3 className="text-xl font-bold text-red-500">
                                            ⚠️ CRITICAL SECURITY ALERT
                                          </h3>
                                          <Badge
                                            variant="destructive"
                                            className="text-xs"
                                          >
                                            IMMEDIATE ACTION REQUIRED
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-foreground mb-4 font-semibold">
                                          {malwareData.isMalware &&
                                            "This domain is distributing malware and poses a serious security risk."}
                                          {malwareData.isPhishing &&
                                            !malwareData.isMalware &&
                                            "This domain has been flagged for phishing activity."}
                                          {malwareData.isBlacklisted &&
                                            !malwareData.isMalware &&
                                            !malwareData.isPhishing &&
                                            "This domain is blacklisted by security providers."}
                                        </p>

                                        {/* Threat Details */}
                                        <div className="space-y-3 mb-4">
                                          {malwareData.threats.map(
                                            (threat, idx) => (
                                              <div
                                                key={idx}
                                                className="p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                                              >
                                                <div className="flex items-start gap-2">
                                                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                                  <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className="text-sm font-semibold text-red-500">
                                                        {threat.source}
                                                      </span>
                                                      <Badge
                                                        variant="destructive"
                                                        className="text-xs"
                                                      >
                                                        {threat.severity.toUpperCase()}
                                                      </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                      {threat.description}
                                                    </p>
                                                    {threat.detectedAt && (
                                                      <p className="text-xs text-muted-foreground mt-1">
                                                        Detected:{" "}
                                                        {new Date(
                                                          threat.detectedAt,
                                                        ).toLocaleDateString()}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>

                                        {/* Recommendations */}
                                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                                          <h4 className="text-sm font-semibold mb-2 text-red-500">
                                            Immediate Actions Required:
                                          </h4>
                                          <ul className="space-y-1 text-sm text-muted-foreground">
                                            <li className="flex items-start gap-2">
                                              <span className="text-red-500 mt-0.5">
                                                •
                                              </span>
                                              <span>
                                                Take the website offline
                                                immediately to prevent further
                                                damage
                                              </span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <span className="text-red-500 mt-0.5">
                                                •
                                              </span>
                                              <span>
                                                Contact your hosting provider's
                                                security team
                                              </span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <span className="text-red-500 mt-0.5">
                                                •
                                              </span>
                                              <span>
                                                Scan all files for malware using
                                                security tools
                                              </span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <span className="text-red-500 mt-0.5">
                                                •
                                              </span>
                                              <span>
                                                Change all passwords (hosting,
                                                FTP, database, admin)
                                              </span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <span className="text-red-500 mt-0.5">
                                                •
                                              </span>
                                              <span>
                                                Review server logs for
                                                unauthorized access
                                              </span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <span className="text-red-500 mt-0.5">
                                                •
                                              </span>
                                              <span>
                                                Request removal from blacklists
                                                after cleaning
                                              </span>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              {/* Migration Eligibility Summary Card - TOP PRIORITY */}
                              {!technologyData.server?.isWebsiteBuilder &&
                                technologyData.wordpress?.detected && (
                                  <div
                                    className={`p-6 rounded-lg border-2 ${
                                      technologyData.controlPanel
                                        ?.recommendation === "managed-upgrade"
                                        ? "bg-gradient-to-br from-green-500/20 via-green-500/10 to-emerald-500/10 border-green-500/40 shadow-lg"
                                        : technologyData.controlPanel
                                              ?.recommendation ===
                                            "needs-updates"
                                          ? "bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-yellow-500/10 border-orange-500/40"
                                          : "bg-muted/50 border-border"
                                    }`}
                                  >
                                    <div className="flex items-start gap-4">
                                      <div
                                        className={`p-3 rounded-lg ${
                                          technologyData.controlPanel
                                            ?.recommendation ===
                                          "managed-upgrade"
                                            ? "bg-green-500/20 border border-green-500/30"
                                            : technologyData.controlPanel
                                                  ?.recommendation ===
                                                "needs-updates"
                                              ? "bg-orange-500/20 border border-orange-500/30"
                                              : "bg-muted border border-border"
                                        }`}
                                      >
                                        {technologyData.controlPanel
                                          ?.recommendation ===
                                        "managed-upgrade" ? (
                                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                                        ) : technologyData.controlPanel
                                            ?.recommendation ===
                                          "needs-updates" ? (
                                          <AlertTriangle className="h-8 w-8 text-orange-500" />
                                        ) : (
                                          <Server className="h-8 w-8 text-muted-foreground" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h3 className="text-xl font-semibold">
                                            Migration Eligibility
                                          </h3>
                                          <Badge
                                            variant={
                                              technologyData.controlPanel
                                                ?.recommendation ===
                                              "managed-upgrade"
                                                ? "default"
                                                : "secondary"
                                            }
                                            className={`${
                                              technologyData.controlPanel
                                                ?.recommendation ===
                                              "managed-upgrade"
                                                ? "bg-green-500"
                                                : technologyData.controlPanel
                                                      ?.recommendation ===
                                                    "needs-updates"
                                                  ? "bg-orange-500"
                                                  : ""
                                            }`}
                                          >
                                            {technologyData.controlPanel
                                              ?.recommendation ===
                                              "managed-upgrade" &&
                                              "✓ Migration Ready"}
                                            {technologyData.controlPanel
                                              ?.recommendation ===
                                              "needs-updates" &&
                                              "⚠ Updates Required"}
                                            {technologyData.controlPanel
                                              ?.recommendation ===
                                              "paid-support" &&
                                              "⚠ Needs Professional Help"}
                                            {technologyData.controlPanel
                                              ?.recommendation === "cpanel" &&
                                              "cPanel Detected"}
                                            {(technologyData.controlPanel
                                              ?.recommendation === "unknown" ||
                                              !technologyData.controlPanel
                                                ?.recommendation) &&
                                              "⚠ Unable to Determine"}
                                          </Badge>
                                        </div>

                                        {technologyData.controlPanel
                                          ?.recommendation ===
                                          "managed-upgrade" && (
                                          <div className="space-y-3">
                                            <p className="text-sm text-foreground">
                                              This site meets all standards for
                                              Managed WordPress migration
                                            </p>
                                            <div className="grid grid-cols-3 gap-3">
                                              <div className="flex items-center gap-2 text-xs">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span className="text-muted-foreground">
                                                  WP{" "}
                                                  {
                                                    technologyData.wordpress
                                                      .version
                                                  }
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span className="text-muted-foreground">
                                                  PHP{" "}
                                                  {technologyData.php.version}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span className="text-muted-foreground">
                                                  {technologyData.server?.type}
                                                </span>
                                              </div>
                                            </div>
                                            <Button
                                              variant="default"
                                              size="sm"
                                              className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                                              onClick={() =>
                                                setShowMigrationDialog(true)
                                              }
                                            >
                                              View Migration Benefits
                                            </Button>
                                          </div>
                                        )}

                                        {technologyData.controlPanel
                                          ?.recommendation ===
                                          "needs-updates" && (
                                          <div className="space-y-3">
                                            <p className="text-sm text-foreground">
                                              Update to WP 6.6+ and PHP 7.4+
                                              before migration
                                            </p>
                                            <div className="space-y-2">
                                              {(() => {
                                                const wpVersion = parseFloat(
                                                  technologyData.wordpress.version
                                                    ?.split(".")
                                                    .slice(0, 2)
                                                    .join(".") || "0",
                                                );
                                                const phpVersion = parseFloat(
                                                  technologyData.php.version
                                                    ?.split(".")
                                                    .slice(0, 2)
                                                    .join(".") || "0",
                                                );
                                                return (
                                                  <>
                                                    <div className="flex items-center gap-2 text-xs">
                                                      {wpVersion >= 6.6 ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                      ) : (
                                                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                      )}
                                                      <span className="text-muted-foreground">
                                                        WordPress{" "}
                                                        {
                                                          technologyData
                                                            .wordpress.version
                                                        }{" "}
                                                        {wpVersion < 6.6
                                                          ? "→ 6.6+ required"
                                                          : "✓"}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                      {phpVersion >= 7.4 ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                      ) : (
                                                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                      )}
                                                      <span className="text-muted-foreground">
                                                        PHP{" "}
                                                        {
                                                          technologyData.php
                                                            .version
                                                        }{" "}
                                                        {phpVersion < 7.4
                                                          ? "→ 7.4+ required"
                                                          : "✓"}
                                                      </span>
                                                    </div>
                                                  </>
                                                );
                                              })()}
                                            </div>
                                            <Accordion
                                              type="single"
                                              collapsible
                                              className="mt-3"
                                            >
                                              <AccordionItem
                                                value="update-info"
                                                className="border-orange-500/20"
                                              >
                                                <AccordionTrigger className="text-xs hover:no-underline text-orange-600 dark:text-orange-400">
                                                  What needs updating?
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                  <div className="text-xs text-muted-foreground space-y-1">
                                                    <p>
                                                      • Update WordPress to
                                                      version 6.6 or higher
                                                    </p>
                                                    <p>
                                                      • Upgrade PHP to version
                                                      7.4 or higher
                                                    </p>
                                                    <p>
                                                      • Test site thoroughly
                                                      after updates
                                                    </p>
                                                    <p>
                                                      • Then re-scan to check
                                                      migration eligibility
                                                    </p>
                                                  </div>
                                                </AccordionContent>
                                              </AccordionItem>
                                            </Accordion>
                                          </div>
                                        )}

                                        {technologyData.controlPanel
                                          ?.recommendation ===
                                          "paid-support" && (
                                          <div className="space-y-3">
                                            <p className="text-sm text-foreground">
                                              Site requires significant updates
                                              before migration - professional
                                              assistance recommended
                                            </p>
                                            <div className="space-y-2">
                                              {(() => {
                                                const wpVersion =
                                                  technologyData.wordpress
                                                    ?.version;
                                                const phpVersion =
                                                  technologyData.php?.version;
                                                const wpVersionNumber =
                                                  parseMajorMinorVersion(
                                                    wpVersion,
                                                  );
                                                const phpVersionNumber =
                                                  parseMajorMinorVersion(
                                                    phpVersion,
                                                  );
                                                const wpVersionUncertain =
                                                  technologyData.wordpress
                                                    ?.versionUncertain ??
                                                  technologyData.wordpress
                                                    ?.versionReliability ===
                                                    "low";
                                                const wpMeetsMinimum =
                                                  wpVersionNumber !== null &&
                                                  wpVersionNumber >= 6.6;
                                                const phpMeetsMinimum =
                                                  phpVersionNumber !== null &&
                                                  phpVersionNumber >= 7.4;

                                                return (
                                                  <>
                                                    {wpVersion && (
                                                      <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-xs">
                                                          {wpVersionUncertain ? (
                                                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                          ) : wpMeetsMinimum ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                          ) : (
                                                            <XCircle className="h-4 w-4 text-red-500" />
                                                          )}
                                                          {wpVersionUncertain ? (
                                                            <span className="text-muted-foreground">
                                                              WordPress{" "}
                                                              {wpVersion}{" "}
                                                              (public estimate -
                                                              verify actual
                                                              version before
                                                              migration; 6.6+
                                                              required)
                                                            </span>
                                                          ) : wpMeetsMinimum ? (
                                                            <span className="text-muted-foreground">
                                                              WordPress{" "}
                                                              {wpVersion} (meets
                                                              minimum 6.6+
                                                              requirement)
                                                            </span>
                                                          ) : (
                                                            <Popover>
                                                              <PopoverTrigger
                                                                asChild
                                                              >
                                                                <button
                                                                  type="button"
                                                                  className="text-orange-500 underline underline-offset-4 hover:text-orange-400 text-left"
                                                                >
                                                                  WordPress{" "}
                                                                  {wpVersion}{" "}
                                                                  (too old -
                                                                  needs update
                                                                  to 6.6+)
                                                                </button>
                                                              </PopoverTrigger>
                                                              <PopoverContent
                                                                side="right"
                                                                align="start"
                                                                className="w-80 space-y-1 text-xs"
                                                              >
                                                                <p className="font-semibold text-foreground">
                                                                  Migration
                                                                  support
                                                                  checklist
                                                                </p>
                                                                <p>
                                                                  1. Confirm
                                                                  WordPress core
                                                                  is 6.6+ and
                                                                  PHP is 7.4+.
                                                                </p>
                                                                <p>
                                                                  2. Gather
                                                                  admin access +
                                                                  current
                                                                  host/control
                                                                  panel details.
                                                                </p>
                                                                <p>
                                                                  3. Share the
                                                                  domain and
                                                                  checklist
                                                                  results with
                                                                  support for a
                                                                  migration
                                                                  plan.
                                                                </p>
                                                              </PopoverContent>
                                                            </Popover>
                                                          )}
                                                        </div>
                                                        {wpVersionUncertain && (
                                                          <Popover>
                                                            <PopoverTrigger
                                                              asChild
                                                            >
                                                              <button
                                                                type="button"
                                                                className="ml-6 text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                                                              >
                                                                Verify true
                                                                WordPress
                                                                version
                                                              </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                              side="right"
                                                              align="start"
                                                              className="w-80 space-y-1 text-xs"
                                                            >
                                                              <p className="font-semibold text-foreground">
                                                                Verify true
                                                                WordPress
                                                                version
                                                              </p>
                                                              <p>
                                                                1. WP Admin:
                                                                Dashboard -
                                                                Updates shows
                                                                core version.
                                                              </p>
                                                              <p>
                                                                2. WP-CLI (if
                                                                available): run{" "}
                                                                <code className="font-mono">
                                                                  wp core
                                                                  version
                                                                </code>
                                                                .
                                                              </p>
                                                              <p>
                                                                3. File check:
                                                                open{" "}
                                                                <code className="font-mono">
                                                                  wp-includes/version.php
                                                                </code>{" "}
                                                                and read{" "}
                                                                <code className="font-mono">
                                                                  $wp_version
                                                                </code>
                                                                .
                                                              </p>
                                                            </PopoverContent>
                                                          </Popover>
                                                        )}
                                                      </div>
                                                    )}
                                                    {phpVersion && (
                                                      <div className="flex items-center gap-2 text-xs">
                                                        {phpVersionNumber ===
                                                        null ? (
                                                          <Info className="h-4 w-4 text-blue-500" />
                                                        ) : phpMeetsMinimum ? (
                                                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                          <XCircle className="h-4 w-4 text-red-500" />
                                                        )}
                                                        {phpVersionNumber ===
                                                        null ? (
                                                          <span className="text-muted-foreground">
                                                            PHP {phpVersion}{" "}
                                                            (version could not
                                                            be validated)
                                                          </span>
                                                        ) : phpMeetsMinimum ? (
                                                          <span className="text-muted-foreground">
                                                            PHP {phpVersion}{" "}
                                                            (meets minimum 7.4+
                                                            requirement)
                                                          </span>
                                                        ) : (
                                                          <Popover>
                                                            <PopoverTrigger
                                                              asChild
                                                            >
                                                              <button
                                                                type="button"
                                                                className="text-orange-500 underline underline-offset-4 hover:text-orange-400 text-left"
                                                              >
                                                                PHP {phpVersion}{" "}
                                                                (too old - needs
                                                                update to 7.4+)
                                                              </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                              side="right"
                                                              align="start"
                                                              className="w-80 space-y-1 text-xs"
                                                            >
                                                              <p className="font-semibold text-foreground">
                                                                PHP update
                                                                checklist
                                                              </p>
                                                              <p>
                                                                1. Confirm your
                                                                current PHP
                                                                version in
                                                                hosting control
                                                                panel or Site
                                                                Health.
                                                              </p>
                                                              <p>
                                                                2. Backup
                                                                site/files/database
                                                                and check
                                                                plugin/theme
                                                                compatibility
                                                                with PHP 7.4+.
                                                              </p>
                                                              <p>
                                                                3. Upgrade PHP
                                                                to 7.4+ and
                                                                retest site
                                                                functionality
                                                                before
                                                                migration.
                                                              </p>
                                                            </PopoverContent>
                                                          </Popover>
                                                        )}
                                                      </div>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </div>

                                            <Button
                                              variant="default"
                                              size="sm"
                                              className="mt-2 bg-orange-700 hover:bg-orange-600 text-white border border-orange-300/40 shadow-[0_0_14px_rgba(194,65,12,0.32)] hover:shadow-[0_0_18px_rgba(194,65,12,0.42)]"
                                              onClick={() =>
                                                setShowPaidSupportDetails(
                                                  (prev) => !prev,
                                                )
                                              }
                                            >
                                              {showPaidSupportDetails
                                                ? "Hide Migration Support Details"
                                                : "Contact Support for Migration Help"}
                                            </Button>

                                            {showPaidSupportDetails && (
                                              <div className="space-y-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 shadow-[0_0_28px_rgba(249,115,22,0.25)] animate-in fade-in-0 slide-in-from-top-1 duration-200">
                                                <div className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                                                  <AlertTriangle className="h-3.5 w-3.5" />
                                                  PAID SUPPORT RECOMMENDED
                                                </div>

                                                <div className="flex items-start gap-3">
                                                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                                  <div>
                                                    <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                                      Critical Updates Required
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                      {technologyData
                                                        .controlPanel?.reason ||
                                                        "This site needs professional migration help before it can be safely moved."}
                                                    </p>
                                                  </div>
                                                </div>

                                                <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-3">
                                                  <h5 className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2">
                                                    Updates without a developer
                                                    can break the site
                                                  </h5>
                                                  <ul className="space-y-1 text-xs text-muted-foreground">
                                                    <li>
                                                      - Outdated software can
                                                      require careful migration
                                                      planning.
                                                    </li>
                                                    <li>
                                                      - Professional migration
                                                      helps reduce downtime and
                                                      data loss risk.
                                                    </li>
                                                    <li>
                                                      - Sites on older stacks
                                                      have higher security and
                                                      compatibility risk.
                                                    </li>
                                                  </ul>
                                                </div>

                                                <div className="text-xs pt-1 border-t border-orange-500/20">
                                                  <span className="text-muted-foreground">
                                                    Current versions:{" "}
                                                  </span>
                                                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                    WP{" "}
                                                    {technologyData.wordpress
                                                      ?.version ||
                                                      "unknown"}{" "}
                                                    | PHP{" "}
                                                    {technologyData.php
                                                      ?.version || "unknown"}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {(technologyData.controlPanel
                                          ?.recommendation === "unknown" ||
                                          technologyData.controlPanel
                                            ?.recommendation === "cpanel") && (
                                          <div className="space-y-3">
                                            <p className="text-sm text-muted-foreground">
                                              {technologyData.controlPanel
                                                ?.reason ||
                                                "Unable to determine migration eligibility. Version information may not be available."}
                                            </p>
                                            <div className="space-y-2">
                                              {technologyData.wordpress
                                                ?.version && (
                                                <div className="flex items-center gap-2 text-xs">
                                                  <Info className="h-4 w-4 text-blue-500" />
                                                  <span className="text-muted-foreground">
                                                    WordPress{" "}
                                                    {
                                                      technologyData.wordpress
                                                        .version
                                                    }
                                                  </span>
                                                </div>
                                              )}
                                              {technologyData.php?.version && (
                                                <div className="flex items-center gap-2 text-xs">
                                                  <Info className="h-4 w-4 text-blue-500" />
                                                  <span className="text-muted-foreground">
                                                    PHP{" "}
                                                    {technologyData.php.version}
                                                  </span>
                                                </div>
                                              )}
                                              {!technologyData.wordpress
                                                ?.version &&
                                                !technologyData.php
                                                  ?.version && (
                                                  <div className="flex items-center gap-2 text-xs">
                                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                    <span className="text-muted-foreground">
                                                      Version information not
                                                      available
                                                    </span>
                                                  </div>
                                                )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {/* Website Builder Detection - TOP PRIORITY */}
                              {technologyData.server?.isWebsiteBuilder && (
                                <div className="p-6 rounded-lg border-2 bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-cyan-500/10 border-blue-500/40 shadow-lg">
                                  <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                      <Globe className="h-8 w-8 text-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-semibold">
                                          Website Builder Detected
                                        </h3>
                                        <Badge
                                          variant="default"
                                          className="bg-blue-500"
                                        >
                                          {technologyData.server.builderType ||
                                            "Managed Platform"}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-foreground/80 mb-3">
                                        This site is hosted on{" "}
                                        <strong>
                                          {technologyData.server.builderType ||
                                            "a website builder platform"}
                                        </strong>
                                        , which provides fully managed hosting,
                                        security, and updates.
                                      </p>
                                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                        <CheckCircle2 className="h-5 w-5 text-blue-500" />
                                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                          No migration needed - already on
                                          managed infrastructure
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                  <div className="text-sm text-muted-foreground mb-1">
                                    Hosting Provider
                                  </div>
                                  <div className="text-lg font-semibold">
                                    {providerData?.provider ||
                                      technologyData.hosting?.provider ||
                                      "Unknown"}
                                  </div>
                                  {providerData?.category && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Category:{" "}
                                      {technologyData.server?.isWebsiteBuilder
                                        ? "Website Builder"
                                        : providerData.category}
                                    </div>
                                  )}
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                  <div className="text-sm text-muted-foreground mb-1">
                                    Server Type
                                  </div>
                                  <div className="text-lg font-semibold">
                                    {technologyData.server?.isWebsiteBuilder
                                      ? technologyData.server.builderType ||
                                        "Website Builder"
                                      : technologyData.server?.type ||
                                        "Unknown"}
                                  </div>
                                </div>
                                {/* Only show WordPress/PHP for actual WordPress sites, not website builders */}
                                {!technologyData.server?.isWebsiteBuilder && (
                                  <>
                                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                      <div className="text-sm text-muted-foreground mb-1">
                                        WordPress
                                      </div>
                                      {technologyData.wordpress?.detected ? (
                                        <div className="space-y-1">
                                          <div className="text-lg font-semibold">
                                            Version{" "}
                                            {technologyData.wordpress.version}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Detection certainty:{" "}
                                            {technologyData.wordpress
                                              ?.certainty === "confirmed"
                                              ? "Confirmed"
                                              : technologyData.wordpress
                                                    ?.certainty === "likely"
                                                ? "Likely"
                                                : technologyData.wordpress
                                                      ?.certainty ===
                                                    "unverified"
                                                  ? "Unverified"
                                                  : "Unknown"}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-lg font-semibold">
                                          Not detected
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                      <div className="text-sm text-muted-foreground mb-1">
                                        PHP Version
                                      </div>
                                      <div className="text-lg font-semibold">
                                        {technologyData.php?.detected ? (
                                          <>{technologyData.php.version}</>
                                        ) : (
                                          "Not detected"
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Server Location */}
                              {geolocationData && geolocationData.location && (
                                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                  <div className="flex items-center gap-2 mb-3">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    <h3 className="text-sm font-semibold">
                                      Server Location
                                    </h3>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Location
                                      </div>
                                      <div className="text-sm font-medium">
                                        {geolocationData.location.city},{" "}
                                        {geolocationData.location.region}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {geolocationData.location.country} (
                                        {geolocationData.location.countryCode})
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        IP Address
                                      </div>
                                      <div className="text-sm font-mono">
                                        {geolocationData.ipAddress}
                                      </div>
                                      {geolocationData.isp && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          ISP: {geolocationData.isp}
                                        </div>
                                      )}
                                    </div>
                                    {geolocationData.distances?.closest && (
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">
                                          Nearest US City
                                        </div>
                                        <div className="text-sm font-medium">
                                          {
                                            geolocationData.distances.closest
                                              .city
                                          }
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {Math.round(
                                            geolocationData.distances.closest
                                              .distance,
                                          )}{" "}
                                          miles away
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Regular Recommendations */}
                              {technologyData.controlPanel &&
                                technologyData.controlPanel.recommendation !==
                                  "unknown" &&
                                !technologyData.controlPanel
                                  .needsPaidSupport && (
                                  <div
                                    className={`p-6 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                                      technologyData.controlPanel
                                        .recommendation === "managed-upgrade"
                                        ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15"
                                        : "bg-primary/10 border-primary/20 hover:bg-primary/15"
                                    }`}
                                    onClick={() => setShowMigrationDialog(true)}
                                  >
                                    <div
                                      className={`text-sm font-semibold mb-2 ${
                                        technologyData.controlPanel
                                          .recommendation === "managed-upgrade"
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-primary"
                                      }`}
                                    >
                                      {technologyData.controlPanel
                                        .recommendation === "managed-upgrade"
                                        ? "🚀 Upgrade Recommendation"
                                        : "Control Panel Recommendation"}
                                    </div>
                                    <div className="text-lg font-bold mb-2">
                                      {technologyData.controlPanel
                                        .recommendation === "managed-upgrade"
                                        ? "Managed WordPress Hosting"
                                        : "cPanel Hosting"}
                                    </div>
                                    <div className="text-muted-foreground mb-3">
                                      {technologyData.controlPanel.reason}
                                    </div>

                                    <div className="text-sm text-primary font-medium flex items-center gap-2 mt-4">
                                      <span>
                                        Click to view{" "}
                                        {technologyData.controlPanel
                                          .recommendation === "managed-upgrade"
                                          ? "migration benefits"
                                          : "details"}
                                      </span>
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 5l7 7-7 7"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="dns" className="space-y-6">
                      <Card className="border-border bg-card/50 backdrop-blur">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Globe className="h-6 w-6 text-primary" />
                                DNS Records
                              </CardTitle>
                              <CardDescription>
                                View DNS configuration, nameservers, and domain
                                records
                              </CardDescription>
                            </div>
                            {dnsData && dnsData.records && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const discoveredSubdomains =
                                    Array.isArray(dnsData.subdomains) &&
                                    dnsData.subdomains.length > 0
                                      ? dnsData.subdomains
                                      : dnsData.records.CNAME || [];

                                  // Format DNS records for easy copy/paste to DNS provider
                                  const formatDNSForEmail = () => {
                                    let output = `DNS Records for ${domain}\n`;
                                    output += `${"=".repeat(60)}\n\n`;

                                    // A Records (Website IP addresses)
                                    if (
                                      dnsData.records.A &&
                                      dnsData.records.A.length > 0
                                    ) {
                                      output += `Website IP Addresses:\n`;
                                      dnsData.records.A.forEach((ip, index) => {
                                        output += `  ${index + 1}. ${ip}\n`;
                                      });
                                      output += `\n`;
                                    }

                                    // AAAA Records (IPv6 addresses)
                                    if (
                                      dnsData.records.AAAA &&
                                      dnsData.records.AAAA.length > 0
                                    ) {
                                      output += `Website IPv6 Addresses:\n`;
                                      dnsData.records.AAAA.forEach(
                                        (ip, index) => {
                                          output += `  ${index + 1}. ${ip}\n`;
                                        },
                                      );
                                      output += `\n`;
                                    }

                                    // MX Records (Email servers)
                                    if (
                                      dnsData.records.MX &&
                                      dnsData.records.MX.length > 0
                                    ) {
                                      output += `Email Servers:\n`;
                                      dnsData.records.MX.forEach(
                                        (mx, index) => {
                                          output += `  ${index + 1}. ${mx.exchange} (Priority: ${mx.priority})\n`;
                                        },
                                      );
                                      output += `\n`;
                                    }

                                    // Subdomains
                                    if (discoveredSubdomains.length > 0) {
                                      output += `Subdomains:\n`;
                                      discoveredSubdomains.forEach(
                                        (subdomain, index) => {
                                          output += `  ${index + 1}. ${subdomain}\n`;
                                        },
                                      );
                                      output += `\n`;
                                    }

                                    // TXT Records (Verification & Security)
                                    if (
                                      dnsData.records.TXT &&
                                      dnsData.records.TXT.length > 0
                                    ) {
                                      output += `Verification & Security Records:\n`;
                                      dnsData.records.TXT.forEach(
                                        (txt, index) => {
                                          const value = Array.isArray(txt)
                                            ? txt.join(" ")
                                            : txt;
                                          output += `  ${index + 1}. ${value}\n`;
                                        },
                                      );
                                      output += `\n`;
                                    }

                                    // NS Records (Nameservers)
                                    if (
                                      dnsData.records.NS &&
                                      dnsData.records.NS.length > 0
                                    ) {
                                      output += `Nameservers:\n`;
                                      dnsData.records.NS.forEach(
                                        (ns, index) => {
                                          output += `  ${index + 1}. ${ns}\n`;
                                        },
                                      );
                                      output += `\n`;
                                    }

                                    output += `${"=".repeat(60)}\n`;
                                    output += `Generated: ${new Date().toLocaleDateString()}\n\n`;
                                    output += `To use these records:\n`;
                                    output += `1. Send this to your DNS provider or hosting company\n`;
                                    output += `2. They will add these records to your domain\n`;
                                    output += `3. Changes take 24-48 hours to fully update\n`;

                                    return output;
                                  };

                                  const formattedDNS = formatDNSForEmail();
                                  navigator.clipboard.writeText(formattedDNS);

                                  // Show success feedback
                                  const button =
                                    document.activeElement as HTMLButtonElement;
                                  const originalText = button.textContent;
                                  button.textContent = "✓ Copied!";
                                  setTimeout(() => {
                                    button.textContent = originalText;
                                  }, 2000);
                                }}
                                className="gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Copy All DNS
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {!dnsData || !dnsData.records ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">
                                Enter a domain above to view DNS records
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* Website Builder Simplified Message */}
                              {technologyData?.server?.isWebsiteBuilder ? (
                                <div className="p-6 rounded-lg border-2 bg-gradient-to-br from-blue-500/10 via-primary/5 to-cyan-500/10 border-blue-500/30">
                                  <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                      <CheckCircle2 className="h-8 w-8 text-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-xl font-semibold mb-2">
                                        DNS Managed by{" "}
                                        {technologyData.server.builderType ||
                                          "Website Builder"}
                                      </h3>
                                      <p className="text-sm text-muted-foreground mb-3">
                                        Your DNS is automatically configured and
                                        managed by your website builder
                                        platform. No manual DNS configuration
                                        needed!
                                      </p>
                                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                          DNS automatically optimized by your
                                          platform
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* DNS Smart Recommendations Card - TOP PRIORITY */
                                (() => {
                                  const recommendations = [];
                                  const insights = [];

                                  // Check for missing email security records
                                  if (emailData) {
                                    if (!emailData.spf?.configured) {
                                      recommendations.push({
                                        type: "warning",
                                        text: "Add SPF record to prevent email spoofing",
                                      });
                                    }
                                    if (!emailData.dmarc?.configured) {
                                      recommendations.push({
                                        type: "warning",
                                        text: "Configure DMARC policy for email authentication",
                                      });
                                    }
                                    if (!emailData.dkim?.configured) {
                                      recommendations.push({
                                        type: "warning",
                                        text: "Enable DKIM for email signature verification",
                                      });
                                    }
                                  }

                                  // Check for CAA records (security best practice)
                                  if (
                                    !dnsData.records.CAA ||
                                    dnsData.records.CAA.length === 0
                                  ) {
                                    recommendations.push({
                                      type: "info",
                                      text: "Consider adding CAA records to control SSL certificate issuance",
                                    });
                                  }

                                  // Check nameserver configuration
                                  if (
                                    dnsData.records.NS &&
                                    dnsData.records.NS.length > 0
                                  ) {
                                    const nsCount = dnsData.records.NS.length;
                                    if (nsCount >= 2) {
                                      insights.push({
                                        type: "success",
                                        text: `${nsCount} nameservers configured (redundancy ✓)`,
                                      });
                                    } else {
                                      recommendations.push({
                                        type: "warning",
                                        text: "Add additional nameservers for redundancy",
                                      });
                                    }
                                  }

                                  // Check email routing
                                  if (
                                    emailData?.mx &&
                                    emailData.mx.length > 0
                                  ) {
                                    insights.push({
                                      type: "success",
                                      text: `Email routing configured with ${emailData.mx.length} MX record${emailData.mx.length > 1 ? "s" : ""}`,
                                    });
                                  } else if (
                                    dnsData.records.MX &&
                                    dnsData.records.MX.length === 0
                                  ) {
                                    recommendations.push({
                                      type: "info",
                                      text: "No MX records found - email delivery not configured",
                                    });
                                  }

                                  // Check for IPv6 support
                                  if (
                                    !dnsData.records.AAAA ||
                                    dnsData.records.AAAA.length === 0
                                  ) {
                                    recommendations.push({
                                      type: "info",
                                      text: "Consider adding AAAA records for IPv6 support",
                                    });
                                  } else {
                                    insights.push({
                                      type: "success",
                                      text: "IPv6 support enabled (AAAA records present)",
                                    });
                                  }

                                  return (
                                    <div className="p-6 rounded-lg border-2 bg-gradient-to-br from-blue-500/10 via-primary/5 to-purple-500/10 border-primary/20">
                                      <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
                                          <Lightbulb className="h-8 w-8 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                          <h3 className="text-xl font-semibold mb-3">
                                            DNS Health & Recommendations
                                          </h3>

                                          {/* Insights */}
                                          {insights.length > 0 && (
                                            <div className="space-y-2 mb-4">
                                              {insights.map((insight, i) => (
                                                <div
                                                  key={i}
                                                  className="flex items-start gap-2 text-sm"
                                                >
                                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                  <span className="text-green-600 dark:text-green-400">
                                                    {insight.text}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {/* Recommendations */}
                                          {recommendations.length > 0 ? (
                                            <div className="space-y-2">
                                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                                Suggested Improvements:
                                              </p>
                                              {recommendations.map((rec, i) => (
                                                <div
                                                  key={i}
                                                  className="flex items-start gap-2 text-sm"
                                                >
                                                  {rec.type === "warning" ? (
                                                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                                  ) : (
                                                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                  )}
                                                  <span
                                                    className={
                                                      rec.type === "warning"
                                                        ? "text-orange-600 dark:text-orange-400"
                                                        : "text-blue-600 dark:text-blue-400"
                                                    }
                                                  >
                                                    {rec.text}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                                              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                                DNS configuration looks healthy!
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()
                              )}

                              <Accordion type="multiple" className="w-full">
                                {/* A Records */}
                                {dnsData.records.A &&
                                  dnsData.records.A.length > 0 && (
                                    <AccordionItem value="a-records">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <Globe className="h-4 w-4 text-primary" />
                                          <span className="font-semibold">
                                            A Records (IPv4)
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            {dnsData.records.A.length}
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {dnsData.records.A.map((ip, i) => (
                                            <div
                                              key={i}
                                              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                                            >
                                              <p className="text-sm text-foreground font-mono">
                                                {ip}
                                              </p>
                                              <CopyButton
                                                text={ip}
                                                label="Copy"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                {/* AAAA Records */}
                                {dnsData.records.AAAA &&
                                  dnsData.records.AAAA.length > 0 && (
                                    <AccordionItem value="aaaa-records">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <Globe className="h-4 w-4 text-primary" />
                                          <span className="font-semibold">
                                            AAAA Records (IPv6)
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            {dnsData.records.AAAA.length}
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {dnsData.records.AAAA.map((ip, i) => (
                                            <div
                                              key={i}
                                              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                                            >
                                              <p className="text-sm text-foreground font-mono break-all">
                                                {ip}
                                              </p>
                                              <CopyButton
                                                text={ip}
                                                label="Copy"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                {/* MX Records */}
                                {dnsData.records.MX &&
                                  dnsData.records.MX.length > 0 && (
                                    <AccordionItem value="mx-records">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <Mail className="h-4 w-4 text-primary" />
                                          <span className="font-semibold">
                                            MX Records (Mail Servers)
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            {dnsData.records.MX.length}
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {dnsData.records.MX.map((mx, i) => (
                                            <div
                                              key={i}
                                              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                                            >
                                              <div className="flex-1">
                                                <p className="text-sm text-foreground font-mono">
                                                  {mx.exchange}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  Priority: {mx.priority}
                                                </p>
                                              </div>
                                              <CopyButton
                                                text={mx.exchange}
                                                label="Copy"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                {/* NS Records */}
                                {dnsData.records.NS &&
                                  dnsData.records.NS.length > 0 && (
                                    <AccordionItem value="ns-records">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <Server className="h-4 w-4 text-primary" />
                                          <span className="font-semibold">
                                            NS Records (Nameservers)
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            {dnsData.records.NS.length}
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {dnsData.records.NS.map((ns, i) => (
                                            <div
                                              key={i}
                                              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                                            >
                                              <p className="text-sm text-foreground font-mono">
                                                {ns}
                                              </p>
                                              <CopyButton
                                                text={ns}
                                                label="Copy"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                {/* CNAME Records */}
                                {dnsData.records.CNAME &&
                                  dnsData.records.CNAME.length > 0 && (
                                    <AccordionItem value="cname-records">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <ArrowRightLeft className="h-4 w-4 text-primary" />
                                          <span className="font-semibold">
                                            CNAME Records (Canonical Name)
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            {dnsData.records.CNAME.length}
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {dnsData.records.CNAME.map(
                                            (cname, i) => (
                                              <div
                                                key={i}
                                                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                                              >
                                                <p className="text-sm text-foreground font-mono break-all">
                                                  {cname}
                                                </p>
                                                <CopyButton
                                                  text={cname}
                                                  label="Copy"
                                                />
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                {/* Discovered Subdomains */}
                                {dnsData.subdomains &&
                                  dnsData.subdomains.length > 0 && (
                                    <AccordionItem value="discovered-subdomains">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <Network className="h-4 w-4 text-primary" />
                                          <span className="font-semibold">
                                            Discovered Subdomains
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            {dnsData.subdomains.length}
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {dnsData.subdomains
                                            .slice(0, 50)
                                            .map((subdomain, i) => (
                                              <div
                                                key={`${subdomain}-${i}`}
                                                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                                              >
                                                <p className="text-sm text-foreground font-mono break-all">
                                                  {subdomain}
                                                </p>
                                                <CopyButton
                                                  text={subdomain}
                                                  label="Copy"
                                                />
                                              </div>
                                            ))}
                                          {dnsData.subdomains.length > 50 && (
                                            <p className="text-xs text-muted-foreground pt-1">
                                              +{dnsData.subdomains.length - 50}{" "}
                                              more subdomains discovered
                                            </p>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                {/* TXT Records */}
                                {dnsData.records.TXT &&
                                  dnsData.records.TXT.length > 0 && (
                                    <AccordionItem value="txt-records">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-primary" />
                                          <span className="font-semibold">
                                            TXT Records
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            {dnsData.records.TXT.length}
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 pt-2">
                                          {dnsData.records.TXT.map((txt, i) => (
                                            <div
                                              key={i}
                                              className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                                            >
                                              <p className="text-xs text-foreground font-mono break-all flex-1">
                                                {txt}
                                              </p>
                                              <CopyButton
                                                text={txt}
                                                label="Copy"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                {/* No Records Found */}
                                {(!dnsData.records.A ||
                                  dnsData.records.A.length === 0) &&
                                  (!dnsData.records.AAAA ||
                                    dnsData.records.AAAA.length === 0) &&
                                  (!dnsData.records.MX ||
                                    dnsData.records.MX.length === 0) &&
                                  (!dnsData.records.NS ||
                                    dnsData.records.NS.length === 0) &&
                                  (!dnsData.records.CNAME ||
                                    dnsData.records.CNAME.length === 0) &&
                                  (!dnsData.records.TXT ||
                                    dnsData.records.TXT.length === 0) &&
                                  (!dnsData.subdomains ||
                                    dnsData.subdomains.length === 0) && (
                                    <div className="text-center py-8 text-muted-foreground">
                                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                      <p>No DNS records found</p>
                                    </div>
                                  )}
                              </Accordion>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* WHOIS Tab */}
                    <TabsContent value="whois" className="space-y-6">
                      <Card className="border-border bg-card/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-6 w-6 text-primary" />
                            WHOIS Information
                          </CardTitle>
                          <CardDescription>
                            Domain ownership, registration details, and
                            registrar information
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {!whoisData ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">
                                Enter a domain above to view WHOIS information
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Error Message */}
                              {whoisData.error ? (
                                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">
                                        WHOIS Data Unavailable
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Unable to fetch WHOIS information. This
                                        may be due to privacy protection or API
                                        limitations.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Info Note */}
                                  <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                    <div className="flex items-start gap-2">
                                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                      <div className="text-xs text-muted-foreground">
                                        <p>
                                          <span className="font-semibold text-foreground">
                                            Data Source:
                                          </span>{" "}
                                          Uses RDAP (modern WHOIS) for
                                          .com/.net/.org domains. Owner details
                                          are often privacy-protected.
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Check if we have any data */}
                                  {!whoisData.registrar &&
                                  !whoisData.createdDate &&
                                  !whoisData.expiryDate &&
                                  !whoisData.nameServers?.length ? (
                                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                      <div className="flex items-start gap-2">
                                        <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-sm font-semibold text-foreground">
                                            Limited WHOIS Data
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            This domain may have privacy
                                            protection enabled, limiting
                                            available WHOIS information.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Original WHOIS Data Grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Registrar */}
                                        {whoisData.registrar && (
                                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Server className="h-4 w-4 text-primary" />
                                              <span className="text-sm font-semibold text-foreground">
                                                Registrar
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground font-medium">
                                              {whoisData.registrar}
                                            </p>
                                            {whoisData.registrarUrl && (
                                              <a
                                                href={whoisData.registrarUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                              >
                                                Visit Website
                                                <ExternalLink className="h-3 w-3" />
                                              </a>
                                            )}
                                          </div>
                                        )}

                                        {/* Created Date */}
                                        {whoisData.createdDate && (
                                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                                              <span className="text-sm font-semibold text-foreground">
                                                Created Date
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground font-medium">
                                              {new Date(
                                                whoisData.createdDate,
                                              ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                              })}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {(() => {
                                                const created = new Date(
                                                  whoisData.createdDate,
                                                );
                                                const now = new Date();
                                                const years = Math.floor(
                                                  (now.getTime() -
                                                    created.getTime()) /
                                                    (1000 * 60 * 60 * 24 * 365),
                                                );
                                                return years > 0
                                                  ? `${years} year${years !== 1 ? "s" : ""} ago`
                                                  : "Less than a year ago";
                                              })()}
                                            </p>
                                          </div>
                                        )}

                                        {/* Expiry Date */}
                                        {whoisData.expiryDate && (
                                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                                              <span className="text-sm font-semibold text-foreground">
                                                Expiry Date
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground font-medium">
                                              {new Date(
                                                whoisData.expiryDate,
                                              ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                              })}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {(() => {
                                                const expiry = new Date(
                                                  whoisData.expiryDate,
                                                );
                                                const now = new Date();
                                                const days = Math.floor(
                                                  (expiry.getTime() -
                                                    now.getTime()) /
                                                    (1000 * 60 * 60 * 24),
                                                );
                                                if (days < 0) return "Expired!";
                                                if (days <= 30)
                                                  return `⚠️ Expires in ${days} days`;
                                                if (days <= 90)
                                                  return `Expires in ${days} days`;
                                                return `${Math.floor(days / 30)} months remaining`;
                                              })()}
                                            </p>
                                          </div>
                                        )}

                                        {/* Updated Date */}
                                        {whoisData.updatedDate && (
                                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                              <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                                              <span className="text-sm font-semibold text-foreground">
                                                Last Updated
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground font-medium">
                                              {new Date(
                                                whoisData.updatedDate,
                                              ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                              })}
                                            </p>
                                          </div>
                                        )}

                                        {/* Registrant Organization */}
                                        {whoisData.registrantOrg && (
                                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Globe className="h-4 w-4 text-primary" />
                                              <span className="text-sm font-semibold text-foreground">
                                                Owner Organization
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground font-medium">
                                              {whoisData.registrantOrg}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Domain registrant
                                            </p>
                                          </div>
                                        )}

                                        {/* Registrant Country */}
                                        {whoisData.registrantCountry && (
                                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                              <MapPin className="h-4 w-4 text-primary" />
                                              <span className="text-sm font-semibold text-foreground">
                                                Owner Country
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground font-medium">
                                              {whoisData.registrantCountry}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Registrant location
                                            </p>
                                          </div>
                                        )}

                                        {/* DNSSEC */}
                                        {whoisData.dnssec && (
                                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Shield className="h-4 w-4 text-primary" />
                                              <span className="text-sm font-semibold text-foreground">
                                                DNSSEC
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground font-medium">
                                              {whoisData.dnssec}
                                            </p>
                                          </div>
                                        )}

                                        {/* Nameservers */}
                                        {whoisData.nameServers &&
                                          whoisData.nameServers.length > 0 && (
                                            <div className="p-4 rounded-lg bg-muted/50 border border-border md:col-span-2">
                                              <div className="flex items-center gap-2 mb-3">
                                                <Network className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-semibold text-foreground">
                                                  Nameservers
                                                </span>
                                                <Badge
                                                  variant="secondary"
                                                  className="ml-auto text-xs"
                                                >
                                                  {whoisData.nameServers.length}{" "}
                                                  servers
                                                </Badge>
                                              </div>
                                              <div className="space-y-2">
                                                {whoisData.nameServers.map(
                                                  (ns, i) => (
                                                    <div
                                                      key={i}
                                                      className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50"
                                                    >
                                                      <code className="text-xs text-foreground font-mono">
                                                        {ns}
                                                      </code>
                                                      <CopyButton text={ns} />
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          )}

                                        {/* Domain Status */}
                                        {whoisData.status &&
                                          whoisData.status.length > 0 && (
                                            <div className="p-4 rounded-lg bg-muted/50 border border-border md:col-span-2">
                                              <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span className="text-sm font-semibold text-foreground">
                                                  Domain Status
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                {whoisData.status.map(
                                                  (status, i) => (
                                                    <Badge
                                                      key={i}
                                                      variant="secondary"
                                                      className="text-xs"
                                                    >
                                                      {status}
                                                    </Badge>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="email" className="space-y-6">
                      <Card className="border-border bg-card/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Mail className="h-6 w-6 text-primary" />
                            Email Configuration
                          </CardTitle>
                          <CardDescription>
                            Check email provider, MX records, and email security
                            settings
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {!emailData ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">
                                Enter a domain above to analyze email
                                configuration
                              </p>
                            </div>
                          ) : (
                            (() => {
                              const hasMxRecords =
                                (emailData.mx?.length ?? 0) > 0;
                              return (
                                <div className="space-y-6">
                                  {/* Email Provider Summary Card */}
                                  <div className="p-6 rounded-lg border-2 bg-gradient-to-br from-blue-500/10 via-primary/5 to-cyan-500/10 border-blue-500/30">
                                    <div className="flex items-start gap-4">
                                      <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
                                        <Mail className="h-8 w-8 text-primary" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                          <h3 className="text-xl font-semibold">
                                            Email Provider
                                          </h3>
                                          {hasMxRecords &&
                                            (() => {
                                              const securityCount = [
                                                emailData.spf?.configured,
                                                emailData.dmarc?.configured,
                                                emailData.dkim?.configured,
                                              ].filter(Boolean).length;
                                              return (
                                                <Badge
                                                  variant="default"
                                                  className={`${
                                                    securityCount === 3
                                                      ? "bg-green-500"
                                                      : securityCount === 2
                                                        ? "bg-orange-500"
                                                        : "bg-red-500"
                                                  }`}
                                                >
                                                  Security: {securityCount}/3
                                                </Badge>
                                              );
                                            })()}
                                        </div>

                                        {/* Email Provider & Security Services from Backend */}
                                        {(() => {
                                          // Get providers from backend detection
                                          const providers = (
                                            emailData.providers || []
                                          ).map((p: string) =>
                                            p === "HostingInfo Email"
                                              ? "Microsoft 365 (GoDaddy)"
                                              : p,
                                          );
                                          const securityServices =
                                            emailData.securityServices || [];

                                          // Determine primary provider
                                          let provider = "Unknown Provider";
                                          let providerIcon = "📧";

                                          if (providers.length > 0) {
                                            provider = providers[0]; // Use first detected provider

                                            // Set icon based on provider
                                            if (provider.includes("Google")) {
                                              providerIcon = "🔵";
                                            } else if (
                                              provider.includes("Microsoft") ||
                                              provider.includes("Outlook")
                                            ) {
                                              providerIcon = "🔷";
                                            } else if (
                                              provider.includes("HostingInfo")
                                            ) {
                                              providerIcon = "🟢";
                                            } else if (
                                              provider.includes("Zoho")
                                            ) {
                                              providerIcon = "🔴";
                                            } else if (
                                              provider.includes("ProtonMail")
                                            ) {
                                              providerIcon = "🔐";
                                            } else if (
                                              provider.includes("Fastmail")
                                            ) {
                                              providerIcon = "⚡";
                                            } else if (
                                              provider.includes("SendGrid") ||
                                              provider.includes("Mailgun") ||
                                              provider.includes("Amazon SES")
                                            ) {
                                              providerIcon = "📮";
                                            } else {
                                              providerIcon = "📧";
                                            }
                                          } else if (
                                            emailData.mx &&
                                            emailData.mx.length > 0
                                          ) {
                                            provider = "Custom Email Server";
                                            providerIcon = "⚙️";
                                          } else {
                                            provider = "No Email Configured";
                                            providerIcon = "❌";
                                          }

                                          return (
                                            <div className="space-y-3">
                                              <div className="flex items-center gap-2">
                                                <span className="text-2xl">
                                                  {providerIcon}
                                                </span>
                                                <span className="text-lg font-semibold">
                                                  {provider}
                                                </span>
                                              </div>

                                              {/* Additional Providers */}
                                              {hasMxRecords &&
                                                providers.length > 1 && (
                                                  <div className="flex flex-wrap gap-2">
                                                    {providers
                                                      .slice(1)
                                                      .map(
                                                        (
                                                          p: string,
                                                          idx: number,
                                                        ) => (
                                                          <Badge
                                                            key={idx}
                                                            variant="outline"
                                                            className="text-xs"
                                                          >
                                                            {p}
                                                          </Badge>
                                                        ),
                                                      )}
                                                  </div>
                                                )}

                                              {/* Email Security Services */}
                                              {hasMxRecords &&
                                                securityServices.length > 0 && (
                                                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                                    <div className="flex items-start gap-2">
                                                      <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                      <div className="flex-1">
                                                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                                          Email Security Layer
                                                          Detected
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                          {securityServices.map(
                                                            (
                                                              service: string,
                                                              idx: number,
                                                            ) => (
                                                              <Badge
                                                                key={idx}
                                                                className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                                              >
                                                                🛡️ {service}
                                                              </Badge>
                                                            ),
                                                          )}
                                                        </div>
                                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                                          Your email is
                                                          protected by an
                                                          additional security
                                                          gateway that filters
                                                          spam, malware, and
                                                          phishing attempts.
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}

                                              {/* Email Security Gateway Status */}
                                              {hasMxRecords &&
                                                (() => {
                                                  const securityGateway =
                                                    emailData.securityGateway;
                                                  const securityLayerDetected =
                                                    Boolean(
                                                      securityGateway?.detected,
                                                    ) ||
                                                    securityServices.length > 0;

                                                  if (
                                                    securityGateway?.detected
                                                  ) {
                                                    // Security Gateway Detected - Show Green Card
                                                    return (
                                                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                                        <div className="flex items-start gap-2">
                                                          <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                          <div className="flex-1">
                                                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">
                                                              Email Security
                                                              Gateway:{" "}
                                                              {
                                                                securityGateway.provider
                                                              }
                                                            </p>
                                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                              Your emails are
                                                              protected by an
                                                              advanced security
                                                              gateway that
                                                              filters spam,
                                                              malware, and
                                                              phishing attacks.
                                                            </p>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  } else if (
                                                    !securityLayerDetected
                                                  ) {
                                                    // No Security Gateway - Show Orange Warning
                                                    return (
                                                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                                        <div className="flex items-start gap-2">
                                                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                                          <div className="flex-1">
                                                            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">
                                                              No Email Security
                                                              Gateway Detected
                                                            </p>
                                                            <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">
                                                              Consider adding an
                                                              email security
                                                              gateway to protect
                                                              against spam,
                                                              phishing, and
                                                              malware.
                                                            </p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                              <Badge
                                                                variant="outline"
                                                                className="text-xs bg-background/50"
                                                              >
                                                                Proofpoint
                                                              </Badge>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  }
                                                  return null;
                                                })()}

                                              {/* Email Security Visual Score */}
                                              {hasMxRecords &&
                                                [
                                                  emailData.spf?.configured,
                                                  emailData.dmarc?.configured,
                                                  emailData.dkim?.configured,
                                                ].filter(Boolean).length !==
                                                  2 && (
                                                  <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                      <span className="text-muted-foreground">
                                                        Email Security Protocols
                                                      </span>
                                                      <span className="font-semibold">
                                                        {
                                                          [
                                                            emailData.spf
                                                              ?.configured,
                                                            emailData.dmarc
                                                              ?.configured,
                                                            emailData.dkim
                                                              ?.configured,
                                                          ].filter(Boolean)
                                                            .length
                                                        }
                                                        /3
                                                      </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                      <div
                                                        className={`flex-1 p-2 rounded text-center text-xs font-medium ${
                                                          emailData.spf
                                                            ?.configured
                                                            ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                                                            : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                                                        }`}
                                                      >
                                                        {emailData.spf
                                                          ?.configured
                                                          ? "✓"
                                                          : "✗"}{" "}
                                                        SPF
                                                      </div>
                                                      <div
                                                        className={`flex-1 p-2 rounded text-center text-xs font-medium ${
                                                          emailData.dkim
                                                            ?.configured
                                                            ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                                                            : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                                                        }`}
                                                      >
                                                        {emailData.dkim
                                                          ?.configured
                                                          ? "✓"
                                                          : "✗"}{" "}
                                                        DKIM
                                                      </div>
                                                      <div
                                                        className={`flex-1 p-2 rounded text-center text-xs font-medium ${
                                                          emailData.dmarc
                                                            ?.configured
                                                            ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
                                                            : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                                                        }`}
                                                      >
                                                        {emailData.dmarc
                                                          ?.configured
                                                          ? "✓"
                                                          : "✗"}{" "}
                                                        DMARC
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}

                                              {/* Deliverability Status */}
                                              {hasMxRecords &&
                                                [
                                                  emailData.spf?.configured,
                                                  emailData.dmarc?.configured,
                                                  emailData.dkim?.configured,
                                                ].filter(Boolean).length !==
                                                  2 && (
                                                  <div
                                                    className={`p-3 rounded-lg border ${
                                                      [
                                                        emailData.spf
                                                          ?.configured,
                                                        emailData.dmarc
                                                          ?.configured,
                                                        emailData.dkim
                                                          ?.configured,
                                                      ].filter(Boolean)
                                                        .length === 3
                                                        ? "bg-green-500/10 border-green-500/30"
                                                        : "bg-red-500/10 border-red-500/30"
                                                    }`}
                                                  >
                                                    <div className="flex items-start gap-2">
                                                      {[
                                                        emailData.spf
                                                          ?.configured,
                                                        emailData.dmarc
                                                          ?.configured,
                                                        emailData.dkim
                                                          ?.configured,
                                                      ].filter(Boolean)
                                                        .length === 3 ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                      ) : (
                                                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                      )}
                                                      <div className="text-xs">
                                                        {[
                                                          emailData.spf
                                                            ?.configured,
                                                          emailData.dmarc
                                                            ?.configured,
                                                          emailData.dkim
                                                            ?.configured,
                                                        ].filter(Boolean)
                                                          .length === 3 && (
                                                          <p className="text-green-600 dark:text-green-400 font-medium">
                                                            ✅ Excellent - All
                                                            security protocols
                                                            configured. Emails
                                                            will have optimal
                                                            deliverability.
                                                          </p>
                                                        )}
                                                        {[
                                                          emailData.spf
                                                            ?.configured,
                                                          emailData.dmarc
                                                            ?.configured,
                                                          emailData.dkim
                                                            ?.configured,
                                                        ].filter(Boolean)
                                                          .length <= 1 && (
                                                          <p className="text-red-600 dark:text-red-400 font-medium">
                                                            🚨 Poor - Critical
                                                            security protocols
                                                            missing. High risk
                                                            of emails being
                                                            marked as spam.
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                            </div>
                                          );
                                        })()}

                                        {/* Website Builder Note */}
                                        {hasMxRecords &&
                                          technologyData?.server
                                            ?.isWebsiteBuilder && (
                                            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                              <div className="flex items-start gap-2">
                                                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                                  <strong>Note:</strong> Your
                                                  email is managed by{" "}
                                                  {technologyData.server
                                                    .builderType ||
                                                    "your website builder"}
                                                  . Contact your platform
                                                  support for email
                                                  configuration assistance.
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* DKIM Missing Alert - Critical Warning */}
                                  {hasMxRecords &&
                                    !emailData.dkim?.configured && (
                                      <div className="p-4 rounded-lg border-2 border-red-500/50 bg-red-500/10">
                                        <div className="flex items-start gap-3">
                                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-red-500 mb-1">
                                              Email Authentication Incomplete -
                                              DKIM Required
                                            </h4>
                                            <p className="text-sm text-foreground">
                                              To enable anti-spoofing and
                                              verification, you must turn on
                                              DKIM first. SPF and DMARC checks
                                              rely on DKIM signing to fully
                                              validate your domain and enforce
                                              your DMARC policy.
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                  {hasMxRecords && (
                                    <Accordion
                                      type="multiple"
                                      className="w-full"
                                    >
                                      {/* MX Records */}
                                      {emailData.mx &&
                                        emailData.mx.length > 0 && (
                                          <AccordionItem value="mx-records">
                                            <AccordionTrigger className="hover:no-underline">
                                              <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-primary" />
                                                <span className="font-semibold">
                                                  MX Records (Mail Servers)
                                                </span>
                                                <Badge
                                                  variant="secondary"
                                                  className="ml-2"
                                                >
                                                  {emailData.mx.length}
                                                </Badge>
                                              </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="space-y-2 pt-2">
                                                {emailData.mx.map((mx, i) => (
                                                  <div
                                                    key={i}
                                                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                                                  >
                                                    <div className="flex-1">
                                                      <p className="text-sm text-foreground font-mono">
                                                        {mx.exchange}
                                                      </p>
                                                      <p className="text-xs text-muted-foreground mt-1">
                                                        Priority: {mx.priority}
                                                      </p>
                                                    </div>
                                                    <CopyButton
                                                      text={mx.exchange}
                                                      label="Copy"
                                                    />
                                                  </div>
                                                ))}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        )}

                                      {/* Email Security */}
                                      <AccordionItem value="email-security">
                                        <AccordionTrigger className="hover:no-underline">
                                          <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-primary" />
                                            <span className="font-semibold">
                                              Email Security
                                            </span>
                                            <Badge
                                              variant="secondary"
                                              className="ml-2"
                                            >
                                              {
                                                [
                                                  emailData.spf?.configured,
                                                  emailData.dmarc?.configured,
                                                  emailData.dkim?.configured,
                                                ].filter(Boolean).length
                                              }
                                              /3
                                            </Badge>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                            {/* SPF */}
                                            <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-sm font-medium">
                                                    SPF
                                                  </span>
                                                  <InfoIcon
                                                    topic="spf"
                                                    size="sm"
                                                    hideRecommendedSolutions
                                                  />
                                                </div>
                                                {emailData.spf?.configured ? (
                                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                  <XCircle className="h-5 w-5 text-red-500" />
                                                )}
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                {emailData.spf?.configured
                                                  ? "Configured"
                                                  : "Not configured"}
                                              </p>
                                              {emailData.spf?.record && (
                                                <div className="mt-2 flex items-start gap-2">
                                                  <p className="text-xs font-mono break-all flex-1 text-muted-foreground">
                                                    {emailData.spf.record}
                                                  </p>
                                                  <CopyButton
                                                    text={emailData.spf.record}
                                                    label="Copy"
                                                  />
                                                </div>
                                              )}
                                            </div>

                                            {/* DMARC */}
                                            <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-sm font-medium">
                                                    DMARC
                                                  </span>
                                                  <InfoIcon
                                                    topic="dmarc"
                                                    size="sm"
                                                    hideRecommendedSolutions
                                                  />
                                                </div>
                                                {emailData.dmarc?.configured ? (
                                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                  <XCircle className="h-5 w-5 text-red-500" />
                                                )}
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                {emailData.dmarc?.configured
                                                  ? "Configured"
                                                  : "Not configured"}
                                              </p>
                                              {emailData.dmarc?.record && (
                                                <div className="mt-2 flex items-start gap-2">
                                                  <p className="text-xs font-mono break-all flex-1 text-muted-foreground">
                                                    {emailData.dmarc.record}
                                                  </p>
                                                  <CopyButton
                                                    text={
                                                      emailData.dmarc.record
                                                    }
                                                    label="Copy"
                                                  />
                                                </div>
                                              )}
                                            </div>

                                            {/* DKIM */}
                                            <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-sm font-medium">
                                                    DKIM
                                                  </span>
                                                  <InfoIcon
                                                    topic="dkim"
                                                    size="sm"
                                                    hideRecommendedSolutions
                                                  />
                                                </div>
                                                {emailData.dkim?.configured ? (
                                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                  <XCircle className="h-5 w-5 text-red-500" />
                                                )}
                                              </div>
                                              <p className="text-xs text-muted-foreground">
                                                {emailData.dkim?.configured
                                                  ? "Configured"
                                                  : "Not configured"}
                                              </p>
                                              {emailData.dkim?.record && (
                                                <div className="mt-2 flex items-start gap-2">
                                                  <p className="text-xs font-mono break-all flex-1 text-muted-foreground">
                                                    {emailData.dkim.record}
                                                  </p>
                                                  <CopyButton
                                                    text={emailData.dkim.record}
                                                    label="Copy"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>

                                      {/* Recommendations */}
                                      {(!emailData.spf?.configured ||
                                        !emailData.dmarc?.configured ||
                                        !emailData.dkim?.configured) && (
                                        <AccordionItem value="recommendations">
                                          <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center gap-2">
                                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                                                Security Recommendations
                                              </span>
                                              <Badge
                                                variant="secondary"
                                                className="ml-2 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                              >
                                                {
                                                  [
                                                    !emailData.spf?.configured,
                                                    !emailData.dmarc
                                                      ?.configured,
                                                    !emailData.dkim?.configured,
                                                  ].filter(Boolean).length
                                                }
                                              </Badge>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent>
                                            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                              <ul className="text-sm text-yellow-600/80 dark:text-yellow-400/80 space-y-1">
                                                {!emailData.spf?.configured && (
                                                  <li>
                                                    • Configure SPF to prevent
                                                    email spoofing
                                                  </li>
                                                )}
                                                {!emailData.dmarc
                                                  ?.configured && (
                                                  <li>
                                                    • Add DMARC policy for email
                                                    authentication
                                                  </li>
                                                )}
                                                {!emailData.dkim
                                                  ?.configured && (
                                                  <li>
                                                    • Enable DKIM for email
                                                    signature verification
                                                  </li>
                                                )}
                                              </ul>
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      )}
                                    </Accordion>
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="space-y-6">
                      {!securityData ? (
                        <Card className="border-border bg-card/50 backdrop-blur">
                          <CardContent className="pt-6">
                            <div className="text-center py-12 text-muted-foreground">
                              <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">
                                Enter a domain above to analyze security
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          {/* Website Builder Security Message */}
                          {technologyData?.server?.isWebsiteBuilder ? (
                            <Card className="border-border bg-card/50 backdrop-blur">
                              <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <Shield className="h-8 w-8 text-green-500" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="text-xl font-semibold">
                                        Security Managed by{" "}
                                        {technologyData.server.builderType ||
                                          "Website Builder"}
                                      </h3>
                                      <Badge
                                        variant="default"
                                        className="bg-green-500"
                                      >
                                        Integrated Security
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      Your site is hosted on{" "}
                                      <span className="font-semibold text-foreground">
                                        {technologyData.server.builderType ||
                                          "a website builder platform"}
                                      </span>
                                      , which provides integrated security
                                      features including:
                                    </p>
                                    <div className="space-y-2 mb-4">
                                      <div className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground">
                                          Built-in DDoS protection
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground">
                                          Automatic SSL/TLS certificates
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground">
                                          Platform-managed security updates
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground">
                                          Infrastructure-level firewall
                                          protection
                                        </span>
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                      <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-muted-foreground">
                                          Security configuration is managed by
                                          your website builder platform. For
                                          additional security features or
                                          questions, please contact your
                                          platform's support team.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <>
                              {/* Security Action Buttons - Only for non-website builders */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Security Improvement Button */}
                                {(securityData.score < 65 ||
                                  !securityData.waf.detected) && (
                                  <Button
                                    onClick={() => setShowSecuritySheet(true)}
                                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-6 shadow-lg"
                                    size="lg"
                                  >
                                    <Shield className="h-5 w-5 mr-2" />
                                    Improve Your Security
                                  </Button>
                                )}

                                {/* Generate Security Report Button */}
                                <Button
                                  onClick={() =>
                                    exportSecurityReportToPDF(domain)
                                  }
                                  variant="outline"
                                  className="w-full border-2 border-primary hover:bg-primary/10 font-semibold py-6"
                                  size="lg"
                                >
                                  <FileDown className="h-5 w-5 mr-2" />
                                  Generate Client Report (PDF)
                                </Button>
                              </div>

                              {/* WAF Card - Prominent at Top */}
                              <Card className="border-border bg-card/50 backdrop-blur">
                                <CardContent className="pt-6">
                                  <div className="flex items-start gap-4">
                                    <div
                                      className={`p-3 rounded-lg ${
                                        securityData.waf.detected
                                          ? "bg-green-500/10 border border-green-500/20"
                                          : "bg-red-500/10 border border-red-500/20"
                                      }`}
                                    >
                                      <Shield
                                        className={`h-8 w-8 ${
                                          securityData.waf.detected
                                            ? "text-green-500"
                                            : "text-red-500"
                                        }`}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-semibold">
                                          Web Application Firewall
                                        </h3>
                                        <InfoIcon topic="waf" size="sm" />
                                        <Badge
                                          variant={
                                            securityData.waf.detected
                                              ? "default"
                                              : "destructive"
                                          }
                                          className={
                                            securityData.waf.detected
                                              ? "bg-green-500"
                                              : ""
                                          }
                                        >
                                          {securityData.waf.detected
                                            ? "Protected"
                                            : "Not Protected"}
                                        </Badge>
                                      </div>
                                      {securityData.waf.detected ? (
                                        <div className="space-y-2">
                                          <p className="text-sm text-muted-foreground">
                                            Your site is protected by{" "}
                                            <span className="font-semibold text-foreground">
                                              {securityData.waf.provider}
                                            </span>
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <p className="text-sm text-muted-foreground">
                                            No Web Application Firewall detected
                                          </p>
                                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mt-3">
                                            <div className="flex items-start gap-2">
                                              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                                Consider adding a WAF like
                                                Cloudflare, Sucuri, or Wordfence
                                                for protection against attacks
                                              </p>
                                            </div>
                                          </div>
                                          <Button
                                            onClick={() =>
                                              setShowNoFirewallDialog(true)
                                            }
                                            variant="destructive"
                                            className="group relative mt-2 overflow-hidden transition-all"
                                          >
                                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-[length:200%_100%] animate-gradient" />
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                            </div>
                                            <AlertTriangle className="relative h-4 w-4 mr-2 text-white" />
                                            <span className="relative text-white">
                                              Critical: No Firewall Detected
                                            </span>
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* DDoS Protection Card */}
                              <Card className="border-border bg-card/50 backdrop-blur">
                                <CardContent className="pt-6">
                                  <div className="flex items-start gap-4">
                                    <div
                                      className={`p-3 rounded-lg ${
                                        securityData.waf.detected &&
                                        [
                                          "Cloudflare",
                                          "Akamai",
                                          "AWS WAF",
                                          "Imperva",
                                        ].includes(
                                          securityData.waf.provider || "",
                                        )
                                          ? "bg-green-500/10 border border-green-500/20"
                                          : "bg-gray-500/10 border border-gray-500/20"
                                      }`}
                                    >
                                      <Zap
                                        className={`h-8 w-8 ${
                                          securityData.waf.detected &&
                                          [
                                            "Cloudflare",
                                            "Akamai",
                                            "AWS WAF",
                                            "Imperva",
                                          ].includes(
                                            securityData.waf.provider || "",
                                          )
                                            ? "text-green-500"
                                            : "text-gray-500"
                                        }`}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-semibold">
                                          DDoS Protection
                                        </h3>
                                        <InfoIcon topic="ddos" size="sm" />
                                        <Badge
                                          variant={
                                            securityData.waf.detected &&
                                            [
                                              "Cloudflare",
                                              "Akamai",
                                              "AWS WAF",
                                              "Imperva",
                                            ].includes(
                                              securityData.waf.provider || "",
                                            )
                                              ? "default"
                                              : "secondary"
                                          }
                                          className={
                                            securityData.waf.detected &&
                                            [
                                              "Cloudflare",
                                              "Akamai",
                                              "AWS WAF",
                                              "Imperva",
                                            ].includes(
                                              securityData.waf.provider || "",
                                            )
                                              ? "bg-green-500"
                                              : ""
                                          }
                                        >
                                          {securityData.waf.detected &&
                                          [
                                            "Cloudflare",
                                            "Akamai",
                                            "AWS WAF",
                                            "Imperva",
                                          ].includes(
                                            securityData.waf.provider || "",
                                          )
                                            ? "Protected"
                                            : "Unknown"}
                                        </Badge>
                                      </div>
                                      {securityData.waf.detected &&
                                      [
                                        "Cloudflare",
                                        "Akamai",
                                        "AWS WAF",
                                        "Imperva",
                                      ].includes(
                                        securityData.waf.provider || "",
                                      ) ? (
                                        <div className="space-y-2">
                                          <p className="text-sm text-muted-foreground">
                                            DDoS protection provided by{" "}
                                            <span className="font-semibold text-foreground">
                                              {securityData.waf.provider}
                                            </span>
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Your site is protected against
                                            distributed denial-of-service
                                            attacks
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <p className="text-sm text-muted-foreground">
                                            Cannot detect DDoS protection
                                            externally
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Server-level DDoS protection may be
                                            enabled through your hosting
                                            provider. Check your hosting control
                                            panel for details.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Security Insights & Recommendations */}
                              {securityData.score < 80 && (
                                <Card className="border-border bg-card/50 backdrop-blur">
                                  <CardContent className="pt-6">
                                    {(() => {
                                      const missingHeaders = Object.entries(
                                        securityData.securityHeaders,
                                      )
                                        .filter(([_, data]) => !data.present)
                                        .map(([header]) => header);

                                      return (
                                        <Accordion
                                          type="single"
                                          collapsible
                                          defaultValue="security-insights"
                                          className="w-full"
                                        >
                                          <AccordionItem
                                            value="security-insights"
                                            className="border-none"
                                          >
                                            <AccordionTrigger className="py-0 hover:no-underline">
                                              <div className="flex items-center gap-2">
                                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                                <h3 className="text-lg font-semibold">
                                                  Security Insights
                                                </h3>
                                              </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-4">
                                              <Accordion
                                                type="multiple"
                                                className="w-full space-y-3"
                                              >
                                                {missingHeaders.length > 0 && (
                                                  <AccordionItem
                                                    value="missing-security-headers"
                                                    className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4"
                                                  >
                                                    <AccordionTrigger className="hover:no-underline py-3">
                                                      <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                                        <XCircle className="h-4 w-4" />
                                                        Missing Security Headers
                                                        ({missingHeaders.length}
                                                        )
                                                      </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                      <div className="space-y-2 pb-1">
                                                        {missingHeaders.map(
                                                          (header) => (
                                                            <div
                                                              key={header}
                                                              className="text-xs text-yellow-600/90 dark:text-yellow-400/90 flex items-start gap-1.5"
                                                            >
                                                              <span className="font-mono font-medium">
                                                                {header}
                                                              </span>
                                                              {header ===
                                                                "Strict-Transport-Security" && (
                                                                <InfoIcon
                                                                  topic="hsts"
                                                                  size="sm"
                                                                />
                                                              )}
                                                              {header ===
                                                                "Content-Security-Policy" && (
                                                                <InfoIcon
                                                                  topic="csp"
                                                                  size="sm"
                                                                />
                                                              )}
                                                              {header ===
                                                                "X-Frame-Options" && (
                                                                <InfoIcon
                                                                  topic="x-frame-options"
                                                                  size="sm"
                                                                />
                                                              )}
                                                              <span className="ml-2">
                                                                {header ===
                                                                  "Content-Security-Policy" &&
                                                                  "- Prevents XSS and injection attacks"}
                                                                {header ===
                                                                  "Strict-Transport-Security" &&
                                                                  "- Forces HTTPS connections"}
                                                                {header ===
                                                                  "X-Frame-Options" &&
                                                                  "- Prevents clickjacking attacks"}
                                                                {header ===
                                                                  "X-Content-Type-Options" &&
                                                                  "- Prevents MIME-type sniffing"}
                                                                {header ===
                                                                  "Referrer-Policy" &&
                                                                  "- Controls referrer information"}
                                                                {header ===
                                                                  "Permissions-Policy" &&
                                                                  "- Controls browser features"}
                                                                {![
                                                                  "Content-Security-Policy",
                                                                  "Strict-Transport-Security",
                                                                  "X-Frame-Options",
                                                                  "X-Content-Type-Options",
                                                                  "Referrer-Policy",
                                                                  "Permissions-Policy",
                                                                ].includes(
                                                                  header,
                                                                ) &&
                                                                  "- Enhances security"}
                                                              </span>
                                                            </div>
                                                          ),
                                                        )}
                                                      </div>
                                                    </AccordionContent>
                                                  </AccordionItem>
                                                )}

                                                {Array.isArray(
                                                  securityData.recommendations,
                                                ) &&
                                                  securityData.recommendations
                                                    .length > 0 && (
                                                    <AccordionItem
                                                      value="recommended-actions"
                                                      className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4"
                                                    >
                                                      <AccordionTrigger className="hover:no-underline py-3">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                                                          <CheckCircle2 className="h-4 w-4" />
                                                          Recommended Actions
                                                        </div>
                                                      </AccordionTrigger>
                                                      <AccordionContent>
                                                        <ul className="space-y-1.5 pb-1">
                                                          {securityData.recommendations.map(
                                                            (rec, i) => (
                                                              <li
                                                                key={i}
                                                                className="text-xs text-blue-600/90 dark:text-blue-400/90"
                                                              >
                                                                - {rec}
                                                              </li>
                                                            ),
                                                          )}
                                                        </ul>
                                                      </AccordionContent>
                                                    </AccordionItem>
                                                  )}
                                              </Accordion>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      );
                                    })()}
                                  </CardContent>
                                </Card>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </TabsContent>

                    {/* Hidden Security Report for PDF Export */}
                    <div className="hidden">
                      {securityData && technologyData && (
                        <SecurityReport
                          domain={domain}
                          securityData={securityData}
                          technologyData={technologyData}
                          dnsData={dnsData}
                          scanDate={new Date()}
                        />
                      )}
                    </div>

                    {/* Performance Tab */}
                    <TabsContent value="performance" className="space-y-6">
                      <Card className="border-border bg-card/50 backdrop-blur">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Zap className="h-6 w-6 text-primary" />
                                PageSpeed Insights
                              </CardTitle>
                              <CardDescription>
                                Google Lighthouse performance scores for mobile
                                and desktop
                              </CardDescription>
                            </div>
                            {performanceData && domain && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPerformanceHistory(true)}
                                className="flex items-center gap-2"
                              >
                                <TrendingUp className="h-4 w-4" />
                                View History
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {!performanceData && !isPerformanceLoading ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">
                                Enter a domain above to analyze performance
                              </p>
                            </div>
                          ) : isPerformanceLoading && !performanceData ? (
                            <div className="text-center py-12">
                              <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
                              <p className="text-lg font-semibold text-primary">
                                Running PageSpeed Insights...
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                This may take 10-30 seconds
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Feel free to explore other tabs while waiting!
                              </p>
                            </div>
                          ) : performanceData &&
                            (performanceData.error ||
                              (performanceData.mobile?.error &&
                                performanceData.desktop?.error)) ? (
                            <Alert
                              className={
                                isPerformanceMarkedOffline
                                  ? "border-yellow-500/30 bg-yellow-500/10"
                                  : "border-red-500/30 bg-red-500/10"
                              }
                            >
                              <AlertTriangle
                                className={
                                  isPerformanceMarkedOffline
                                    ? "h-4 w-4 text-yellow-600 dark:text-yellow-400"
                                    : "h-4 w-4 text-red-600 dark:text-red-400"
                                }
                              />
                              <AlertDescription className="space-y-1">
                                <p
                                  className={
                                    isPerformanceMarkedOffline
                                      ? "font-semibold text-yellow-700 dark:text-yellow-300"
                                      : "font-semibold text-red-700 dark:text-red-300"
                                  }
                                >
                                  {isPerformanceMarkedOffline
                                    ? "Site is offline"
                                    : "Performance data is temporarily unavailable"}
                                </p>
                                <p
                                  className={
                                    isPerformanceMarkedOffline
                                      ? "text-sm text-yellow-700/90 dark:text-yellow-300/90"
                                      : "text-sm text-red-700/90 dark:text-red-300/90"
                                  }
                                >
                                  {isPerformanceMarkedOffline
                                    ? "Performance checks are skipped for offline or unreachable sites."
                                    : performanceData.error ||
                                      performanceData.mobile?.error ||
                                      performanceData.desktop?.error ||
                                      "Google PageSpeed Insights did not return usable results for this scan."}
                                </p>
                                <p
                                  className={
                                    isPerformanceMarkedOffline
                                      ? "text-xs text-yellow-700/80 dark:text-yellow-300/80"
                                      : "text-xs text-red-700/80 dark:text-red-300/80"
                                  }
                                >
                                  {isPerformanceMarkedOffline
                                    ? "DNS/WHOIS and other non-live checks can still complete normally."
                                    : "The domain can still be online even when PageSpeed is rate limited or unavailable."}
                                </p>
                              </AlertDescription>
                            </Alert>
                          ) : performanceData ? (
                            <div className="space-y-6">
                              {(performanceData.mobile?.error ||
                                performanceData.desktop?.error) && (
                                <Alert className="border-yellow-500/30 bg-yellow-500/10">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                  <AlertDescription className="space-y-1">
                                    <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                                      Partial PageSpeed data
                                    </p>
                                    {performanceData.mobile?.error && (
                                      <p className="text-sm text-yellow-700/90 dark:text-yellow-300/90">
                                        Mobile: {performanceData.mobile.error}
                                      </p>
                                    )}
                                    {performanceData.desktop?.error && (
                                      <p className="text-sm text-yellow-700/90 dark:text-yellow-300/90">
                                        Desktop: {performanceData.desktop.error}
                                      </p>
                                    )}
                                    <p className="text-xs text-yellow-700/80 dark:text-yellow-300/80">
                                      Unavailable strategies are shown as N/A
                                      instead of score 0.
                                    </p>
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Mobile & Desktop Scores Side-by-Side */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Mobile Score */}
                                <div
                                  className={`p-6 rounded-lg border-2 ${
                                    performanceData.mobile.error
                                      ? "bg-yellow-500/10 border-yellow-500/30"
                                      : performanceData.mobile.color === "green"
                                        ? "bg-green-500/10 border-green-500/30"
                                        : performanceData.mobile.color ===
                                            "orange"
                                          ? "bg-orange-500/10 border-orange-500/30"
                                          : "bg-red-500/10 border-red-500/30"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <Smartphone
                                        className={`h-8 w-8 ${
                                          performanceData.mobile.error
                                            ? "text-yellow-600 dark:text-yellow-400"
                                            : performanceData.mobile.color ===
                                                "green"
                                              ? "text-green-600 dark:text-green-400"
                                              : performanceData.mobile.color ===
                                                  "orange"
                                                ? "text-orange-600 dark:text-orange-400"
                                                : "text-red-600 dark:text-red-400"
                                        }`}
                                      />
                                      <div>
                                        <h3 className="text-lg font-semibold">
                                          Mobile
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                          Performance Score
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div
                                        className={`text-5xl font-bold ${
                                          performanceData.mobile.error
                                            ? "text-yellow-600 dark:text-yellow-400"
                                            : performanceData.mobile.color ===
                                                "green"
                                              ? "text-green-600 dark:text-green-400"
                                              : performanceData.mobile.color ===
                                                  "orange"
                                                ? "text-orange-600 dark:text-orange-400"
                                                : "text-red-600 dark:text-red-400"
                                        }`}
                                      >
                                        {performanceData.mobile.error
                                          ? "N/A"
                                          : performanceData.mobile.score}
                                      </div>
                                      <Badge
                                        className={`mt-1 ${
                                          performanceData.mobile.error
                                            ? "bg-yellow-600 dark:bg-yellow-500"
                                            : performanceData.mobile.color ===
                                                "green"
                                              ? "bg-green-600 dark:bg-green-500"
                                              : performanceData.mobile.color ===
                                                  "orange"
                                                ? "bg-orange-600 dark:bg-orange-500"
                                                : "bg-red-600 dark:bg-red-500"
                                        }`}
                                      >
                                        {performanceData.mobile.error
                                          ? "Unavailable"
                                          : `Grade ${performanceData.mobile.grade}`}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-3">
                                    <div
                                      className={`h-3 rounded-full transition-all duration-500 ${
                                        performanceData.mobile.error
                                          ? "bg-yellow-600 dark:bg-yellow-500"
                                          : performanceData.mobile.color ===
                                              "green"
                                            ? "bg-green-600 dark:bg-green-500"
                                            : performanceData.mobile.color ===
                                                "orange"
                                              ? "bg-orange-600 dark:bg-orange-500"
                                              : "bg-red-600 dark:bg-red-500"
                                      }`}
                                      style={{
                                        width: `${performanceData.mobile.error ? 0 : performanceData.mobile.score}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Desktop Score */}
                                <div
                                  className={`p-6 rounded-lg border-2 ${
                                    performanceData.desktop.error
                                      ? "bg-yellow-500/10 border-yellow-500/30"
                                      : performanceData.desktop.color ===
                                          "green"
                                        ? "bg-green-500/10 border-green-500/30"
                                        : performanceData.desktop.color ===
                                            "orange"
                                          ? "bg-orange-500/10 border-orange-500/30"
                                          : "bg-red-500/10 border-red-500/30"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <Monitor
                                        className={`h-8 w-8 ${
                                          performanceData.desktop.error
                                            ? "text-yellow-600 dark:text-yellow-400"
                                            : performanceData.desktop.color ===
                                                "green"
                                              ? "text-green-600 dark:text-green-400"
                                              : performanceData.desktop
                                                    .color === "orange"
                                                ? "text-orange-600 dark:text-orange-400"
                                                : "text-red-600 dark:text-red-400"
                                        }`}
                                      />
                                      <div>
                                        <h3 className="text-lg font-semibold">
                                          Desktop
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                          Performance Score
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div
                                        className={`text-5xl font-bold ${
                                          performanceData.desktop.error
                                            ? "text-yellow-600 dark:text-yellow-400"
                                            : performanceData.desktop.color ===
                                                "green"
                                              ? "text-green-600 dark:text-green-400"
                                              : performanceData.desktop
                                                    .color === "orange"
                                                ? "text-orange-600 dark:text-orange-400"
                                                : "text-red-600 dark:text-red-400"
                                        }`}
                                      >
                                        {performanceData.desktop.error
                                          ? "N/A"
                                          : performanceData.desktop.score}
                                      </div>
                                      <Badge
                                        className={`mt-1 ${
                                          performanceData.desktop.error
                                            ? "bg-yellow-600 dark:bg-yellow-500"
                                            : performanceData.desktop.color ===
                                                "green"
                                              ? "bg-green-600 dark:bg-green-500"
                                              : performanceData.desktop
                                                    .color === "orange"
                                                ? "bg-orange-600 dark:bg-orange-500"
                                                : "bg-red-600 dark:bg-red-500"
                                        }`}
                                      >
                                        {performanceData.desktop.error
                                          ? "Unavailable"
                                          : `Grade ${performanceData.desktop.grade}`}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-3">
                                    <div
                                      className={`h-3 rounded-full transition-all duration-500 ${
                                        performanceData.desktop.error
                                          ? "bg-yellow-600 dark:bg-yellow-500"
                                          : performanceData.desktop.color ===
                                              "green"
                                            ? "bg-green-600 dark:bg-green-500"
                                            : performanceData.desktop.color ===
                                                "orange"
                                              ? "bg-orange-600 dark:bg-orange-500"
                                              : "bg-red-600 dark:bg-red-500"
                                      }`}
                                      style={{
                                        width: `${performanceData.desktop.error ? 0 : performanceData.desktop.score}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Core Web Vitals - Mobile */}
                              <Accordion
                                type="single"
                                collapsible
                                className="w-full"
                              >
                                <AccordionItem value="mobile-metrics">
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-2">
                                      <Smartphone className="h-5 w-5 text-primary" />
                                      <span className="font-semibold">
                                        Mobile Core Web Vitals
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          First Contentful Paint
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.mobile.metrics.fcp
                                              .displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.mobile.metrics.fcp.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Largest Contentful Paint
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.mobile.metrics.lcp
                                              .displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.mobile.metrics.lcp.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Total Blocking Time
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.mobile.metrics.tbt
                                              .displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.mobile.metrics.tbt.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Cumulative Layout Shift
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.mobile.metrics.cls
                                              .displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.mobile.metrics.cls.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Speed Index
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.mobile.metrics
                                              .speedIndex.displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.mobile.metrics.speedIndex.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* Core Web Vitals - Desktop */}
                                <AccordionItem value="desktop-metrics">
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-2">
                                      <Monitor className="h-5 w-5 text-primary" />
                                      <span className="font-semibold">
                                        Desktop Core Web Vitals
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          First Contentful Paint
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.desktop.metrics.fcp
                                              .displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.desktop.metrics.fcp.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Largest Contentful Paint
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.desktop.metrics.lcp
                                              .displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.desktop.metrics.lcp.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Total Blocking Time
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.desktop.metrics.tbt
                                              .displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.desktop.metrics.tbt.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Cumulative Layout Shift
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.desktop.metrics.cls
                                              .displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.desktop.metrics.cls.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Speed Index
                                        </p>
                                        <p className="text-2xl font-bold text-primary">
                                          {
                                            performanceData.desktop.metrics
                                              .speedIndex.displayValue
                                          }
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                          <div
                                            className="bg-primary h-1.5 rounded-full"
                                            style={{
                                              width: `${performanceData.desktop.metrics.speedIndex.score}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* Optimization Opportunities - Mobile */}
                                {performanceData.mobile.opportunities &&
                                  performanceData.mobile.opportunities.length >
                                    0 && (
                                    <AccordionItem value="mobile-opportunities">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                          <span className="font-semibold">
                                            Mobile Optimization Opportunities
                                          </span>
                                          <Badge variant="secondary">
                                            {
                                              performanceData.mobile
                                                .opportunities.length
                                            }
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-3 pt-4">
                                          {performanceData.mobile.opportunities.map(
                                            (opp, i) => (
                                              <div
                                                key={i}
                                                className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20"
                                              >
                                                <div className="flex items-start justify-between gap-4">
                                                  <div className="flex-1">
                                                    <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">
                                                      {opp.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                      {opp.description}
                                                    </p>
                                                  </div>
                                                  <Badge className="bg-orange-600 dark:bg-orange-500 whitespace-nowrap">
                                                    {opp.savings}
                                                  </Badge>
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}

                                {/* Optimization Opportunities - Desktop */}
                                {performanceData.desktop.opportunities &&
                                  performanceData.desktop.opportunities.length >
                                    0 && (
                                    <AccordionItem value="desktop-opportunities">
                                      <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                          <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                          <span className="font-semibold">
                                            Desktop Optimization Opportunities
                                          </span>
                                          <Badge variant="secondary">
                                            {
                                              performanceData.desktop
                                                .opportunities.length
                                            }
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-3 pt-4">
                                          {performanceData.desktop.opportunities.map(
                                            (opp, i) => (
                                              <div
                                                key={i}
                                                className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20"
                                              >
                                                <div className="flex items-start justify-between gap-4">
                                                  <div className="flex-1">
                                                    <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">
                                                      {opp.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                      {opp.description}
                                                    </p>
                                                  </div>
                                                  <Badge className="bg-orange-600 dark:bg-orange-500 whitespace-nowrap">
                                                    {opp.savings}
                                                  </Badge>
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}
                              </Accordion>

                              {/* Improve Performance Button */}
                              {performanceData && (
                                <div className="flex justify-center mt-6">
                                  <Sheet>
                                    <SheetTrigger asChild>
                                      <Button
                                        size="lg"
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                                      >
                                        <Zap className="mr-2 h-5 w-5" />
                                        Improve Your Performance
                                      </Button>
                                    </SheetTrigger>
                                    <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                                      <SheetHeader>
                                        <SheetTitle className="flex items-center gap-2 text-2xl">
                                          <Zap className="h-6 w-6 text-primary" />
                                          Performance Optimization Roadmap
                                        </SheetTitle>
                                        <SheetDescription>
                                          Boost your PageSpeed score with these
                                          proven optimization strategies
                                        </SheetDescription>
                                      </SheetHeader>

                                      <div className="mt-6 space-y-6">
                                        {/* Performance EXP Bar */}
                                        {(() => {
                                          const availableScores = [
                                            performanceData.mobile.error
                                              ? null
                                              : performanceData.mobile.score,
                                            performanceData.desktop.error
                                              ? null
                                              : performanceData.desktop.score,
                                          ].filter(
                                            (score): score is number =>
                                              typeof score === "number",
                                          );
                                          const avgScore =
                                            availableScores.length > 0
                                              ? Math.round(
                                                  availableScores.reduce(
                                                    (sum, score) => sum + score,
                                                    0,
                                                  ) / availableScores.length,
                                                )
                                              : 0;

                                          // Current points based on average score
                                          const currentPerfPoints = avgScore;

                                          const perfProgressPercentage =
                                            currentPerfPoints;
                                          const perfPotentialPercentage = 100;

                                          // Determine current level
                                          const getCurrentLevel = () => {
                                            if (avgScore >= 90)
                                              return {
                                                name: "Excellent",
                                                icon: "🏆",
                                                color:
                                                  "text-green-600 dark:text-green-400",
                                              };
                                            if (avgScore >= 50)
                                              return {
                                                name: "Good",
                                                icon: "⚡",
                                                color:
                                                  "text-orange-600 dark:text-orange-400",
                                              };
                                            return {
                                              name: "Needs Work",
                                              icon: "🔰",
                                              color:
                                                "text-red-600 dark:text-red-400",
                                            };
                                          };

                                          const getNextLevel = () => {
                                            if (avgScore >= 90) return null;
                                            if (avgScore >= 50)
                                              return "Excellent";
                                            return "Good";
                                          };

                                          const currentLevel =
                                            getCurrentLevel();
                                          const nextLevel = getNextLevel();

                                          return (
                                            <div className="p-5 rounded-lg bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20">
                                              <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-2xl">
                                                    {currentLevel.icon}
                                                  </span>
                                                  <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                      {currentLevel.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      {nextLevel
                                                        ? `Next: ${nextLevel}`
                                                        : "Maximum Level!"}
                                                    </p>
                                                  </div>
                                                </div>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                                  </TooltipTrigger>
                                                  <TooltipContent className="max-w-xs">
                                                    <p className="font-semibold mb-1">
                                                      Performance Levels
                                                    </p>
                                                    <p className="text-xs">
                                                      🔰 Needs Work (0-49):
                                                      Significant optimization
                                                      needed
                                                    </p>
                                                    <p className="text-xs">
                                                      ⚡ Good (50-89): Decent
                                                      performance, room for
                                                      improvement
                                                    </p>
                                                    <p className="text-xs">
                                                      🏆 Excellent (90-100):
                                                      Outstanding performance!
                                                    </p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </div>

                                              {/* Progress Bar */}
                                              <div className="relative h-8 bg-muted/30 rounded-full overflow-hidden mb-3">
                                                {/* Current Progress */}
                                                <div
                                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                                  style={{
                                                    width: `${perfProgressPercentage}%`,
                                                  }}
                                                />
                                                {/* Potential Progress (Ghost) */}
                                                <div
                                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500/30 to-green-600/30 transition-all duration-500"
                                                  style={{
                                                    width: `${perfPotentialPercentage}%`,
                                                  }}
                                                />
                                                {/* Level Markers */}
                                                <div className="absolute inset-0 flex items-center justify-between px-2">
                                                  {[25, 50, 75, 100].map(
                                                    (marker) => (
                                                      <div
                                                        key={marker}
                                                        className={`text-xs font-bold ${
                                                          avgScore >= marker
                                                            ? "text-white"
                                                            : "text-muted-foreground"
                                                        }`}
                                                      >
                                                        {marker}
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>

                                              {/* Score Display */}
                                              <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                  Current Score:{" "}
                                                  <strong className="text-foreground">
                                                    {currentPerfPoints}/100
                                                  </strong>
                                                </span>
                                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                                  Potential:{" "}
                                                  {perfPotentialPercentage}/100
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Optimization Recommendations */}
                                        <div className="space-y-4">
                                          <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <Zap className="h-5 w-5 text-primary" />
                                            Quick Wins (High Impact)
                                          </h3>

                                          {/* Image Optimization */}
                                          <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-lg bg-blue-500/10">
                                                <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                  <h4 className="font-semibold text-foreground">
                                                    Optimize Images
                                                  </h4>
                                                  <Badge className="bg-blue-600 dark:bg-blue-500">
                                                    High Impact
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-3">
                                                  Compress images, use modern
                                                  formats (WebP, AVIF), and
                                                  implement lazy loading
                                                </p>
                                                <div className="space-y-2 text-xs">
                                                  <p className="text-muted-foreground">
                                                    <strong>Tools:</strong>{" "}
                                                    TinyPNG, Squoosh,
                                                    ImageOptim, Cloudflare
                                                    Polish
                                                  </p>
                                                  <p className="text-muted-foreground">
                                                    <strong>Quick Fix:</strong>{" "}
                                                    Use CDN with automatic image
                                                    optimization (Cloudflare,
                                                    Imgix)
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Minify Resources */}
                                          <div className="p-4 rounded-lg border-2 border-purple-500/30 bg-purple-500/5">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-lg bg-purple-500/10">
                                                <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                  <h4 className="font-semibold text-foreground">
                                                    Minify CSS/JS
                                                  </h4>
                                                  <Badge className="bg-purple-600 dark:bg-purple-500">
                                                    High Impact
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-3">
                                                  Remove whitespace, comments,
                                                  and unused code from CSS and
                                                  JavaScript files
                                                </p>
                                                <div className="space-y-2 text-xs">
                                                  <p className="text-muted-foreground">
                                                    <strong>Tools:</strong>{" "}
                                                    Webpack, Vite, Parcel
                                                    (automatic minification)
                                                  </p>
                                                  <p className="text-muted-foreground">
                                                    <strong>Quick Fix:</strong>{" "}
                                                    Enable minification in your
                                                    build tool or use Cloudflare
                                                    Auto Minify
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Enable Caching */}
                                          <div className="p-4 rounded-lg border-2 border-green-500/30 bg-green-500/5">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-lg bg-green-500/10">
                                                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                  <h4 className="font-semibold text-foreground">
                                                    Enable Browser Caching
                                                  </h4>
                                                  <Badge className="bg-green-600 dark:bg-green-500">
                                                    High Impact
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-3">
                                                  Set proper cache headers so
                                                  browsers can store static
                                                  assets locally
                                                </p>
                                                <div className="space-y-2 text-xs">
                                                  <p className="text-muted-foreground">
                                                    <strong>Headers:</strong>{" "}
                                                    Cache-Control:
                                                    max-age=31536000 for static
                                                    assets
                                                  </p>
                                                  <p className="text-muted-foreground">
                                                    <strong>Quick Fix:</strong>{" "}
                                                    Use CDN (Cloudflare, AWS
                                                    CloudFront) for automatic
                                                    caching
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Advanced Optimizations */}
                                        <div className="space-y-3">
                                          <div className="flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-primary" />
                                            <h3 className="text-lg font-semibold text-foreground">
                                              Advanced Optimizations
                                            </h3>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                              </TooltipTrigger>
                                              <TooltipContent className="max-w-xs">
                                                <p className="font-semibold mb-1">
                                                  Advanced Performance
                                                  Techniques
                                                </p>
                                                <p className="text-xs">
                                                  These optimizations require
                                                  technical expertise but
                                                  provide significant
                                                  performance improvements. All
                                                  recommendations are free to
                                                  implement.
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </div>

                                          {/* CDN */}
                                          <div className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-lg bg-indigo-500/20">
                                                <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <h4 className="font-semibold text-foreground">
                                                    Use a CDN (Content Delivery
                                                    Network)
                                                  </h4>
                                                  <Badge className="bg-indigo-600 dark:bg-indigo-500">
                                                    High Impact
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-foreground/80 mb-3">
                                                  Distribute your content across
                                                  global servers to reduce
                                                  latency and improve load times
                                                  for visitors worldwide.
                                                </p>
                                                <div className="space-y-2 text-xs">
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      Free Options:
                                                    </p>
                                                    <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-0.5">
                                                      <li>
                                                        Cloudflare (Free plan
                                                        includes CDN + DDoS
                                                        protection)
                                                      </li>
                                                      <li>
                                                        jsDelivr (Free CDN for
                                                        open source projects)
                                                      </li>
                                                      <li>
                                                        Netlify/Vercel (Free
                                                        tier with global CDN)
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      How to Implement:
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                      1. Sign up for Cloudflare
                                                      (free)
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                      2. Update your domain's
                                                      nameservers
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                      3. Enable CDN caching in
                                                      Cloudflare dashboard
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Server Response Time */}
                                          <div className="p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-lg bg-cyan-500/20">
                                                <Server className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <h4 className="font-semibold text-foreground">
                                                    Reduce Server Response Time
                                                    (TTFB)
                                                  </h4>
                                                  <Badge className="bg-cyan-600 dark:bg-cyan-500">
                                                    High Impact
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-foreground/80 mb-3">
                                                  Optimize your server to
                                                  respond faster to requests.
                                                  Target: under 200ms.
                                                </p>
                                                <div className="space-y-2 text-xs">
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      Free Optimizations:
                                                    </p>
                                                    <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-0.5">
                                                      <li>
                                                        Enable server-side
                                                        caching (Redis,
                                                        Memcached)
                                                      </li>
                                                      <li>
                                                        Optimize database
                                                        queries (add indexes,
                                                        reduce joins)
                                                      </li>
                                                      <li>
                                                        Use PHP OPcache for
                                                        WordPress sites
                                                      </li>
                                                      <li>
                                                        Enable GZIP/Brotli
                                                        compression
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      WordPress Specific:
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                      Install WP Rocket or W3
                                                      Total Cache plugin for
                                                      automatic optimization
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Remove Unused Code */}
                                          <div className="p-4 rounded-lg border border-pink-500/30 bg-pink-500/10">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-lg bg-pink-500/20">
                                                <Trash2 className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <h4 className="font-semibold text-foreground">
                                                    Remove Unused Code
                                                  </h4>
                                                  <Badge className="bg-pink-600 dark:bg-pink-500">
                                                    Medium Impact
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-foreground/80 mb-3">
                                                  Eliminate unused JavaScript,
                                                  CSS, and dependencies to
                                                  reduce bundle size.
                                                </p>
                                                <div className="space-y-2 text-xs">
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      Free Tools:
                                                    </p>
                                                    <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-0.5">
                                                      <li>
                                                        Chrome DevTools Coverage
                                                        tab (built-in)
                                                      </li>
                                                      <li>
                                                        PurgeCSS (removes unused
                                                        CSS automatically)
                                                      </li>
                                                      <li>
                                                        Tree-shaking with
                                                        Webpack/Vite (automatic)
                                                      </li>
                                                      <li>
                                                        UnCSS (removes unused
                                                        CSS rules)
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      Quick Win:
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                      Disable unused WordPress
                                                      plugins and themes - can
                                                      reduce load by 30-50%
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Preload Critical Resources */}
                                          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-lg bg-amber-500/20">
                                                <Rocket className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <h4 className="font-semibold text-foreground">
                                                    Preload Critical Resources
                                                  </h4>
                                                  <Badge className="bg-amber-600 dark:bg-amber-500">
                                                    Medium Impact
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-foreground/80 mb-3">
                                                  Tell the browser to load
                                                  critical resources early for
                                                  faster rendering.
                                                </p>
                                                <div className="space-y-2 text-xs">
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      Add to HTML &lt;head&gt;:
                                                    </p>
                                                    <code className="block bg-muted p-2 rounded text-muted-foreground mt-1 overflow-x-auto">
                                                      &lt;link rel="preload"
                                                      href="/fonts/main.woff2"
                                                      as="font" crossorigin&gt;
                                                      <br />
                                                      &lt;link rel="preload"
                                                      href="/css/critical.css"
                                                      as="style"&gt;
                                                      <br />
                                                      &lt;link rel="preload"
                                                      href="/images/hero.jpg"
                                                      as="image"&gt;
                                                    </code>
                                                  </div>
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      What to Preload:
                                                    </p>
                                                    <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-0.5">
                                                      <li>
                                                        Web fonts (especially
                                                        custom fonts)
                                                      </li>
                                                      <li>
                                                        Critical CSS files
                                                      </li>
                                                      <li>
                                                        Hero/above-the-fold
                                                        images
                                                      </li>
                                                      <li>
                                                        Essential JavaScript
                                                        bundles
                                                      </li>
                                                    </ul>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* HTTP/2 or HTTP/3 */}
                                          <div className="p-4 rounded-lg border border-teal-500/30 bg-teal-500/10">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-lg bg-teal-500/20">
                                                <Zap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <h4 className="font-semibold text-foreground">
                                                    Enable HTTP/2 or HTTP/3
                                                  </h4>
                                                  <Badge className="bg-teal-600 dark:bg-teal-500">
                                                    High Impact
                                                  </Badge>
                                                </div>
                                                <p className="text-sm text-foreground/80 mb-3">
                                                  Modern protocols that allow
                                                  multiple requests over a
                                                  single connection for faster
                                                  loading.
                                                </p>
                                                <div className="space-y-2 text-xs">
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      How to Enable (Free):
                                                    </p>
                                                    <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-0.5">
                                                      <li>
                                                        Most modern hosting
                                                        providers enable HTTP/2
                                                        automatically with SSL
                                                      </li>
                                                      <li>
                                                        Cloudflare enables
                                                        HTTP/2 and HTTP/3 by
                                                        default (free)
                                                      </li>
                                                      <li>
                                                        Check if enabled: Open
                                                        DevTools → Network →
                                                        Protocol column
                                                      </li>
                                                    </ul>
                                                  </div>
                                                  <div className="p-2 rounded bg-card/50">
                                                    <p className="font-semibold text-foreground mb-1">
                                                      Requirements:
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                      ✅ HTTPS/SSL certificate
                                                      (required)
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                      ✅ Modern web server
                                                      (Nginx, Apache 2.4.17+)
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Performance Roadmap Summary */}
                                        {(() => {
                                          const availableScores = [
                                            performanceData.mobile.error
                                              ? null
                                              : performanceData.mobile.score,
                                            performanceData.desktop.error
                                              ? null
                                              : performanceData.desktop.score,
                                          ].filter(
                                            (score): score is number =>
                                              typeof score === "number",
                                          );
                                          const avgScore =
                                            availableScores.length > 0
                                              ? Math.round(
                                                  availableScores.reduce(
                                                    (sum, score) => sum + score,
                                                    0,
                                                  ) / availableScores.length,
                                                )
                                              : 0;
                                          const currentPerfPoints = avgScore;
                                          const potentialPerfPoints = 100;

                                          return (
                                            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                                              <div className="text-center">
                                                <p className="text-sm font-semibold text-foreground mb-2">
                                                  🎯 Your Performance
                                                  Improvement Roadmap
                                                </p>
                                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                                  <span>
                                                    Current Score:{" "}
                                                    <strong className="text-foreground">
                                                      {currentPerfPoints}/100
                                                    </strong>
                                                  </span>
                                                  <span>→</span>
                                                  <span>
                                                    Potential:{" "}
                                                    <strong className="text-green-600 dark:text-green-400">
                                                      {potentialPerfPoints}/100
                                                    </strong>
                                                  </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                  {potentialPerfPoints >= 90 ? (
                                                    <span className="text-green-600 dark:text-green-400 font-semibold">
                                                      🏆 Can reach Excellent
                                                      performance!
                                                    </span>
                                                  ) : potentialPerfPoints >=
                                                    50 ? (
                                                    <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                                      ⚡ Can reach Good
                                                      performance
                                                    </span>
                                                  ) : (
                                                    <span>
                                                      Implement optimizations to
                                                      improve performance
                                                    </span>
                                                  )}
                                                </p>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </SheetContent>
                                  </Sheet>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Intelligence Tab */}
                  </div>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Features Section - Only show when no scan results */}
          {!technologyData && !dnsData && !emailData && (
            <div className="container mx-auto px-4 py-16 relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-border bg-card/95 transition-all duration-200 hover:border-primary/50 hover:shadow-md">
                  <CardHeader>
                    <Server className="h-10 w-10 text-primary mb-2 transition-transform duration-200 group-hover:scale-110" />
                    <CardTitle>Hosting Intelligence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Analyze WordPress/PHP versions, server type, and hosting
                      provider to recommend managed hosting or cPanel based on
                      your site's requirements.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/95 transition-all duration-200 hover:border-primary/50 hover:shadow-md">
                  <CardHeader>
                    <Globe className="h-10 w-10 text-primary mb-2 transition-transform duration-200 group-hover:scale-110" />
                    <CardTitle>DNS & Security</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      View DNS records (A, AAAA, MX, CNAME, TXT, NS), SSL
                      certificates, security headers, and WAF detection in one
                      comprehensive scan.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/95 transition-all duration-200 hover:border-primary/50 hover:shadow-md">
                  <CardHeader>
                    <Zap className="h-10 w-10 text-primary mb-2 transition-transform duration-200 group-hover:scale-110" />
                    <CardTitle>Performance Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Google PageSpeed scores, Core Web Vitals, email security
                      (SPF/DMARC/DKIM), and optimization recommendations for
                      mobile and desktop.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Migration Benefits Dialog */}
          <Dialog
            open={showMigrationDialog}
            onOpenChange={setShowMigrationDialog}
          >
            <DialogContent className="w-[92vw] max-w-[560px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Migration Benefits
                </DialogTitle>
                <DialogDescription>
                  {technologyData?.controlPanel?.reason ||
                    "Migration guidance based on this scan."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {Array.isArray(
                  technologyData?.controlPanel?.migrationBenefits,
                ) &&
                technologyData.controlPanel.migrationBenefits.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Benefits</h3>
                    <ul className="space-y-2">
                      {technologyData.controlPanel.migrationBenefits.map(
                        (benefit: string, idx: number) => (
                          <li
                            key={`${benefit}-${idx}`}
                            className="flex items-start gap-2 rounded-md border p-3"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{benefit}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No detailed migration benefits were returned for this scan.
                  </p>
                )}

                <div className="rounded-lg border bg-muted/40 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Current Setup
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">WordPress:</span>
                      <span className="ml-2 font-medium">
                        v{technologyData?.wordpress?.version || "unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PHP:</span>
                      <span className="ml-2 font-medium">
                        v{technologyData?.php?.version || "unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Server:</span>
                      <span className="ml-2 font-medium capitalize">
                        {technologyData?.server?.type || "unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setShowMigrationDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showNoFirewallDialog}
            onOpenChange={setShowNoFirewallDialog}
          >
            <DialogContent className="w-[92vw] max-w-[620px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Critical: No Firewall Detected
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Your website does not appear to be protected by a Web
                  Application Firewall (WAF). This increases exposure to common
                  attack vectors and automated abuse.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-foreground/90">
                    Without active edge protection, malicious traffic can reach
                    your origin directly and increase risk across availability,
                    integrity, and security response time.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <h4 className="text-sm font-semibold mb-2">
                    Exposure Checklist
                  </h4>
                  <ul className="space-y-1.5">
                    {noFirewallExposureList.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">
                    Recommended Solution: Website Security Premium
                  </p>
                  <p className="text-xs text-foreground/80">
                    Add managed protection with WAF, CDN, malware scanning, and
                    DDoS mitigation to reduce immediate risk and improve
                    resilience.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    onClick={() => {
                      const content = educationalContent["waf"];
                      if (content) {
                        setShowNoFirewallDialog(false);
                        setModalContent(content);
                        setEducationalModalOpen(true);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Learn How to Protect Your Site
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNoFirewallDialog(false);
                      setShowSecuritySheet(true);
                    }}
                    variant="outline"
                    className="border-red-500/40 text-red-600 hover:bg-red-500/10"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Security Solutions
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowNoFirewallDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Security Recommendations Sheet */}
          <Sheet open={showSecuritySheet} onOpenChange={setShowSecuritySheet}>
            <SheetContent
              side="right"
              className="w-full sm:max-w-xl overflow-y-auto"
            >
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="h-6 w-6 text-green-500" />
                  Security Improvement Recommendations
                </SheetTitle>
                <SheetDescription>
                  Actionable steps to enhance your website's security posture
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Security Score Display */}
                {securityData &&
                  (() => {
                    const currentScore = securityData.score; // Use actual security score from Security tab
                    const progressPercentage = (currentScore / 100) * 100;

                    return (
                      <div className="p-5 rounded-lg bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              Security Score
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Based on your current security configuration
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {currentScore}/100
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative h-8 bg-muted/30 rounded-full overflow-hidden">
                          {/* Current Progress */}
                          <div
                            className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${
                              currentScore >= 80
                                ? "bg-gradient-to-r from-green-500 to-green-600"
                                : currentScore >= 60
                                  ? "bg-gradient-to-r from-orange-500 to-orange-600"
                                  : "bg-gradient-to-r from-red-500 to-red-600"
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                          {/* Level Markers */}
                          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
                            <span
                              className={
                                currentScore >= 25
                                  ? "text-white"
                                  : "text-muted-foreground"
                              }
                            >
                              25
                            </span>
                            <span
                              className={
                                currentScore >= 50
                                  ? "text-white"
                                  : "text-muted-foreground"
                              }
                            >
                              50
                            </span>
                            <span
                              className={
                                currentScore >= 75
                                  ? "text-white"
                                  : "text-muted-foreground"
                              }
                            >
                              75
                            </span>
                            <span
                              className={
                                currentScore >= 100
                                  ? "text-white"
                                  : "text-muted-foreground"
                              }
                            >
                              100
                            </span>
                          </div>
                        </div>

                        {/* Level Status */}
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`${
                                currentScore >= 80
                                  ? "border-green-500 text-green-600"
                                  : currentScore >= 60
                                    ? "border-orange-500 text-orange-600"
                                    : "border-red-500 text-red-600"
                              }`}
                            >
                              {currentScore >= 80
                                ? "✅ Excellent"
                                : currentScore >= 60
                                  ? "⚠️ Good"
                                  : currentScore >= 40
                                    ? "🚨 Needs Improvement"
                                    : "🔴 Critical"}
                            </Badge>
                            <span className="text-muted-foreground">
                              {currentScore >= 80
                                ? "Your site has strong security"
                                : currentScore >= 60
                                  ? "Consider the improvements below"
                                  : "Immediate action recommended"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* Recommendations List */}
                <div className="space-y-4">
                  {securityData && !securityData.waf.detected && (
                    <div className="p-4 rounded-lg border-2 border-orange-500/30 bg-orange-500/5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                          <Shield className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-1">
                            Add a Web Application Firewall (WAF)
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Protect against attacks, malware, and bots. A WAF
                            acts as a shield between your website and malicious
                            traffic.
                          </p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>
                              <strong>Recommended Services:</strong>
                            </p>
                            <ul className="list-disc list-inside ml-2">
                              <li>Cloudflare (Free & Paid plans)</li>
                              <li>Sucuri (Premium security)</li>
                              <li>Wordfence (WordPress-specific)</li>
                              <li>GoDaddy Website Security Premium</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {securityData && securityData.score < 65 && (
                    <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                            Enable Security Headers
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Configure your server to send proper security
                            headers. These headers tell browsers how to handle
                            your content securely.
                          </p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>
                              <strong>Key Headers to Enable:</strong>
                            </p>
                            <ul className="list-disc list-inside ml-2">
                              <li>Content-Security-Policy (CSP)</li>
                              <li>X-Frame-Options</li>
                              <li>X-Content-Type-Options</li>
                              <li>Strict-Transport-Security (HSTS)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {securityData &&
                    securityData.score < 65 &&
                    providerData?.category !== "Managed WordPress" &&
                    technologyData?.server?.type !== "managed-wordpress" && (
                      <div className="p-4 rounded-lg border-2 border-green-500/30 bg-green-500/5">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-green-500/20">
                            <Server className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                              Upgrade to Managed Hosting
                            </h4>
                            <p className="text-sm text-foreground/80 mb-2">
                              Managed WordPress hosting includes automatic
                              security updates, malware scanning, and DDoS
                              protection built-in.
                            </p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>
                                <strong>Benefits:</strong>
                              </p>
                              <ul className="list-disc list-inside ml-2">
                                <li>Automatic WordPress & plugin updates</li>
                                <li>Daily malware scans</li>
                                <li>DDoS protection</li>
                                <li>Expert support team</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {securityData && securityData.score < 50 && (
                    <div className="p-4 rounded-lg border-2 border-red-500/30 bg-red-500/5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-500/20">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">
                            Security Audit Recommended
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Your site has multiple security gaps. A professional
                            security audit can identify and fix vulnerabilities
                            before they're exploited.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <p>
                              <strong>What to expect:</strong> Comprehensive
                              vulnerability scan, penetration testing, and
                              detailed remediation plan.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business-Grade Security Features (Locked) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      <span>Business-Grade Features</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="font-semibold mb-2">
                            Enterprise Security
                          </p>
                          <p className="text-xs">
                            These advanced features require professional
                            security services or enterprise hosting. They
                            provide military-grade protection for high-value
                            websites.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* DDoS Protection */}
                    <div className="p-4 rounded-lg border-2 border-purple-500/20 bg-purple-500/5 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                          <Shield className="h-5 w-5 text-purple-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2 mb-1">
                            DDoS Protection
                            <Lock className="h-3 w-3" />
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Protect against distributed denial-of-service
                            attacks that can take your site offline.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <strong>Requires:</strong> Cloudflare Pro, AWS
                            Shield, or enterprise hosting
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SSL Certificate Monitoring */}
                    <div className="p-4 rounded-lg border-2 border-indigo-500/20 bg-indigo-500/5 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/20">
                          <Key className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 mb-1">
                            SSL Certificate Monitoring
                            <Lock className="h-3 w-3" />
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Automated monitoring and renewal of SSL certificates
                            to prevent expiration.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <strong>Requires:</strong> Managed hosting or
                            monitoring service
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Malware Scanning */}
                    <div className="p-4 rounded-lg border-2 border-pink-500/20 bg-pink-500/5 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-pink-500/20">
                          <Eye className="h-5 w-5 text-pink-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-2 mb-1">
                            Daily Malware Scanning
                            <Lock className="h-3 w-3" />
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Automated daily scans to detect and remove malware
                            before it causes damage.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <strong>Requires:</strong> Sucuri, Wordfence
                            Premium, or managed hosting
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Database Security */}
                    <div className="p-4 rounded-lg border-2 border-cyan-500/20 bg-cyan-500/5 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/20">
                          <Database className="h-5 w-5 text-cyan-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-2 mb-1">
                            Database Security Hardening
                            <Lock className="h-3 w-3" />
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Advanced database security including encryption,
                            access controls, and audit logging.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <strong>Requires:</strong> Database administrator or
                            managed hosting
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="p-4 rounded-lg border-2 border-teal-500/20 bg-teal-500/5 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/20">
                          <Key className="h-5 w-5 text-teal-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-2 mb-1">
                            Two-Factor Authentication
                            <Lock className="h-3 w-3" />
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Require 2FA for all admin accounts to prevent
                            unauthorized access.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <strong>Requires:</strong> WordPress plugin or
                            hosting feature
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Security Incident Response */}
                    <div className="p-4 rounded-lg border-2 border-amber-500/20 bg-amber-500/5 opacity-75">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-1">
                            24/7 Security Monitoring
                            <Lock className="h-3 w-3" />
                          </h4>
                          <p className="text-sm text-foreground/80 mb-2">
                            Round-the-clock monitoring with instant alerts and
                            incident response.
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <strong>Requires:</strong> Enterprise hosting or
                            security service
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">
                          Quick Wins for Maximum Impact
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Start with the most critical items first. Adding a WAF
                          is the single most impactful security improvement you
                          can make.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Domain Comparison Sheet */}
          <Sheet
            open={showComparisonSheet}
            onOpenChange={setShowComparisonSheet}
          >
            <SheetContent
              side="right"
              className="w-full sm:max-w-4xl overflow-y-auto"
            >
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-2xl">
                  <GitCompare className="h-6 w-6 text-primary" />
                  Domain Comparison
                </SheetTitle>
                <SheetDescription>
                  Side-by-side comparison of {comparisonData.length} domains
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportComparison}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export as Image
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setComparisonMode(false);
                      setComparisonData([]);
                      setComparisonDomains(["", ""]);
                      setShowComparisonSheet(false);
                    }}
                    className="gap-2"
                  >
                    <XIcon className="h-4 w-4" />
                    Clear Comparison
                  </Button>
                </div>

                {/* Comparison Grid */}
                <div className="overflow-x-auto" ref={comparisonRef}>
                  <div
                    className="grid gap-4"
                    style={{
                      gridTemplateColumns: `repeat(${comparisonData.length}, minmax(300px, 1fr))`,
                    }}
                  >
                    {comparisonData.map((data, index) => {
                      // Calculate best indices for highlighting
                      const securityScores = comparisonData.map(
                        (d) => d.security?.score,
                      );
                      const performanceScores = comparisonData.map(
                        (d) => d.performance?.mobile?.score,
                      );
                      const bestSecurityIndex = getBestIndex(
                        securityScores,
                        true,
                      );
                      const bestPerformanceIndex = getBestIndex(
                        performanceScores,
                        true,
                      );

                      return (
                        <div key={index} className="space-y-4">
                          {/* Domain Header */}
                          <div className="min-h-[132px] rounded-lg border border-primary/20 bg-primary/10 p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-bold text-lg truncate">
                                {data.domain}
                              </h3>
                              {data.technology?.server?.isWebsiteBuilder && (
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 text-xs"
                                >
                                  Website Builder
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2 mt-2"
                              onClick={() => {
                                // Exit comparison mode and load this domain's details
                                setDomain(data.domain);
                                setRawTechnologyData(data.technology);
                                setDNSData(data.dns);
                                setEmailData(data.email);
                                setPerformanceData(data.performance);
                                setSecurityData(data.security);
                                setGeolocationData(data.geolocation);
                                setProviderData(data.provider);
                                setComparisonMode(false);
                                setShowComparisonSheet(false);
                                setActiveTab("hosting");
                                window.scrollTo({
                                  top: 0,
                                  behavior: "smooth",
                                });
                              }}
                            >
                              <Search className="h-4 w-4" />
                              View Details
                            </Button>
                          </div>

                          {/* Technology Stack */}
                          <div className="min-h-[132px] rounded-lg border border-border bg-muted/50 p-4">
                            <div className="mb-2 text-xs text-muted-foreground">
                              Technology Stack
                            </div>
                            <div className="space-y-1 text-sm">
                              {data.technology ? (
                                <>
                                  {data.technology.wordpress.detected && (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      <span>
                                        WordPress{" "}
                                        {data.technology.wordpress.version &&
                                          `v${data.technology.wordpress.version}`}
                                      </span>
                                    </div>
                                  )}
                                  {data.technology.php.detected && (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      <span>
                                        PHP{" "}
                                        {data.technology.php.version &&
                                          `v${data.technology.php.version}`}
                                      </span>
                                    </div>
                                  )}
                                  {data.technology.server.type && (
                                    <div className="flex items-center gap-2">
                                      <Server className="h-3 w-3 text-muted-foreground" />
                                      <span className="capitalize">
                                        {data.technology.server.type}
                                      </span>
                                    </div>
                                  )}
                                  {!data.technology.wordpress.detected &&
                                    !data.technology.php.detected &&
                                    !data.technology.server.type && (
                                      <div className="text-xs text-muted-foreground">
                                        No major technology signals detected.
                                      </div>
                                    )}
                                </>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  Technology data not available.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Security Score */}
                          <div
                            className={`min-h-[124px] rounded-lg border p-4 ${
                              data.security && index === bestSecurityIndex
                                ? "border-green-500/30 bg-green-500/10"
                                : "border-border bg-muted/50"
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                Security Score
                              </div>
                              {data.security && index === bestSecurityIndex && (
                                <Badge
                                  variant="default"
                                  className="bg-green-500 text-xs"
                                >
                                  Best
                                </Badge>
                              )}
                            </div>
                            {data.security ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <div className="text-2xl font-bold">
                                    {data.security.score}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    / 100
                                  </div>
                                </div>
                                {data.security.waf.detected && (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                    <Shield className="h-3 w-3" />
                                    <span>WAF Protected</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                Security data not available.
                              </div>
                            )}
                          </div>

                          {/* Performance Score */}
                          <div
                            className={`min-h-[124px] rounded-lg border p-4 ${
                              data.performance?.mobile &&
                              index === bestPerformanceIndex
                                ? "border-green-500/30 bg-green-500/10"
                                : "border-border bg-muted/50"
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                Performance (Mobile)
                              </div>
                              {data.performance?.mobile &&
                                index === bestPerformanceIndex && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-500 text-xs"
                                  >
                                    Best
                                  </Badge>
                                )}
                            </div>
                            {data.performance?.mobile ? (
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-bold">
                                  {data.performance.mobile.score}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    data.performance.mobile.grade === "A"
                                      ? "bg-green-500/20 text-green-700 dark:text-green-300"
                                      : data.performance.mobile.grade === "B"
                                        ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                        : data.performance.mobile.grade === "C"
                                          ? "bg-orange-500/20 text-orange-700 dark:text-orange-300"
                                          : "bg-red-500/20 text-red-700 dark:text-red-300"
                                  }
                                >
                                  {data.performance.mobile.grade}
                                </Badge>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                Performance data not available.
                              </div>
                            )}
                          </div>

                          {/* Server Location */}
                          {data.geolocation?.location && (
                            <div className="p-4 rounded-lg bg-muted/50 border border-border">
                              <div className="text-xs text-muted-foreground mb-1">
                                Server Location
                              </div>
                              <div className="font-semibold text-sm">
                                {data.geolocation.location.city},{" "}
                                {data.geolocation.location.country}
                              </div>
                            </div>
                          )}

                          {/* Email Security */}
                          {data.email && (
                            <div className="p-4 rounded-lg bg-muted/50 border border-border">
                              <div className="text-xs text-muted-foreground mb-2">
                                Email Security
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  {data.email.spf.configured ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  <span>SPF</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {data.email.dmarc.configured ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  <span>DMARC</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {data.email.dkim.configured ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  <span>DKIM</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pro Tip */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Pro Tip:</strong> Click "View Details" on any
                    domain to see comprehensive analysis. The comparison will
                    remain accessible via the floating tab button.
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Educational Modal */}
          {modalContent && (
            <EducationalModal
              open={educationalModalOpen}
              onOpenChange={setEducationalModalOpen}
              content={modalContent}
            />
          )}

          {/* Performance History Chart */}
          {domain && (
            <PerformanceHistoryChart
              domain={domain}
              open={showPerformanceHistory}
              onOpenChange={setShowPerformanceHistory}
            />
          )}
        </div>
      </TooltipProvider>
    </>
  );
}
