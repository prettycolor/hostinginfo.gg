import type { EducationalContent } from '@/components/EducationalModal';

export const educationalContent: Record<string, EducationalContent> = {
  // Security Headers
  'hsts': {
    title: 'HTTP Strict Transport Security (HSTS)',
    description: 'Forces browsers to only connect via HTTPS, preventing downgrade attacks',
    category: 'security',
    importance: 'high',
    whatItIs: 'HSTS is a security header that tells browsers to always use HTTPS when connecting to your website, even if the user types http:// in the address bar.',
    whyItMatters: 'Without HSTS, attackers can intercept the first HTTP request and steal sensitive data or inject malicious code. HSTS prevents this by forcing all connections to use encrypted HTTPS.',
    howToFix: 'Add the Strict-Transport-Security header to your server configuration. Most web hosting providers offer this as a one-click option in their security settings.',
    example: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    sections: [
      {
        title: 'How HSTS Works',
        content: 'When a browser receives the HSTS header, it remembers to always use HTTPS for that domain. This happens automatically - users do not need to do anything. The max-age value tells the browser how long to remember this rule (typically 1 year).'
      },
      {
        title: 'Common Issues',
        content: 'If you enable HSTS but your SSL certificate expires, users will not be able to access your site at all. Make sure to set up automatic SSL renewal before enabling HSTS.'
      }
    ],
    products: [
      {
        name: 'HostingInfo Website Security',
        description: 'Automatically configures HSTS and other security headers with one click',
        link: 'https://www.hostinginfo.gg/web-security'
      },
      {
        name: 'Cloudflare',
        description: 'Free HSTS configuration with automatic SSL certificate management',
        link: 'https://www.cloudflare.com'
      }
    ],
    resources: [
      { title: 'MDN: HSTS Documentation', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security' }
    ]
  },

  'csp': {
    title: 'Content Security Policy (CSP)',
    description: 'Prevents XSS attacks by controlling which resources can load on your site',
    category: 'security',
    importance: 'high',
    whatItIs: 'CSP is a security header that tells browsers which sources of content like scripts, images, and styles are allowed to load on your website.',
    whyItMatters: 'CSP is your best defense against Cross-Site Scripting (XSS) attacks, where attackers inject malicious JavaScript into your site. A strong CSP policy can block these attacks automatically.',
    howToFix: 'Start with a basic CSP policy and gradually tighten it. Most hosting providers offer CSP configuration in their security dashboard.',
    example: "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    sections: [
      {
        title: 'CSP Directives',
        content: 'CSP uses directives to control different types of content:\n\n• default-src: Fallback for all other directives\n• script-src: Controls JavaScript sources\n• style-src: Controls CSS sources\n• img-src: Controls image sources\n• connect-src: Controls AJAX/WebSocket connections'
      },
      {
        title: 'Testing Your CSP',
        content: 'Use Content-Security-Policy-Report-Only header first to test your policy without breaking your site. Check browser console for CSP violations before enforcing.'
      }
    ],
    products: [
      {
        name: 'HostingInfo Website Security',
        description: 'Pre-configured CSP policies optimized for common website platforms',
        link: 'https://www.hostinginfo.gg/web-security'
      }
    ],
    resources: [
      { title: 'CSP Evaluator Tool', url: 'https://csp-evaluator.withgoogle.com/' },
      { title: 'MDN: CSP Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP' }
    ]
  },

  'x-frame-options': {
    title: 'X-Frame-Options',
    description: 'Prevents clickjacking attacks by controlling iframe embedding',
    category: 'security',
    importance: 'medium',
    whatItIs: 'X-Frame-Options prevents your website from being embedded in an iframe on another site.',
    whyItMatters: 'Clickjacking attacks trick users into clicking hidden buttons by embedding your site in an invisible iframe. X-Frame-Options blocks this attack vector.',
    howToFix: 'Set X-Frame-Options to DENY (block all iframes) or SAMEORIGIN (allow only your own site to iframe your content).',
    example: 'X-Frame-Options: DENY',
    sections: [
      {
        title: 'When to Use SAMEORIGIN',
        content: 'Use SAMEORIGIN if you need to embed your own pages in iframes (like admin dashboards or embedded widgets). Use DENY for maximum security if you never need iframe embedding.'
      }
    ],
    products: [
      {
        name: 'HostingInfo Website Security',
        description: 'Automatically sets X-Frame-Options based on your site type',
        link: 'https://www.hostinginfo.gg/web-security'
      }
    ]
  },

  'ssl': {
    title: 'SSL/TLS Certificate',
    description: 'Encrypts data between your website and visitors',
    category: 'ssl',
    importance: 'critical',
    whatItIs: 'SSL/TLS certificates enable HTTPS encryption, protecting data as it travels between your server and visitors browsers.',
    whyItMatters: 'Without SSL, all data like passwords, credit cards, and personal info is sent in plain text that anyone can intercept. Modern browsers also flag non-HTTPS sites as Not Secure, hurting trust and SEO.',
    howToFix: 'Get a free SSL certificate from Lets Encrypt or purchase one from your hosting provider. Most hosts offer free SSL with automatic renewal.',
    example: 'Certificate: example.com\nIssuer: Lets Encrypt\nValid: 90 days\nProtocol: TLS 1.3',
    sections: [
      {
        title: 'Types of SSL Certificates',
        content: 'Domain Validation (DV): Free, validates domain ownership only. Good for blogs and small sites.\n\nOrganization Validation (OV): Validates your business identity. Better for e-commerce.\n\nExtended Validation (EV): Highest validation level, shows company name in address bar. Best for banks and large e-commerce.'
      },
      {
        title: 'SSL vs TLS',
        content: 'SSL is the old name - modern encryption uses TLS 1.2 or TLS 1.3. When people say SSL certificate, they mean TLS. Always use TLS 1.2 or higher for security.'
      }
    ],
    products: [
      {
        name: 'HostingInfo SSL Certificates',
        description: 'Free and premium SSL certificates with automatic installation and renewal',
        link: 'https://www.hostinginfo.gg/web-security/ssl-certificate'
      },
      {
        name: 'Lets Encrypt',
        description: 'Free SSL certificates with 90-day auto-renewal',
        link: 'https://letsencrypt.org/'
      }
    ],
    resources: [
      { title: 'SSL Labs Server Test', url: 'https://www.ssllabs.com/ssltest/' }
    ]
  },

  'waf': {
    title: 'Web Application Firewall (WAF)',
    description: 'Blocks malicious traffic and common web attacks',
    category: 'security',
    importance: 'high',
    whatItIs: 'A WAF sits between your website and the internet, filtering out malicious requests before they reach your server.',
    whyItMatters: 'WAFs protect against SQL injection, XSS, DDoS attacks, and bot traffic. They can block attacks automatically without any code changes to your site.',
    howToFix: 'Enable WAF through your hosting provider or use a service like Cloudflare. Most modern hosting includes basic WAF protection.',
    sections: [
      {
        title: 'What WAF Blocks',
        content: 'SQL Injection: Attackers trying to access your database\nXSS Attacks: Malicious JavaScript injection\nDDoS: Traffic floods that crash your site\nBot Traffic: Scrapers and spam bots\nZero-Day Exploits: Newly discovered vulnerabilities'
      },
      {
        title: 'Cloud WAF vs Server WAF',
        content: 'Cloud WAF (like Cloudflare): Filters traffic before it reaches your server. Better for DDoS protection.\n\nServer WAF (like ModSecurity): Runs on your server. More customizable but uses server resources.'
      }
    ],
    products: [
      {
        name: 'HostingInfo Website Security',
        description: 'Cloud-based WAF with automatic rule updates and DDoS protection',
        link: 'https://www.hostinginfo.gg/web-security'
      },
      {
        name: 'Cloudflare',
        description: 'Free and paid WAF plans with global CDN',
        link: 'https://www.cloudflare.com/waf/'
      },
      {
        name: 'Sucuri',
        description: 'Website firewall with malware removal and monitoring',
        link: 'https://sucuri.net/'
      }
    ]
  },

  'ddos': {
    title: 'DDoS Protection',
    description: 'Prevents distributed denial-of-service attacks from taking your site offline',
    category: 'security',
    importance: 'high',
    whatItIs: 'DDoS protection filters out massive traffic floods that try to overwhelm and crash your website.',
    whyItMatters: 'DDoS attacks can take your site offline for hours or days, costing revenue and damaging reputation. Protection is essential for any business-critical website.',
    howToFix: 'Use a CDN with DDoS protection (like Cloudflare) or enable DDoS protection through your hosting provider.',
    sections: [
      {
        title: 'Types of DDoS Attacks',
        content: 'Volumetric Attacks: Flood your bandwidth with junk traffic\nProtocol Attacks: Exploit weaknesses in network protocols\nApplication Layer Attacks: Target your web application directly\n\nModern DDoS protection handles all three types automatically.'
      },
      {
        title: 'How DDoS Protection Works',
        content: 'Traffic Analysis: Identifies normal vs attack traffic patterns\nRate Limiting: Blocks IPs sending too many requests\nChallenge-Response: Uses CAPTCHAs to verify human users\nGlobal Network: Distributes traffic across multiple data centers'
      }
    ],
    products: [
      {
        name: 'Cloudflare',
        description: 'Free DDoS protection for sites of any size',
        link: 'https://www.cloudflare.com/ddos/'
      },
      {
        name: 'HostingInfo Website Security',
        description: 'DDoS protection included with WAF service',
        link: 'https://www.hostinginfo.gg/web-security'
      }
    ]
  },

  'spf': {
    title: 'SPF (Sender Policy Framework)',
    description: 'Prevents email spoofing by listing authorized mail servers',
    category: 'email',
    importance: 'high',
    whatItIs: 'SPF is a DNS record that lists which mail servers are allowed to send email from your domain.',
    whyItMatters: 'Without SPF, anyone can send emails pretending to be from your domain. SPF helps prevent phishing attacks and improves email deliverability.',
    howToFix: 'Add an SPF record to your DNS settings. Your email provider should give you the exact record to add.',
    example: 'v=spf1 include:_spf.google.com ~all',
    sections: [
      {
        title: 'SPF Record Syntax',
        content: 'v=spf1: Version identifier (always required)\ninclude: Authorize another domain servers\nip4/ip6: Authorize specific IP addresses\na/mx: Authorize your domain A or MX records\n~all: Soft fail (mark as suspicious)\n-all: Hard fail (reject)'
      },
      {
        title: 'Common Mistakes',
        content: 'Multiple SPF Records: Only one SPF record per domain\nToo Many Lookups: SPF has a 10 DNS lookup limit\nForgetting Services: Include all services that send email (marketing tools, support systems, etc.)'
      }
    ],
    products: [
      {
        name: 'HostingInfo Email Marketing',
        description: 'Automatically configures SPF for your domain',
        link: 'https://www.hostinginfo.gg/email-marketing'
      }
    ],
    resources: [
      { title: 'SPF Record Checker', url: 'https://mxtoolbox.com/spf.aspx' }
    ]
  },

  'dkim': {
    title: 'DKIM (DomainKeys Identified Mail)',
    description: 'Cryptographically signs emails to verify authenticity',
    category: 'email',
    importance: 'high',
    whatItIs: 'DKIM adds a digital signature to your emails that proves they actually came from your domain and were not modified in transit.',
    whyItMatters: 'DKIM prevents email tampering and improves deliverability. Major email providers (Gmail, Outlook) require DKIM for bulk senders.',
    howToFix: 'Your email provider will give you a DKIM record to add to your DNS. This is usually a TXT record with a long cryptographic key.',
    example: 'default._domainkey.example.com TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3..."',
    sections: [
      {
        title: 'How DKIM Works',
        content: 'When you send an email:\n1. Your mail server signs it with a private key\n2. The signature is added to the email header\n3. Receiving server looks up your public key in DNS\n4. Verifies the signature matches\n\nIf the signature is valid, the email is trusted.'
      }
    ],
    products: [
      {
        name: 'HostingInfo Email Marketing',
        description: 'DKIM automatically configured and managed',
        link: 'https://www.hostinginfo.gg/email-marketing'
      }
    ]
  },

  'dmarc': {
    title: 'DMARC (Domain-based Message Authentication)',
    description: 'Tells email providers what to do with emails that fail SPF/DKIM checks',
    category: 'email',
    importance: 'critical',
    whatItIs: 'DMARC is a policy that tells email providers how to handle emails from your domain that fail authentication checks.',
    whyItMatters: 'DMARC is now required by Gmail and Yahoo for bulk senders. Without it, your emails may be rejected or marked as spam.',
    howToFix: 'Add a DMARC record to your DNS. Start with a monitoring policy (p=none) to collect data, then move to quarantine or reject.',
    example: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com',
    sections: [
      {
        title: 'DMARC Policies',
        content: 'p=none: Monitor only, do not take action (good for testing)\np=quarantine: Send suspicious emails to spam folder\np=reject: Block suspicious emails entirely\n\nStart with none, analyze reports, then gradually tighten.'
      },
      {
        title: 'DMARC Reports',
        content: 'The rua tag specifies where to send aggregate reports. These reports show:\n• Who is sending email from your domain\n• Which emails pass/fail authentication\n• Potential spoofing attempts\n\nUse a DMARC analyzer tool to make sense of these reports.'
      }
    ],
    products: [
      {
        name: 'HostingInfo Email Marketing',
        description: 'DMARC setup and monitoring included',
        link: 'https://www.hostinginfo.gg/email-marketing'
      }
    ],
    resources: [
      { title: 'DMARC Analyzer', url: 'https://dmarcian.com/' }
    ]
  },

  'dns': {
    title: 'DNS Records',
    description: 'Domain Name System records that route traffic to your website',
    category: 'dns',
    importance: 'critical',
    whatItIs: 'DNS records are like a phone book for the internet - they tell browsers where to find your website.',
    whyItMatters: 'Incorrect DNS records mean your website will not load. Proper DNS configuration is essential for website availability and email delivery.',
    howToFix: 'Manage DNS records through your domain registrar or hosting provider. Common records include A (website), MX (email), and TXT (verification).',
    sections: [
      {
        title: 'Common DNS Record Types',
        content: 'A Record: Points domain to IPv4 address\nAAAA Record: Points domain to IPv6 address\nCNAME: Creates an alias to another domain\nMX Record: Specifies mail servers\nTXT Record: Stores text data (SPF, DKIM, verification)\nNS Record: Specifies nameservers'
      },
      {
        title: 'DNS Propagation',
        content: 'DNS changes take time to spread across the internet (usually 1-24 hours). This is called propagation. During this time, some users may see the old site and others the new one.'
      }
    ],
    products: [
      {
        name: 'HostingInfo DNS Management',
        description: 'Easy-to-use DNS editor with templates for common setups',
        link: 'https://www.hostinginfo.gg/help/dns'
      }
    ]
  },

  'performance': {
    title: 'Website Performance',
    description: 'How fast your website loads and responds to user interactions',
    category: 'performance',
    importance: 'high',
    whatItIs: 'Website performance measures how quickly your site loads and becomes interactive for users.',
    whyItMatters: 'Slow sites lose visitors and revenue. Google found that 53% of mobile users abandon sites that take over 3 seconds to load. Performance also affects SEO rankings.',
    howToFix: 'Optimize images, enable caching, use a CDN, minify code, and choose fast hosting. Start with the biggest issues first.',
    sections: [
      {
        title: 'Core Web Vitals',
        content: 'LCP (Largest Contentful Paint): How fast main content loads (target: <2.5s)\nFID (First Input Delay): How fast site responds to clicks (target: <100ms)\nCLS (Cumulative Layout Shift): How much content jumps around (target: <0.1)\n\nGoogle uses these metrics for search rankings.'
      },
      {
        title: 'Quick Wins',
        content: 'Image Optimization: Compress and resize images (biggest impact)\nBrowser Caching: Store files locally on repeat visits\nCDN: Serve files from servers close to users\nMinification: Remove unnecessary code characters\nLazy Loading: Load images only when needed'
      }
    ],
    products: [
      {
        name: 'Cloudflare',
        description: 'Free CDN with automatic optimization',
        link: 'https://www.cloudflare.com'
      },
      {
        name: 'GoDaddy Website Builder',
        description: 'Automatically optimized for performance',
        link: 'https://www.hostinginfo.gg/websites'
      }
    ],
    resources: [
      { title: 'PageSpeed Insights', url: 'https://pagespeed.web.dev/' },
      { title: 'GTmetrix', url: 'https://gtmetrix.com/' }
    ]
  }
};

// Helper function to get content by key
export function getEducationalContent(key: string): EducationalContent | null {
  return educationalContent[key] || null;
}
