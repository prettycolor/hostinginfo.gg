export const COOKIE_CONSENT_KEY = "c2_analytics_consent";
export const COOKIE_CONSENT_VERSION = 2;
export const COOKIE_CONSENT_TTL_DAYS = 180;
export const COOKIE_CONSENT_CHANGE_EVENT = "hostinginfo:cookie-consent-change";

const COOKIE_CONSENT_TTL_MS =
  COOKIE_CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface CookieConsentRecord {
  analytics: boolean;
  necessary: true;
  timestamp: number;
  version: number;
}

interface CookieConsentChangeEventDetail {
  consent: CookieConsentRecord | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseConsentRecord(value: unknown): CookieConsentRecord | null {
  if (!isRecord(value)) return null;

  const analytics = value.analytics;
  const timestamp = value.timestamp;

  if (typeof analytics !== "boolean" || typeof timestamp !== "number") {
    return null;
  }

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return {
    analytics,
    necessary: true,
    timestamp,
    version:
      typeof value.version === "number" && Number.isFinite(value.version)
        ? value.version
        : 1,
  };
}

function dispatchConsentChange(consent: CookieConsentRecord | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<CookieConsentChangeEventDetail>(
      COOKIE_CONSENT_CHANGE_EVENT,
      { detail: { consent } },
    ),
  );
}

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    const normalized = parseConsentRecord(parsed);

    if (!normalized) {
      window.localStorage.removeItem(COOKIE_CONSENT_KEY);
      return null;
    }

    if (Date.now() - normalized.timestamp > COOKIE_CONSENT_TTL_MS) {
      window.localStorage.removeItem(COOKIE_CONSENT_KEY);
      return null;
    }

    return normalized;
  } catch {
    window.localStorage.removeItem(COOKIE_CONSENT_KEY);
    return null;
  }
}

export function writeCookieConsent(
  analytics: boolean,
): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  const consent: CookieConsentRecord = {
    analytics,
    necessary: true,
    timestamp: Date.now(),
    version: COOKIE_CONSENT_VERSION,
  };

  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  dispatchConsentChange(consent);
  return consent;
}

export function clearCookieConsent() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(COOKIE_CONSENT_KEY);
  dispatchConsentChange(null);
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.analytics === true;
}

export function shouldShowCookieBanner(): boolean {
  return readCookieConsent() === null;
}

export function subscribeCookieConsentChange(
  callback: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = () => callback();
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === COOKIE_CONSENT_KEY) {
      callback();
    }
  };

  window.addEventListener(
    COOKIE_CONSENT_CHANGE_EVENT,
    handleCustomEvent as EventListener,
  );
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(
      COOKIE_CONSENT_CHANGE_EVENT,
      handleCustomEvent as EventListener,
    );
    window.removeEventListener("storage", handleStorageEvent);
  };
}
