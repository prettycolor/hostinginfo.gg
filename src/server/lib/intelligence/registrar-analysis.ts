/**
 * Registrar Analysis Engine
 * 
 * Provides:
 * - Registrar reputation scoring
 * - Transfer recommendations
 * - Pricing analysis
 * - Feature comparisons
 * - Security ratings
 */

import { db } from '../../db/client.js';
import { whoisRecords } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export interface RegistrarProfile {
  name: string;
  ianaId?: number;
  reputationScore: number; // 0-100
  securityRating: 'excellent' | 'good' | 'fair' | 'poor';
  pricingTier: 'budget' | 'mid-range' | 'premium';
  features: {
    freePrivacy: boolean;
    freeDNS: boolean;
    freeEmail: boolean;
    twoFactorAuth: boolean;
    apiAccess: boolean;
    bulkManagement: boolean;
  };
  strengths: string[];
  weaknesses: string[];
  averageRenewalPrice?: number;
  transferPrice?: number;
  supportQuality: 'excellent' | 'good' | 'fair' | 'poor';
  marketShare?: number; // Percentage
}

export interface TransferRecommendation {
  currentRegistrar: string;
  recommendedRegistrar: string;
  confidence: number; // 0-100
  reasons: string[];
  estimatedSavings?: number;
  transferSteps: string[];
  warnings: string[];
}

/**
 * Registrar profiles with reputation and features
 * Based on industry data and user reviews
 */
const REGISTRAR_PROFILES: Record<string, RegistrarProfile> = {
  'GoDaddy': {
    name: 'GoDaddy',
    ianaId: 146,
    reputationScore: 75,
    securityRating: 'good',
    pricingTier: 'mid-range',
    features: {
      freePrivacy: false,
      freeDNS: true,
      freeEmail: false,
      twoFactorAuth: true,
      apiAccess: true,
      bulkManagement: true,
    },
    strengths: [
      'Large market share and established reputation',
      'Comprehensive product ecosystem',
      'Good API and developer tools',
      'Strong security features',
    ],
    weaknesses: [
      'Privacy protection costs extra',
      'Aggressive upselling',
      'Higher renewal prices',
    ],
    averageRenewalPrice: 17.99,
    transferPrice: 17.99,
    supportQuality: 'good',
    marketShare: 18.5,
  },
  'Namecheap': {
    name: 'Namecheap',
    ianaId: 1068,
    reputationScore: 85,
    securityRating: 'excellent',
    pricingTier: 'budget',
    features: {
      freePrivacy: true,
      freeDNS: true,
      freeEmail: false,
      twoFactorAuth: true,
      apiAccess: true,
      bulkManagement: true,
    },
    strengths: [
      'Free WHOIS privacy protection',
      'Competitive pricing',
      'Strong security focus',
      'Good customer support',
    ],
    weaknesses: [
      'Smaller market share',
      'Limited product ecosystem',
    ],
    averageRenewalPrice: 13.98,
    transferPrice: 9.98,
    supportQuality: 'excellent',
    marketShare: 5.2,
  },
  'Cloudflare': {
    name: 'Cloudflare',
    ianaId: 1910,
    reputationScore: 90,
    securityRating: 'excellent',
    pricingTier: 'budget',
    features: {
      freePrivacy: true,
      freeDNS: true,
      freeEmail: false,
      twoFactorAuth: true,
      apiAccess: true,
      bulkManagement: true,
    },
    strengths: [
      'At-cost pricing (no markup)',
      'Free WHOIS privacy',
      'Integrated with Cloudflare CDN',
      'Excellent security',
    ],
    weaknesses: [
      'Limited TLD support',
      'Requires Cloudflare account',
      'No phone support',
    ],
    averageRenewalPrice: 8.57,
    transferPrice: 8.57,
    supportQuality: 'good',
    marketShare: 2.1,
  },
  'Google Domains': {
    name: 'Google Domains',
    ianaId: 895,
    reputationScore: 88,
    securityRating: 'excellent',
    pricingTier: 'mid-range',
    features: {
      freePrivacy: true,
      freeDNS: true,
      freeEmail: true,
      twoFactorAuth: true,
      apiAccess: false,
      bulkManagement: false,
    },
    strengths: [
      'Free privacy protection',
      'Free email forwarding',
      'Simple, clean interface',
      'Google integration',
    ],
    weaknesses: [
      'Limited API access',
      'Smaller TLD selection',
      'Being acquired by Squarespace',
    ],
    averageRenewalPrice: 12.00,
    transferPrice: 12.00,
    supportQuality: 'fair',
    marketShare: 3.8,
  },
  'Porkbun': {
    name: 'Porkbun',
    ianaId: 1861,
    reputationScore: 87,
    securityRating: 'excellent',
    pricingTier: 'budget',
    features: {
      freePrivacy: true,
      freeDNS: true,
      freeEmail: false,
      twoFactorAuth: true,
      apiAccess: true,
      bulkManagement: true,
    },
    strengths: [
      'Very competitive pricing',
      'Free WHOIS privacy',
      'Good API',
      'Transparent pricing',
    ],
    weaknesses: [
      'Smaller company',
      'Limited brand recognition',
    ],
    averageRenewalPrice: 9.13,
    transferPrice: 9.13,
    supportQuality: 'good',
    marketShare: 0.8,
  },
};

