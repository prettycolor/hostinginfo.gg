/**
 * SSL Certificate Recommendations
 * 
 * Generates recommendations for SSL certificate issues:
 * - Expired certificates
 * - Expiring soon (< 30 days)
 * - Invalid certificates
 */

import type { Recommendation, ComprehensiveScanData } from './types';

/**
 * Generate SSL certificate recommendations
 */
export function generateSSLRecommendations(data: ComprehensiveScanData): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const ssl = data.ssl;

  if (!ssl) return recommendations;

  // Map daysUntilExpiry to daysRemaining for consistency
  const daysRemaining = ssl.daysRemaining ?? ssl.daysUntilExpiry ?? 0;

  // 1. CRITICAL: SSL Certificate Expired
  if (ssl.expired || (!ssl.valid && ssl.hasSSL)) {
    recommendations.push({
      id: 'ssl-expired',
      priority: 'critical',
      category: 'Security',
      title: 'SSL Certificate Expired',
      issue: `Your SSL certificate expired on ${ssl.validTo || 'unknown date'}. Browsers are blocking access to your site.`,
      impact: 'Site is insecure and visitors cannot access it. Major trust and SEO damage.',
      recommendation: 'Renew your SSL certificate immediately to restore site access.',
      actionSteps: [
        {
          step: 1,
          description: 'Contact your hosting provider or SSL issuer urgently',
        },
        {
          step: 2,
          description: 'Request immediate certificate renewal',
        },
        {
          step: 3,
          description: 'Install the renewed certificate on your server',
          code: 'sudo certbot renew --force-renewal',
        },
        {
          step: 4,
          description: 'Verify certificate is working',
          link: 'https://www.ssllabs.com/ssltest/',
          linkText: 'Test with SSL Labs',
        },
      ],
      estimatedTime: '1-2 hours',
      difficulty: 'medium',
      resources: [
        {
          title: "Let's Encrypt Documentation",
          url: 'https://letsencrypt.org/docs/',
          type: 'documentation',
        },
        {
          title: 'SSL Labs Server Test',
          url: 'https://www.ssllabs.com/ssltest/',
          type: 'tool',
        },
      ],
      affectedArea: 'Entire site',
      detectedValue: 'Expired',
      targetValue: 'Valid certificate',
      tags: ['ssl', 'security', 'critical', 'expired'],
      skipForWebsiteBuilders: true, // Website builders auto-manage SSL
    });
  }
  // 2. CRITICAL/HIGH: SSL Certificate Expiring Soon
  else if (daysRemaining > 0 && daysRemaining < 30) {
    const isCritical = daysRemaining < 15;
    
    recommendations.push({
      id: 'ssl-expiring-soon',
      priority: isCritical ? 'critical' : 'high',
      category: 'Security',
      title: 'SSL Certificate Expiring Soon',
      issue: `Your SSL certificate expires in ${daysRemaining} days (${ssl.validTo}). ${isCritical ? 'Immediate action required.' : 'Plan renewal soon.'}`,
      impact: 'Site will show security warnings and lose visitor trust if certificate expires.',
      recommendation: `${isCritical ? 'Renew immediately' : 'Schedule renewal'} to maintain secure connections.`,
      actionSteps: [
        {
          step: 1,
          description: 'Contact your hosting provider or SSL certificate issuer',
          link: 'https://letsencrypt.org/docs/',
          linkText: "Let's Encrypt Docs",
        },
        {
          step: 2,
          description: 'Request certificate renewal or purchase new certificate',
        },
        {
          step: 3,
          description: 'Install renewed certificate before expiration date',
          code: ssl.issuer?.includes('Let\'s Encrypt') ? 'sudo certbot renew' : undefined,
        },
        {
          step: 4,
          description: 'Verify new certificate is active',
          link: 'https://www.ssllabs.com/ssltest/',
          linkText: 'SSL Labs Test',
        },
      ],
      estimatedTime: '30 minutes',
      difficulty: 'medium',
      resources: [
        {
          title: "Let's Encrypt Renewal Guide",
          url: 'https://letsencrypt.org/docs/renewing/',
          type: 'documentation',
        },
        {
          title: 'SSL Certificate Renewal Tutorial',
          url: 'https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt',
          type: 'tutorial',
        },
      ],
      affectedArea: 'Entire site',
      detectedValue: `${daysRemaining} days remaining`,
      targetValue: '90+ days remaining',
      tags: ['ssl', 'security', isCritical ? 'critical' : 'urgent', 'expiring'],
      skipForWebsiteBuilders: true, // Website builders auto-renew
    });
  }
  // 3. MEDIUM: SSL Certificate Needs Renewal Soon (30-60 days)
  else if (daysRemaining >= 30 && daysRemaining < 60) {
    recommendations.push({
      id: 'ssl-renewal-reminder',
      priority: 'medium',
      category: 'Security',
      title: 'Plan SSL Certificate Renewal',
      issue: `Your SSL certificate expires in ${daysRemaining} days (${ssl.validTo}).`,
      impact: 'Good time to plan renewal to avoid last-minute issues.',
      recommendation: 'Schedule certificate renewal in the next few weeks.',
      actionSteps: [
        {
          step: 1,
          description: 'Add renewal reminder to your calendar',
        },
        {
          step: 2,
          description: 'Verify auto-renewal is configured (if using Let\'s Encrypt)',
          code: 'sudo certbot renew --dry-run',
        },
        {
          step: 3,
          description: 'Contact provider if manual renewal is needed',
        },
      ],
      estimatedTime: '15 minutes',
      difficulty: 'easy',
      affectedArea: 'Entire site',
      detectedValue: `${daysRemaining} days remaining`,
      targetValue: '90+ days remaining',
      tags: ['ssl', 'security', 'renewal', 'planning'],
      skipForWebsiteBuilders: true,
    });
  }
  // 4. HIGH: No SSL Certificate
  else if (!ssl.hasSSL) {
    recommendations.push({
      id: 'no-ssl',
      priority: 'high',
      category: 'Security',
      title: 'No SSL Certificate Detected',
      issue: 'Your site is not using HTTPS. Browsers mark it as "Not Secure".',
      impact: 'Major security risk, poor SEO ranking, and loss of visitor trust.',
      recommendation: 'Install an SSL certificate immediately to enable HTTPS.',
      actionSteps: [
        {
          step: 1,
          description: 'Get a free SSL certificate from Let\'s Encrypt',
          link: 'https://letsencrypt.org/getting-started/',
          linkText: 'Getting Started Guide',
        },
        {
          step: 2,
          description: 'Install certificate on your web server',
          code: 'sudo certbot --nginx',
        },
        {
          step: 3,
          description: 'Configure automatic HTTPS redirect',
        },
        {
          step: 4,
          description: 'Test HTTPS is working correctly',
          link: 'https://www.ssllabs.com/ssltest/',
          linkText: 'SSL Labs Test',
        },
      ],
      estimatedTime: '1 hour',
      difficulty: 'medium',
      resources: [
        {
          title: "Let's Encrypt Getting Started",
          url: 'https://letsencrypt.org/getting-started/',
          type: 'documentation',
        },
        {
          title: 'Certbot Installation Guide',
          url: 'https://certbot.eff.org/',
          type: 'tutorial',
        },
      ],
      affectedArea: 'Entire site',
      detectedValue: 'No SSL',
      targetValue: 'Valid SSL certificate',
      tags: ['ssl', 'security', 'https', 'urgent'],
      skipForWebsiteBuilders: true,
    });
  }

  return recommendations;
}
