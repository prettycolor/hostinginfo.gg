import { useState, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useSmartBack, useSmartBackDestination } from "@/lib/smart-navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Shield,
  Zap,
  Mail,
  Lock,
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Network,
  History,
  LayoutDashboard,
  ArrowLeft,
  ChevronDown,
  Star,
} from "lucide-react";
import { OverviewTab } from "@/components/intelligence/OverviewTab";
import { TechnologyStack } from "@/components/intelligence/TechnologyStack";
import { DNSInfrastructure } from "@/components/intelligence/DNSInfrastructure";
import { IPFingerprint } from "@/components/intelligence/IPFingerprint";
import { DomainHistoryTimeline } from "@/components/intelligence/DomainHistoryTimeline";
import { SSLCertificateCard } from "@/components/intelligence/SSLCertificateCard";
import { SecurityHeadersCard } from "@/components/intelligence/SecurityHeadersCard";
import { WAFProtectionCard } from "@/components/intelligence/WAFProtectionCard";
import { SecurityRecommendationsCard } from "@/components/intelligence/SecurityRecommendationsCard";
import { PerformanceOverview } from "@/components/intelligence/PerformanceOverview";
import { PerformanceDetails } from "@/components/intelligence/PerformanceDetails";
import { MXRecordsCard } from "@/components/intelligence/MXRecordsCard";
import { SPFRecordCard } from "@/components/intelligence/SPFRecordCard";
import { DMARCRecordCard } from "@/components/intelligence/DMARCRecordCard";
import { DKIMRecordCard } from "@/components/intelligence/DKIMRecordCard";
import { EmailRecommendationsCard } from "@/components/intelligence/EmailRecommendationsCard";
import { RecommendationsTab } from "@/components/intelligence/RecommendationsTab";
import { MalwareDetectionCard } from "@/components/intelligence/MalwareDetectionCard";
import { MigrationSupportPanel } from "@/components/intelligence/MigrationSupportPanel";
import { normalizeScanDomainInput } from "@/lib/domain-input";
import { calculateOverviewScanCompletion } from "@/lib/intelligence-scan-progress";
import { shouldRecommendWaf } from "@/lib/security-waf";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";
import { useAuth } from "@/lib/auth-context";

type ScanPayload = Record<string, unknown>;

interface LegacyDnsRecord {
  type?: string;
  value?: string;
}

interface DnsApiRecords {
  A?: string[];
  AAAA?: string[];
  MX?: Array<{ exchange?: string; priority?: number }>;
  TXT?: string[];
  NS?: string[];
  CNAME?: string[];
  [recordType: string]: unknown;
}

interface DnsApiResult extends ScanPayload {
  records?: DnsApiRecords | LegacyDnsRecord[];
  nameservers?: string[];
  subdomains?: string[];
  subdomainCount?: number;
}

interface TechnologyApiResult extends ScanPayload {
  technologies?: Array<{
    name?: string;
    category?: string;
    version?: string | null;
    confidence?: number;
  }>;
  wordpress?: {
    detected?: boolean;
    version?: string | null;
    confidence?: number;
    isWooCommerce?: boolean;
    plugins?: string[];
    methods?: string[];
    certainty?: string;
    versionReliability?: string;
    versionUncertain?: boolean;
  };
  php?: {
    detected?: boolean;
    version?: string | null;
    confidence?: number;
  };
  server?: {
    type?: string;
    builderType?: string | null;
    isWebsiteBuilder?: boolean;
    confidence?: number;
  };
  hosting?: {
    provider?: string;
    confidence?: number;
  };
  controlPanel?: {
    recommendation?: string | null;
    migrationBenefits?: string[];
    needsPaidSupport?: boolean;
    reason?: string;
  };
}

interface PerformanceMetric {
  value?: number;
  score?: number;
  displayValue?: string;
}

interface PerformanceOpportunity {
  id?: string;
  title?: string;
  description?: string;
  numericValue?: number;
  displayValue?: string;
  details?: string[];
}

interface PerformanceStrategyResult {
  score?: number;
  metrics?: {
    fcp?: PerformanceMetric;
    lcp?: PerformanceMetric;
    tbt?: PerformanceMetric;
    cls?: PerformanceMetric;
    speedIndex?: PerformanceMetric;
  };
  opportunities?: PerformanceOpportunity[];
}

interface PerformanceApiResult extends ScanPayload {
  success?: boolean;
  score?: number;
  mobile?: PerformanceStrategyResult;
  desktop?: PerformanceStrategyResult;
  totalPagesScanned?: number;
}

interface PerformanceScanJob {
  jobId?: string;
  status?: "queued" | "processing" | "completed" | "failed";
  pollAfterMs?: number;
  result?: PerformanceApiResult;
  error?: string;
  message?: string;
}

interface EmailApiResult extends ScanPayload {
  success?: boolean;
  score?: number;
  mx?: Array<{ exchange?: string; priority?: number }>;
  spf?: {
    configured?: boolean;
    valid?: boolean;
    record?: string | null;
    issues?: string[];
  };
  dmarc?: {
    configured?: boolean;
    valid?: boolean;
    record?: string | null;
    policy?: string | null;
  };
  dkim?: {
    configured?: boolean;
    hasRecord?: boolean;
    note?: string;
    record?: string;
  };
  providers?: string[];
  securityServices?: string[];
  securityGateway?: {
    detected?: boolean;
    provider?: string;
  };
}

interface MalwareThreat {
  severity?: string;
  source?: string;
  description?: string;
}

interface MalwareCheckStatus {
  checked?: boolean;
  clean?: boolean;
  error?: string | null;
}

interface MalwareApiResult extends ScanPayload {
  success?: boolean;
  isBlacklisted?: boolean;
  isMalware?: boolean;
  isPhishing?: boolean;
  threats?: MalwareThreat[];
  checks?: {
    urlhaus?: MalwareCheckStatus;
    googleSafeBrowsing?: MalwareCheckStatus;
    virusTotal?: MalwareCheckStatus;
    phishTank?: MalwareCheckStatus;
  };
  lastChecked?: string;
}

interface SecurityHeaderInfo extends ScanPayload {
  present?: boolean;
}

interface SecurityApiResult extends ScanPayload {
  success?: boolean;
  score?: number;
  grade?: string;
  headers?: Record<string, SecurityHeaderInfo>;
  securityHeaders?: Record<string, SecurityHeaderInfo>;
  waf?: {
    detected?: boolean;
    provider?: string | null;
    confidence?: number;
    evidence?: string[];
    hostProvider?: string | null;
    corroborated?: boolean;
    sourceVersion?: string | null;
    evidenceDetails?: Array<{
      type?: string;
      signal?: string;
      provider?: string;
      confidence?: number;
      role?: string;
      matchedIp?: string;
    }>;
    historySummary?: {
      sampleSize?: number;
      detectionRate?: number;
      managedEdgeRate?: number;
      lastDetectedAt?: string | null;
    };
  };
  wafDetected?: boolean;
  wafProvider?: string | null;
  wafConfidence?: number;
  wafMethods?: string[];
  wafHostProvider?: string | null;
  wafCorroborated?: boolean;
  wafSourceVersion?: string | null;
  ddos?: {
    protected?: boolean;
  };
  ddosProtection?: boolean;
  criticalIssues?: string[];
  recommendations?: string[];
  malware?: MalwareApiResult;
}

interface SslApiResult extends ScanPayload {
  hasSSL?: boolean;
  valid?: boolean;
  expired?: boolean;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  daysRemaining?: number;
  protocol?: string;
  cipher?: string;
  grade?: string;
  domains?: string[];
  wildcardCert?: boolean;
}

interface GeolocationApiResult extends ScanPayload {
  ip?: string;
  ipAddress?: string;
  asn?: string;
  asnName?: string;
  country?: string;
  city?: string;
  location?: {
    country?: string;
    city?: string;
  };
}

interface ProviderApiResult extends ScanPayload {
  provider?: string;
}

interface AttributionApiResult extends ScanPayload {
  asn?: string;
  asnOrg?: string;
}

interface ComprehensiveResults {
  success: boolean;
  domain: string;
  scannedAt: string;

  // Main tool data
  technology: TechnologyApiResult | null;
  performance: PerformanceApiResult | null;
  dns: DnsApiResult | null;
  email: EmailApiResult | null;
  ssl: SslApiResult | null;
  security: SecurityApiResult | null;
  geolocation: GeolocationApiResult | null;
  provider: ProviderApiResult | null;
  malware: MalwareApiResult | null; // Malware scan results

  // Intelligence data
  attribution?: AttributionApiResult;
  securityScore?: unknown;
  whoisHistory?: unknown[];

  // Computed insights
  overallScore: number;
  overallGrade: string;
  criticalIssues: string[];
  recommendations: unknown[];

  // Metadata
  confidence: number;
  dataCompleteness: number;
}

/**
 * Convert DNS records object to array format for DNSInfrastructure component
 * DNS API returns: { A: ['1.2.3.4'], AAAA: [...], MX: [...], etc. }
 * Component expects: [{ recordType: 'A', recordValue: '1.2.3.4', ttl: null }, ...]
 */
function convertDNSRecordsToArray(
  records: DnsApiResult["records"] | null | undefined,
): Array<{ recordType: string; recordValue: string; ttl: number | null }> {
  if (!records || typeof records !== "object") {
    return [];
  }

  const result: Array<{
    recordType: string;
    recordValue: string;
    ttl: number | null;
  }> = [];

  // Iterate through each record type (A, AAAA, MX, TXT, NS, CNAME)
  if (Array.isArray(records)) {
    for (const record of records) {
      if (
        !record?.type ||
        record.value === undefined ||
        record.value === null
      ) {
        continue;
      }
      result.push({
        recordType: record.type,
        recordValue: String(record.value),
        ttl: null,
      });
    }
    return result;
  }

  for (const [recordType, values] of Object.entries(records)) {
    if (Array.isArray(values)) {
      // Add each value as a separate record
      for (const value of values) {
        // Handle MX records specially (they are objects with exchange and priority)
        let recordValue: string;
        if (
          recordType === "MX" &&
          typeof value === "object" &&
          value !== null
        ) {
          // MX record format: {exchange: "mail.example.com", priority: 10}
          const mxValue = value as { priority?: number; exchange?: string };
          recordValue =
            `${mxValue.priority ?? ""} ${mxValue.exchange ?? ""}`.trim();
        } else {
          recordValue = String(value);
        }

        result.push({
          recordType,
          recordValue,
          ttl: null, // DNS API doesn't return TTL values
        });
      }
    }
  }

  return result;
}

/**
 * Extract IP address from geolocation or DNS A record
 * Priority: geolocation.ip → geolocation.ipAddress → dns.records.A[0] → 'Unknown'
 */
function extractIPAddress(
  geolocation: GeolocationApiResult | null | undefined,
  dns: DnsApiResult | null | undefined,
): string {
  // Try geolocation first (most reliable)
  if (geolocation?.ip) return geolocation.ip;
  if (geolocation?.ipAddress) return geolocation.ipAddress;

  // Fallback to DNS A record
  if (
    dns?.records?.A &&
    Array.isArray(dns.records.A) &&
    dns.records.A.length > 0
  ) {
    return dns.records.A[0];
  }

  // Last resort: check if dns.records is an array (old format)
  if (Array.isArray(dns?.records)) {
    const aRecord = dns.records.find((record) => record.type === "A");
    if (aRecord?.value) return aRecord.value;
  }

  return "Unknown";
}

