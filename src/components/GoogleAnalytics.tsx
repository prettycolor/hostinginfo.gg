import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { initGA, setAnalyticsEnabled, trackPageView } from "@/lib/analytics";
import {
  hasAnalyticsConsent,
  subscribeCookieConsentChange,
} from "@/lib/cookie-consent";

/**
 * Google Analytics 4 component
 * Initializes GA4 and tracks page views automatically
 */
export default function GoogleAnalytics() {
  const location = useLocation();
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const [analyticsConsent, setAnalyticsConsent] = useState(() =>
    hasAnalyticsConsent(),
  );

  useEffect(() => {
    const syncConsent = () => {
      setAnalyticsConsent(hasAnalyticsConsent());
    };

    return subscribeCookieConsentChange(syncConsent);
  }, []);

  useEffect(() => {
    setAnalyticsEnabled(analyticsConsent);
  }, [analyticsConsent]);

  useEffect(() => {
    if (GA_MEASUREMENT_ID && analyticsConsent) {
      initGA(GA_MEASUREMENT_ID);
    }
  }, [GA_MEASUREMENT_ID, analyticsConsent]);

  useEffect(() => {
    if (GA_MEASUREMENT_ID && analyticsConsent) {
      trackPageView(location.pathname + location.search);
    }
  }, [location, GA_MEASUREMENT_ID, analyticsConsent]);

  return null;
}
