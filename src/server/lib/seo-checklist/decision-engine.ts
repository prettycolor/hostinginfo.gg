/**
 * Decision Engine Module
 * Compute overall SEO readiness decision
 */

import { SEO_CHECKLIST_CONFIG } from './config.js';
import type { ScanData, Decision, ScanSummary } from './types.js';

/**
 * Compute SEO readiness decision
 */
export function computeDecision(data: ScanData): { decision: Decision; summary: ScanSummary } {
  const reasons: string[] = [];
  const fixes: string[] = [];

  // Critical gates ("Not ready yet")
  if (!data.access.accessible) {
    if (data.access.homepageStatusCode && data.access.homepageStatusCode >= 400) {
      reasons.push('Your homepage is broken or returns an error');
      fixes.push('Fix your homepage to return a successful response (200 OK)');
    }

    if (data.access.hasNoindex) {
      reasons.push('Google is told not to index your homepage');
      fixes.push('Remove the noindex meta tag from your homepage');
    }

    if (data.access.robotsTxtBlocked) {
      reasons.push('Your robots.txt file blocks Google from accessing your site');
      fixes.push('Update your robots.txt to allow Googlebot access');
    }

    if (data.access.contentEmpty) {
      reasons.push('Your homepage content appears empty or is only visible with JavaScript');
      fixes.push('Ensure your homepage has readable content for search engines');
    }

    if (data.access.redirectLoop) {
      reasons.push('Your site has a redirect loop');
      fixes.push('Fix the redirect chain to avoid loops');
    }

    return {
      decision: 'not_ready',
      summary: {
        headline: 'Your site is not ready for SEO work yet',
        topReasons: reasons.slice(0, 3),
        topFixes: fixes.slice(0, 3),
      },
    };
  }

  // Fix-first gates
  const mobileScore = data.lighthouse.mobileScore || 0;
  const pagesWithoutTitles = data.crawl.pages.filter((p) => !p.pageTitle).length;
  const pagesWithoutH1 = data.crawl.pages.filter((p) => !p.h1Present).length;
  const brokenPages = data.crawl.pages.filter((p) => p.statusCode >= 400).length;

  if (mobileScore < SEO_CHECKLIST_CONFIG.mobile_speed.fix_first) {
    reasons.push('Your mobile speed is too slow');
    fixes.push('Improve mobile performance (optimize images, reduce JavaScript, enable caching)');
  }

  if (pagesWithoutTitles > data.crawl.pages.length / 2) {
    reasons.push('Many pages are missing page titles');
    fixes.push('Add unique, descriptive titles to all pages');
  }

  if (pagesWithoutH1 > data.crawl.pages.length / 2) {
    reasons.push('Many pages are missing main headings');
    fixes.push('Add H1 headings to all pages');
  }

  if (brokenPages > data.crawl.pages.length / 3) {
    reasons.push('Many pages return errors');
    fixes.push('Fix broken pages and links');
  }

  if (fixes.length > 0) {
    return {
      decision: 'fix_first',
      summary: {
        headline: 'Fix these issues before investing in SEO',
        topReasons: reasons.slice(0, 3),
        topFixes: fixes.slice(0, 3),
      },
    };
  }

  // Ready for SEO work
  reasons.push('Google can access your site');
  if (mobileScore >= SEO_CHECKLIST_CONFIG.mobile_speed.ready) {
    reasons.push('Mobile speed is good');
  }
  if (pagesWithoutTitles === 0) {
    reasons.push('Page basics are in place');
  }

  // Add website builder warning if detected
  let headline = 'Your site is ready for SEO work';
  if (data.access.technology.isWebsiteBuilder) {
    headline = `Your ${data.access.technology.platform} site is ready for SEO work`;
    reasons.push(`Note: Website builders have SEO limitations compared to custom-built sites`);
  }

  return {
    decision: 'ready',
    summary: {
      headline,
      topReasons: reasons.slice(0, 3),
      topFixes: [],
    },
  };
}
