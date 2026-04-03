/**
 * Leveling System Integration
 * 
 * Helper functions to award XP and track stats from various user actions.
 * Call these functions after completing scans, verifying domains, etc.
 */

import { XP_REWARDS } from './leveling-system';
import { showAchievementToast, showLevelUpToast, showXpToast } from '@/components/AchievementToast';

interface AwardXpResponse {
  success: boolean;
  xpAwarded: number;
  newTotalXp: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newAchievements: Array<{
    title: string;
    description: string;
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    xpReward: number;
  }>;
}

function getJsonAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Award XP for a security scan
 */
export async function awardSecurityScanXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.SECURITY_SCAN,
        source: 'security_scan',
        description: `Security scan: ${domain}`,
        metadata: { domain },
        statUpdates: {
          totalScans: 1,
          securityScans: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'Security Scan');
    }
  } catch (error) {
    console.error('Failed to award security scan XP:', error);
  }
}

/**
 * Award XP for a performance scan
 */
export async function awardPerformanceScanXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.PERFORMANCE_SCAN,
        source: 'performance_scan',
        description: `Performance scan: ${domain}`,
        metadata: { domain },
        statUpdates: {
          totalScans: 1,
          performanceScans: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'Performance Scan');
    }
  } catch (error) {
    console.error('Failed to award performance scan XP:', error);
  }
}

/**
 * Award XP for a DNS scan
 */
export async function awardDnsScanXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.DNS_SCAN,
        source: 'dns_scan',
        description: `DNS scan: ${domain}`,
        metadata: { domain },
        statUpdates: {
          totalScans: 1,
          dnsScans: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'DNS Scan');
    }
  } catch (error) {
    console.error('Failed to award DNS scan XP:', error);
  }
}

/**
 * Award XP for a WHOIS scan
 */
export async function awardWhoisScanXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.WHOIS_SCAN,
        source: 'whois_scan',
        description: `WHOIS scan: ${domain}`,
        metadata: { domain },
        statUpdates: {
          totalScans: 1,
          whoisScans: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'WHOIS Scan');
    }
  } catch (error) {
    console.error('Failed to award WHOIS scan XP:', error);
  }
}

/**
 * Award XP for an SSL scan
 */
export async function awardSslScanXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.SSL_SCAN,
        source: 'ssl_scan',
        description: `SSL scan: ${domain}`,
        metadata: { domain },
        statUpdates: {
          totalScans: 1,
          sslScans: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'SSL Scan');
    }
  } catch (error) {
    console.error('Failed to award SSL scan XP:', error);
  }
}

/**
 * Award XP for an email security scan
 */
export async function awardEmailScanXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.EMAIL_SCAN,
        source: 'email_scan',
        description: `Email scan: ${domain}`,
        metadata: { domain },
        statUpdates: {
          totalScans: 1,
          emailScans: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'Email Scan');
    }
  } catch (error) {
    console.error('Failed to award email scan XP:', error);
  }
}

/**
 * Award XP for a malware scan
 */
export async function awardMalwareScanXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.MALWARE_SCAN,
        source: 'malware_scan',
        description: `Malware scan: ${domain}`,
        metadata: { domain },
        statUpdates: {
          totalScans: 1,
          malwareScans: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'Malware Scan');
    }
  } catch (error) {
    console.error('Failed to award malware scan XP:', error);
  }
}

/**
 * Award XP for a full scan (all scan types combined)
 */
export async function awardFullScanXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.FULL_SCAN,
        source: 'full_scan',
        description: `Full scan: ${domain}`,
        metadata: { domain },
        statUpdates: {
          totalScans: 1,
          securityScans: 1,
          performanceScans: 1,
          dnsScans: 1,
          sslScans: 1,
          emailScans: 1,
          malwareScans: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'Full Scan');
    }
  } catch (error) {
    console.error('Failed to award full scan XP:', error);
  }
}

/**
 * Award XP for verifying a domain
 */
export async function awardDomainVerifiedXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.DOMAIN_VERIFIED,
        source: 'domain_verified',
        description: `Domain verified: ${domain}`,
        metadata: { domain },
        statUpdates: {
          domainsVerified: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'Domain Verified');
    }
  } catch (error) {
    console.error('Failed to award domain verified XP:', error);
  }
}

/**
 * Award XP for enabling domain monitoring
 */
export async function awardDomainMonitoredXp(domain: string): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.DOMAIN_MONITORED,
        source: 'domain_monitored',
        description: `Domain monitoring enabled: ${domain}`,
        metadata: { domain },
        statUpdates: {
          domainsMonitored: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'Domain Monitoring');
    }
  } catch (error) {
    console.error('Failed to award domain monitored XP:', error);
  }
}

/**
 * Award XP for exporting a PDF report
 */
export async function awardPdfExportXp(): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.PDF_EXPORT,
        source: 'pdf_export',
        description: 'PDF report exported',
        statUpdates: {
          pdfExports: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'PDF Export');
    }
  } catch (error) {
    console.error('Failed to award PDF export XP:', error);
  }
}

/**
 * Award XP for using AI insights
 */
export async function awardAiInsightsXp(): Promise<void> {
  try {
    const response = await fetch('/api/leveling/award-xp', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        xpAmount: XP_REWARDS.AI_INSIGHTS,
        source: 'ai_insights',
        description: 'AI Insights generated',
        statUpdates: {
          aiInsightsUsed: 1,
        },
      }),
    });

    if (response.ok) {
      const data: AwardXpResponse = await response.json();
      handleXpResponse(data, 'AI Insights');
    }
  } catch (error) {
    console.error('Failed to award AI insights XP:', error);
  }
}

/**
 * Handle XP award response and show appropriate notifications
 */
function handleXpResponse(data: AwardXpResponse, source: string): void {
  // Show XP toast
  showXpToast(data.xpAwarded, source);

  // Show level up notification
  if (data.leveledUp) {
    // Get level title from the response or calculate it
    // For now, just show the level number
    showLevelUpToast(data.newLevel, `Level ${data.newLevel}`);
  }

  // Show achievement notifications
  if (data.newAchievements && data.newAchievements.length > 0) {
    // Show achievements with a slight delay between each
    data.newAchievements.forEach((achievement, index) => {
      setTimeout(() => {
        showAchievementToast(achievement);
      }, (index + 1) * 1000); // 1 second delay between each achievement
    });
  }
}