function extractSubdomainCount(dns: DnsApiResult | null | undefined): number {
  if (
    typeof dns?.subdomainCount === "number" &&
    Number.isFinite(dns.subdomainCount)
  ) {
    return dns.subdomainCount;
  }

  if (Array.isArray(dns?.subdomains)) {
    return dns.subdomains.length;
  }

  return 0;
}

/**
 * Convert technology API response to format expected by TechnologyStack component
 * API returns: { wordpress: {...}, php: {...}, server: {...}, hosting: {...}, controlPanel: {...} }
 * Component expects: { technologies: [...], framework, serverType, isWebsiteBuilder, builderType, etc. }
 */
function convertTechnologyData(
  techData: TechnologyApiResult | null | undefined,
) {
  if (!techData) {
    return {
      technologies: [],
      framework: null,
      serverType: "unknown",
      isWebsiteBuilder: false,
      builderType: null,
      wordpressDetected: false,
      wordpressVersion: null,
      wordpressVersionReliability: "unknown",
      wordpressVersionUncertain: true,
      phpVersion: null,
      controlPanelRecommendation: null,
      migrationBenefits: [],
      needsPaidSupport: false,
    };
  }

  const technologies: Array<{
    name: string;
    techCategory: string;
    techVersion: string | null;
    confidence: number;
  }> = [];
  const pushTechnology = (
    name: string,
    techCategory: string,
    techVersion: string | null,
    confidence: number,
  ) => {
    const normalizedName = name.trim().toLowerCase();
    const normalizedVersion = techVersion?.trim() || null;
    const existing = technologies.find(
      (tech) =>
        tech.name.trim().toLowerCase() === normalizedName &&
        (tech.techVersion?.trim() || null) === normalizedVersion,
    );

    if (existing) {
      existing.confidence = Math.max(existing.confidence, confidence);
      if (!existing.techVersion && normalizedVersion) {
        existing.techVersion = normalizedVersion;
      }
      return;
    }

    technologies.push({
      name,
      techCategory,
      techVersion: normalizedVersion,
      confidence,
    });
  };

  if (Array.isArray(techData.technologies)) {
    for (const technology of techData.technologies) {
      const rawName =
        typeof technology?.name === "string" ? technology.name.trim() : "";
      if (!rawName) continue;

      pushTechnology(
        rawName,
        typeof technology.category === "string" &&
          technology.category.trim().length > 0
          ? technology.category
          : "Technology",
        typeof technology.version === "string" ? technology.version : null,
        typeof technology.confidence === "number" ? technology.confidence : 72,
      );
    }
  }

  // Add WordPress as a technology if detected
  if (techData.wordpress?.detected) {
    pushTechnology(
      "WordPress",
      "CMS",
      techData.wordpress.version || null,
      techData.wordpress.confidence || 85,
    );

    // Add WooCommerce if detected
    if (techData.wordpress.isWooCommerce) {
      pushTechnology("WooCommerce", "E-commerce", null, 90);
    }

    // Add detected plugins as technologies
    if (
      techData.wordpress.plugins &&
      Array.isArray(techData.wordpress.plugins)
    ) {
      techData.wordpress.plugins.forEach((plugin: string) => {
        pushTechnology(plugin, "WordPress Plugin", null, 85);
      });
    }
  }

  // Add PHP as a technology if detected
  if (techData.php?.detected && techData.php.version) {
    pushTechnology(
      "PHP",
      "Server",
      techData.php.version,
      techData.php.confidence || 70,
    );
  }

  // Add server type as a technology
  if (techData.server?.type && techData.server.type !== "unknown") {
    const serverName =
      techData.server.type === "website-builder"
        ? techData.server.builderType || "Website Builder"
        : techData.server.type.charAt(0).toUpperCase() +
          techData.server.type.slice(1);

    pushTechnology(
      serverName,
      "Server",
      null,
      techData.server.confidence || 90,
    );
  }

  // Add hosting provider as a technology
  if (techData.hosting?.provider && techData.hosting.provider !== "Unknown") {
    pushTechnology(
      techData.hosting.provider,
      "Hosting",
      null,
      techData.hosting.confidence || 95,
    );
  }

  return {
    technologies,
    framework: techData.wordpress?.detected ? "WordPress" : null,
    serverType: techData.server?.type || "unknown",
    isWebsiteBuilder: techData.server?.isWebsiteBuilder || false,
    builderType: techData.server?.builderType || null,
    wordpressDetected: techData.wordpress?.detected || false,
    wordpressVersion: techData.wordpress?.version || null,
    wordpressVersionReliability:
      techData.wordpress?.versionReliability || "unknown",
    wordpressVersionUncertain: techData.wordpress?.versionUncertain ?? true,
    phpVersion: techData.php?.version || null,
    controlPanelRecommendation: techData.controlPanel?.recommendation || null,
    migrationBenefits: techData.controlPanel?.migrationBenefits || [],
    needsPaidSupport: techData.controlPanel?.needsPaidSupport || false,
  };
}

interface CollapsibleTileProps {
  title: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  contentClassName?: string;
  headerMeta?: (collapsed: boolean) => ReactNode;
  headerClassName?: string;
}

