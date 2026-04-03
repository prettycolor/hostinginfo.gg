/**
 * Performance Recommendations
 * 
 * Generates recommendations for performance optimization:
 * - Core Web Vitals (LCP, FID, CLS)
 * - PageSpeed score
 * - Page size and requests
 * - Server response time
 * 
 * Context-aware for different platforms:
 * - Website builders: Focus on content optimization
 * - WordPress: Plugin and theme optimization
 * - Custom sites: Server and code optimization
 */

import type { Recommendation, ComprehensiveScanData } from './types';

/**
 * Generate performance recommendations
 */
export function generatePerformanceRecommendations(data: ComprehensiveScanData): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const performance = data.performance;
  const technology = data.technology;
  const isWebsiteBuilder = technology?.isWebsiteBuilder || false;
  const isWordPress = technology?.platform?.toLowerCase().includes('wordpress') || false;

  if (!performance) return recommendations;

  // 1. HIGH: Poor Largest Contentful Paint (LCP > 4.0s)
  if (performance.metrics?.lcp && performance.metrics.lcp > 4.0) {
    let actionSteps = [];

    if (isWebsiteBuilder) {
      // Website builder: Focus on content optimization
      actionSteps = [
        {
          step: 1,
          description: 'Compress and optimize all images before uploading',
          link: 'https://tinypng.com/',
          linkText: 'TinyPNG Image Compressor',
        },
        {
          step: 2,
          description: 'Use your platform\'s built-in image optimization features',
        },
        {
          step: 3,
          description: 'Reduce the number of elements on your homepage',
        },
        {
          step: 4,
          description: 'Remove unused widgets and third-party scripts',
        },
      ];
    } else if (isWordPress) {
      // WordPress: Plugin-based optimization
      actionSteps = [
        {
          step: 1,
          description: 'Install an image optimization plugin (Smush, ShortPixel, or Imagify)',
        },
        {
          step: 2,
          description: 'Enable lazy loading for images',
        },
        {
          step: 3,
          description: 'Install a caching plugin (WP Rocket, W3 Total Cache)',
        },
        {
          step: 4,
          description: 'Use a CDN to serve images and static assets',
        },
      ];
    } else {
      // Custom site: Technical optimization
      actionSteps = [
        {
          step: 1,
          description: 'Optimize and compress images (use WebP format)',
          code: 'cwebp input.jpg -q 80 -o output.webp',
        },
        {
          step: 2,
          description: 'Implement lazy loading for below-fold images',
          code: '<img src="image.jpg" loading="lazy" alt="Description">',
        },
        {
          step: 3,
          description: 'Minimize render-blocking CSS and JavaScript',
        },
        {
          step: 4,
          description: 'Use a CDN for static assets',
        },
      ];
    }

    recommendations.push({
      id: 'poor-lcp',
      priority: 'high',
      category: 'Performance',
      title: 'Slow Page Load Time (LCP)',
      issue: `Your Largest Contentful Paint is ${performance.metrics.lcp.toFixed(1)}s (target: < 2.5s). Main content takes too long to load.`,
      impact: 'Poor user experience, higher bounce rate, lower SEO ranking.',
      recommendation: 'Optimize images and reduce render-blocking resources.',
      actionSteps,
      estimatedTime: isWebsiteBuilder ? '30 minutes' : '1-2 hours',
      difficulty: isWebsiteBuilder ? 'easy' : 'medium',
      resources: [
        {
          title: 'Optimize Largest Contentful Paint',
          url: 'https://web.dev/optimize-lcp/',
          type: 'documentation',
        },
      ],
      affectedArea: 'All pages',
      detectedValue: `${performance.metrics.lcp.toFixed(1)}s`,
      targetValue: '< 2.5s',
      tags: ['performance', 'lcp', 'core-web-vitals'],
      skipForWebsiteBuilders: false, // Show for all (content optimization)
    });
  }
  // 2. MEDIUM: Moderate LCP (2.5s - 4.0s)
  else if (performance.metrics?.lcp && performance.metrics.lcp > 2.5) {
    recommendations.push({
      id: 'moderate-lcp',
      priority: 'medium',
      category: 'Performance',
      title: 'Page Load Time Needs Improvement',
      issue: `Your Largest Contentful Paint is ${performance.metrics.lcp.toFixed(1)}s (target: < 2.5s).`,
      impact: 'Moderate user experience impact, room for SEO improvement.',
      recommendation: 'Optimize images and implement caching.',
      actionSteps: isWordPress
        ? [
            {
              step: 1,
              description: 'Install a caching plugin (WP Rocket recommended)',
            },
            {
              step: 2,
              description: 'Optimize images with Smush or ShortPixel',
            },
            {
              step: 3,
              description: 'Enable lazy loading',
            },
          ]
        : [
            {
              step: 1,
              description: 'Compress images before uploading',
            },
            {
              step: 2,
              description: 'Enable browser caching',
            },
            {
              step: 3,
              description: 'Minimize third-party scripts',
            },
          ],
      estimatedTime: '30 minutes',
      difficulty: 'easy',
      affectedArea: 'All pages',
      detectedValue: `${performance.metrics.lcp.toFixed(1)}s`,
      targetValue: '< 2.5s',
      tags: ['performance', 'lcp'],
      skipForWebsiteBuilders: false,
    });
  }

  // 3. MEDIUM: Poor First Input Delay (FID > 100ms)
  if (performance.metrics?.fid && performance.metrics.fid > 100) {
    recommendations.push({
      id: 'poor-fid',
      priority: 'medium',
      category: 'Performance',
      title: 'Slow Interactivity (FID)',
      issue: `First Input Delay is ${performance.metrics.fid}ms (target: < 100ms). Site feels sluggish when users interact.`,
      impact: 'Poor user experience, frustrated visitors, lower engagement.',
      recommendation: 'Reduce JavaScript execution time and optimize scripts.',
      actionSteps: isWordPress
        ? [
            {
              step: 1,
              description: 'Disable unused WordPress plugins',
            },
            {
              step: 2,
              description: 'Use a performance plugin to defer JavaScript',
            },
            {
              step: 3,
              description: 'Remove unnecessary third-party scripts',
            },
          ]
        : [
            {
              step: 1,
              description: 'Minimize and defer JavaScript',
            },
            {
              step: 2,
              description: 'Remove unused JavaScript libraries',
            },
            {
              step: 3,
              description: 'Use code splitting for large applications',
            },
          ],
      estimatedTime: '1 hour',
      difficulty: 'medium',
      affectedArea: 'All pages',
      detectedValue: `${performance.metrics.fid}ms`,
      targetValue: '< 100ms',
      tags: ['performance', 'fid', 'interactivity'],
      skipForWebsiteBuilders: false,
    });
  }

  // 4. MEDIUM: Poor Cumulative Layout Shift (CLS > 0.1)
  if (performance.metrics?.cls && performance.metrics.cls > 0.1) {
    recommendations.push({
      id: 'poor-cls',
      priority: 'medium',
      category: 'Performance',
      title: 'Layout Shift Issues (CLS)',
      issue: `Cumulative Layout Shift is ${performance.metrics.cls.toFixed(3)} (target: < 0.1). Content jumps around while loading.`,
      impact: 'Frustrating user experience, accidental clicks, poor usability.',
      recommendation: 'Set explicit dimensions for images and reserve space for dynamic content.',
      actionSteps: [
        {
          step: 1,
          description: 'Add width and height attributes to all images',
          code: '<img src="image.jpg" width="800" height="600" alt="Description">',
        },
        {
          step: 2,
          description: 'Reserve space for ads and embeds',
        },
        {
          step: 3,
          description: 'Avoid inserting content above existing content',
        },
      ],
      estimatedTime: '1 hour',
      difficulty: 'medium',
      affectedArea: 'All pages',
      detectedValue: performance.metrics.cls.toFixed(3),
      targetValue: '< 0.1',
      tags: ['performance', 'cls', 'layout-shift'],
      skipForWebsiteBuilders: false,
    });
  }

  // 5. MEDIUM: Low PageSpeed Score (< 50)
  if (performance.score !== undefined && performance.score < 50) {
    recommendations.push({
      id: 'low-pagespeed-score',
      priority: 'medium',
      category: 'Performance',
      title: 'Low PageSpeed Score',
      issue: `Your PageSpeed score is ${performance.score}/100. Multiple performance issues detected.`,
      impact: 'Slow site, poor user experience, lower search rankings.',
      recommendation: 'Implement comprehensive performance optimizations.',
      actionSteps: isWordPress
        ? [
            {
              step: 1,
              description: 'Install WP Rocket or similar performance plugin',
            },
            {
              step: 2,
              description: 'Enable all caching options',
            },
            {
              step: 3,
              description: 'Optimize images with Smush',
            },
            {
              step: 4,
              description: 'Use a CDN (Cloudflare recommended)',
            },
          ]
        : [
            {
              step: 1,
              description: 'Run PageSpeed Insights for detailed recommendations',
              link: 'https://pagespeed.web.dev/',
              linkText: 'PageSpeed Insights',
            },
            {
              step: 2,
              description: 'Implement top 3 recommendations from the report',
            },
            {
              step: 3,
              description: 'Enable compression and caching',
            },
          ],
      estimatedTime: '2-3 hours',
      difficulty: 'medium',
      resources: [
        {
          title: 'PageSpeed Insights',
          url: 'https://pagespeed.web.dev/',
          type: 'tool',
        },
      ],
      affectedArea: 'All pages',
      detectedValue: `${performance.score}/100`,
      targetValue: '80+/100',
      tags: ['performance', 'pagespeed', 'optimization'],
      skipForWebsiteBuilders: false,
    });
  }

  return recommendations;
}
