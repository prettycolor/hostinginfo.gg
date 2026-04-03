/**
 * Automatic Analytics Tracking for HostingInfo
 * 
 * This module automatically tracks key user interactions and events
 * without requiring manual tracking calls throughout the codebase.
 */

import { trackEvent, trackDomainScan, trackScanComplete, trackExport, trackTabView, trackError, trackSignUp, trackLogin, trackEmailVerification } from './analytics';

// Track if analytics is initialized
let isSetup = false;

/**
 * Initialize automatic analytics tracking
 */
export function setupAutoAnalytics() {
  if (isSetup || typeof window === 'undefined') return;
  isSetup = true;

  // Page views are tracked by GoogleAnalytics.tsx via react-router location changes.
  // Do not attach a second history listener here or GA4 page_view will be duplicated.

  // Track form submissions
  setupFormTracking();

  // Track button clicks
  setupButtonTracking();

  // Track errors
  setupErrorTracking();

  // Track user engagement
  setupEngagementTracking();

  console.log('✅ Auto-analytics tracking initialized');
}

/**
 * Track form submissions automatically
 */
function setupFormTracking() {
  document.addEventListener('submit', (e) => {
    const form = e.target as {
      id?: string;
      name?: string;
      querySelector: (selector: string) => unknown;
    };
    const formId = form.id || form.name || 'unknown';
    
    // Track domain scan form
    if (formId.includes('scan') || formId.includes('domain')) {
      const input = form.querySelector('input[type="text"], input[type="url"]') as HTMLInputElement;
      if (input?.value) {
        trackDomainScan(input.value, 'full', getUserType());
      }
    }

    // Track authentication forms
    if (formId.includes('login')) {
      trackLogin('email');
    }
    if (formId.includes('signup') || formId.includes('register')) {
      trackSignUp('email');
    }

    // Track generic form submissions
    trackEvent('Form', 'Submit', formId);
  });
}

/**
 * Track button clicks automatically
 */
function setupButtonTracking() {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button, a[role="button"]') as HTMLElement;
    
    if (!button) return;

    const buttonText = button.textContent?.trim() || '';
    const buttonId = button.id || '';
    const buttonClass = button.className || '';

    // Track export buttons
    if (buttonText.toLowerCase().includes('export') || buttonId.includes('export')) {
      const exportType = buttonText.toLowerCase().includes('pdf') ? 'pdf' : 
                        buttonText.toLowerCase().includes('csv') ? 'csv' : 'json';
      trackExport(exportType, 'domain-report', getUserType());
    }

    // Track scan buttons
    if (buttonText.toLowerCase().includes('scan') || buttonText.toLowerCase().includes('analyze')) {
      trackEvent('Button', 'Click', 'Start Scan');
    }

    // Track tab switches
    if (buttonClass.includes('tab') || button.getAttribute('role') === 'tab') {
      trackTabView(buttonText, getCurrentDomain());
    }

    // Track CTA buttons
    if (buttonText.toLowerCase().includes('sign up') || buttonText.toLowerCase().includes('get started')) {
      trackEvent('CTA', 'Click', buttonText);
    }

    // Track logout
    if (buttonText.toLowerCase().includes('logout') || buttonText.toLowerCase().includes('sign out')) {
      trackEvent('User', 'Logout', 'Header Menu');
    }
  });
}

/**
 * Track errors automatically
 */
function setupErrorTracking() {
  // Track JavaScript errors
  window.addEventListener('error', (e) => {
    trackError('JavaScript Error', e.message, e.filename);
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    trackError('Unhandled Promise', String(e.reason), 'Promise Rejection');
  });

  // Track API errors (intercept fetch)
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Only track server-side API failures. Client 4xx responses are often expected
      // and can generate high-volume analytics noise.
      if (!response.ok && response.status >= 500) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : String(args[0]));
        if (url.includes('/api/')) {
          trackError('API Error', `${response.status} ${response.statusText}`, url);
        }
      }
      
      return response;
    } catch (error) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : String(args[0]));
      trackError('Network Error', String(error), url);
      throw error;
    }
  };
}

/**
 * Track user engagement metrics
 */
function setupEngagementTracking() {
  const startTime = Date.now();
  let isActive = true;

  // Track time on page
  window.addEventListener('beforeunload', () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    trackEvent('Engagement', 'Time on Page', window.location.pathname, timeSpent);
  });

  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      
      // Track at 25%, 50%, 75%, 100%
      if ([25, 50, 75, 100].includes(scrollPercent)) {
        trackEvent('Engagement', 'Scroll Depth', `${scrollPercent}%`);
      }
    }
  });

  // Track user activity (active vs idle)
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  activityEvents.forEach(event => {
    document.addEventListener(event, () => {
      if (!isActive) {
        isActive = true;
        trackEvent('Engagement', 'User Active', 'Returned from Idle');
      }
    });
  });

  // Mark as idle after 5 minutes of inactivity
  let idleTimer: NodeJS.Timeout;
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      isActive = false;
      trackEvent('Engagement', 'User Idle', '5 minutes');
    }, 5 * 60 * 1000);
  };

  activityEvents.forEach(event => {
    document.addEventListener(event, resetIdleTimer);
  });
  resetIdleTimer();
}

/**
 * Helper: Get current user type
 */
function getUserType(): 'anonymous' | 'authenticated' | 'verified' {
  if (typeof window === 'undefined') return 'anonymous';
  
  const token = localStorage.getItem('token');
  if (!token) return 'anonymous';

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.emailVerified ? 'verified' : 'authenticated';
  } catch {
    return 'anonymous';
  }
}

/**
 * Helper: Get current domain being analyzed
 */
function getCurrentDomain(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  // Try to get from URL params
  const params = new URLSearchParams(window.location.search);
  const domain = params.get('domain') || params.get('url');
  if (domain) return domain;

  // Try to get from page content
  const domainInput = document.querySelector('input[type="text"], input[type="url"]') as HTMLInputElement;
  if (domainInput?.value) return domainInput.value;

  return 'unknown';
}

/**
 * Track custom event (for manual tracking)
 */
export function trackCustomEvent(category: string, action: string, label?: string, value?: number) {
  trackEvent(category, action, label, value);
}

/**
 * Track domain scan completion (call this when scan finishes)
 */
export function trackScanCompleted(domain: string, durationMs: number) {
  trackScanComplete(domain, Math.round(durationMs / 1000), getUserType());
}

/**
 * Track email verification status
 */
export function trackEmailVerified() {
  trackEmailVerification('verified');
}

/**
 * Track email verification sent
 */
export function trackEmailVerificationSent() {
  trackEmailVerification('sent');
}
