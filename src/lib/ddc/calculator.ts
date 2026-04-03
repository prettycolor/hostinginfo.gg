import type {
  Domain,
  DomainCalculation,
  SavingsResult,
  TimeFrame,
  PricingData,
} from '@/types/ddc';
import pricingData from '@/data/pricing.json';

const pricing = pricingData as PricingData;

function normalizeExtensionKey(extension: string): string {
  return extension.replace(/^\./, '').toLowerCase();
}

function resolveExtensionPricing(extension: string) {
  const normalized = normalizeExtensionKey(extension);
  return (
    pricing.extensions[normalized] ??
    pricing.extensions[extension] ??
    pricing.extensions[`.${normalized}`]
  );
}

function resolveMemberPrice(listPrice: number, tierPrice: unknown): number {
  const numericTierPrice =
    typeof tierPrice === 'number' ? tierPrice : Number(tierPrice);

  // Some extensions intentionally use 0/blank for a tier to mean
  // "no member discount available". In that case, member price should
  // fall back to list price (not free).
  if (!Number.isFinite(numericTierPrice) || numericTierPrice <= 0) {
    return listPrice;
  }

  return numericTierPrice;
}

/**
 * Calculate savings for a list of domains
 */
export function calculateSavings(
  domains: Domain[],
  years: TimeFrame = 1
): SavingsResult {
  const calculations: DomainCalculation[] = [];
  let supportedCount = 0;
  let unsupportedCount = 0;

  // Calculate per-domain pricing
  for (const domain of domains) {
    const extensionPricing = resolveExtensionPricing(domain.extension);

    if (extensionPricing) {
      supportedCount++;
      const listPrice = extensionPricing.list;
      const basicPrice = resolveMemberPrice(listPrice, extensionPricing.basic);
      const premiumPrice = resolveMemberPrice(listPrice, extensionPricing.premium);
      const proPrice = resolveMemberPrice(listPrice, extensionPricing.pro);

      calculations.push({
        ...domain,
        listPrice,
        basicPrice,
        premiumPrice,
        proPrice,
        basicSavings: listPrice - basicPrice,
        premiumSavings: listPrice - premiumPrice,
        proSavings: listPrice - proPrice,
        supported: true,
      });
    } else {
      unsupportedCount++;
      calculations.push({
        ...domain,
        listPrice: 0,
        basicPrice: 0,
        premiumPrice: 0,
        proPrice: 0,
        basicSavings: 0,
        premiumSavings: 0,
        proSavings: 0,
        supported: false,
      });
    }
  }

  // Calculate totals (only for supported domains)
  const supportedDomains = calculations.filter((d) => d.supported);

  const totalListPrice = supportedDomains.reduce((sum, d) => sum + d.listPrice, 0);
  const totalBasicPrice = supportedDomains.reduce((sum, d) => sum + d.basicPrice, 0);
  const totalPremiumPrice = supportedDomains.reduce((sum, d) => sum + d.premiumPrice, 0);
  const totalProPrice = supportedDomains.reduce((sum, d) => sum + d.proPrice, 0);

  // Calculate savings over time period
  const basicMembershipCost = pricing.memberships.basic.price * years;
  const premiumMembershipCost = pricing.memberships.premium.price * years;
  const proMembershipCost = pricing.memberships.pro.price * years;

  const basicGrossSavings = (totalListPrice - totalBasicPrice) * years;
  const premiumGrossSavings = (totalListPrice - totalPremiumPrice) * years;
  const proGrossSavings = (totalListPrice - totalProPrice) * years;

  return {
    domains: calculations,
    totalDomains: domains.length,
    supportedDomains: supportedCount,
    unsupportedDomains: unsupportedCount,
    basic: {
      totalListPrice: totalListPrice * years,
      totalMemberPrice: totalBasicPrice * years,
      grossSavings: basicGrossSavings,
      membershipCost: basicMembershipCost,
      netSavings: basicGrossSavings - basicMembershipCost,
    },
    premium: {
      totalListPrice: totalListPrice * years,
      totalMemberPrice: totalPremiumPrice * years,
      grossSavings: premiumGrossSavings,
      membershipCost: premiumMembershipCost,
      netSavings: premiumGrossSavings - premiumMembershipCost,
    },
    pro: {
      totalListPrice: totalListPrice * years,
      totalMemberPrice: totalProPrice * years,
      grossSavings: proGrossSavings,
      membershipCost: proMembershipCost,
      netSavings: proGrossSavings - proMembershipCost,
    },
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get pricing for a specific extension
 */
export function getExtensionPricing(extension: string) {
  return resolveExtensionPricing(extension) || null;
}

/**
 * Get all supported extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(pricing.extensions).sort();
}

/**
 * Check if extension is supported
 */
export function isExtensionSupported(extension: string): boolean {
  return Boolean(resolveExtensionPricing(extension));
}
