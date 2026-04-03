export interface Membership {
  name: string;
  price: number;
  description: string;
  features: string[];
}

export interface ExtensionPricing {
  list: number;
  basic: number;
  premium: number;
  pro: number;
}

export interface PricingData {
  memberships: {
    basic: Membership;
    premium: Membership;
    pro: Membership;
  };
  extensions: Record<string, ExtensionPricing>;
}

export interface Domain {
  full: string;
  name: string;
  extension: string;
}

export interface DomainCalculation extends Domain {
  listPrice: number;
  basicPrice: number;
  premiumPrice: number;
  proPrice: number;
  basicSavings: number;
  premiumSavings: number;
  proSavings: number;
  supported: boolean;
}

export interface SavingsResult {
  domains: DomainCalculation[];
  totalDomains: number;
  supportedDomains: number;
  unsupportedDomains: number;
  basic: {
    totalListPrice: number;
    totalMemberPrice: number;
    grossSavings: number;
    membershipCost: number;
    netSavings: number;
  };
  premium: {
    totalListPrice: number;
    totalMemberPrice: number;
    grossSavings: number;
    membershipCost: number;
    netSavings: number;
  };
  pro: {
    totalListPrice: number;
    totalMemberPrice: number;
    grossSavings: number;
    membershipCost: number;
    netSavings: number;
  };
}

export type TimeFrame = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
