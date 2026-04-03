import type { Domain } from '@/types/ddc';

/**
 * Extract domains from any text input
 * Handles URLs, plain domains, comma/semicolon separated lists, etc.
 */
export function extractDomains(text: string): Domain[] {
  if (!text || text.trim() === '') {
    return [];
  }

  // Domain regex pattern - matches domain.tld format
  // Supports multi-level TLDs like .co.uk, .com.au
  const domainPattern =
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/gi;

  const matches = text.matchAll(domainPattern);
  const domains: Domain[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const fullDomain = match[1].toLowerCase();

    // Skip if already processed
    if (seen.has(fullDomain)) {
      continue;
    }
    seen.add(fullDomain);

    // Extract extension (handle multi-level TLDs)
    const parts = fullDomain.split('.');
    let extension = '';
    let name = '';

    // Handle multi-level TLDs (.co.uk, .com.au, etc.)
    if (parts.length >= 3) {
      const lastTwo = `.${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
      // Check if it's a known multi-level TLD
      if (
        lastTwo === '.co.uk' ||
        lastTwo === '.com.au' ||
        lastTwo === '.co.nz' ||
        lastTwo === '.co.za'
      ) {
        extension = lastTwo;
        name = parts.slice(0, -2).join('.');
      } else {
        extension = `.${parts[parts.length - 1]}`;
        name = parts.slice(0, -1).join('.');
      }
    } else if (parts.length === 2) {
      extension = `.${parts[1]}`;
      name = parts[0];
    } else {
      // Invalid domain
      continue;
    }

    domains.push({
      full: fullDomain,
      name,
      extension,
    });
  }

  return domains;
}

/**
 * Validate if a string looks like a domain
 */
export function isDomain(text: string): boolean {
  const domainPattern = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return domainPattern.test(text.trim());
}

/**
 * Clean and normalize domain input
 */
export function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/^www\./, '') // Remove www
    .replace(/\/.*$/, '') // Remove path
    .trim();
}
