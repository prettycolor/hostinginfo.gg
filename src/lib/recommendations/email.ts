/**
 * Email Security Recommendations
 * 
 * Generates recommendations for email security configuration:
 * - Missing SPF record
 * - Missing DMARC record
 * - Missing DKIM configuration
 * - Weak DMARC policy
 */

import type { Recommendation, ComprehensiveScanData } from './types';

/**
 * Generate email security recommendations
 */
export function generateEmailRecommendations(data: ComprehensiveScanData): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const email = data.email;
  const emailWithGateway = email as (typeof email & {
    securityGateway?: { detected?: boolean };
  });

  if (!email) return recommendations;

  // 1. HIGH: Missing SPF Record
  if (!email.spf?.configured) {
    recommendations.push({
      id: 'missing-spf',
      priority: 'high',
      category: 'Email',
      title: 'Missing SPF Record',
      issue: 'Your domain doesn\'t have an SPF (Sender Policy Framework) record configured.',
      impact: 'Email spoofing possible, deliverability issues, emails may be marked as spam.',
      recommendation: 'Add an SPF record to your DNS to authorize email senders.',
      actionSteps: [
        {
          step: 1,
          description: 'Add SPF TXT record to your DNS',
          code: 'v=spf1 include:_spf.google.com ~all',
        },
        {
          step: 2,
          description: 'Replace the include with your email provider\'s SPF record',
        },
        {
          step: 3,
          description: 'Wait for DNS propagation (up to 48 hours)',
        },
        {
          step: 4,
          description: 'Verify SPF record is working',
          link: 'https://mxtoolbox.com/spf.aspx',
          linkText: 'MXToolbox SPF Checker',
        },
      ],
      estimatedTime: '15 minutes',
      difficulty: 'easy',
      resources: [
        {
          title: 'SPF Record Syntax',
          url: 'https://www.dmarcanalyzer.com/spf/spf-record-syntax/',
          type: 'documentation',
        },
        {
          title: 'SPF Record Generator',
          url: 'https://www.spfwizard.net/',
          type: 'tool',
        },
      ],
      affectedArea: 'Email system',
      detectedValue: 'No SPF',
      targetValue: 'SPF configured',
      tags: ['email', 'spf', 'dns', 'deliverability'],
      skipForWebsiteBuilders: false, // Email is user-configurable
    });
  }

  // 2. MEDIUM: Missing DMARC Record
  if (!email.dmarc?.configured) {
    recommendations.push({
      id: 'missing-dmarc',
      priority: 'medium',
      category: 'Email',
      title: 'Missing DMARC Record',
      issue: 'Your domain doesn\'t have a DMARC (Domain-based Message Authentication) policy.',
      impact: 'Email authentication incomplete, spoofing possible, reduced deliverability.',
      recommendation: 'Add a DMARC record to your DNS to protect your domain.',
      actionSteps: [
        {
          step: 1,
          description: 'Add DMARC TXT record to DNS at _dmarc.yourdomain.com',
          code: 'v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com',
        },
        {
          step: 2,
          description: 'Start with p=none to monitor without blocking',
        },
        {
          step: 3,
          description: 'Review DMARC reports and adjust policy',
        },
        {
          step: 4,
          description: 'Gradually tighten policy to p=quarantine or p=reject',
        },
      ],
      estimatedTime: '20 minutes',
      difficulty: 'medium',
      resources: [
        {
          title: 'DMARC.org Guide',
          url: 'https://dmarc.org/overview/',
          type: 'documentation',
        },
        {
          title: 'DMARC Record Generator',
          url: 'https://www.dmarcanalyzer.com/dmarc/dmarc-record-generator/',
          type: 'tool',
        },
      ],
      affectedArea: 'Email system',
      detectedValue: 'No DMARC',
      targetValue: 'DMARC configured',
      tags: ['email', 'dmarc', 'dns', 'authentication'],
      skipForWebsiteBuilders: false,
    });
  }
  // 3. LOW: Weak DMARC Policy (p=none)
  else if (email.dmarc?.configured && email.dmarc?.policy === 'none') {
    recommendations.push({
      id: 'weak-dmarc-policy',
      priority: 'low',
      category: 'Email',
      title: 'Weak DMARC Policy',
      issue: 'Your DMARC policy is set to "none" which only monitors but doesn\'t block spoofed emails.',
      impact: 'Limited protection against email spoofing and phishing.',
      recommendation: 'Strengthen DMARC policy to "quarantine" or "reject" after monitoring.',
      actionSteps: [
        {
          step: 1,
          description: 'Review DMARC reports to ensure legitimate email is passing',
        },
        {
          step: 2,
          description: 'Update DMARC record to p=quarantine',
          code: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
        },
        {
          step: 3,
          description: 'Monitor for 2-4 weeks',
        },
        {
          step: 4,
          description: 'If no issues, upgrade to p=reject for maximum protection',
        },
      ],
      estimatedTime: '10 minutes',
      difficulty: 'easy',
      affectedArea: 'Email system',
      detectedValue: 'p=none',
      targetValue: 'p=quarantine or p=reject',
      tags: ['email', 'dmarc', 'policy', 'security'],
      skipForWebsiteBuilders: false,
    });
  }

  // 4. MEDIUM: Missing DKIM
  if (!email.dkim?.configured) {
    recommendations.push({
      id: 'missing-dkim',
      priority: 'medium',
      category: 'Email',
      title: 'Missing DKIM Configuration',
      issue: 'Your domain doesn\'t have DKIM (DomainKeys Identified Mail) configured.',
      impact: 'Email authentication incomplete, reduced deliverability and trust.',
      recommendation: 'Configure DKIM with your email provider to sign outgoing emails.',
      actionSteps: [
        {
          step: 1,
          description: 'Contact your email provider for DKIM setup instructions',
        },
        {
          step: 2,
          description: 'Generate DKIM keys (usually done by email provider)',
        },
        {
          step: 3,
          description: 'Add DKIM TXT records to your DNS',
        },
        {
          step: 4,
          description: 'Verify DKIM is working',
          link: 'https://mxtoolbox.com/dkim.aspx',
          linkText: 'MXToolbox DKIM Checker',
        },
      ],
      estimatedTime: '30 minutes',
      difficulty: 'medium',
      resources: [
        {
          title: 'DKIM Explained',
          url: 'https://www.dmarcanalyzer.com/dkim/',
          type: 'documentation',
        },
        {
          title: 'Google Workspace DKIM Setup',
          url: 'https://support.google.com/a/answer/174124',
          type: 'tutorial',
        },
      ],
      affectedArea: 'Email system',
      detectedValue: 'No DKIM',
      targetValue: 'DKIM configured',
      tags: ['email', 'dkim', 'dns', 'authentication'],
      skipForWebsiteBuilders: false,
    });
  }

  // 5. HIGH: No MX Records
  if (!email.mx || email.mx.length === 0) {
    recommendations.push({
      id: 'no-mx-records',
      priority: 'high',
      category: 'Email',
      title: 'No MX Records Found',
      issue: 'Your domain doesn\'t have MX (Mail Exchange) records configured.',
      impact: 'Cannot receive emails at your domain. Email delivery will fail.',
      recommendation: 'Add MX records to your DNS to enable email receiving.',
      actionSteps: [
        {
          step: 1,
          description: 'Choose an email provider (Google Workspace, Microsoft 365, etc.)',
        },
        {
          step: 2,
          description: 'Get MX record values from your email provider',
        },
        {
          step: 3,
          description: 'Add MX records to your DNS',
        },
        {
          step: 4,
          description: 'Wait for DNS propagation and test email delivery',
        },
      ],
      estimatedTime: '30 minutes',
      difficulty: 'easy',
      resources: [
        {
          title: 'MX Records Explained',
          url: 'https://www.cloudflare.com/learning/dns/dns-records/dns-mx-record/',
          type: 'article',
        },
      ],
      affectedArea: 'Email system',
      detectedValue: 'No MX records',
      targetValue: 'MX records configured',
      tags: ['email', 'mx', 'dns', 'critical'],
      skipForWebsiteBuilders: false,
    });
  }

  // 6. MEDIUM: No Email Security Gateway
  if (!emailWithGateway?.securityGateway?.detected) {
    recommendations.push({
      id: 'no-security-gateway',
      priority: 'medium',
      category: 'Email',
      title: 'Consider Email Security Gateway',
      issue: 'Your domain doesn\'t have an email security gateway configured.',
      impact: 'Increased risk of spam, phishing, malware, and email-based attacks reaching your inbox.',
      recommendation: 'Add an email security gateway to protect your organization from email threats.',
      actionSteps: [
        {
          step: 1,
          description: 'Evaluate email security gateway providers based on your needs',
        },
        {
          step: 2,
          description: 'Popular options include:',
          code: 'Proofpoint, Barracuda, Mimecast, Cisco IronPort, Trend Micro, Fortinet FortiMail',
        },
        {
          step: 3,
          description: 'Configure MX records to route email through the security gateway',
        },
        {
          step: 4,
          description: 'Update SPF record to include the security gateway',
        },
        {
          step: 5,
          description: 'Test email flow and configure filtering policies',
        },
      ],
      estimatedTime: '2-4 hours',
      difficulty: 'medium',
      resources: [
        {
          title: 'Proofpoint Email Protection',
          url: 'https://www.proofpoint.com/us/products/email-security-and-protection',
          type: 'article',
        },
        {
          title: 'Barracuda Email Security Gateway',
          url: 'https://www.barracuda.com/products/email-protection',
          type: 'article',
        },
        {
          title: 'Mimecast Email Security',
          url: 'https://www.mimecast.com/products/email-security/',
          type: 'article',
        },
        {
          title: 'Email Security Best Practices',
          url: 'https://www.cisa.gov/email-security',
          type: 'article',
        },
      ],
      affectedArea: 'Email security',
      detectedValue: 'No security gateway',
      targetValue: 'Security gateway configured',
      tags: ['email', 'security', 'gateway', 'protection', 'spam', 'phishing'],
      skipForWebsiteBuilders: false,
    });
  }

  return recommendations;
}
