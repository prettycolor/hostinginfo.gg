/**
 * Technology Detection Module
 * 
 * Provides comprehensive web technology fingerprinting:
 * - CMS detection (WordPress, Drupal, Joomla, etc.)
 * - Framework detection (React, Vue, Angular, etc.)
 * - Server detection (Apache, Nginx, IIS, etc.)
 * - CDN detection (Cloudflare, Akamai, etc.)
 * - Analytics detection (Google Analytics, etc.)
 * - Security tools (WAF, SSL/TLS)
 * - Programming languages
 * - JavaScript libraries
 * 
 * Part of Phase 1: Core Intelligence Engine
 */

import { db } from '../../db/client.js';
import { technologyStack } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface TechnologySignature {
  name: string;
  category: string;
  version?: string;
  confidence: number;
  evidence: string[];
}

export interface TechnologyStack {
  domain: string;
  technologies: TechnologySignature[];
  categories: {
    cms: TechnologySignature[];
    frameworks: TechnologySignature[];
    servers: TechnologySignature[];
    cdn: TechnologySignature[];
    analytics: TechnologySignature[];
    security: TechnologySignature[];
    languages: TechnologySignature[];
    libraries: TechnologySignature[];
  };
  totalConfidence: number;
  lastChecked: Date;
}

/**
 * Technology detection patterns
 */
