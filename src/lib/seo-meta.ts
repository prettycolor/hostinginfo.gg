/**
 * SEO Meta Tags Generator
 *
 * Generates optimized meta tags for each page.
 */

import { TOP_KEYWORDS, PAGE_KEYWORDS, SCHEMA_ORG } from "./seo-keywords";

export interface SEOMetaProps {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

export const BRAND_TITLE =
  "HostingInfo - Free Website Checker, Domain Analyzer & Hosting Tool";
export const BRAND_NAME = "HostingInfo";

export function buildContextualTitle(context: string): string {
  return `${context} | ${BRAND_NAME}`;
}

export function generateSEOMeta(props: SEOMetaProps) {
  const {
    title,
    description,
    keywords = TOP_KEYWORDS,
    canonical,
    ogImage = "/og-image.png",
    noindex = false,
  } = props;

  const fullTitle = title.includes(BRAND_NAME)
    ? title
    : buildContextualTitle(title);
  const keywordsString = keywords.join(", ");

  return {
    title: fullTitle,
    description,
    keywords: keywordsString,
    canonical,
    ogImage,
    noindex,
  };
}

// Page-specific meta tags
export const PAGE_META = {
  home: generateSEOMeta({
    title: BRAND_TITLE,
    description:
      "Free all-in-one website checker and domain analyzer. Check DNS, SSL, email security (DMARC, DKIM, SPF), performance, hosting provider, and more. AI-powered website intelligence tool.",
    keywords: PAGE_KEYWORDS.home,
    canonical: "https://hostinginfo.gg/",
  }),

  dashboard: generateSEOMeta({
    title: buildContextualTitle("Dashboard"),
    description:
      "View comprehensive website analysis, domain intelligence, security scans, performance metrics, DNS records, and email security reports.",
    keywords: PAGE_KEYWORDS.dashboard,
    canonical: "https://hostinginfo.gg/dashboard",
  }),

  archives: generateSEOMeta({
    title: buildContextualTitle("Web Archives"),
    description:
      "View your website scan history, compare results over time, and track security, performance, and DNS changes.",
    keywords: PAGE_KEYWORDS.archives,
    canonical: "https://hostinginfo.gg/archives",
  }),

  leaderboard: generateSEOMeta({
    title: buildContextualTitle("Leaderboard"),
    description:
      "See top-ranked websites by security score, performance, and overall health. Compare your website against others.",
    keywords: PAGE_KEYWORDS.leaderboard,
    canonical: "https://hostinginfo.gg/leaderboard",
  }),

  intelligence: generateSEOMeta({
    title: buildContextualTitle("Intelligence Dashboard"),
    description:
      "Comprehensive security, performance, and technology analysis for any domain.",
    noindex: true,
  }),

  ddcCalculator: generateSEOMeta({
    title: buildContextualTitle("Domain Calculator"),
    description:
      "Calculate domain registration and renewal costs for 555+ TLDs. Compare prices and find the best domain for your budget.",
    keywords: PAGE_KEYWORDS.ddcCalculator,
    canonical: "https://hostinginfo.gg/ddc-calculator",
  }),

  guide: generateSEOMeta({
    title: buildContextualTitle("Interactive Guide"),
    description: "Learn how to use HostingInfo with our interactive guide.",
    canonical: "https://hostinginfo.gg/guide",
  }),

  login: generateSEOMeta({
    title: buildContextualTitle("Login"),
    description:
      "Login to access your website scan history, saved domains, and comprehensive analysis reports.",
    noindex: true,
  }),

  signup: generateSEOMeta({
    title: buildContextualTitle("Sign Up"),
    description:
      "Create a free account to save scan history, track domains, and access advanced website analysis features.",
    noindex: true,
  }),

  signupCreate: generateSEOMeta({
    title: buildContextualTitle("Create Account"),
    description:
      "Create your HostingInfo account to save scans and access domain intelligence features.",
    noindex: true,
  }),

  accountSettings: generateSEOMeta({
    title: buildContextualTitle("Account Settings"),
    description:
      "Manage your HostingInfo account profile, security settings, and scan data preferences.",
    noindex: true,
  }),

  verifyEmail: generateSEOMeta({
    title: buildContextualTitle("Verify Email"),
    description:
      "Verify your email address to unlock your HostingInfo account features.",
    noindex: true,
  }),

  verifyEmailRequired: generateSEOMeta({
    title: buildContextualTitle("Email Verification Required"),
    description:
      "Verify your email to continue using protected HostingInfo account features.",
    noindex: true,
  }),

  privacy: generateSEOMeta({
    title: buildContextualTitle("Privacy Policy"),
    description:
      "HostingInfo privacy policy. Learn how we collect, use, and protect your data.",
    canonical: "https://hostinginfo.gg/privacy",
  }),

  terms: generateSEOMeta({
    title: buildContextualTitle("Terms of Service"),
    description:
      "HostingInfo terms of service. Read our terms and conditions for using our website checker and domain analysis tools.",
    canonical: "https://hostinginfo.gg/terms-of-service",
  }),

  analytics: generateSEOMeta({
    title: buildContextualTitle("Analytics Dashboard"),
    description:
      "Comprehensive domain analytics with performance scoring, cost analysis, and hosting recommendations.",
    noindex: true,
  }),

  monitoring: generateSEOMeta({
    title: buildContextualTitle("Domain Monitoring"),
    description:
      "Real-time domain monitoring, uptime tracking, and performance alerts.",
    noindex: true,
  }),

  reports: generateSEOMeta({
    title: buildContextualTitle("Reports"),
    description: "Generate and manage domain intelligence reports.",
    noindex: true,
  }),

  notFound: generateSEOMeta({
    title: buildContextualTitle("Page Not Found"),
    description: "The page you requested could not be found.",
    noindex: true,
  }),
};

// Generate JSON-LD structured data
export function generateStructuredData() {
  return JSON.stringify(SCHEMA_ORG);
}
