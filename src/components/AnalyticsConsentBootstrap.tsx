import { useEffect } from "react";

import { setupAutoAnalytics } from "@/lib/auto-analytics";
import { setAnalyticsEnabled } from "@/lib/analytics";
import {
  hasAnalyticsConsent,
  subscribeCookieConsentChange,
} from "@/lib/cookie-consent";

/**
 * Keeps runtime analytics behavior aligned with current cookie consent.
 */
export default function AnalyticsConsentBootstrap() {
  useEffect(() => {
    const syncAnalyticsConsent = () => {
      const consentGranted = hasAnalyticsConsent();
      setAnalyticsEnabled(consentGranted);

      if (consentGranted) {
        setupAutoAnalytics();
      }
    };

    syncAnalyticsConsent();
    return subscribeCookieConsentChange(syncAnalyticsConsent);
  }, []);

  return null;
}
