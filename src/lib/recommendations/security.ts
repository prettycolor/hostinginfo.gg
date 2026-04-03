/**
 * Security Recommendations
 * 
 * Generates CONCISE security recommendations:
 * - Groups missing security headers into 1-2 recommendations (not 10+ individual ones)
 * - Focuses on top 3 most important issues
 * - Provides clear, actionable guidance
 * 
 * Design Principle: LESS IS MORE
 * - Don't overwhelm users with 15 security header recommendations
 * - Group related issues together
 * - Prioritize the most impactful fixes
 */

import type { Recommendation, ComprehensiveScanData } from './types';

/**
 * Generate security recommendations
 */
export function generateSecurityRecommendations(data: ComprehensiveScanData): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const security = data.security;
  const isWebsiteBuilder = data.technology?.isWebsiteBuilder || false;

  if (!security) return recommendations;

  // Skip security header recommendations for website builders (platform-managed)
  if (isWebsiteBuilder) {
    return recommendations;
  }

  // Count missing critical security headers
  const criticalHeaders = [
    'strict-transport-security',
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
  ];

  const missingCriticalHeaders = criticalHeaders.filter(
    header => !security.headers?.[header] && !security.headers?.[header.toLowerCase()]
  );

  const totalMissingHeaders = security.missingHeaders?.length || 0;

  // 1. HIGH: Multiple Critical Security Headers Missing (GROUP THEM!)
  if (missingCriticalHeaders.length >= 3) {
    const headerList = missingCriticalHeaders
      .map(h => h.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-'))
      .join(', ');

    recommendations.push({
      id: 'missing-critical-security-headers',
      priority: 'high',
      category: 'Security',
      title: 'Missing Critical Security Headers',
      issue: `Your site is missing ${missingCriticalHeaders.length} critical security headers: ${headerList}.`,
      impact: 'Site vulnerable to XSS attacks, clickjacking, and code injection.',
      recommendation: 'Add security headers to your web server configuration.',
      actionSteps: [
        {
          step: 1,
          description: 'Add security headers to your web server config (Nginx, Apache, etc.)',
          link: 'https://securityheaders.com/',
          linkText: 'Test Your Headers',
        },
        {
          step: 2,
          description: 'Start with these essential headers',
          code: `# Nginx example
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Content-Security-Policy "default-src 'self'" always;`,
        },
        {
          step: 3,
          description: 'Test your configuration and reload server',
        },
        {
          step: 4,
          description: 'Verify headers are working',
          link: 'https://securityheaders.com/',
          linkText: 'SecurityHeaders.com',
        },
      ],
      estimatedTime: '30 minutes',
      difficulty: 'medium',
      resources: [
        {
          title: 'OWASP Secure Headers Project',
          url: 'https://owasp.org/www-project-secure-headers/',
          type: 'documentation',
        },
        {
          title: 'SecurityHeaders.com Scanner',
          url: 'https://securityheaders.com/',
          type: 'tool',
        },
      ],
      affectedArea: 'Entire site',
      detectedValue: `${missingCriticalHeaders.length} missing`,
      targetValue: 'All headers present',
      tags: ['security', 'headers', 'xss', 'clickjacking'],
      skipForWebsiteBuilders: true,
    });
  }
  // 2. MEDIUM: Some Security Headers Missing (1-2 headers)
  else if (missingCriticalHeaders.length > 0 && missingCriticalHeaders.length < 3) {
    const headerName = missingCriticalHeaders[0]
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('-');

    let headerDescription = '';
    let headerCode = '';
    let vulnerability = '';

    switch (missingCriticalHeaders[0]) {
      case 'strict-transport-security':
        headerDescription = 'HSTS (HTTP Strict Transport Security)';
        headerCode = 'Strict-Transport-Security: max-age=31536000; includeSubDomains';
        vulnerability = 'protocol downgrade attacks';
        break;
      case 'content-security-policy':
        headerDescription = 'CSP (Content Security Policy)';
        headerCode = "Content-Security-Policy: default-src 'self'";
        vulnerability = 'XSS and code injection attacks';
        break;
      case 'x-frame-options':
        headerDescription = 'X-Frame-Options';
        headerCode = 'X-Frame-Options: SAMEORIGIN';
        vulnerability = 'clickjacking attacks';
        break;
      case 'x-content-type-options':
        headerDescription = 'X-Content-Type-Options';
        headerCode = 'X-Content-Type-Options: nosniff';
        vulnerability = 'MIME-type sniffing attacks';
        break;
      default:
        headerDescription = headerName;
        headerCode = `${headerName}: <value>`;
        vulnerability = 'security vulnerabilities';
    }

    recommendations.push({
      id: `missing-${missingCriticalHeaders[0]}`,
      priority: 'medium',
      category: 'Security',
      title: `Missing ${headerDescription} Header`,
      issue: `Your site doesn't have the ${headerDescription} security header configured.`,
      impact: `Site vulnerable to ${vulnerability}.`,
      recommendation: `Add ${headerDescription} header to your server configuration.`,
      actionSteps: [
        {
          step: 1,
          description: 'Add header to your web server config',
          code: headerCode,
        },
        {
          step: 2,
          description: 'Reload your web server',
        },
        {
          step: 3,
          description: 'Test the header is working',
          link: 'https://securityheaders.com/',
          linkText: 'SecurityHeaders.com',
        },
      ],
      estimatedTime: '15 minutes',
      difficulty: 'easy',
      resources: [
        {
          title: 'OWASP Secure Headers Guide',
          url: 'https://owasp.org/www-project-secure-headers/',
          type: 'documentation',
        },
      ],
      affectedArea: 'Entire site',
      detectedValue: 'Missing',
      targetValue: 'Configured',
      tags: ['security', 'headers', missingCriticalHeaders[0]],
      skipForWebsiteBuilders: true,
    });
  }

  // 3. MEDIUM: Low Security Score (but don't list every header!)
  if (security.securityScore !== undefined && security.securityScore < 70 && totalMissingHeaders > 5) {
    recommendations.push({
      id: 'low-security-score',
      priority: 'medium',
      category: 'Security',
      title: 'Low Security Score',
      issue: `Your site has a security score of ${security.securityScore}/100 with ${totalMissingHeaders} missing security configurations.`,
      impact: 'Site may be vulnerable to various security threats.',
      recommendation: 'Improve security by implementing recommended security headers and best practices.',
      actionSteps: [
        {
          step: 1,
          description: 'Run a comprehensive security scan',
          link: 'https://securityheaders.com/',
          linkText: 'SecurityHeaders.com',
        },
        {
          step: 2,
          description: 'Implement the top 3 recommended security headers',
        },
        {
          step: 3,
          description: 'Consider using a security plugin or service',
        },
        {
          step: 4,
          description: 'Re-scan to verify improvements',
        },
      ],
      estimatedTime: '1 hour',
      difficulty: 'medium',
      resources: [
        {
          title: 'OWASP Top 10 Security Risks',
          url: 'https://owasp.org/www-project-top-ten/',
          type: 'documentation',
        },
        {
          title: 'Web Security Best Practices',
          url: 'https://developer.mozilla.org/en-US/docs/Web/Security',
          type: 'article',
        },
      ],
      affectedArea: 'Entire site',
      detectedValue: `${security.securityScore}/100`,
      targetValue: '80+/100',
      tags: ['security', 'score', 'best-practices'],
      skipForWebsiteBuilders: true,
    });
  }

  // 4. HIGH: No WAF Detected (Critical for self-hosted sites)
  if (!security.hasWAF) {
    recommendations.push({
      id: 'no-waf',
      priority: 'high',
      category: 'Security',
      title: 'No Web Application Firewall (WAF)',
      issue: 'Your site doesn\'t appear to be protected by a Web Application Firewall.',
      impact: 'Site more vulnerable to DDoS attacks, SQL injection, and other threats.',
      recommendation: 'Consider adding a WAF service like Cloudflare or Sucuri.',
      actionSteps: [
        {
          step: 1,
          description: 'Sign up for a WAF service (Cloudflare, Sucuri, AWS WAF)',
          link: 'https://www.cloudflare.com/',
          linkText: 'Cloudflare (Free Plan Available)',
        },
        {
          step: 2,
          description: 'Update your DNS to route through the WAF',
        },
        {
          step: 3,
          description: 'Configure WAF rules and security settings',
        },
        {
          step: 4,
          description: 'Monitor for blocked threats',
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
          title: 'What is a WAF?',
          url: 'https://www.cloudflare.com/learning/ddos/glossary/web-application-firewall-waf/',
          type: 'article',
        },
      ],
      affectedArea: 'Entire site',
      detectedValue: 'No WAF',
      targetValue: 'WAF enabled',
      tags: ['security', 'waf', 'firewall', 'ddos'],
      skipForWebsiteBuilders: true,
    });
  }

  return recommendations;
}