function CollapsibleTile({
  title,
  children,
  defaultCollapsed = false,
  className = "",
  contentClassName = "",
  headerMeta,
  headerClassName = "",
}: CollapsibleTileProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${headerClassName || "hover:bg-muted/50"}`}
        aria-expanded={!collapsed}
      >
        <span className="font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {headerMeta?.(collapsed)}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </div>
      </button>
      {!collapsed && (
        <div className={`p-3 pt-0 ${contentClassName}`}>{children}</div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const goBack = useSmartBack();
  const backDestination = useSmartBackDestination();
  const initialDomain = searchParams.get("domain") || "";

  const [domain, setDomain] = useState(initialDomain);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [favoriteDomains, setFavoriteDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [results, setResults] = useState<ComprehensiveResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTabs, setLoadingTabs] = useState<Set<string>>(new Set());
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [securityAlertAcknowledged, setSecurityAlertAcknowledged] =
    useState(false);
  const malwareSectionRef = useRef<HTMLDivElement | null>(null);
  const autoScanTriggeredRef = useRef(false);
  const scanDomainRef = useRef<(targetDomain: string) => Promise<void>>(
    async () => {},
  );
  const normalizedFavoriteDomain = normalizeScanDomainInput(domain);
  const isCurrentDomainFavorite =
    Boolean(normalizedFavoriteDomain) &&
    favoriteDomains.includes(normalizedFavoriteDomain);
  const pendingSlowScanCount = ["performance", "email", "security"].filter(
    (tab) => loadingTabs.has(tab),
  ).length;
  const overviewScanCompletion = calculateOverviewScanCompletion(
    Boolean(results),
    pendingSlowScanCount,
  );
  const hasMalwareAlert = Boolean(
    results?.malware?.isBlacklisted ||
    results?.malware?.isMalware ||
    results?.malware?.isPhishing ||
    (Array.isArray(results?.malware?.threats) &&
      results.malware.threats.length > 0),
  );
  const shouldHighlightSecurityTab =
    hasMalwareAlert && !securityAlertAcknowledged;

  useEffect(() => {
    setSecurityAlertAcknowledged(false);
  }, [results?.domain, results?.scannedAt, hasMalwareAlert]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      !hasMalwareAlert ||
      securityAlertAcknowledged ||
      activeTab !== "security"
    ) {
      return;
    }

    const target = malwareSectionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          setSecurityAlertAcknowledged(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    activeTab,
    hasMalwareAlert,
    securityAlertAcknowledged,
    results?.scannedAt,
  ]);

  const fetchScanJson = async (
    endpoint: string,
    targetDomain: string,
    timeoutMs = 60000,
    bodyOverride?: Record<string, unknown>,
  ) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyOverride ?? { domain: targetDomain }),
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "message" in payload
            ? String((payload as { message?: unknown }).message)
            : typeof payload === "string"
              ? payload.slice(0, 180)
              : `${endpoint} failed with status ${response.status}`;
        throw new Error(message);
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  };

  const fetchApiJson = async <T,>(
    endpoint: string,
    timeoutMs = 60000,
    init?: RequestInit,
  ): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        ...init,
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const payload = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload
            ? String(
                (payload as { message?: unknown; error?: unknown }).message ??
                  (payload as { message?: unknown; error?: unknown }).error ??
                  `${endpoint} failed with status ${response.status}`,
              )
            : typeof payload === "string"
              ? payload.slice(0, 180)
              : `${endpoint} failed with status ${response.status}`;
        throw new Error(message);
      }

      return payload as T;
    } finally {
      clearTimeout(timeout);
    }
  };

  const extractPerformanceFailureReason = (
    value: PerformanceApiResult | null,
  ): string | null => {
    if (!value || typeof value !== "object") {
      return "Performance scan unavailable";
    }

    if (typeof value.error === "string" && value.error.trim().length > 0) {
      return value.error;
    }

    const mobileError =
      value.mobile &&
      typeof value.mobile === "object" &&
      "error" in value.mobile &&
      typeof (value.mobile as Record<string, unknown>).error === "string"
        ? String((value.mobile as Record<string, unknown>).error)
        : null;
    const desktopError =
      value.desktop &&
      typeof value.desktop === "object" &&
      "error" in value.desktop &&
      typeof (value.desktop as Record<string, unknown>).error === "string"
        ? String((value.desktop as Record<string, unknown>).error)
        : null;

    if (mobileError && desktopError) {
      return mobileError;
    }

    return null;
  };

  const runAsyncPerformanceScan = async (
    targetDomain: string,
  ): Promise<PerformanceApiResult> => {
    const startedJob = await fetchApiJson<PerformanceScanJob>(
      "/api/scan/performance",
      20000,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: targetDomain, async: true }),
      },
    );

    // Backward-safe fallback if endpoint returns direct payload instead of job.
    if (!startedJob.jobId) {
      const startedJobAsResult = startedJob as PerformanceApiResult;
      if (startedJobAsResult.mobile || startedJobAsResult.desktop) {
        return startedJobAsResult;
      }
      throw new Error("Performance scan returned an invalid job response");
    }

    if (startedJob.status === "completed" && startedJob.result) {
      return startedJob.result;
    }

    if (startedJob.status === "failed") {
      throw new Error(startedJob.error || "Performance scan failed");
    }

    const pollDeadline = Date.now() + 180000;
    const pollInterval = Math.max(1000, startedJob.pollAfterMs ?? 2000);

    while (Date.now() < pollDeadline) {
      await wait(pollInterval);

      let polledJob: PerformanceScanJob | null = null;
      try {
        polledJob = await fetchApiJson<PerformanceScanJob>(
          `/api/scan/performance?jobId=${encodeURIComponent(startedJob.jobId)}`,
          20000,
          { method: "GET" },
        );
      } catch (error) {
        if (isRetryableScanError(error)) {
          console.warn(
            "[Intelligence] Transient performance polling failure, retrying:",
            error instanceof Error ? error.message : error,
          );
          continue;
        }
        throw error;
      }

      if (!polledJob) {
        continue;
      }

      if (polledJob.status === "completed" && polledJob.result) {
        return polledJob.result;
      }

      if (polledJob.status === "failed") {
        throw new Error(polledJob.error || "Performance scan failed");
      }
    }

    throw new Error("Performance scan timed out while waiting for completion");
  };

  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const isRetryableScanError = (error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (!message) return false;
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("temporarily unavailable") ||
      message.includes("request failed") ||
      message.includes("failed to parse") ||
      message.includes("pagespeed insights unavailable") ||
      message.includes("pagespeed request") ||
      message.includes("gateway timeout") ||
      message.includes("cloudflare") ||
      message.includes("429") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("524") ||
      message.includes("502") ||
      message.includes("500")
    );
  };

  const fetchScanJsonWithRetry = async (
    endpoint: string,
    targetDomain: string,
    timeoutMs = 60000,
    maxRetries = 0,
  ) => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetchScanJson(endpoint, targetDomain, timeoutMs);
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries || !isRetryableScanError(error)) {
          throw error;
        }

        console.warn(
          `[Intelligence] Retry ${attempt + 1}/${maxRetries} for ${endpoint}:`,
          error instanceof Error ? error.message : error,
        );
        await wait(600 * (attempt + 1));
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to fetch scan data for ${endpoint}`);
  };

  const scanDomain = async (targetDomain: string) => {
    if (!targetDomain.trim()) return;

    const normalizedDomain = normalizeScanDomainInput(targetDomain);
    if (!normalizedDomain) {
      setError(
        "Please enter a valid domain or URL (example: example.com or https://example.com/path)",
      );
      return;
    }

    // Prevent multiple simultaneous scans
    if (loading) {
      console.log("Scan already in progress, ignoring duplicate request");
      return;
    }

    setLoading(true);
    setLoadingProgress("Initializing scan...");
    setError(null);
    setResults(null); // Clear previous results
    setLoadingTabs(new Set(["performance", "email", "security"])); // Mark slow tabs as loading
    setDomain(normalizedDomain);
    setSearchParams({ domain: normalizedDomain });

    const startTime = Date.now();

    try {
      console.log(
        `Starting progressive intelligence scan for: ${normalizedDomain}`,
      );

      // PHASE 1: Fast scans (1-3 seconds) - Technology, DNS, Geolocation, Provider
      setLoadingProgress(
        "Running fast scans (Technology, DNS, Geolocation, Provider)...",
      );

      const fastScansPromise = Promise.all([
        fetchScanJson("/api/scan/technology", normalizedDomain, 45000),
        fetchScanJson("/api/scan/dns", normalizedDomain, 45000),
        fetchScanJson("/api/scan/geolocation", normalizedDomain, 45000),
        fetchScanJson("/api/scan/ssl", normalizedDomain, 45000),
        fetchScanJson("/api/scan/malware", normalizedDomain, 45000),
      ]);

      const [technology, dns, geolocation, ssl, malware] =
        await fastScansPromise;

      const provider = await fetchScanJson(
        "/api/scan/provider",
        normalizedDomain,
        45000,
        {
          domain: normalizedDomain,
          nameservers: Array.isArray(dns?.records?.NS) ? dns.records.NS : [],
          isp: geolocation?.isp,
          organization: geolocation?.organization,
          isWebsiteBuilder: Boolean(technology?.server?.isWebsiteBuilder),
          builderType: technology?.server?.builderType || null,
          ipAddress: geolocation?.ipAddress || geolocation?.ip || null,
        },
      ).catch((providerError) => {
        console.error("[Intelligence] Provider scan failed:", providerError);
        return null;
      });

      const fastScanDuration = Date.now() - startTime;
      console.log(`Fast scans completed in ${fastScanDuration}ms`);

      // Debug: Log technology detection results
      console.log("[Intelligence] Technology detection:", {
        isWebsiteBuilder: technology?.server?.isWebsiteBuilder,
        builderType: technology?.server?.builderType,
        serverType: technology?.server?.type,
        wordpress: technology?.wordpress?.detected,
      });

      // Extract malware threats for critical issues
      const malwareThreats: string[] = [];
      if (malware?.threats && Array.isArray(malware.threats)) {
        malware.threats.forEach((threat) => {
          if (threat.severity === "critical" || threat.severity === "high") {
            malwareThreats.push(`🚨 ${threat.source}: ${threat.description}`);
          }
        });
      }

      const hasMalwareDetection = Boolean(
        malware?.isBlacklisted ||
        malware?.isMalware ||
        malware?.isPhishing ||
        malwareThreats.length > 0,
      );

      if (hasMalwareDetection) {
        const detectionSources = Array.isArray(malware?.threats)
          ? Array.from(
              new Set(
                malware.threats
                  .map((threat) =>
                    typeof threat?.source === "string"
                      ? threat.source.trim()
                      : "",
                  )
                  .filter((source) => source.length > 0),
              ),
            )
          : [];

        const sourcePreview =
          detectionSources.length > 0
            ? `Detected by ${detectionSources.slice(0, 3).join(", ")}${detectionSources.length > 3 ? ` +${detectionSources.length - 3} more` : ""}.`
            : "Threat indicators were detected by malware providers.";

        toast.error(`Malware alert for ${normalizedDomain}`, {
          description: sourcePreview,
          duration: 9000,
        });
      }

      // Show partial results immediately
      const partialResults = {
        success: true,
        domain: normalizedDomain,
        scannedAt: new Date().toISOString(),
        technology,
        dns,
        geolocation,
        provider,
        ssl,
        malware,
        // Placeholders for slow scans
        performance: null,
        email: null,
        security: null,
        overallScore: 0,
        overallGrade: "Pending",
        criticalIssues: malwareThreats, // Include malware threats immediately
        recommendations: [],
        confidence: 80,
        dataCompleteness: 60,
      };

      setResults(partialResults);
      setLoading(false); // Allow user to view fast results
      setLoadingProgress("Loading Performance, Email, and Security tabs...");

      // PHASE 2: Slow scans (10-30 seconds) - Performance, Email, Security
      // Run in background and allow partial completion/failures.
      const runSlowScan = async (
        tab: "performance" | "email" | "security",
        endpoint: string,
      ) => {
        try {
          if (tab === "performance") {
            try {
              return await runAsyncPerformanceScan(normalizedDomain);
            } catch (error) {
              if (!isRetryableScanError(error)) {
                throw error;
              }

              // Give the backend a brief grace period to finish and cache results,
              // then perform one lightweight follow-up request.
              await wait(2500);
              return await runAsyncPerformanceScan(normalizedDomain);
            }
          }

          return await fetchScanJsonWithRetry(
            endpoint,
            normalizedDomain,
            90000,
            0,
          );
        } finally {
          setLoadingTabs((prev) => {
            const next = new Set(prev);
            next.delete(tab);
            return next;
          });
        }
      };

      const [performanceResult, emailResult, securityResult] =
        await Promise.allSettled([
          runSlowScan("performance", "/api/scan/performance"),
          runSlowScan("email", "/api/scan/email"),
          runSlowScan("security", "/api/scan/security"),
        ]);

      // Force-clear any stale loading flags once all slow scans have settled.
      setLoadingTabs(new Set());

      const performance =
        performanceResult.status === "fulfilled"
          ? performanceResult.value
          : null;
      const email =
        emailResult.status === "fulfilled" ? emailResult.value : null;
      const security =
        securityResult.status === "fulfilled" ? securityResult.value : null;

      const performanceFailureReason =
        extractPerformanceFailureReason(performance);
      const hasUsablePerformanceData = Boolean(
        performance && !performanceFailureReason,
      );

      const failedSlowScans = new Set<string>();
      if (performanceResult.status === "rejected")
        failedSlowScans.add("Performance");
      if (performanceFailureReason) failedSlowScans.add("Performance");
      if (emailResult.status === "rejected") failedSlowScans.add("Email");
      if (securityResult.status === "rejected") failedSlowScans.add("Security");
      if (failedSlowScans.size > 0) {
        setError(
          `Some scans could not complete: ${Array.from(failedSlowScans).join(", ")}. You can retry the domain scan.`,
        );
      }

      const totalScanDuration = Date.now() - startTime;
      console.log(`All scans completed in ${totalScanDuration}ms`);

      // Debug: Log email data structure
      console.log("[Intelligence] Email data received:", {
        success: email?.success,
        hasMX: !!email?.mx,
        mxCount: email?.mx?.length,
        hasSPF: !!email?.spf,
        hasDMARC: !!email?.dmarc,
        hasDKIM: !!email?.dkim,
        providers: email?.providers,
        rawEmail: email,
      });

      // Debug: Log performance data structure
      console.log("[Intelligence] Performance data received:", {
        success: performance?.success,
        hasMobile: !!performance?.mobile,
        hasDesktop: !!performance?.desktop,
        mobileScore: performance?.mobile?.score,
        desktopScore: performance?.desktop?.score,
        mobileMetrics: performance?.mobile?.metrics,
        totalPages: performance?.totalPagesScanned,
        failureReason: performanceFailureReason,
      });

      // Debug: Log security data structure
      console.log("[Intelligence] Security data received:", {
        success: security?.success,
        score: security?.score,
        grade: security?.grade,
        hasWAF: security?.waf?.detected,
        hasDDoS: security?.ddos?.protected,
        rawSecurity: security,
      });

      // Calculate final scores
      const securityScore = security?.score || 0;
      const performanceScore = performance?.score || 0;
      const emailScore = email?.score || 0;

      console.log("[Intelligence] Score calculation:", {
        securityScore,
        performanceScore,
        emailScore,
        calculation: `(${securityScore} * 0.4) + (${performanceScore} * 0.3) + (${emailScore} * 0.3)`,
      });

      const overallScore = Math.round(
        securityScore * 0.4 + performanceScore * 0.3 + emailScore * 0.3,
      );

      let overallGrade = "F";
      if (overallScore >= 90) overallGrade = "A";
      else if (overallScore >= 80) overallGrade = "B";
      else if (overallScore >= 70) overallGrade = "C";
      else if (overallScore >= 60) overallGrade = "D";

      // Combine malware threats with security critical issues
      const allCriticalIssues = [
        ...malwareThreats, // Malware threats from URLhaus, Google Safe Browsing, VirusTotal
        ...(security?.criticalIssues || []), // Security issues from headers, SSL, etc.
      ];

      // Update with complete results
      const completeResults = {
        ...partialResults,
        performance,
        email,
        security,
        overallScore,
        overallGrade,
        criticalIssues: allCriticalIssues,
        dataCompleteness: 100,
      };

      setResults(completeResults);
      setLoadingProgress("");

      // Extract website builder info for logging
      const isWebsiteBuilder = technology?.server?.isWebsiteBuilder || false;
      const builderType = technology?.server?.builderType || null;

      console.log("Scan results:", {
        overallScore,
        overallGrade,
        dataCompleteness: 100,
        isWebsiteBuilder,
        builderType,
      });

      const authToken =
        token ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("authToken");

      const scanJsonHeaders = {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      const preferredHostingProvider =
        provider?.provider ||
        technology?.hosting?.provider ||
        technology?.server?.builderType ||
        null;

      const compactScanSnapshot = {
        domain: normalizedDomain,
        hostingProvider: preferredHostingProvider,
        sslValid: typeof ssl?.valid === "boolean" ? ssl.valid : null,
        sslExpiryDate: typeof ssl?.validTo === "string" ? ssl.validTo : null,
        ssl: ssl
          ? {
              hasSSL:
                typeof ssl.hasSSL === "boolean"
                  ? ssl.hasSSL
                  : typeof ssl.valid === "boolean"
                    ? ssl.valid
                    : null,
              valid: typeof ssl.valid === "boolean" ? ssl.valid : null,
              expired:
                typeof ssl.expired === "boolean" ? ssl.expired : undefined,
              validTo: typeof ssl.validTo === "string" ? ssl.validTo : null,
              issuer: typeof ssl.issuer === "string" ? ssl.issuer : null,
            }
          : null,
        performanceData: hasUsablePerformanceData
          ? {
              mobile: { score: performance?.mobile?.score || 0 },
              desktop: { score: performance?.desktop?.score || 0 },
            }
          : null,
        securityData: security
          ? {
              score: security.score || 0,
              grade: security.grade || null,
              issues: Array.isArray(security.recommendations)
                ? security.recommendations.slice(0, 12)
                : Array.isArray(security.criticalIssues)
                  ? security.criticalIssues.slice(0, 12)
                  : [],
            }
          : null,
        technologyData: technology
          ? {
              wordpress: {
                detected: Boolean(technology.wordpress?.detected),
                version: technology.wordpress?.version || null,
              },
              server: {
                type: technology.server?.type || null,
                isWebsiteBuilder: Boolean(technology.server?.isWebsiteBuilder),
                builderType: technology.server?.builderType || null,
              },
              hosting: {
                provider: preferredHostingProvider,
              },
            }
          : null,
        emailData: email
          ? {
              spf: { configured: Boolean(email.spf?.configured) },
              dkim: { configured: Boolean(email.dkim?.configured) },
              dmarc: { configured: Boolean(email.dmarc?.configured) },
            }
          : null,
        providerData: preferredHostingProvider
          ? { provider: preferredHostingProvider }
          : null,
        malwareData: malware
          ? {
              isMalware: Boolean(malware.isMalware),
              isPhishing: Boolean(malware.isPhishing),
              isBlacklisted: Boolean(malware.isBlacklisted),
            }
          : null,
      };

      // Keep Pro Dashboard domain history in sync with intelligence scans.
      if (authToken) {
        try {
          const historyResponse = await fetch("/api/scan-history", {
            method: "POST",
            headers: scanJsonHeaders,
            body: JSON.stringify({
              domain: normalizedDomain,
              scanType: "full",
              scanData: compactScanSnapshot,
            }),
          });

          if (!historyResponse.ok) {
            console.warn(
              "[Intelligence] Failed to save dashboard scan history:",
              historyResponse.status,
            );
          }
        } catch (historyError) {
          console.error(
            "[Intelligence] Failed to save dashboard scan history:",
            historyError,
          );
        }
      }

      if (
        hasUsablePerformanceData &&
        performance?.mobile &&
        performance?.desktop
      ) {
        try {
          const performanceHistoryResponse = await fetch(
            "/api/scan/performance/history",
            {
              method: "POST",
              headers: scanJsonHeaders,
              body: JSON.stringify({
                domain: normalizedDomain,
                mobile: performance.mobile,
                desktop: performance.desktop,
              }),
            },
          );

          if (!performanceHistoryResponse.ok) {
            console.warn(
              "[Intelligence] Failed to save performance history:",
              performanceHistoryResponse.status,
            );
          }
        } catch (performanceHistoryError) {
          console.error(
            "[Intelligence] Failed to save performance history:",
            performanceHistoryError,
          );
        }
      }

      const isScanPayloadSuccessful = (payload: ScanPayload | null) => {
        if (!payload || typeof payload !== "object") {
          return false;
        }
        const payloadError = (payload as Record<string, unknown>).error;
        return !(
          typeof payloadError === "string" && payloadError.trim().length > 0
        );
      };

      // Award XP for each completed scan category, even when performance fails.
      const scansCompleted: string[] = [];
      if (isScanPayloadSuccessful(security)) scansCompleted.push("security");
      if (hasUsablePerformanceData) scansCompleted.push("performance");
      if (isScanPayloadSuccessful(dns)) scansCompleted.push("dns");
      if (isScanPayloadSuccessful(ssl)) scansCompleted.push("ssl");
      if (isScanPayloadSuccessful(email)) scansCompleted.push("email");
      if (isScanPayloadSuccessful(malware)) scansCompleted.push("malware");
      if (isScanPayloadSuccessful(technology))
        scansCompleted.push("technology");
      if (isScanPayloadSuccessful(geolocation))
        scansCompleted.push("geolocation");
      if (isScanPayloadSuccessful(provider)) scansCompleted.push("provider");

      if (scansCompleted.length > 0) {
        try {
          const completionResponse = await fetch("/api/scan/complete", {
            method: "POST",
            headers: scanJsonHeaders,
            body: JSON.stringify({
              domain: normalizedDomain,
              scansCompleted,
            }),
          });

          if (!completionResponse.ok) {
            console.warn(
              "[Intelligence] Failed to process scan completion XP:",
              completionResponse.status,
            );
          }
        } catch (completionError) {
          console.error(
            "[Intelligence] Failed to process scan completion XP:",
            completionError,
          );
        }
      }

      // Save complete scan to database (fire and forget)
      fetch("/api/intelligence/scans", {
        method: "POST",
        headers: scanJsonHeaders,
        body: JSON.stringify({
          domain: normalizedDomain,
          hostingData: completeResults.provider,
          dnsData: completeResults.dns,
          ipData: completeResults.geolocation,
          techData: completeResults.technology,
          scanDuration: totalScanDuration,
        }),
      }).catch((err) => console.error("Failed to save scan:", err));
    } catch (err) {
      console.error("Scan failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to scan domain. Please try again.",
      );
    } finally {
      setLoading(false);
      setLoadingProgress("");
    }
  };

  scanDomainRef.current = scanDomain;

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
        console.error("[Intelligence] Failed to load favorites:", error);
      }
    };

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scanDomain(domain);
  };

  const handleAddFavorite = async () => {
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
  };

  // Auto-scan when domain is in URL on page load
  useEffect(() => {
    if (!initialDomain || results || loading || autoScanTriggeredRef.current) {
      return;
    }
    autoScanTriggeredRef.current = true;
    console.log(`Auto-scanning domain from URL: ${initialDomain}`);
    void scanDomainRef.current(initialDomain);
  }, [initialDomain, loading, results]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={PAGE_META.intelligence.title}
        description={PAGE_META.intelligence.description}
        keywords={PAGE_META.intelligence.keywords}
        noindex={PAGE_META.intelligence.noindex}
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backDestination.label}
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive security, performance, and technology analysis for any
            domain
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-8 border-2">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter domain (e.g., example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1 text-lg h-12"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Scan Domain
                  </>
                )}
              </Button>
              {user && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    loading ||
                    isAddingFavorite ||
                    !normalizedFavoriteDomain ||
                    isCurrentDomainFavorite
                  }
                  onClick={() => void handleAddFavorite()}
                  size="lg"
                  className="px-6"
                >
                  <Star
                    className={`mr-2 h-4 w-4 ${
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
            </form>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-xl font-bold">Scanning {domain}</div>
                  <div className="text-sm text-muted-foreground">
                    {loadingProgress}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    Running 8 comprehensive scans: Technology, DNS, Email, SSL,
                    Security, Performance, Geolocation, Provider
                  </div>
                  <div className="text-xs text-muted-foreground">
                    This typically takes 10-30 seconds
                  </div>
                </div>
                <div className="w-full max-w-md">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/50 animate-pulse"
                      style={{ width: "70%" }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && !loading && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-9 h-auto p-1">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group"
              >
                <LayoutDashboard className="h-4 w-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-5deg]" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="technology"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group"
              >
                <Server className="h-4 w-4 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3" />
                <span className="hidden sm:inline">Technology</span>
              </TabsTrigger>
              <TabsTrigger
                value="infrastructure"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group"
              >
                <Globe className="h-4 w-4 transition-all duration-400 group-hover:scale-105 group-hover:rotate-[8deg]" />
                <span className="hidden sm:inline">Infrastructure</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className={`flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group ${
                  shouldHighlightSecurityTab
                    ? "ring-1 ring-red-500/70 shadow-lg shadow-red-500/40 animate-[pulse_4s_ease-in-out_infinite]"
                    : ""
                }`}
              >
                <Lock className="h-4 w-4 transition-all duration-250 group-hover:scale-105 group-hover:rotate-[-5deg]" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group"
              >
                {loadingTabs.has("performance") ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Zap className="h-4 w-4 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[-8deg]" />
                )}
                <span className="hidden sm:inline">Performance</span>
              </TabsTrigger>
              <TabsTrigger
                value="dns"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group"
              >
                <Network className="h-4 w-4 transition-all duration-400 group-hover:scale-110 group-hover:rotate-[12deg]" />
                <span className="hidden sm:inline">DNS</span>
              </TabsTrigger>
              <TabsTrigger
                value="email"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group"
              >
                <Mail className="h-4 w-4 transition-all duration-300 group-hover:scale-105 group-hover:rotate-5" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group"
              >
                <History className="h-4 w-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-15deg]" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger
                value="recommendations"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200 hover:bg-primary/10 hover:-translate-y-px relative isolate group"
              >
                <Shield className="h-4 w-4 transition-all duration-300 group-hover:scale-105 group-hover:rotate-[-3deg]" />
                <span className="hidden sm:inline">Recommendations</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="space-y-6">
                <CollapsibleTile title="Overview Summary">
                  <OverviewTab
                    data={{
                      ...results,
                      scanCompletionPercent: overviewScanCompletion,
                      performanceScanLoading: loadingTabs.has("performance"),
                    }}
                    domain={domain}
                    isWebsiteBuilder={
                      results.technology?.server?.isWebsiteBuilder || false
                    }
                    builderType={
                      results.technology?.server?.builderType || null
                    }
                  />
                </CollapsibleTile>
              </div>
            </TabsContent>

            {/* Technology Tab */}
            <TabsContent value="technology">
              {(() => {
                const techData = convertTechnologyData(results.technology);
                const hasSecondaryOutput =
                  techData.isWebsiteBuilder || techData.wordpressDetected;

                return (
                  <div
                    className={
                      techData.isWebsiteBuilder
                        ? "grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch"
                        : hasSecondaryOutput
                          ? "grid grid-cols-1 xl:grid-cols-2 gap-6 items-start"
                          : "space-y-6"
                    }
                  >
                    <div
                      className={
                        techData.isWebsiteBuilder ? "min-w-0 h-full" : "min-w-0"
                      }
                    >
                      <CollapsibleTile
                        title="Technology Stack"
                        className={techData.isWebsiteBuilder ? "h-full" : ""}
                      >
                        <TechnologyStack
                          technologies={techData.technologies}
                          framework={techData.framework}
                          serverType={techData.serverType}
                          isCustomCoded={
                            !techData.isWebsiteBuilder &&
                            !techData.wordpressDetected &&
                            techData.serverType !== "unknown"
                          }
                          isWebsiteBuilder={techData.isWebsiteBuilder}
                          builderType={techData.builderType}
                          wordpressVersionUncertain={
                            techData.wordpressVersionUncertain
                          }
                        />
                      </CollapsibleTile>
                    </div>

                    {techData.isWebsiteBuilder && (
                      <div className="min-w-0 h-full">
                        <CollapsibleTile
                          title="Website Builder Detection"
                          className="h-full"
                        >
                          <Card className="border-purple-500/50 h-full">
                            <CardContent className="pt-6 h-full">
                              <div className="flex items-center gap-3 mb-4">
                                <Server className="h-6 w-6 text-purple-500" />
                                <h3 className="text-xl font-bold">
                                  Website Builder Detected
                                </h3>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Platform:
                                  </span>
                                  <span className="font-semibold">
                                    {techData.builderType}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Hosting Type:
                                  </span>
                                  <span className="font-semibold">Managed</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Migration Needed:
                                  </span>
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    No
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </CollapsibleTile>
                      </div>
                    )}

                    {!techData.isWebsiteBuilder &&
                      techData.wordpressDetected && (
                        <div className="min-w-0 space-y-6">
                          <CollapsibleTile title="WordPress Analysis">
                            <Card>
                              <CardContent className="pt-6">
                                {(() => {
                                  const certainty =
                                    results.technology?.wordpress?.certainty ||
                                    "likely";
                                  const signalCount =
                                    results.technology?.wordpress
                                      ?.detectionSignalCount ??
                                    results.technology?.wordpress?.methods
                                      ?.length ??
                                    0;
                                  const certaintyLabel =
                                    certainty === "confirmed"
                                      ? "Confirmed"
                                      : certainty === "likely"
                                        ? "Likely"
                                        : certainty === "unverified"
                                          ? "Unverified"
                                          : "Unknown";
                                  const certaintyClass =
                                    certainty === "confirmed"
                                      ? "bg-green-600"
                                      : certainty === "likely"
                                        ? "bg-blue-600"
                                        : "bg-amber-600";

                                  return (
                                    <div className="mb-4">
                                      <div className="flex items-center gap-3">
                                        <Server className="h-6 w-6 text-blue-500" />
                                        <h3 className="text-xl font-bold">
                                          WordPress Site
                                        </h3>
                                        <Badge className={certaintyClass}>
                                          {certaintyLabel}
                                        </Badge>
                                      </div>
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        Detection confidence is based on{" "}
                                        {signalCount} WordPress signal
                                        {signalCount === 1 ? "" : "s"}.
                                      </p>
                                      <div className="mt-4 pt-4 border-t border-border/50">
                                        <MigrationSupportPanel
                                          technology={results.technology}
                                          showSupportButton={false}
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>
                          </CollapsibleTile>
                          <CollapsibleTile title="Migration Eligibility">
                            <Card>
                              <CardContent className="pt-6">
                                {(() => {
                                  const recommendation =
                                    results.technology?.controlPanel
                                      ?.recommendation || "unknown";
                                  const reason =
                                    results.technology?.controlPanel?.reason ||
                                    "Unable to determine migration eligibility.";
                                  const isManagedUpgrade =
                                    recommendation === "managed-upgrade";
                                  const isNeedsUpdates =
                                    recommendation === "needs-updates";
                                  const isPaidSupport =
                                    recommendation === "paid-support";
                                  const isCPanel = recommendation === "cpanel";

                                  const containerClass = isManagedUpgrade
                                    ? "bg-gradient-to-br from-green-500/20 via-green-500/10 to-emerald-500/10 border-green-500/40"
                                    : isNeedsUpdates
                                      ? "bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-yellow-500/10 border-orange-500/40"
                                      : "bg-muted/50 border-border";
                                  const iconWrapClass = isManagedUpgrade
                                    ? "bg-green-500/20 border-green-500/30"
                                    : isNeedsUpdates
                                      ? "bg-orange-500/20 border-orange-500/30"
                                      : "bg-muted border-border";
                                  const badgeClass = isManagedUpgrade
                                    ? "bg-green-500"
                                    : isNeedsUpdates
                                      ? "bg-orange-500"
                                      : "";

                                  return (
                                    <div
                                      className={`mb-4 p-4 rounded-lg border ${containerClass}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div
                                          className={`p-2 rounded-md border ${iconWrapClass}`}
                                        >
                                          {isManagedUpgrade ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                          ) : isNeedsUpdates ||
                                            isPaidSupport ? (
                                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                                          ) : (
                                            <Server className="h-5 w-5 text-muted-foreground" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <h4 className="text-sm font-semibold">
                                              Migration Eligibility
                                            </h4>
                                            <Badge
                                              variant={
                                                isManagedUpgrade
                                                  ? "default"
                                                  : "secondary"
                                              }
                                              className={`text-[10px] ${badgeClass}`}
                                            >
                                              {isManagedUpgrade &&
                                                "✓ Migration Ready"}
                                              {isNeedsUpdates &&
                                                "⚠ Updates Required"}
                                              {isPaidSupport &&
                                                "⚠ Needs Professional Help"}
                                              {isCPanel && "cPanel Detected"}
                                              {(!recommendation ||
                                                recommendation === "unknown") &&
                                                "⚠ Unable to Determine"}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            {reason}
                                          </p>
                                          {isManagedUpgrade && (
                                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                <span>
                                                  WP{" "}
                                                  {results.technology?.wordpress
                                                    ?.version || "unknown"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                <span>
                                                  PHP{" "}
                                                  {results.technology?.php
                                                    ?.version || "unknown"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                <span>
                                                  {results.technology?.server
                                                    ?.type || "server unknown"}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                          <Button
                                            variant="default"
                                            size="sm"
                                            className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                                            onClick={() =>
                                              setShowMigrationDialog(true)
                                            }
                                          >
                                            View Migration Benefits
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>
                          </CollapsibleTile>
                        </div>
                      )}
                  </div>
                );
              })()}
            </TabsContent>

            {/* Infrastructure Tab */}
            <TabsContent value="infrastructure">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                <div className="min-w-0">
                  <CollapsibleTile
                    title="DNS Infrastructure"
                    className="h-full"
                  >
                    <DNSInfrastructure
                      domain={domain}
                      records={convertDNSRecordsToArray(results.dns?.records)}
                      authoritativeNameservers={
                        results.dns?.nameservers ||
                        results.dns?.records?.NS ||
                        []
                      }
                      subdomainCount={extractSubdomainCount(results.dns)}
                      discoveredSubdomains={
                        Array.isArray(results.dns?.subdomains)
                          ? results.dns.subdomains
                          : []
                      }
                      emailData={
                        results.email
                          ? {
                              mx: results.email.mx || [],
                              providers: results.email.providers || [],
                              securityGateway: results.email.securityGateway,
                            }
                          : undefined
                      }
                      isWebsiteBuilder={
                        results.technology?.server?.isWebsiteBuilder || false
                      }
                      builderType={
                        results.technology?.server?.builderType || null
                      }
                    />
                  </CollapsibleTile>
                </div>
                <div className="min-w-0">
                  <CollapsibleTile title="IP Fingerprint" className="h-full">
                    <IPFingerprint
                      ipAddress={extractIPAddress(
                        results.geolocation,
                        results.dns,
                      )}
                      asn={results.geolocation?.asn || results.attribution?.asn}
                      asnOrg={
                        results.geolocation?.asnName ||
                        results.attribution?.asnOrg
                      }
                      country={
                        results.geolocation?.location?.country ||
                        results.geolocation?.country
                      }
                      city={
                        results.geolocation?.location?.city ||
                        results.geolocation?.city
                      }
                      openPorts={[]}
                      serviceBanners={{}}
                      tlsCertData={results.ssl}
                      httpResponses={{}}
                    />
                  </CollapsibleTile>
                </div>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              {loadingTabs.has("security") ? (
                <Card className="border-2 border-primary/20">
                  <CardContent className="pt-8 pb-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          Loading Security Analysis...
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Scanning SSL certificates, security headers, WAF
                          protection, and vulnerabilities
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    // Transform security data for components
                    const securityData = results.security || {};
                    const normalizedSecurityData = {
                      ...securityData,
                      headers:
                        securityData.headers ||
                        securityData.securityHeaders ||
                        {},
                      wafDetected:
                        securityData.wafDetected ??
                        securityData.waf?.detected ??
                        false,
                      wafProvider:
                        securityData.wafProvider ??
                        securityData.waf?.provider ??
                        null,
                      wafConfidence:
                        securityData.wafConfidence ??
                        securityData.waf?.confidence ??
                        0,
                      wafMethods:
                        securityData.wafMethods ??
                        securityData.waf?.evidence ??
                        [],
                      wafHostProvider:
                        securityData.wafHostProvider ??
                        securityData.waf?.hostProvider ??
                        null,
                      wafCorroborated:
                        securityData.wafCorroborated ??
                        securityData.waf?.corroborated ??
                        false,
                      wafSourceVersion:
                        securityData.wafSourceVersion ??
                        securityData.waf?.sourceVersion ??
                        null,
                      wafEvidenceDetails:
                        securityData.waf?.evidenceDetails ?? [],
                      wafHistorySummary:
                        securityData.waf?.historySummary ?? null,
                      ddosProtection:
                        securityData.ddosProtection ??
                        securityData.ddos?.protected ??
                        false,
                    };
                    const rawSslData = results.ssl || {};

                    // Map SSL data - API returns daysUntilExpiry, component expects daysRemaining
                    const sslData = {
                      ...rawSslData,
                      daysRemaining:
                        rawSslData.daysUntilExpiry ??
                        rawSslData.daysRemaining ??
                        0,
                    };

                    // Check if website builder (managed security)
                    const isWebsiteBuilder =
                      results.technology?.server?.isWebsiteBuilder || false;
                    const builderType =
                      results.technology?.server?.builderType || null;

                    // If website builder, show managed security card
                    if (isWebsiteBuilder && builderType) {
                      return (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                          <CollapsibleTile
                            title="Managed Security"
                            className="h-full"
                            contentClassName="h-full"
                          >
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Shield className="h-5 w-5 text-primary" />
                                  Managed Security
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <Alert>
                                  <Shield className="h-4 w-4" />
                                  <AlertDescription>
                                    Security is fully managed by{" "}
                                    <strong>{builderType}</strong>, including
                                    SSL certificates, security headers, DDoS
                                    protection, and Web Application Firewall
                                    (WAF).
                                  </AlertDescription>
                                </Alert>

                                <div className="space-y-2 pt-2 border-t">
                                  <div className="text-sm font-semibold">
                                    Platform Security Features
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      <span>SSL/TLS Certificates</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      <span>DDoS Protection</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      <span>Web Application Firewall</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      <span>Security Headers</span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </CollapsibleTile>

                          {/* Still show SSL certificate - users want to see this */}
                          {sslData.valid !== undefined && (
                            <CollapsibleTile
                              title="SSL/TLS Certificate"
                              className="h-full"
                              contentClassName="h-full"
                            >
                              <SSLCertificateCard
                                valid={sslData.valid || false}
                                issuer={sslData.issuer || "Unknown"}
                                validFrom={
                                  sslData.validFrom || new Date().toISOString()
                                }
                                validTo={
                                  sslData.validTo || new Date().toISOString()
                                }
                                daysRemaining={sslData.daysRemaining || 0}
                                protocol={sslData.protocol}
                                cipher={sslData.cipher}
                                grade={sslData.grade || "F"}
                                showGrade={false}
                                domains={sslData.domains || []}
                                wildcardCert={sslData.wildcardCert}
                              />
                            </CollapsibleTile>
                          )}
                        </div>
                      );
                    }

                    // Normal security display for non-builders

                    // Build security recommendations
                    const recommendations: Array<{
                      priority: "critical" | "high" | "medium" | "low";
                      category: string;
                      issue: string;
                      recommendation: string;
                      implementation?: string;
                      potentialImpact?: string;
                    }> = [];

                    // Add recommendations for missing security headers
                    if (normalizedSecurityData.headers) {
                      if (
                        !normalizedSecurityData.headers[
                          "content-security-policy"
                        ]?.present
                      ) {
                        recommendations.push({
                          priority: "critical",
                          category: "Security Headers",
                          issue: "Content-Security-Policy header missing",
                          recommendation:
                            "Add a Content-Security-Policy header to prevent XSS attacks and control resource loading.",
                          implementation: `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`,
                          potentialImpact:
                            "Without CSP, your site is vulnerable to cross-site scripting (XSS) attacks that could steal user data or inject malicious content.",
                        });
                      }
                      if (
                        !normalizedSecurityData.headers[
                          "strict-transport-security"
                        ]?.present
                      ) {
                        recommendations.push({
                          priority: "high",
                          category: "Security Headers",
                          issue: "Strict-Transport-Security header missing",
                          recommendation:
                            "Enable HSTS to force browsers to use HTTPS connections only.",
                          implementation: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`,
                          potentialImpact:
                            "Without HSTS, users may be vulnerable to man-in-the-middle attacks when accessing your site over HTTP.",
                        });
                      }
                      if (
                        !normalizedSecurityData.headers["referrer-policy"]
                          ?.present
                      ) {
                        recommendations.push({
                          priority: "medium",
                          category: "Security Headers",
                          issue: "Referrer-Policy header missing",
                          recommendation:
                            "Add a Referrer-Policy header to control referrer information leakage.",
                          implementation: `Referrer-Policy: strict-origin-when-cross-origin`,
                          potentialImpact:
                            "Without a referrer policy, sensitive information in URLs may be leaked to third-party sites.",
                        });
                      }
                      if (
                        !normalizedSecurityData.headers["permissions-policy"]
                          ?.present
                      ) {
                        recommendations.push({
                          priority: "medium",
                          category: "Security Headers",
                          issue: "Permissions-Policy header missing",
                          recommendation:
                            "Add a Permissions-Policy header to control browser features and APIs.",
                          implementation: `Permissions-Policy: geolocation=(), microphone=(), camera=()`,
                          potentialImpact:
                            "Without permissions policy, malicious scripts could access sensitive browser features without user consent.",
                        });
                      }
                    }

                    // Add SSL/TLS recommendations
                    if (sslData.daysRemaining && sslData.daysRemaining < 30) {
                      recommendations.push({
                        priority:
                          sslData.daysRemaining < 15 ? "critical" : "high",
                        category: "SSL/TLS",
                        issue: `SSL certificate expires in ${sslData.daysRemaining} days`,
                        recommendation:
                          "Renew your SSL certificate before it expires to avoid service disruption.",
                        potentialImpact:
                          "An expired certificate will cause browsers to show security warnings and block access to your site.",
                      });
                    }

                    // Add WAF recommendation if not detected
                    if (
                      shouldRecommendWaf({
                        wafDetected: normalizedSecurityData.wafDetected,
                        hostProvider: normalizedSecurityData.wafHostProvider,
                        wafConfidence: normalizedSecurityData.wafConfidence,
                        corroborated: normalizedSecurityData.wafCorroborated,
                      })
                    ) {
                      recommendations.push({
                        priority: "high",
                        category: "WAF Protection",
                        issue: "No Web Application Firewall detected",
                        recommendation:
                          "Enable a WAF to protect against common web attacks like SQL injection and XSS.",
                        potentialImpact:
                          "Without a WAF, your site is more vulnerable to automated attacks and exploitation attempts.",
                      });
                    }

                    return (
                      <>
                        {/* Row 1: WAF + SSL Certificate (+ Malware directly below SSL) */}
                        <CollapsibleTile title="Security & SSL Summary">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <WAFProtectionCard
                              wafDetected={
                                normalizedSecurityData.wafDetected || false
                              }
                              wafProvider={
                                normalizedSecurityData.wafProvider || null
                              }
                              wafConfidence={
                                normalizedSecurityData.wafConfidence || 0
                              }
                              ddosProtection={
                                normalizedSecurityData.ddosProtection || false
                              }
                              methods={normalizedSecurityData.wafMethods || []}
                              hostProvider={
                                normalizedSecurityData.wafHostProvider || null
                              }
                              corroborated={
                                normalizedSecurityData.wafCorroborated || false
                              }
                              evidenceDetails={
                                normalizedSecurityData.wafEvidenceDetails || []
                              }
                              historySummary={
                                normalizedSecurityData.wafHistorySummary || null
                              }
                            />

                            <div className="space-y-6">
                              {sslData.valid !== undefined && (
                                <SSLCertificateCard
                                  valid={sslData.valid || false}
                                  issuer={sslData.issuer || "Unknown"}
                                  validFrom={
                                    sslData.validFrom ||
                                    new Date().toISOString()
                                  }
                                  validTo={
                                    sslData.validTo || new Date().toISOString()
                                  }
                                  daysRemaining={sslData.daysRemaining || 0}
                                  protocol={sslData.protocol}
                                  cipher={sslData.cipher}
                                  grade={sslData.grade || "F"}
                                  domains={sslData.domains || []}
                                  wildcardCert={sslData.wildcardCert}
                                  compact
                                />
                              )}

                              {results.malware && (
                                <div
                                  ref={malwareSectionRef}
                                  className={
                                    hasMalwareAlert
                                      ? "rounded-lg border border-red-500/60 shadow-[0_0_22px_rgba(239,68,68,0.35)] animate-[pulse_3s_ease-in-out_infinite]"
                                      : ""
                                  }
                                >
                                  <MalwareDetectionCard
                                    domain={results.domain}
                                    isBlacklisted={
                                      results.malware.isBlacklisted || false
                                    }
                                    isMalware={
                                      results.malware.isMalware || false
                                    }
                                    isPhishing={
                                      results.malware.isPhishing || false
                                    }
                                    threats={results.malware.threats || []}
                                    checks={{
                                      urlhaus: results.malware.checks
                                        ?.urlhaus || {
                                        checked: false,
                                        clean: true,
                                      },
                                      googleSafeBrowsing: results.malware.checks
                                        ?.googleSafeBrowsing || {
                                        checked: false,
                                        clean: true,
                                      },
                                      virusTotal: results.malware.checks
                                        ?.virusTotal || {
                                        checked: false,
                                        clean: true,
                                      },
                                      phishTank:
                                        results.malware.checks?.phishTank,
                                    }}
                                    lastChecked={results.malware.lastChecked}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleTile>

                        {/* Row 3: Security Headers (Full Width) */}
                        {normalizedSecurityData.headers && (
                          <CollapsibleTile
                            title="Security Headers"
                            defaultCollapsed
                          >
                            <SecurityHeadersCard
                              headers={normalizedSecurityData.headers}
                            />
                          </CollapsibleTile>
                        )}

                        {/* Row 4: Security Recommendations (Full Width) */}
                        <CollapsibleTile
                          title="Security Recommendations"
                          defaultCollapsed
                        >
                          <SecurityRecommendationsCard
                            recommendations={recommendations}
                          />
                        </CollapsibleTile>
                      </>
                    );
                  })()}
                </div>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance">
              {loadingTabs.has("performance") ? (
                <Card className="border-2 border-primary/20">
                  <CardContent className="pt-8 pb-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          Loading Performance Analysis...
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Running Google PageSpeed Insights (mobile + desktop)
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          This typically takes 10-20 seconds
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : results?.performance ? (
                <div className="space-y-6">
                  {(() => {
                    // Transform performance data for components
                    const performanceData = results.performance || {};

                    // Extract mobile and desktop scores
                    const mobileScore = performanceData.mobile?.score || 0;
                    const desktopScore = performanceData.desktop?.score || 0;

                    // Extract Core Web Vitals from mobile and desktop data
                    // API returns metrics as objects with { value, score, displayValue }
                    // Extract the .value property for numeric values
                    const mobileMetrics = {
                      fcp: performanceData.mobile?.metrics?.fcp?.value,
                      lcp: performanceData.mobile?.metrics?.lcp?.value,
                      tbt: performanceData.mobile?.metrics?.tbt?.value,
                      cls: performanceData.mobile?.metrics?.cls?.value,
                      speedIndex:
                        performanceData.mobile?.metrics?.speedIndex?.value,
                    };

                    const desktopMetrics = {
                      fcp: performanceData.desktop?.metrics?.fcp?.value,
                      lcp: performanceData.desktop?.metrics?.lcp?.value,
                      tbt: performanceData.desktop?.metrics?.tbt?.value,
                      cls: performanceData.desktop?.metrics?.cls?.value,
                      speedIndex:
                        performanceData.desktop?.metrics?.speedIndex?.value,
                    };

                    // Extract Page Metrics
                    // PageSpeed API doesn't provide these metrics directly
                    // We can estimate some based on Core Web Vitals or leave undefined
                    const pageMetrics = {
                      loadTime: undefined, // Not available from PageSpeed
                      pageSize: undefined, // Not available from PageSpeed
                      requests: undefined, // Not available from PageSpeed
                      domSize: undefined, // Not available from PageSpeed
                      timeToInteractive: mobileMetrics.tbt
                        ? mobileMetrics.tbt + (mobileMetrics.fcp || 0)
                        : undefined,
                      firstMeaningfulPaint: mobileMetrics.fcp, // Use FCP as approximation
                    };

                    // Build optimization opportunities from PageSpeed data
                    const opportunities: Array<{
                      title: string;
                      description: string;
                      impact: "high" | "medium" | "low";
                      savings?: string;
                      category:
                        | "images"
                        | "javascript"
                        | "css"
                        | "fonts"
                        | "network"
                        | "rendering"
                        | "other";
                      details?: string[];
                    }> = [];

                    // Parse opportunities from PageSpeed Insights data (from mobile results)
                    const mobileOpportunities =
                      performanceData.mobile?.opportunities || [];
                    if (mobileOpportunities.length > 0) {
                      mobileOpportunities.forEach((opp) => {
                        let category:
                          | "images"
                          | "javascript"
                          | "css"
                          | "fonts"
                          | "network"
                          | "rendering"
                          | "other" = "other";

                        // Categorize based on opportunity ID
                        if (
                          opp.id?.includes("image") ||
                          opp.id?.includes("offscreen")
                        )
                          category = "images";
                        else if (
                          opp.id?.includes("javascript") ||
                          opp.id?.includes("js") ||
                          opp.id?.includes("script")
                        )
                          category = "javascript";
                        else if (
                          opp.id?.includes("css") ||
                          opp.id?.includes("style")
                        )
                          category = "css";
                        else if (opp.id?.includes("font")) category = "fonts";
                        else if (
                          opp.id?.includes("network") ||
                          opp.id?.includes("connection")
                        )
                          category = "network";
                        else if (
                          opp.id?.includes("render") ||
                          opp.id?.includes("paint")
                        )
                          category = "rendering";

                        // Determine impact based on score impact
                        let impact: "high" | "medium" | "low" = "low";
                        if (opp.numericValue > 1000) impact = "high";
                        else if (opp.numericValue > 500) impact = "medium";

                        opportunities.push({
                          title: opp.title || "Optimization Opportunity",
                          description: opp.description || "Improve performance",
                          impact,
                          savings: opp.displayValue,
                          category,
                          details: opp.details || [],
                        });
                      });
                    }

                    // Add default opportunities if none from API
                    if (opportunities.length === 0 && mobileScore < 90) {
                      opportunities.push({
                        title: "Optimize Images",
                        description:
                          "Properly size images and use modern formats like WebP",
                        impact: "high",
                        savings: "1.5s",
                        category: "images",
                        details: [
                          "Use responsive images with srcset",
                          "Compress images without losing quality",
                          "Convert to WebP or AVIF format",
                          "Lazy load offscreen images",
                        ],
                      });
                      opportunities.push({
                        title: "Reduce JavaScript Execution Time",
                        description:
                          "Minimize and defer non-critical JavaScript",
                        impact: "medium",
                        savings: "800ms",
                        category: "javascript",
                        details: [
                          "Remove unused JavaScript",
                          "Split code into smaller chunks",
                          "Defer non-critical scripts",
                          "Use code splitting and lazy loading",
                        ],
                      });
                    }

                    return (
                      <>
                        {/* Performance Overview - Mobile & Desktop Scores */}
                        <CollapsibleTile title="Performance Overview">
                          <PerformanceOverview
                            mobileScore={mobileScore}
                            desktopScore={desktopScore}
                            mobileMetrics={mobileMetrics}
                            desktopMetrics={desktopMetrics}
                          />
                        </CollapsibleTile>

                        {/* Mobile Performance Details */}
                        <CollapsibleTile title="Mobile Performance Details">
                          <PerformanceDetails
                            device="mobile"
                            metrics={mobileMetrics}
                            pageMetrics={pageMetrics}
                            opportunities={opportunities}
                          />
                        </CollapsibleTile>

                        {/* Desktop Performance Details */}
                        <CollapsibleTile title="Desktop Performance Details">
                          <PerformanceDetails
                            device="desktop"
                            metrics={desktopMetrics}
                            pageMetrics={pageMetrics}
                            opportunities={opportunities}
                          />
                        </CollapsibleTile>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">
                      No performance data available
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* DNS Tab */}
            <TabsContent value="dns">
              <div className="space-y-6">
                <CollapsibleTile title="DNS Infrastructure">
                  <DNSInfrastructure
                    domain={domain}
                    records={convertDNSRecordsToArray(results.dns?.records)}
                    authoritativeNameservers={
                      results.dns?.nameservers || results.dns?.records?.NS || []
                    }
                    subdomainCount={extractSubdomainCount(results.dns)}
                    discoveredSubdomains={
                      Array.isArray(results.dns?.subdomains)
                        ? results.dns.subdomains
                        : []
                    }
                    emailData={
                      results.email
                        ? {
                            mx: results.email.mx || [],
                            providers: results.email.providers || [],
                            securityGateway: results.email.securityGateway,
                          }
                        : undefined
                    }
                  />
                </CollapsibleTile>
              </div>
            </TabsContent>

            {/* Email Tab */}
            <TabsContent value="email">
              {loadingTabs.has("email") ? (
                <Card className="border-2 border-primary/20">
                  <CardContent className="pt-8 pb-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          Loading Email Security Analysis...
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          Checking MX records, SPF, DMARC, and DKIM
                          configurations
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : results?.email &&
                (results.email.mx ||
                  results.email.spf ||
                  results.email.dmarc ||
                  results.email.dkim) ? (
                <div className="space-y-6">
                  {(() => {
                    // Transform email data from API format to component format
                    const apiEmailData = results.email || {};

                    // Helper: Extract DMARC policy from record
                    const extractDmarcPolicy = (
                      record: string | null | undefined,
                    ): "reject" | "quarantine" | "none" | undefined => {
                      if (!record) return undefined;
                      if (record.includes("p=reject")) return "reject";
                      if (record.includes("p=quarantine")) return "quarantine";
                      if (record.includes("p=none")) return "none";
                      return "none";
                    };

                    const extractDmarcSubdomainPolicy = (
                      record: string | null | undefined,
                    ): "reject" | "quarantine" | "none" | undefined => {
                      if (!record) return undefined;
                      if (record.includes("sp=reject")) return "reject";
                      if (record.includes("sp=quarantine")) return "quarantine";
                      if (record.includes("sp=none")) return "none";
                      return undefined;
                    };

                    const mxStatus: "valid" | "warning" | "error" =
                      apiEmailData.mx && apiEmailData.mx.length > 1
                        ? "valid"
                        : apiEmailData.mx && apiEmailData.mx.length === 1
                          ? "warning"
                          : "error";

                    const spfIssues = Array.isArray(apiEmailData.spf?.issues)
                      ? apiEmailData.spf.issues
                      : [];
                    const spfStatus: "valid" | "warning" | "error" | "missing" =
                      !apiEmailData.spf?.configured
                        ? "missing"
                        : spfIssues.length > 0
                          ? "warning"
                          : "valid";

                    const dmarcPolicy = extractDmarcPolicy(
                      apiEmailData.dmarc?.record,
                    );
                    const dmarcStatus:
                      | "valid"
                      | "warning"
                      | "error"
                      | "missing" = !apiEmailData.dmarc?.configured
                      ? "missing"
                      : dmarcPolicy === "none"
                        ? "warning"
                        : "valid";

                    const dkimKeyLength =
                      typeof apiEmailData.dkim?.keyLength === "number"
                        ? apiEmailData.dkim.keyLength
                        : undefined;
                    const dkimStatus:
                      | "valid"
                      | "warning"
                      | "error"
                      | "missing" = !apiEmailData.dkim?.configured
                      ? "missing"
                      : dkimKeyLength && dkimKeyLength < 1024
                        ? "warning"
                        : "valid";

                    // Transform API data to component-expected format
                    const emailData = {
                      mx: {
                        records: apiEmailData.mx || [],
                        status: mxStatus,
                        provider: apiEmailData.providers?.[0] || undefined,
                      },
                      spf: {
                        present: apiEmailData.spf?.configured || false,
                        record: apiEmailData.spf?.record || undefined,
                        status: spfStatus,
                        mechanisms: apiEmailData.spf?.parsed?.mechanisms || [],
                        includes: apiEmailData.spf?.parsed?.includes || [],
                        issues: spfIssues,
                      },
                      dmarc: {
                        present: apiEmailData.dmarc?.configured || false,
                        record: apiEmailData.dmarc?.record || undefined,
                        status: dmarcStatus,
                        policy: dmarcPolicy,
                        subdomainPolicy: extractDmarcSubdomainPolicy(
                          apiEmailData.dmarc?.record,
                        ),
                        percentage:
                          typeof apiEmailData.dmarc?.percentage === "number"
                            ? apiEmailData.dmarc.percentage
                            : undefined,
                        reportingEmails: Array.isArray(
                          apiEmailData.dmarc?.reportingEmails,
                        )
                          ? apiEmailData.dmarc.reportingEmails
                          : [],
                        issues: [],
                      },
                      dkim: {
                        present: apiEmailData.dkim?.configured || false,
                        status: dkimStatus,
                        selectors: apiEmailData.dkim?.selectors || [],
                        providers: apiEmailData.dkim?.providers || [],
                        keyLength: dkimKeyLength,
                        issues: [],
                      },
                      providers: apiEmailData.providers || [],
                      securityServices: apiEmailData.securityServices || [],
                    };

                    console.log("[Intelligence] Email data transformed:", {
                      apiFormat: {
                        mx: apiEmailData.mx?.length,
                        providers: apiEmailData.providers,
                      },
                      componentFormat: {
                        mxRecords: emailData.mx.records.length,
                        provider: emailData.mx.provider,
                      },
                    });

                    // Calculate email security score
                    const calculateEmailScore = () => {
                      let score = 0;
                      let spfScore = 0;
                      let dmarcScore = 0;
                      let dkimScore = 0;
                      let mxScore = 0;

                      // SPF scoring (30% weight)
                      if (emailData.spf?.present) {
                        if (emailData.spf.status === "valid") spfScore = 100;
                        else if (emailData.spf.status === "warning")
                          spfScore = 70;
                        else spfScore = 40;
                      }

                      // DMARC scoring (30% weight)
                      if (emailData.dmarc?.present) {
                        if (emailData.dmarc.policy === "reject")
                          dmarcScore = 100;
                        else if (emailData.dmarc.policy === "quarantine")
                          dmarcScore = 80;
                        else if (emailData.dmarc.policy === "none")
                          dmarcScore = 50;
                      }

                      // DKIM scoring (25% weight)
                      if (emailData.dkim?.present) {
                        if (
                          emailData.dkim.keyLength &&
                          emailData.dkim.keyLength >= 2048
                        )
                          dkimScore = 100;
                        else if (
                          emailData.dkim.keyLength &&
                          emailData.dkim.keyLength >= 1024
                        )
                          dkimScore = 70;
                        else dkimScore = 50;
                      }

                      // MX scoring (15% weight)
                      if (
                        emailData.mx?.records &&
                        emailData.mx.records.length > 0
                      ) {
                        if (emailData.mx.records.length >= 2) mxScore = 100;
                        else mxScore = 70;
                      }

                      score = Math.round(
                        spfScore * 0.3 +
                          dmarcScore * 0.3 +
                          dkimScore * 0.25 +
                          mxScore * 0.15,
                      );

                      // Calculate grade
                      let grade = "F";
                      if (score >= 90) grade = "A";
                      else if (score >= 80) grade = "B";
                      else if (score >= 70) grade = "C";
                      else if (score >= 60) grade = "D";

                      return {
                        score,
                        grade,
                        categories: {
                          spf: { score: spfScore, weight: 0.3 },
                          dmarc: { score: dmarcScore, weight: 0.3 },
                          dkim: { score: dkimScore, weight: 0.25 },
                          mx: { score: mxScore, weight: 0.15 },
                        },
                      };
                    };

                    const emailScore = calculateEmailScore();

                    // Build recommendations
                    const recommendations: Array<{
                      title: string;
                      description: string;
                      priority: "critical" | "high" | "medium" | "low";
                      category: "spf" | "dmarc" | "dkim" | "mx" | "general";
                      implementation?: string;
                      impact: string;
                    }> = [];

                    // SPF recommendations
                    if (!emailData.spf?.present) {
                      recommendations.push({
                        title: "Add SPF Record",
                        description:
                          "Your domain has no SPF record, making it vulnerable to email spoofing",
                        priority: "critical",
                        category: "spf",
                        implementation: "v=spf1 include:_spf.google.com ~all",
                        impact:
                          "Prevents email spoofing and improves deliverability",
                      });
                    } else if (emailData.spf.status !== "valid") {
                      recommendations.push({
                        title: "Fix SPF Record Issues",
                        description: "Your SPF record has validation errors",
                        priority: "high",
                        category: "spf",
                        impact: "Ensures proper email authentication",
                      });
                    }

                    // DMARC recommendations
                    if (!emailData.dmarc?.present) {
                      recommendations.push({
                        title: "Add DMARC Policy",
                        description:
                          "DMARC provides reporting and policy enforcement for email authentication",
                        priority: "critical",
                        category: "dmarc",
                        implementation:
                          "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100",
                        impact:
                          "Protects against phishing and provides authentication reports",
                      });
                    } else if (emailData.dmarc.policy === "none") {
                      recommendations.push({
                        title: "Upgrade DMARC Policy",
                        description:
                          'Your DMARC policy is set to "none" (monitoring only)',
                        priority: "medium",
                        category: "dmarc",
                        implementation:
                          "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100",
                        impact:
                          "Enforces email authentication and blocks spoofed emails",
                      });
                    }

                    // DKIM recommendations
                    if (!emailData.dkim?.present) {
                      recommendations.push({
                        title: "Configure DKIM Signing",
                        description:
                          "DKIM adds cryptographic signatures to verify email authenticity",
                        priority: "high",
                        category: "dkim",
                        impact:
                          "Verifies email integrity and improves deliverability",
                      });
                    } else if (
                      emailData.dkim.keyLength &&
                      emailData.dkim.keyLength < 2048
                    ) {
                      recommendations.push({
                        title: "Upgrade DKIM Key Length",
                        description: `Your DKIM key is ${emailData.dkim.keyLength}-bit, below the 2048-bit recommendation`,
                        priority: "medium",
                        category: "dkim",
                        impact: "Improves cryptographic security",
                      });
                    }

                    // MX recommendations
                    if (
                      !emailData.mx?.records ||
                      emailData.mx.records.length === 0
                    ) {
                      recommendations.push({
                        title: "Add MX Records",
                        description: "Your domain has no MX records configured",
                        priority: "critical",
                        category: "mx",
                        impact: "Enables email delivery to your domain",
                      });
                    }

                    const hasMxRecords =
                      (emailData.mx?.records?.length ?? 0) > 0;
                    const totalAuthProtocols = [
                      emailData.spf?.present,
                      emailData.dmarc?.present,
                      emailData.dkim?.present,
                    ].filter(Boolean).length;
                    const emailProvider =
                      emailData.mx?.provider ||
                      emailData.providers?.[0] ||
                      (hasMxRecords
                        ? "Custom Email Server"
                        : "No Email Configured");
                    const providerIcon = emailProvider.includes("Google")
                      ? "🔵"
                      : emailProvider.includes("Microsoft") ||
                          emailProvider.includes("Outlook")
                        ? "🔷"
                        : emailProvider.includes("Zoho")
                          ? "🔴"
                          : emailProvider.includes("Proton")
                            ? "🔐"
                            : emailProvider === "No Email Configured"
                              ? "❌"
                              : "📧";
                    const criticalCount = recommendations.filter(
                      (rec) => rec.priority === "critical",
                    ).length;
                    const highCount = recommendations.filter(
                      (rec) => rec.priority === "high",
                    ).length;
                    const scoreColorClass =
                      emailScore.score >= 85
                        ? "text-green-600 dark:text-green-400"
                        : emailScore.score >= 70
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400";
                    const missingProtocol = !emailData.spf?.present
                      ? "SPF"
                      : !emailData.dkim?.present
                        ? "DKIM"
                        : !emailData.dmarc?.present
                          ? "DMARC"
                          : null;
                    const getProtocolHeaderConfig = (
                      status?: "valid" | "warning" | "error" | "missing",
                    ) => {
                      const normalizedStatus = status || "missing";
                      if (normalizedStatus === "valid") {
                        return {
                          headerClassName:
                            "bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-500/15",
                          badgeClassName:
                            "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300",
                          label: "Valid",
                          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                        };
                      }
                      if (normalizedStatus === "warning") {
                        return {
                          headerClassName:
                            "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/15",
                          badgeClassName:
                            "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300",
                          label: "Warning",
                          icon: <AlertTriangle className="h-3.5 w-3.5" />,
                        };
                      }
                      return {
                        headerClassName:
                          "bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/15",
                        badgeClassName:
                          "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300",
                        label:
                          normalizedStatus === "error" ? "Error" : "Missing",
                        icon: <XCircle className="h-3.5 w-3.5" />,
                      };
                    };
                    const spfHeaderConfig = getProtocolHeaderConfig(
                      emailData.spf?.status,
                    );
                    const dmarcHeaderConfig = getProtocolHeaderConfig(
                      emailData.dmarc?.status,
                    );
                    const dkimHeaderConfig = getProtocolHeaderConfig(
                      emailData.dkim?.status,
                    );

                    return (
                      <>
                        <CollapsibleTile title="Email Security Summary">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                            <Card className="border-border bg-card/50 backdrop-blur">
                              <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                    <Mail className="h-6 w-6 text-primary" />
                                  </div>
                                  <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-xl font-semibold">
                                        Email Provider
                                      </h3>
                                      <Badge
                                        className={
                                          totalAuthProtocols === 3
                                            ? "bg-green-500"
                                            : totalAuthProtocols === 2
                                              ? "bg-orange-500"
                                              : "bg-red-500"
                                        }
                                      >
                                        Security: {totalAuthProtocols}/3
                                      </Badge>
                                      <Badge variant="outline">
                                        {emailData.mx.records.length} MX
                                      </Badge>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">
                                        {providerIcon}
                                      </span>
                                      <span className="text-lg font-semibold">
                                        {emailProvider}
                                      </span>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                          Email Authentication
                                        </span>
                                        <span className="font-semibold">
                                          {totalAuthProtocols}/3
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div
                                          className={`p-2 rounded text-center text-xs font-medium border ${
                                            emailData.spf?.present
                                              ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                                              : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                                          }`}
                                        >
                                          {emailData.spf?.present ? "✓" : "✕"}{" "}
                                          SPF
                                        </div>
                                        <div
                                          className={`p-2 rounded text-center text-xs font-medium border ${
                                            emailData.dkim?.present
                                              ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                                              : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                                          }`}
                                        >
                                          {emailData.dkim?.present ? "✓" : "✕"}{" "}
                                          DKIM
                                        </div>
                                        <div
                                          className={`p-2 rounded text-center text-xs font-medium border ${
                                            emailData.dmarc?.present
                                              ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                                              : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                                          }`}
                                        >
                                          {emailData.dmarc?.present ? "✓" : "✕"}{" "}
                                          DMARC
                                        </div>
                                      </div>
                                    </div>

                                    {hasMxRecords &&
                                      !(
                                        totalAuthProtocols === 2 &&
                                        missingProtocol === "DKIM"
                                      ) && (
                                        <div
                                          className={`p-3 rounded-lg border ${
                                            totalAuthProtocols === 3
                                              ? "bg-green-500/10 border-green-500/30"
                                              : totalAuthProtocols === 2
                                                ? "bg-orange-500/10 border-orange-500/30"
                                                : "bg-red-500/10 border-red-500/30"
                                          }`}
                                        >
                                          <p className="text-xs font-medium">
                                            {totalAuthProtocols === 3 &&
                                              "Excellent - full authentication coverage configured."}
                                            {totalAuthProtocols === 2 &&
                                              `Fair - ${missingProtocol || "one protocol"} is missing and should be configured.`}
                                            {totalAuthProtocols <= 1 &&
                                              "Poor - critical email authentication protections are missing."}
                                          </p>
                                        </div>
                                      )}

                                    {hasMxRecords &&
                                      !emailData.dkim?.present && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                            Email Authentication Incomplete -
                                            DKIM Required
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            SPF and DMARC are strongest when
                                            DKIM signing is enabled.
                                          </p>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border-border bg-card/50 backdrop-blur">
                              <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-xl font-semibold">
                                    Email Security Score
                                  </h3>
                                  <Badge variant="outline">
                                    Grade {emailScore.grade}
                                  </Badge>
                                </div>

                                <div className="flex items-end gap-2">
                                  <span
                                    className={`text-5xl font-bold ${scoreColorClass}`}
                                  >
                                    {emailScore.score}
                                  </span>
                                  <span className="text-2xl text-muted-foreground">
                                    /100
                                  </span>
                                </div>

                                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      emailScore.score >= 85
                                        ? "bg-green-500"
                                        : emailScore.score >= 70
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                    }`}
                                    style={{ width: `${emailScore.score}%` }}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="p-2 rounded border bg-muted/40">
                                    SPF:{" "}
                                    <span className="font-semibold">
                                      {emailScore.categories.spf.score}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded border bg-muted/40">
                                    DMARC:{" "}
                                    <span className="font-semibold">
                                      {emailScore.categories.dmarc.score}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded border bg-muted/40">
                                    DKIM:{" "}
                                    <span className="font-semibold">
                                      {emailScore.categories.dkim.score}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded border bg-muted/40">
                                    MX:{" "}
                                    <span className="font-semibold">
                                      {emailScore.categories.mx.score}
                                    </span>
                                  </div>
                                </div>

                                {recommendations.length > 0 ? (
                                  <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/10">
                                    <p className="text-sm font-medium">
                                      {recommendations.length} action item
                                      {recommendations.length === 1 ? "" : "s"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {criticalCount} critical, {highCount} high
                                      priority recommendations.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                      No urgent email security issues detected
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </CollapsibleTile>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                          <CollapsibleTile
                            title="MX Records Details"
                            defaultCollapsed
                          >
                            <MXRecordsCard
                              records={emailData.mx?.records || []}
                              status={emailData.mx?.status || "error"}
                              provider={emailData.mx?.provider}
                              compact
                            />
                          </CollapsibleTile>

                          <CollapsibleTile
                            title="SPF Record Details"
                            defaultCollapsed
                            headerClassName={spfHeaderConfig.headerClassName}
                            headerMeta={() => (
                              <Badge
                                variant="outline"
                                className={spfHeaderConfig.badgeClassName}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {spfHeaderConfig.icon}
                                  {spfHeaderConfig.label}
                                </span>
                              </Badge>
                            )}
                          >
                            <SPFRecordCard
                              present={emailData.spf?.present || false}
                              record={emailData.spf?.record}
                              status={emailData.spf?.status || "missing"}
                              mechanisms={emailData.spf?.mechanisms}
                              issues={emailData.spf?.issues}
                              compact
                            />
                          </CollapsibleTile>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                          <CollapsibleTile
                            title="DMARC Policy Details"
                            defaultCollapsed
                            headerClassName={dmarcHeaderConfig.headerClassName}
                            headerMeta={() => (
                              <Badge
                                variant="outline"
                                className={dmarcHeaderConfig.badgeClassName}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {dmarcHeaderConfig.icon}
                                  {dmarcHeaderConfig.label}
                                </span>
                              </Badge>
                            )}
                          >
                            <DMARCRecordCard
                              present={emailData.dmarc?.present || false}
                              record={emailData.dmarc?.record}
                              status={emailData.dmarc?.status || "missing"}
                              policy={emailData.dmarc?.policy}
                              subdomainPolicy={emailData.dmarc?.subdomainPolicy}
                              percentage={emailData.dmarc?.percentage}
                              reportingEmails={emailData.dmarc?.reportingEmails}
                              issues={emailData.dmarc?.issues}
                              compact
                            />
                          </CollapsibleTile>

                          <CollapsibleTile
                            title="DKIM Signature Details"
                            defaultCollapsed
                            headerClassName={dkimHeaderConfig.headerClassName}
                            headerMeta={() => (
                              <Badge
                                variant="outline"
                                className={dkimHeaderConfig.badgeClassName}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {dkimHeaderConfig.icon}
                                  {dkimHeaderConfig.label}
                                </span>
                              </Badge>
                            )}
                          >
                            <DKIMRecordCard
                              present={emailData.dkim?.present || false}
                              status={emailData.dkim?.status || "missing"}
                              selectors={emailData.dkim?.selectors}
                              keyLength={emailData.dkim?.keyLength}
                              issues={emailData.dkim?.issues}
                              compact
                            />
                          </CollapsibleTile>
                        </div>

                        <CollapsibleTile
                          title="Email Recommendations"
                          defaultCollapsed
                        >
                          <EmailRecommendationsCard
                            recommendations={recommendations}
                            compact
                          />
                        </CollapsibleTile>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">
                      No email data available
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <div className="space-y-6">
                <CollapsibleTile title="Historical Scan Timeline">
                  <DomainHistoryTimeline domain={domain} />
                </CollapsibleTile>
              </div>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              <div className="space-y-6">
                <CollapsibleTile title="Prioritized Recommendations">
                  <RecommendationsTab data={results} domain={domain} />
                </CollapsibleTile>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!results && !loading && (
          <Card className="border-2">
            <CardContent className="py-16 text-center">
              <Shield className="h-20 w-20 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-2xl font-semibold mb-2">Ready to Analyze</h3>
              <p className="text-muted-foreground text-lg">
                Enter a domain above to start comprehensive intelligence
                analysis
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                We'll analyze security, performance, technology stack, DNS,
                email configuration, and more.
              </p>
            </CardContent>
          </Card>
        )}

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
                {results?.technology?.controlPanel?.reason ||
                  "Migration guidance based on this scan."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {Array.isArray(
                results?.technology?.controlPanel?.migrationBenefits,
              ) &&
              results.technology.controlPanel.migrationBenefits.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Benefits</h3>
                  <ul className="space-y-2">
                    {results.technology.controlPanel.migrationBenefits.map(
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
                      v{results?.technology?.wordpress?.version || "unknown"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PHP:</span>
                    <span className="ml-2 font-medium">
                      v{results?.technology?.php?.version || "unknown"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Server:</span>
                    <span className="ml-2 font-medium capitalize">
                      {results?.technology?.server?.type || "unknown"}
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
      </div>
    </div>
  );
}
