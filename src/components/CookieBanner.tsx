import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  clearCookieConsent,
  hasAnalyticsConsent,
  shouldShowCookieBanner,
  subscribeCookieConsentChange,
  writeCookieConsent,
} from "@/lib/cookie-consent";

/**
 * Cookie banner component for analytics consent.
 * Necessary cookies are always active; analytics are optional.
 */
export default function CookieBanner() {
  const [isReady, setIsReady] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const scriptLoadedRef = useRef(false);

  const disableAnalyticsScript = useCallback(() => {
    if (typeof window === "undefined") return;

    document
      .querySelectorAll('script[src*="analytics"]')
      .forEach((script) => script.remove());

    // Analytics removed
    scriptLoadedRef.current = false;
  }, []);

  const loadAnalyticsScript = useCallback(() => {
    if (typeof window === "undefined" || scriptLoadedRef.current) return;

    // Analytics removed

    const existingScript = document.querySelector('script[src*="analytics"]');
    if (existingScript) {
      scriptLoadedRef.current = true;
      return;
    }

    const script = document.createElement("script");
    const isTestEnv =
      window.location.hostname.startsWith("test-") ||
      window.location.hostname.startsWith("dev-");
    const scriptUrl = isTestEnv
      ? "<!-- analytics-sdk-url -->"
      : "<!-- analytics-sdk-url -->";

    script.src = scriptUrl;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    scriptLoadedRef.current = true;
  }, []);

  const syncBannerState = useCallback(() => {
    if (typeof window === "undefined") return;

    const analyticsAllowed = hasAnalyticsConsent();
    setShowBanner(shouldShowCookieBanner());

    if (analyticsAllowed) {
      loadAnalyticsScript();
    } else {
      disableAnalyticsScript();
    }
  }, [disableAnalyticsScript, loadAnalyticsScript]);

  const handleAccept = useCallback(() => {
    writeCookieConsent(true);
    loadAnalyticsScript();
    setShowBanner(false);
  }, [loadAnalyticsScript]);

  const handleDecline = useCallback(() => {
    writeCookieConsent(false);
    disableAnalyticsScript();
    setShowBanner(false);
  }, [disableAnalyticsScript]);

  const revokeConsent = useCallback(() => {
    clearCookieConsent();
    disableAnalyticsScript();
    setShowBanner(true);
  }, [disableAnalyticsScript]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    syncBannerState();
    setIsReady(true);

    return subscribeCookieConsentChange(syncBannerState);
  }, [syncBannerState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.revokeAnalyticsConsent = revokeConsent;

    return () => {
      delete window.revokeAnalyticsConsent;
    };
  }, [revokeConsent]);

  if (!isReady || !showBanner) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70]"
      role="alertdialog"
      aria-live="polite"
      aria-label="Cookie consent banner"
      aria-describedby="cookie-banner-description"
    >
      <div className="w-full border-t border-border bg-background/95 text-foreground shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="flex flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div className="min-w-0 space-y-1">
            <h3 className="text-xs font-semibold sm:text-sm">
              Cookie Preferences
            </h3>
            <p
              id="cookie-banner-description"
              className="text-xs leading-snug text-muted-foreground sm:text-sm"
            >
              We use necessary cookies to keep HostingInfo secure and working
              properly. Optional analytics cookies help us measure usage and
              improve product quality. You can accept or decline optional
              analytics cookies. See our{" "}
              <a
                href="/privacy"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Privacy Policy
              </a>{" "}
              for details.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="h-8 px-3 text-xs sm:text-sm"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="h-8 px-3 text-xs sm:text-sm"
              autoFocus
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    analyticsDataLayer?: unknown[];
    revokeAnalyticsConsent?: () => void;
  }
}