/**
 * Get registrar profile by name
 */
export function getRegistrarProfile(registrar: string): RegistrarProfile | null {
  // Try exact match
  if (REGISTRAR_PROFILES[registrar]) {
    return REGISTRAR_PROFILES[registrar];
  }

  // Try partial match (case-insensitive)
  const registrarLower = registrar.toLowerCase();
  for (const [key, profile] of Object.entries(REGISTRAR_PROFILES)) {
    if (registrarLower.includes(key.toLowerCase())) {
      return profile;
    }
  }

  return null;
}

/**
 * Analyze a registrar and provide recommendations
 */
export async function analyzeRegistrar(registrar: string): Promise<{
  profile: RegistrarProfile | null;
  domainCount: number;
  recommendations: string[];
}> {
  const profile = getRegistrarProfile(registrar);

  // Count domains with this registrar
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(whoisRecords)
    .where(eq(whoisRecords.registrar, registrar));

  const domainCount = Number(result[0]?.count || 0);

  const recommendations: string[] = [];

  if (profile) {
    // Generate recommendations based on profile
    if (profile.reputationScore < 70) {
      recommendations.push('⚠️ Consider transferring to a higher-rated registrar');
    }

    if (!profile.features.freePrivacy) {
      recommendations.push('💡 Switch to a registrar with free WHOIS privacy protection');
    }

    if (profile.pricingTier === 'premium') {
      recommendations.push('💰 Consider budget-friendly alternatives to save on renewals');
    }

    if (!profile.features.twoFactorAuth) {
      recommendations.push('🔒 Enable two-factor authentication for better security');
    }
  } else {
    recommendations.push('ℹ️ Unknown registrar - consider transferring to a well-known provider');
  }

  return {
    profile,
    domainCount,
    recommendations,
  };
}

/**
 * Get transfer recommendation for a domain
 */
export async function getTransferRecommendation(
  currentRegistrar: string
): Promise<TransferRecommendation | null> {
  const currentProfile = getRegistrarProfile(currentRegistrar);

  if (!currentProfile) {
    return null;
  }

  // Find best alternative registrar
  let bestRegistrar: RegistrarProfile | null = null;
  let bestScore = 0;

  for (const profile of Object.values(REGISTRAR_PROFILES)) {
    if (profile.name === currentProfile.name) continue;

    // Calculate score based on multiple factors
    let score = profile.reputationScore;

    // Bonus for free privacy
    if (profile.features.freePrivacy && !currentProfile.features.freePrivacy) {
      score += 10;
    }

    // Bonus for better pricing
    if (profile.averageRenewalPrice && currentProfile.averageRenewalPrice) {
      const savings = currentProfile.averageRenewalPrice - profile.averageRenewalPrice;
      if (savings > 0) {
        score += Math.min(savings * 2, 15); // Up to 15 bonus points
      }
    }

    // Bonus for better security
    if (profile.securityRating === 'excellent' && currentProfile.securityRating !== 'excellent') {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRegistrar = profile;
    }
  }

  if (!bestRegistrar) {
    return null;
  }

  const reasons: string[] = [];
  const warnings: string[] = [];

  // Build reasons for recommendation
  if (bestRegistrar.reputationScore > currentProfile.reputationScore) {
    reasons.push(`Higher reputation score (${bestRegistrar.reputationScore} vs ${currentProfile.reputationScore})`);
  }

  if (bestRegistrar.features.freePrivacy && !currentProfile.features.freePrivacy) {
    reasons.push('Free WHOIS privacy protection included');
  }

  let estimatedSavings: number | undefined;
  if (bestRegistrar.averageRenewalPrice && currentProfile.averageRenewalPrice) {
    const savings = currentProfile.averageRenewalPrice - bestRegistrar.averageRenewalPrice;
    if (savings > 0) {
      estimatedSavings = savings;
      reasons.push(`Save $${savings.toFixed(2)}/year per domain`);
    }
  }

  if (bestRegistrar.securityRating === 'excellent' && currentProfile.securityRating !== 'excellent') {
    reasons.push('Better security features and ratings');
  }

  // Add warnings
  warnings.push('Ensure domain is unlocked before initiating transfer');
  warnings.push('Transfer may take 5-7 days to complete');
  warnings.push('Domain must be at least 60 days old');
  warnings.push('Renewal will be added (1 year) upon transfer');

  const transferSteps = [
    '1. Unlock domain at current registrar',
    '2. Disable WHOIS privacy temporarily',
    '3. Request authorization/EPP code',
    '4. Initiate transfer at new registrar',
    '5. Approve transfer via email',
    '6. Wait for transfer completion (5-7 days)',
    '7. Re-enable WHOIS privacy at new registrar',
  ];

  return {
    currentRegistrar: currentProfile.name,
    recommendedRegistrar: bestRegistrar.name,
    confidence: Math.min(bestScore, 100),
    reasons,
    estimatedSavings,
    transferSteps,
    warnings,
  };
}

