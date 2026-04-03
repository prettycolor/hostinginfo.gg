// Scan history and rate limiting utilities

export interface ScanRecord {
  domain: string;
  timestamp: number;
  technology?: Record<string, unknown> | null;
  dns?: Record<string, unknown> | null;
  email?: Record<string, unknown> | null;
  ssl?: Record<string, unknown> | null;
  performance?: Record<string, unknown> | null;
  security?: Record<string, unknown> | null;
  geolocation?: Record<string, unknown> | null;
  provider?: Record<string, unknown> | null;
  malware?: Record<string, unknown> | null;
}

const HISTORY_KEY = "scan_history";
const HISTORY_TIMESTAMP_KEY = "scan_history_timestamp";
const RATE_LIMIT_KEY = "scan_rate_limit";
const HISTORY_RETENTION_MS = 12 * 60 * 60 * 1000; // 12 hours
const RATE_LIMIT_MS = 6 * 1000; // 6 seconds

/**
 * Check if scan history has expired (older than 12 hours)
 * This checks the creation timestamp of the entire history cache
 */
function isHistoryExpired(): boolean {
  try {
    const timestamp = localStorage.getItem(HISTORY_TIMESTAMP_KEY);
    if (!timestamp) return true;

    const now = Date.now();
    const historyAge = now - parseInt(timestamp, 10);

    return historyAge >= HISTORY_RETENTION_MS;
  } catch (error) {
    console.error("Error checking history expiry:", error);
    return true;
  }
}

/**
 * Get scan history from localStorage
 * Automatically clears entire history if older than 12 hours
 * This provides a "fresh start" each day for all users
 */
export function getScanHistory(): ScanRecord[] {
  try {
    // Check if history has expired (12 hours old)
    if (isHistoryExpired()) {
      clearScanHistory();
      return [];
    }

    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];

    const history: ScanRecord[] = JSON.parse(stored);
    return history;
  } catch (error) {
    console.error("Error reading scan history:", error);
    return [];
  }
}

/**
 * Add a scan to history
 * Sets the history timestamp on first scan to track 12-hour expiry
 */
export function addScanToHistory(record: ScanRecord): void {
  try {
    const history = getScanHistory();

    // If this is the first scan (empty history), set the timestamp
    if (history.length === 0) {
      localStorage.setItem(HISTORY_TIMESTAMP_KEY, Date.now().toString());
    }

    // Check if domain already exists, update it
    const existingIndex = history.findIndex((r) => r.domain === record.domain);
    if (existingIndex >= 0) {
      history[existingIndex] = record;
    } else {
      history.unshift(record); // Add to beginning
    }

    // Keep only last 20 scans
    const trimmed = history.slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Error saving scan history:", error);
  }
}

/**
 * Check if a domain can be scanned (rate limiting)
 * Returns { allowed: boolean, waitTime: number }
 */
export function checkRateLimit(domain: string): {
  allowed: boolean;
  waitTime: number;
} {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (!stored) return { allowed: true, waitTime: 0 };

    const rateLimits: Record<string, number> = JSON.parse(stored);
    const lastScan = rateLimits[domain];

    if (!lastScan) return { allowed: true, waitTime: 0 };

    const now = Date.now();
    const timeSinceLastScan = now - lastScan;

    if (timeSinceLastScan < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - timeSinceLastScan) / 1000);
      return { allowed: false, waitTime };
    }

    return { allowed: true, waitTime: 0 };
  } catch (error) {
    console.error("Error checking rate limit:", error);
    return { allowed: true, waitTime: 0 };
  }
}

/**
 * Record a scan for rate limiting
 */
export function recordScan(domain: string): void {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const rateLimits: Record<string, number> = stored ? JSON.parse(stored) : {};

    rateLimits[domain] = Date.now();

    // Clean up old entries (older than 1 hour)
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    Object.entries(rateLimits).forEach(([key, value]) => {
      if (now - value < 60 * 60 * 1000) {
        cleaned[key] = value;
      }
    });

    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(cleaned));
  } catch (error) {
    console.error("Error recording scan:", error);
  }
}

/**
 * Clear all scan history and timestamp
 */
export function clearScanHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(HISTORY_TIMESTAMP_KEY);
  } catch (error) {
    console.error("Error clearing scan history:", error);
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes === 0) {
    return `${seconds}s ago`;
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else {
    return new Date(timestamp).toLocaleTimeString();
  }
}
