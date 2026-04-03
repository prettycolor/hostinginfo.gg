import ReactGA from "react-ga4";

// Initialize GA4
let isInitialized = false;
let analyticsEnabled = false;

export const setAnalyticsEnabled = (enabled: boolean) => {
  analyticsEnabled = enabled;
};

export const isAnalyticsEnabled = () => analyticsEnabled;

export const initGA = (measurementId: string) => {
  if (!isInitialized && measurementId) {
    ReactGA.initialize(measurementId, {
      // We manually send SPA pageviews via trackPageView().
      // Disabling implicit initial page_view avoids duplicate initial tracking noise.
      gtagOptions: { send_page_view: false },
      // Firefox can spam console warnings when GA keeps extending cookie expiry.
      // Keep a stable expiry instead of updating on every tracked event.
      gaOptions: { cookieUpdate: false },
    });
    isInitialized = true;
  }
};

// Track page views
export const trackPageView = (path: string, title?: string) => {
  if (isInitialized && analyticsEnabled) {
    ReactGA.send({ hitType: "pageview", page: path, title });
  }
};

// Track custom events
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number,
) => {
  if (isInitialized && analyticsEnabled) {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  }
};

// Domain scan events
export const trackDomainScan = (
  domain: string,
  scanType: "full" | "quick",
  userType: "anonymous" | "authenticated" | "verified",
) => {
  trackEvent(
    "Domain Scan",
    "Scan Started",
    `${domain} - ${scanType}`,
    userType === "verified" ? 3 : userType === "authenticated" ? 2 : 1,
  );
};

export const trackScanComplete = (
  domain: string,
  duration: number,
  _userType: "anonymous" | "authenticated" | "verified",
) => {
  trackEvent("Domain Scan", "Scan Completed", domain, duration);
};

// User authentication events
export const trackSignUp = (
  method: "email" | "google" | "microsoft" | "apple" | "github",
) => {
  trackEvent("User", "Sign Up", method);
};

export const trackLogin = (
  method: "email" | "google" | "microsoft" | "apple" | "github",
) => {
  trackEvent("User", "Login", method);
};

export const trackEmailVerification = (
  status: "sent" | "verified" | "resent",
) => {
  trackEvent("User", "Email Verification", status);
};

// Feature usage events
export const trackFeatureUsage = (
  feature: string,
  action: string,
  label?: string,
) => {
  trackEvent("Feature Usage", `${feature} - ${action}`, label);
};

export const trackExport = (
  exportType: "pdf" | "csv" | "json",
  reportType: string,
  userType: "anonymous" | "authenticated" | "verified",
) => {
  trackEvent(
    "Export",
    `Export ${exportType.toUpperCase()}`,
    reportType,
    userType === "verified" ? 3 : userType === "authenticated" ? 2 : 1,
  );
};

export const trackPerformanceHistory = (domain: string, dateRange: string) => {
  trackEvent(
    "Feature Usage",
    "View Performance History",
    `${domain} - ${dateRange}`,
  );
};

// Domain claiming
export const trackDomainClaim = (domain: string, success: boolean) => {
  trackEvent("Domain", "Claim Domain", domain, success ? 1 : 0);
};

// Tab navigation
export const trackTabView = (tabName: string, domain: string) => {
  trackEvent("Navigation", "View Tab", `${tabName} - ${domain}`);
};

// Error tracking
export const trackError = (
  errorType: string,
  errorMessage: string,
  context?: string,
) => {
  trackEvent(
    "Error",
    errorType,
    `${errorMessage}${context ? ` - ${context}` : ""}`,
  );
};

// Conversion tracking
export const trackConversion = (
  conversionType:
    | "signup"
    | "email_verified"
    | "domain_claimed"
    | "export_report",
  value?: number,
) => {
  trackEvent("Conversion", conversionType, undefined, value);
};

// User engagement
export const trackEngagement = (
  action: string,
  label?: string,
  value?: number,
) => {
  trackEvent("Engagement", action, label, value);
};

// Search/input tracking
export const trackSearch = (searchTerm: string, resultCount?: number) => {
  trackEvent("Search", "Domain Search", searchTerm, resultCount);
};