/**
 * Compare multiple registrars
 */
export function compareRegistrars(registrarNames: string[]): {
  registrars: (RegistrarProfile | null)[];
  comparison: {
    bestPrice: string;
    bestSecurity: string;
    bestFeatures: string;
    bestSupport: string;
  };
} {
  const registrars = registrarNames.map(name => getRegistrarProfile(name));
  const validRegistrars = registrars.filter(r => r !== null) as RegistrarProfile[];

  let bestPrice = validRegistrars[0];
  let bestSecurity = validRegistrars[0];
  let bestFeatures = validRegistrars[0];
  let bestSupport = validRegistrars[0];

  for (const registrar of validRegistrars) {
    if (registrar.averageRenewalPrice && bestPrice.averageRenewalPrice) {
      if (registrar.averageRenewalPrice < bestPrice.averageRenewalPrice) {
        bestPrice = registrar;
      }
    }

    if (registrar.securityRating === 'excellent' && bestSecurity.securityRating !== 'excellent') {
      bestSecurity = registrar;
    }

    const featureCount = Object.values(registrar.features).filter(Boolean).length;
    const bestFeatureCount = Object.values(bestFeatures.features).filter(Boolean).length;
    if (featureCount > bestFeatureCount) {
      bestFeatures = registrar;
    }

    if (registrar.supportQuality === 'excellent' && bestSupport.supportQuality !== 'excellent') {
      bestSupport = registrar;
    }
  }

  return {
    registrars,
    comparison: {
      bestPrice: bestPrice.name,
      bestSecurity: bestSecurity.name,
      bestFeatures: bestFeatures.name,
      bestSupport: bestSupport.name,
    },
  };
}

/**
 * Get registrar market analysis
 */
export async function getRegistrarMarketAnalysis() {
  try {
    // Get all registrars from database
    const registrars = await db
      .select({
        registrar: whoisRecords.registrar,
        count: sql<number>`count(*)`
      })
      .from(whoisRecords)
      .groupBy(whoisRecords.registrar)
      .orderBy(sql`count(*) DESC`);

    const totalDomains = registrars.reduce((sum, r) => sum + Number(r.count), 0);

    const analysis = registrars.map(r => {
      const profile = getRegistrarProfile(r.registrar || 'Unknown');
      const domainCount = Number(r.count);
      const percentage = totalDomains > 0 ? (domainCount / totalDomains) * 100 : 0;

      return {
        registrar: r.registrar || 'Unknown',
        domainCount,
        percentage: Math.round(percentage * 10) / 10,
        profile: profile ? {
          reputationScore: profile.reputationScore,
          securityRating: profile.securityRating,
          pricingTier: profile.pricingTier,
        } : null,
      };
    });

    return {
      totalDomains,
      registrarCount: registrars.length,
      distribution: analysis,
    };
  } catch (error) {
    console.error('[Registrar Analysis] Error getting market analysis:', error);
    return null;
  }
}
