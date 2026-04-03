/**
 * Domain Expiry Monitoring System
 * 
 * Monitors domain expiration dates and provides:
 * - 30/60/90 day expiry alerts
 * - Auto-renewal detection
 * - Registrar-specific expiry rules
 * - Grace period calculations
 * - Redemption period tracking
 */

import { db } from '../../db/client.js';
import { whoisRecords } from '../../db/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface ExpiryAlert {
  domain: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  alertLevel: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'expiring_soon' | 'expired' | 'in_grace_period' | 'in_redemption';
  registrar: string;
  autoRenewalEnabled?: boolean;
  gracePeriodEnds?: Date;
  redemptionPeriodEnds?: Date;
  recommendations: string[];
}

export interface RegistrarRules {
  name: string;
  gracePeriodDays: number; // Days after expiry to renew at normal price
  redemptionPeriodDays: number; // Days after grace period with higher fees
  autoRenewalDefault: boolean;
  transferLockDays: number; // Days before expiry when transfers are locked
}

/**
 * Registrar-specific expiry rules
 * Based on common industry practices
 */
const REGISTRAR_RULES: Record<string, RegistrarRules> = {
  'HostingInfo': {
    name: 'HostingInfo',
    gracePeriodDays: 0,
    redemptionPeriodDays: 30,
    autoRenewalDefault: true,
    transferLockDays: 7,
  },
  'Namecheap': {
    name: 'Namecheap',
    gracePeriodDays: 0,
    redemptionPeriodDays: 30,
    autoRenewalDefault: false,
    transferLockDays: 7,
  },
  'Google Domains': {
    name: 'Google Domains',
    gracePeriodDays: 0,
    redemptionPeriodDays: 30,
    autoRenewalDefault: true,
    transferLockDays: 5,
  },
  'Cloudflare': {
    name: 'Cloudflare',
    gracePeriodDays: 0,
    redemptionPeriodDays: 30,
    autoRenewalDefault: true,
    transferLockDays: 0,
  },
  'default': {
    name: 'Unknown Registrar',
    gracePeriodDays: 0,
    redemptionPeriodDays: 30,
    autoRenewalDefault: false,
    transferLockDays: 7,
  },
};

/**
 * Get registrar rules for a specific registrar
 */
function getRegistrarRules(registrar: string): RegistrarRules {
  // Try exact match first
  if (REGISTRAR_RULES[registrar]) {
    return REGISTRAR_RULES[registrar];
  }

  // Try partial match (case-insensitive)
  const registrarLower = registrar.toLowerCase();
  for (const [key, rules] of Object.entries(REGISTRAR_RULES)) {
    if (registrarLower.includes(key.toLowerCase())) {
      return rules;
    }
  }

  // Return default rules
  return REGISTRAR_RULES['default'];
}

/**
 * Calculate days until expiry
 */
function calculateDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Determine alert level based on days until expiry
 */
function getAlertLevel(daysUntilExpiry: number): 'critical' | 'high' | 'medium' | 'low' {
  if (daysUntilExpiry <= 0) return 'critical';
  if (daysUntilExpiry <= 30) return 'critical';
  if (daysUntilExpiry <= 60) return 'high';
  if (daysUntilExpiry <= 90) return 'medium';
  return 'low';
}

/**
 * Determine domain status based on expiry date and registrar rules
 */
function getDomainStatus(
  daysUntilExpiry: number,
  rules: RegistrarRules
): 'active' | 'expiring_soon' | 'expired' | 'in_grace_period' | 'in_redemption' {
  if (daysUntilExpiry > 90) return 'active';
  if (daysUntilExpiry > 0) return 'expiring_soon';
  
  const daysExpired = Math.abs(daysUntilExpiry);
  
  if (daysExpired <= rules.gracePeriodDays) return 'in_grace_period';
  if (daysExpired <= rules.gracePeriodDays + rules.redemptionPeriodDays) return 'in_redemption';
  
  return 'expired';
}

/**
 * Generate recommendations based on domain status
 */
function generateRecommendations(
  daysUntilExpiry: number,
  status: string,
  rules: RegistrarRules,
  autoRenewalEnabled: boolean
): string[] {
  const recommendations: string[] = [];

  if (status === 'expired' || status === 'in_redemption') {
    recommendations.push('⚠️ URGENT: Domain has expired. Contact registrar immediately.');
    recommendations.push('Redemption fees may apply. Act quickly to avoid losing the domain.');
    return recommendations;
  }

  if (status === 'in_grace_period') {
    recommendations.push('⚠️ Domain is in grace period. Renew now to avoid redemption fees.');
    return recommendations;
  }

  if (daysUntilExpiry <= 7) {
    recommendations.push('🚨 CRITICAL: Domain expires in less than 7 days!');
    if (!autoRenewalEnabled) {
      recommendations.push('Enable auto-renewal immediately or renew manually.');
    } else {
      recommendations.push('Verify auto-renewal is configured correctly.');
    }
  } else if (daysUntilExpiry <= 30) {
    recommendations.push('⚠️ Domain expires in less than 30 days.');
    if (!autoRenewalEnabled) {
      recommendations.push('Consider enabling auto-renewal to prevent expiration.');
    }
  } else if (daysUntilExpiry <= 60) {
    recommendations.push('Domain expires in less than 60 days.');
    recommendations.push('Review renewal settings and payment methods.');
  } else if (daysUntilExpiry <= 90) {
    recommendations.push('Domain expires in less than 90 days.');
    recommendations.push('Plan for renewal or consider multi-year registration.');
  }

  // Transfer lock warning
  if (daysUntilExpiry <= rules.transferLockDays && rules.transferLockDays > 0) {
    recommendations.push(`⚠️ Domain transfers may be locked within ${rules.transferLockDays} days of expiry.`);
  }

  return recommendations;
}

