/**
 * Infrastructure Recommendations
 * 
 * Generates recommendations for infrastructure improvements:
 * - CDN usage
 * - DNS configuration
 * - Server location
 * - Hosting environment
 * 
 * Highly context-aware:
 * - Website builders: Skip (managed infrastructure)
 * - Managed WordPress: Limited recommendations
 * - Self-hosted WordPress on cPanel: Full server recommendations
 * - Custom sites: Advanced infrastructure recommendations
 */

import type { Recommendation, ComprehensiveScanData } from './types';

/**
 * Generate infrastructure recommendations
 */
export function generateInfrastructureRecommendations(data: ComprehensiveScanData): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const technology = data.technology;
  const hosting = data.hosting;
  const dns = data.dns;
  const security = data.security;
  
  const isWebsiteBuilder = technology?.isWebsiteBuilder || false;
  const isWordPress = technology?.isWordPress || technology?.platform?.toLowerCase().includes('wordpress') || false;
  const isManagedWordPress = technology?.wordPressType === 'managed';
  const isSelfHostedWordPress = technology?.wordPressType === 'self-hosted';
  const hasCPanel = technology?.controlPanel?.recommendation === 'cpanel';
  const serverType = technology?.serverType;

  // Skip all infrastructure recommendations for website builders
  if (isWebsiteBuilder) {
    return recommendations;
  }

  // 1. CRITICAL: No CDN AND No WAF (Double vulnerability)
  const hasWAF = security?.waf?.detected || false;
  
  if (!hasWAF && !hosting?.provider?.toLowerCase().includes('cloudflare')) {
    const hasNeitherCdnNorWaf = true;
    
    // If site has neither CDN nor WAF, create a CRITICAL combined recommendation
    if (hasNeitherCdnNorWaf && !isManagedWordPress) {
      recommendations.push({
        id: 'no-cdn-no-waf',
        priority: 'critical',
        category: 'Infrastructure',
        title: 'No CDN or Firewall Protection',
        issue: 'Your site has no Content Delivery Network (CDN) or Web Application Firewall (WAF). This leaves you vulnerable to attacks and slow performance.',
        impact: 'High risk of DDoS attacks, slow global performance, increased server costs, and security vulnerabilities.',
        recommendation: 'Implement Cloudflare immediately for both CDN and WAF protection (free plan available).',
        actionSteps: isSelfHostedWordPress && hasCPanel
          ? [
              {
                step: 1,
                description: 'Sign up for Cloudflare free plan (includes CDN + WAF)',
                link: 'https://www.cloudflare.com/plans/free/',
                linkText: 'Cloudflare Free Plan',
              },
              {
                step: 2,
                description: 'Log into cPanel and update your domain nameservers',
              },
              {
                step: 3,
                description: 'Configure Cloudflare: Enable SSL, caching, and firewall',
              },
              {
                step: 4,
                description: 'Install Cloudflare WordPress plugin for optimization',
              },
              {
                step: 5,
                description: 'Test site performance and security',
                link: 'https://www.webpagetest.org/',
                linkText: 'WebPageTest',
              },
            ]
          : [
              {
                step: 1,
                description: 'Sign up for Cloudflare (free plan includes CDN + WAF)',
                link: 'https://www.cloudflare.com/plans/free/',
                linkText: 'Cloudflare Free Plan',
              },
              {
                step: 2,
                description: 'Update your domain nameservers to Cloudflare',
              },
              {
                step: 3,
                description: 'Configure security and performance settings',
              },
              {
                step: 4,
                description: 'Enable SSL/TLS encryption',
              },
              {
                step: 5,
                description: 'Set up firewall rules and caching',
              },
            ],
        estimatedTime: '1-2 hours',
        difficulty: 'medium',
        resources: [
          {
            title: 'Cloudflare Free Plan',
            url: 'https://www.cloudflare.com/plans/free/',
            type: 'tool',
          },
          {
            title: 'Cloudflare Setup Guide',
            url: 'https://developers.cloudflare.com/fundamentals/get-started/setup/',
            type: 'documentation',
          },
          {
            title: 'What is a CDN?',
            url: 'https://www.cloudflare.com/learning/cdn/what-is-a-cdn/',
            type: 'article',
          },
          {
            title: 'What is a WAF?',
            url: 'https://www.cloudflare.com/learning/ddos/glossary/web-application-firewall-waf/',
            type: 'article',
          },
        ],
        affectedArea: 'Entire site',
        detectedValue: 'No CDN, No WAF',
        targetValue: 'CDN + WAF enabled',
        tags: ['infrastructure', 'cdn', 'waf', 'security', 'performance', 'critical'],
        skipForWebsiteBuilders: true,
      });
      
      // Skip individual CDN/WAF recommendations since we have the combined one
      return recommendations;
    }
  }

  // 2. HIGH: No CDN Detected (when WAF exists separately)
  if (!security?.hasWAF && !hosting?.provider?.toLowerCase().includes('cloudflare')) {
    let actionSteps = [];
    let priority: 'high' | 'medium' = 'high'; // Default to high

    if (isManagedWordPress) {
      priority = 'medium'; // Lower priority for managed (may be included)
      // Managed WordPress: Check if CDN is included
      actionSteps = [
        {
          step: 1,
          description: 'Check if your hosting plan includes a CDN',
        },
        {
          step: 2,
          description: 'Enable CDN in your hosting dashboard if available',
        },
        {
          step: 3,
          description: 'Consider upgrading to a plan with CDN included',
        },
      ];
    } else if (isSelfHostedWordPress && hasCPanel) {
      // Self-hosted WordPress on cPanel
      actionSteps = [
        {
          step: 1,
          description: 'Sign up for Cloudflare (free plan available)',
          link: 'https://www.cloudflare.com/plans/free/',
          linkText: 'Cloudflare Free Plan',
        },
        {
          step: 2,
          description: 'Update your domain nameservers in cPanel',
        },
        {
          step: 3,
          description: 'Configure Cloudflare settings (SSL, caching, firewall)',
        },
        {
          step: 4,
          description: 'Install Cloudflare WordPress plugin for optimization',
        },
      ];
    } else {
      // Custom sites
      actionSteps = [
        {
          step: 1,
          description: 'Choose a CDN provider (Cloudflare, AWS CloudFront, Fastly)',
          link: 'https://www.cloudflare.com/',
          linkText: 'Cloudflare',
        },
        {
          step: 2,
          description: 'Configure DNS to route through CDN',
        },
        {
          step: 3,
          description: 'Set up caching rules for static assets',
        },
        {
          step: 4,
          description: 'Test performance improvement',
        },
      ];
    }

    recommendations.push({
      id: 'no-cdn',
      priority: priority,
      category: 'Infrastructure',
      title: 'No CDN Detected',
      issue: 'Your site doesn\'t appear to be using a Content Delivery Network (CDN).',
      impact: 'Slower load times for global visitors, higher server load, increased bandwidth costs.',
      recommendation: 'Implement a CDN to improve performance and reduce server load.',
      actionSteps,
      estimatedTime: isManagedWordPress ? '15 minutes' : '1 hour',
      difficulty: isManagedWordPress ? 'easy' : 'medium',
      resources: [
        {
          title: 'What is a CDN?',
          url: 'https://www.cloudflare.com/learning/cdn/what-is-a-cdn/',
          type: 'article',
        },
        {
          title: 'Cloudflare Free Plan',
          url: 'https://www.cloudflare.com/plans/free/',
          type: 'tool',
        },
      ],
      affectedArea: 'Entire site',
      detectedValue: 'No CDN',
      targetValue: 'CDN enabled',
      tags: ['infrastructure', 'cdn', 'performance'],
      skipForWebsiteBuilders: true,
    });
  }

  // 3. LOW: Single Nameserver (No Redundancy)
  if (dns?.nameservers && dns.nameservers.length === 1) {
    recommendations.push({
      id: 'single-nameserver',
      priority: 'low',
      category: 'Infrastructure',
      title: 'Single Nameserver (No Redundancy)',
      issue: 'Your domain uses only one nameserver. No redundancy if it fails.',
      impact: 'Site could become unreachable if the nameserver goes down.',
      recommendation: 'Add additional nameservers for redundancy.',
      actionSteps: hasCPanel
        ? [
            {
              step: 1,
              description: 'Contact your hosting provider for additional nameservers',
            },
            {
              step: 2,
              description: 'Add secondary nameservers at your domain registrar',
            },
            {
              step: 3,
              description: 'Verify DNS propagation',
            },
          ]
        : [
            {
              step: 1,
              description: 'Use a DNS provider with multiple nameservers (Cloudflare, Route53)',
            },
            {
              step: 2,
              description: 'Update nameservers at your domain registrar',
            },
            {
              step: 3,
              description: 'Verify all nameservers are responding',
            },
          ],
      estimatedTime: '30 minutes',
      difficulty: 'easy',
      affectedArea: 'DNS infrastructure',
      detectedValue: '1 nameserver',
      targetValue: '2+ nameservers',
      tags: ['infrastructure', 'dns', 'redundancy'],
      skipForWebsiteBuilders: true,
    });
  }

  // 4. MEDIUM: Apache Server (Consider Nginx)
  if (serverType === 'apache' && isSelfHostedWordPress) {
    recommendations.push({
      id: 'apache-to-nginx',
      priority: 'low',
      category: 'Infrastructure',
      title: 'Consider Nginx for Better Performance',
      issue: 'Your site runs on Apache. Nginx typically offers better performance for WordPress.',
      impact: 'Moderate performance improvement possible with Nginx.',
      recommendation: 'Consider migrating to Nginx or using Nginx as a reverse proxy.',
      actionSteps: [
        {
          step: 1,
          description: 'Research Nginx benefits for your use case',
          link: 'https://www.nginx.com/blog/nginx-vs-apache-our-view/',
          linkText: 'Nginx vs Apache',
        },
        {
          step: 2,
          description: 'Check if your hosting provider supports Nginx',
        },
        {
          step: 3,
          description: 'Consider managed WordPress hosting with Nginx (WP Engine, Kinsta)',
        },
      ],
      estimatedTime: 'Varies',
      difficulty: 'hard',
      affectedArea: 'Server infrastructure',
      detectedValue: 'Apache',
      targetValue: 'Nginx',
      tags: ['infrastructure', 'server', 'performance', 'apache', 'nginx'],
      skipForWebsiteBuilders: true,
    });
  }

  // 5. MEDIUM: cPanel Detected (Consider Managed Hosting)
  if (hasCPanel && isWordPress) {
    recommendations.push({
      id: 'cpanel-to-managed',
      priority: 'low',
      category: 'Infrastructure',
      title: 'Consider Managed WordPress Hosting',
      issue: 'You\'re using cPanel hosting. Managed WordPress hosting offers better performance and security.',
      impact: 'Significant performance and security improvements with managed hosting.',
      recommendation: 'Consider upgrading to managed WordPress hosting for better performance.',
      actionSteps: [
        {
          step: 1,
          description: 'Research managed WordPress hosts (WP Engine, Kinsta, Flywheel)',
          link: 'https://wpengine.com/',
          linkText: 'WP Engine',
        },
        {
          step: 2,
          description: 'Compare features: automatic backups, staging, CDN, security',
        },
        {
          step: 3,
          description: 'Plan migration during low-traffic period',
        },
      ],
      estimatedTime: 'Several hours',
      difficulty: 'medium',
      resources: [
        {
          title: 'Managed WordPress Hosting Comparison',
          url: 'https://www.wpbeginner.com/wordpress-hosting/',
          type: 'article',
        },
      ],
      affectedArea: 'Entire infrastructure',
      detectedValue: 'cPanel hosting',
      targetValue: 'Managed WordPress hosting',
      tags: ['infrastructure', 'hosting', 'wordpress', 'cpanel', 'managed'],
      skipForWebsiteBuilders: true,
    });
  }

  // 6. LOW: PHP Version Detection
  if (technology?.phpVersion) {
    const phpVersion = parseFloat(technology.phpVersion);
    
    // PHP < 7.4 is end-of-life
    if (phpVersion < 7.4) {
      recommendations.push({
        id: 'outdated-php',
        priority: 'high',
        category: 'Infrastructure',
        title: 'Outdated PHP Version',
        issue: `Your site runs on PHP ${technology.phpVersion}, which is end-of-life and no longer receives security updates.`,
        impact: 'Security vulnerabilities, poor performance, compatibility issues.',
        recommendation: 'Upgrade to PHP 8.0 or higher immediately.',
        actionSteps: hasCPanel
          ? [
              {
                step: 1,
                description: 'Backup your site completely',
              },
              {
                step: 2,
                description: 'Log into cPanel and find "Select PHP Version"',
              },
              {
                step: 3,
                description: 'Select PHP 8.0 or 8.1',
              },
              {
                step: 4,
                description: 'Test your site thoroughly',
              },
            ]
          : [
              {
                step: 1,
                description: 'Backup your site',
              },
              {
                step: 2,
                description: 'Contact your hosting provider to upgrade PHP',
              },
              {
                step: 3,
                description: 'Test site after upgrade',
              },
            ],
        estimatedTime: '30 minutes',
        difficulty: 'medium',
        resources: [
          {
            title: 'PHP Supported Versions',
            url: 'https://www.php.net/supported-versions.php',
            type: 'documentation',
          },
        ],
        affectedArea: 'Entire site',
        detectedValue: `PHP ${technology.phpVersion}`,
        targetValue: 'PHP 8.0+',
        tags: ['infrastructure', 'php', 'security', 'performance'],
        skipForWebsiteBuilders: true,
      });
    }
    // PHP 7.4 - 8.0 (recommend upgrade)
    else if (phpVersion < 8.0) {
      recommendations.push({
        id: 'php-upgrade-recommended',
        priority: 'medium',
        category: 'Infrastructure',
        title: 'PHP Upgrade Recommended',
        issue: `Your site runs on PHP ${technology.phpVersion}. PHP 8.0+ offers better performance and security.`,
        impact: 'Missing out on performance improvements and latest security patches.',
        recommendation: 'Upgrade to PHP 8.0 or 8.1 for better performance.',
        actionSteps: hasCPanel
          ? [
              {
                step: 1,
                description: 'Backup your site',
              },
              {
                step: 2,
                description: 'Update PHP version in cPanel',
              },
              {
                step: 3,
                description: 'Test site functionality',
              },
            ]
          : [
              {
                step: 1,
                description: 'Contact hosting provider for PHP upgrade',
              },
              {
                step: 2,
                description: 'Test in staging environment first',
              },
            ],
        estimatedTime: '30 minutes',
        difficulty: 'easy',
        affectedArea: 'Entire site',
        detectedValue: `PHP ${technology.phpVersion}`,
        targetValue: 'PHP 8.0+',
        tags: ['infrastructure', 'php', 'performance'],
        skipForWebsiteBuilders: true,
      });
    }
  }

  return recommendations;
}