const TECH_PATTERNS = {
  cms: [
    {
      name: 'WordPress',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="WordPress/i },
        { type: 'path', pattern: /\/wp-content\//i },
        { type: 'path', pattern: /\/wp-includes\//i },
        { type: 'script', pattern: /\/wp-json\//i },
      ],
    },
    {
      name: 'Drupal',
      patterns: [
        { type: 'meta', pattern: /<meta name="Generator" content="Drupal/i },
        { type: 'path', pattern: /\/sites\/default\/files\//i },
        { type: 'header', pattern: /X-Drupal-Cache/i },
      ],
    },
    {
      name: 'Joomla',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="Joomla/i },
        { type: 'path', pattern: /\/components\/com_/i },
        { type: 'path', pattern: /\/media\/jui\//i },
      ],
    },
    {
      name: 'Shopify',
      patterns: [
        { type: 'meta', pattern: /<meta name="shopify-/i },
        { type: 'script', pattern: /cdn\.shopify\.com/i },
        { type: 'header', pattern: /X-ShopId/i },
      ],
    },
    {
      name: 'Wix',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="Wix/i },
        { type: 'script', pattern: /static\.wixstatic\.com/i },
      ],
    },
    {
      name: 'Squarespace',
      patterns: [
        { type: 'meta', pattern: /Squarespace/i },
        { type: 'script', pattern: /static\.squarespace\.com/i },
      ],
    },
    {
      name: 'GoDaddy Website Builder',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content=".*(GoDaddy) Website Builder/i },
        { type: 'meta', pattern: /<meta name="generator" content="Starfield Technologies/i },
        { type: 'script', pattern: /img1\.wsimg\.com/i },
        { type: 'path', pattern: /\.wsimg\.com/i },
      ],
    },
    {
      name: 'Weebly',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="Weebly/i },
        { type: 'script', pattern: /cdn\d+\.editmysite\.com/i },
        { type: 'path', pattern: /weebly/i },
      ],
    },
    {
      name: 'Webflow',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="Webflow/i },
        { type: 'script', pattern: /assets\.website-files\.com/i },
        { type: 'attribute', pattern: /data-wf-/i },
      ],
    },
    {
      name: 'Duda',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="Duda/i },
        { type: 'script', pattern: /irp\.cdn-website\.com/i },
        { type: 'attribute', pattern: /data-duda/i },
      ],
    },
    {
      name: 'Jimdo',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="Jimdo/i },
        { type: 'script', pattern: /assets\.jimstatic\.com/i },
      ],
    },
    {
      name: 'Strikingly',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="Strikingly/i },
        { type: 'script', pattern: /static-assets\.strikinglycdn\.com/i },
      ],
    },
    {
      name: 'Site123',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="SITE123/i },
        { type: 'script', pattern: /cdn-cms-s\.f-static\.com/i },
      ],
    },
    {
      name: 'Carrd',
      patterns: [
        { type: 'meta', pattern: /<meta name="generator" content="Carrd/i },
        { type: 'script', pattern: /carrd\.co/i },
      ],
    },
  ],
  frameworks: [
    {
      name: 'React',
      patterns: [
        { type: 'script', pattern: /react(-dom)?(\.min)?\.js/i },
        { type: 'attribute', pattern: /data-reactroot/i },
        { type: 'global', pattern: /__REACT_DEVTOOLS_GLOBAL_HOOK__/i },
      ],
    },
    {
      name: 'Vue.js',
      patterns: [
        { type: 'script', pattern: /vue(\.min)?\.js/i },
        { type: 'attribute', pattern: /data-v-/i },
        { type: 'global', pattern: /__VUE__/i },
      ],
    },
    {
      name: 'Angular',
      patterns: [
        { type: 'script', pattern: /angular(\.min)?\.js/i },
        { type: 'attribute', pattern: /ng-/i },
        { type: 'global', pattern: /angular/i },
      ],
    },
    {
      name: 'Next.js',
      patterns: [
        { type: 'script', pattern: /_next\//i },
        { type: 'meta', pattern: /<meta name="next-head-count"/i },
      ],
    },
    {
      name: 'Nuxt.js',
      patterns: [
        { type: 'script', pattern: /_nuxt\//i },
        { type: 'attribute', pattern: /data-n-head/i },
      ],
    },
  ],
  servers: [
    {
      name: 'Apache',
      patterns: [
        { type: 'header', pattern: /Server: Apache/i },
      ],
    },
    {
      name: 'Nginx',
      patterns: [
        { type: 'header', pattern: /Server: nginx/i },
      ],
    },
    {
      name: 'Microsoft IIS',
      patterns: [
        { type: 'header', pattern: /Server: Microsoft-IIS/i },
        { type: 'header', pattern: /X-Powered-By: ASP\.NET/i },
      ],
    },
    {
      name: 'LiteSpeed',
      patterns: [
        { type: 'header', pattern: /Server: LiteSpeed/i },
      ],
    },
  ],
  cdn: [
    {
      name: 'Cloudflare',
      patterns: [
        { type: 'header', pattern: /CF-RAY/i },
        { type: 'header', pattern: /Server: cloudflare/i },
      ],
    },
    {
      name: 'Akamai',
      patterns: [
        { type: 'header', pattern: /X-Akamai/i },
      ],
    },
    {
      name: 'Fastly',
      patterns: [
        { type: 'header', pattern: /X-Fastly/i },
      ],
    },
    {
      name: 'Amazon CloudFront',
      patterns: [
        { type: 'header', pattern: /X-Amz-Cf-Id/i },
      ],
    },
  ],
  analytics: [
    {
      name: 'Google Analytics',
      patterns: [
        { type: 'script', pattern: /google-analytics\.com\/analytics\.js/i },
        { type: 'script', pattern: /googletagmanager\.com\/gtag\/js/i },
        { type: 'global', pattern: /ga\(/i },
      ],
    },
    {
      name: 'Google Tag Manager',
      patterns: [
        { type: 'script', pattern: /googletagmanager\.com\/gtm\.js/i },
      ],
    },
    {
      name: 'Facebook Pixel',
      patterns: [
        { type: 'script', pattern: /connect\.facebook\.net\/.*\/fbevents\.js/i },
      ],
    },
  ],
  security: [
    {
      name: 'Cloudflare WAF',
      patterns: [
        { type: 'header', pattern: /CF-RAY/i },
      ],
    },
    {
      name: 'Sucuri',
      patterns: [
        { type: 'header', pattern: /X-Sucuri/i },
      ],
    },
    {
      name: 'Wordfence',
      patterns: [
        { type: 'header', pattern: /X-Wordfence/i },
      ],
    },
  ],
  libraries: [
    {
      name: 'jQuery',
      patterns: [
        { type: 'script', pattern: /jquery(-[0-9.]+)?(\.min)?\.js/i },
        { type: 'global', pattern: /jQuery/i },
      ],
    },
    {
      name: 'Bootstrap',
      patterns: [
        { type: 'script', pattern: /bootstrap(\.min)?\.js/i },
        { type: 'style', pattern: /bootstrap(\.min)?\.css/i },
      ],
    },
    {
      name: 'Tailwind CSS',
      patterns: [
        { type: 'style', pattern: /tailwindcss/i },
        { type: 'class', pattern: /\b(flex|grid|bg-|text-|p-|m-)/i },
      ],
    },
  ],
};

/**
 * Fetch and analyze HTML content
 */
async function fetchAndAnalyzeHTML(domain: string): Promise<{
  html: string;
  headers: Record<string, string>;
}> {
  try {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HostingInfo-TechDetector/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const headers: Record<string, string> = {};
    
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return { html, headers };
  } catch (error) {
    console.error('Failed to fetch HTML:', error);
    throw error;
  }
}

/**
 * Detect technologies from HTML and headers
 */
function detectTechnologies(
  html: string,
  headers: Record<string, string>
): TechnologySignature[] {
  const detected: TechnologySignature[] = [];

  // Check each category
  for (const [category, techs] of Object.entries(TECH_PATTERNS)) {
    for (const tech of techs) {
      const evidence: string[] = [];
      let matchCount = 0;

      for (const pattern of tech.patterns) {
        let matched = false;

        if (pattern.type === 'header') {
          // Check headers
          for (const [key, value] of Object.entries(headers)) {
            if (pattern.pattern.test(`${key}: ${value}`)) {
              evidence.push(`Header: ${key}`);
              matched = true;
              break;
            }
          }
        } else if (pattern.type === 'meta' || pattern.type === 'script' || 
                   pattern.type === 'attribute' || pattern.type === 'style' || 
                   pattern.type === 'class' || pattern.type === 'global' || 
                   pattern.type === 'path') {
          // Check HTML content
          if (pattern.pattern.test(html)) {
            evidence.push(`${pattern.type}: matched`);
            matched = true;
          }
        }

        if (matched) matchCount++;
      }

      if (matchCount > 0) {
        const confidence = Math.min(100, (matchCount / tech.patterns.length) * 100);
        detected.push({
          name: tech.name,
          category,
          confidence,
          evidence,
        });
      }
    }
  }

  return detected;
}

/**
 * Detect technology stack for a domain
 */
export async function detectTechnologyStack(
  domain: string,
  userId?: number
): Promise<TechnologyStack> {
  void userId;

  // Fetch HTML and headers
  const { html, headers } = await fetchAndAnalyzeHTML(domain);

  // Detect technologies
  const technologies = detectTechnologies(html, headers);

  // Categorize technologies
  const categories = {
    cms: technologies.filter(t => t.category === 'cms'),
    frameworks: technologies.filter(t => t.category === 'frameworks'),
    servers: technologies.filter(t => t.category === 'servers'),
    cdn: technologies.filter(t => t.category === 'cdn'),
    analytics: technologies.filter(t => t.category === 'analytics'),
    security: technologies.filter(t => t.category === 'security'),
    languages: technologies.filter(t => t.category === 'languages'),
    libraries: technologies.filter(t => t.category === 'libraries'),
  };

  // Calculate overall confidence
  const totalConfidence = technologies.length > 0
    ? technologies.reduce((sum, t) => sum + t.confidence, 0) / technologies.length
    : 0;

  // Store detected technologies as individual rows
  if (technologies.length > 0) {
    await db.insert(technologyStack).values(
      technologies.map((tech) => ({
        domain,
        name: tech.name,
        version: tech.version || null,
        category: tech.category,
        confidence: Math.round(tech.confidence),
        detectionMethod: 'pattern_match',
        scannedAt: new Date(),
      }))
    );
  }

  return {
    domain,
    technologies,
    categories,
    totalConfidence,
    lastChecked: new Date(),
  };
}

/**
 * Get technology stack history
 */
export async function getTechnologyHistory(domain: string, limit: number = 10) {
  const history = await db
    .select()
    .from(technologyStack)
    .where(eq(technologyStack.domain, domain))
    .orderBy(desc(technologyStack.scannedAt))
    .limit(limit);

  return history;
}

/**
 * Analyze technology stack for insights
 */
export function analyzeTechnologyStack(stack: TechnologyStack): {
  insights: string[];
  recommendations: string[];
  securityConcerns: string[];
} {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const securityConcerns: string[] = [];

  // CMS insights
  if (stack.categories.cms.length > 0) {
    const cms = stack.categories.cms[0];
    insights.push(`Site built with ${cms.name}`);
    
    if (cms.name === 'WordPress') {
      recommendations.push('Keep WordPress core and plugins updated for security');
      recommendations.push('Consider using a security plugin like Wordfence');
    }
  } else {
    insights.push('Custom-built website or CMS not detected');
  }

  // Framework insights
  if (stack.categories.frameworks.length > 0) {
    const framework = stack.categories.frameworks[0];
    insights.push(`Frontend framework: ${framework.name}`);
  }

  // CDN insights
  if (stack.categories.cdn.length > 0) {
    const cdn = stack.categories.cdn[0];
    insights.push(`Using ${cdn.name} CDN for performance`);
  } else {
    recommendations.push('Consider using a CDN to improve global performance');
  }

  // Security insights
  if (stack.categories.security.length === 0) {
    securityConcerns.push('No WAF (Web Application Firewall) detected');
    recommendations.push('Consider adding a WAF like Cloudflare or Sucuri');
  }

  // Analytics insights
  if (stack.categories.analytics.length === 0) {
    recommendations.push('No analytics detected - consider adding Google Analytics');
  }

  // Server insights
  if (stack.categories.servers.length > 0) {
    const server = stack.categories.servers[0];
    insights.push(`Web server: ${server.name}`);
  }

  return { insights, recommendations, securityConcerns };
}