/**
 * Monitor a single domain's expiry status
 */
export async function monitorDomainExpiry(domain: string): Promise<ExpiryAlert | null> {
  try {
    // Get latest WHOIS record for domain
    const records = await db
      .select()
      .from(whoisRecords)
      .where(eq(whoisRecords.domain, domain))
      .orderBy(desc(whoisRecords.scannedAt))
      .limit(1);

    if (records.length === 0) {
      return null;
    }

    const record = records[0];

    if (!record.expiryDate) {
      return null;
    }

    const expiryDate = new Date(record.expiryDate);
    const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
    const registrar = record.registrar || 'Unknown';
    const rules = getRegistrarRules(registrar);
    const alertLevel = getAlertLevel(daysUntilExpiry);
    const status = getDomainStatus(daysUntilExpiry, rules);

    // Calculate grace and redemption period end dates
    let gracePeriodEnds: Date | undefined;
    let redemptionPeriodEnds: Date | undefined;

    if (daysUntilExpiry <= 0) {
      gracePeriodEnds = new Date(expiryDate);
      gracePeriodEnds.setDate(gracePeriodEnds.getDate() + rules.gracePeriodDays);

      redemptionPeriodEnds = new Date(gracePeriodEnds);
      redemptionPeriodEnds.setDate(redemptionPeriodEnds.getDate() + rules.redemptionPeriodDays);
    }

    // Detect auto-renewal (heuristic based on registrar defaults)
    const autoRenewalEnabled = rules.autoRenewalDefault;

    const recommendations = generateRecommendations(
      daysUntilExpiry,
      status,
      rules,
      autoRenewalEnabled
    );

    return {
      domain,
      expiryDate,
      daysUntilExpiry,
      alertLevel,
      status,
      registrar,
      autoRenewalEnabled,
      gracePeriodEnds,
      redemptionPeriodEnds,
      recommendations,
    };
  } catch (error) {
    console.error(`[Expiry Monitor] Error monitoring ${domain}:`, error);
    return null;
  }
}

/**
 * Get all domains expiring within a specified number of days
 */
export async function getExpiringDomains(withinDays: number = 90): Promise<ExpiryAlert[]> {
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    // Get all WHOIS records with expiration dates in range
    const records = await db
      .select()
      .from(whoisRecords)
      .where(
        and(
          gte(whoisRecords.expiryDate, now),
          lte(whoisRecords.expiryDate, futureDate)
        )
      )
      .orderBy(whoisRecords.expiryDate);

    const alerts: ExpiryAlert[] = [];

    for (const record of records) {
      const alert = await monitorDomainExpiry(record.domain);
      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  } catch (error) {
    console.error('[Expiry Monitor] Error getting expiring domains:', error);
    return [];
  }
}

/**
 * Get domains by alert level
 */
export async function getDomainsByAlertLevel(
  level: 'critical' | 'high' | 'medium' | 'low'
): Promise<ExpiryAlert[]> {
  const allAlerts = await getExpiringDomains(365); // Check all domains within a year
  return allAlerts.filter(alert => alert.alertLevel === level);
}

/**
 * Get summary statistics for domain expiry monitoring
 */
export async function getExpirySummary() {
  try {
    const allAlerts = await getExpiringDomains(365);

    const summary = {
      total: allAlerts.length,
      critical: allAlerts.filter(a => a.alertLevel === 'critical').length,
      high: allAlerts.filter(a => a.alertLevel === 'high').length,
      medium: allAlerts.filter(a => a.alertLevel === 'medium').length,
      low: allAlerts.filter(a => a.alertLevel === 'low').length,
      expiring30Days: allAlerts.filter(a => a.daysUntilExpiry <= 30 && a.daysUntilExpiry > 0).length,
      expiring60Days: allAlerts.filter(a => a.daysUntilExpiry <= 60 && a.daysUntilExpiry > 0).length,
      expiring90Days: allAlerts.filter(a => a.daysUntilExpiry <= 90 && a.daysUntilExpiry > 0).length,
      expired: allAlerts.filter(a => a.status === 'expired').length,
      inGracePeriod: allAlerts.filter(a => a.status === 'in_grace_period').length,
      inRedemption: allAlerts.filter(a => a.status === 'in_redemption').length,
      autoRenewalEnabled: allAlerts.filter(a => a.autoRenewalEnabled).length,
    };

    return summary;
  } catch (error) {
    console.error('[Expiry Monitor] Error getting summary:', error);
    return null;
  }
}
