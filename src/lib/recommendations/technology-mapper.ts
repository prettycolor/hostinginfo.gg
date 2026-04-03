/**
 * Technology Detection Mapper
 * 
 * Maps technology scan API response to recommendation system types.
 * Handles detection of:
 * - Website builders (Wix, Shopify, etc.)
 * - Managed WordPress (WP Engine, Kinsta, etc.)
 * - Self-hosted WordPress on cPanel/Apache/Nginx
 * - Custom PHP sites
 * - Static sites
 */

import type { TechnologyResult } from './types';

/**
 * API response structure from /api/scan/technology
 */
interface TechnologyAPIResponse {
  wordpress: {
    detected: boolean;
    version: string | null;
    plugins?: string[];
    isWooCommerce?: boolean;
  };
  php: {
    detected: boolean;
    version: string | null;
  };
  server: {
    type: string; // "apache", "nginx", "litespeed", "iis", "managed-wordpress", "website-builder", "unknown"
    isWebsiteBuilder: boolean;
    builderType: string | null; // "Wix", "Shopify", "Squarespace", etc.
  };
  hosting: {
    provider: string; // "WP Engine", "Kinsta", "Unknown", etc.
    type: 'managed' | 'cpanel' | 'unknown';
    isManagedWordPress: boolean;
  };
  controlPanel: {
    recommendation: 'cpanel' | 'managed-upgrade' | 'needs-updates' | 'paid-support' | 'unknown';
    reason: string;
    confidence: number;
  };
}

/**
 * Map technology API response to recommendation system types
 */
export function mapTechnologyData(apiResponse: TechnologyAPIResponse): TechnologyResult {
  const { wordpress, php, server, hosting, controlPanel } = apiResponse;

  // Determine if this is a website builder
  const isWebsiteBuilder = server.isWebsiteBuilder;
  const builderType = server.builderType || undefined;

  // Determine if this is WordPress
  const isWordPress = wordpress.detected;
  
  // Determine WordPress hosting type
  let wordPressType: 'managed' | 'self-hosted' | 'unknown' = 'unknown';
  let wordPressHost: string | undefined = undefined;
  
  if (isWordPress) {
    if (hosting.isManagedWordPress) {
      wordPressType = 'managed';
      wordPressHost = hosting.provider !== 'Unknown' ? hosting.provider : undefined;
    } else if (hosting.type === 'cpanel') {
      wordPressType = 'self-hosted';
    } else {
      wordPressType = 'unknown';
    }
  }

  // Determine server type
  let serverType: 'apache' | 'nginx' | 'iis' | 'litespeed' | 'unknown' = 'unknown';
  if (server.type === 'apache') serverType = 'apache';
  else if (server.type === 'nginx') serverType = 'nginx';
  else if (server.type === 'litespeed') serverType = 'litespeed';
  else if (server.type === 'iis' || server.type === 'microsoft-iis') serverType = 'iis';
  else if (server.type === 'managed-wordpress') {
    // Managed WordPress typically uses nginx
    serverType = 'nginx';
  }

  // Normalize control panel recommendation into TechnologyResult shape
  let controlPanelRecommendation: NonNullable<TechnologyResult['controlPanel']>['recommendation'] =
    controlPanel.recommendation;
  if (hosting.type === 'cpanel') {
    controlPanelRecommendation = 'cpanel';
  } else if (hosting.type === 'managed' || isWebsiteBuilder) {
    controlPanelRecommendation = 'unknown';
  }

  const controlPanelData: NonNullable<TechnologyResult['controlPanel']> = {
    recommendation: controlPanelRecommendation,
    reason: controlPanel.reason,
    confidence: controlPanel.confidence,
  };

  // Determine primary language
  let primaryLanguage: 'php' | 'javascript' | 'python' | 'ruby' | 'asp.net' | 'unknown' = 'unknown';
  if (php.detected) {
    primaryLanguage = 'php';
  } else if (serverType === 'iis') {
    primaryLanguage = 'asp.net';
  } else if (!isWordPress && !isWebsiteBuilder) {
    // Likely a static site or JavaScript app
    primaryLanguage = 'javascript';
  }

  // Determine if static site
  const isStaticSite = !isWordPress && !php.detected && !isWebsiteBuilder && primaryLanguage === 'javascript';

  // Build result
  const result: TechnologyResult = {
    // Platform detection
    isWebsiteBuilder,
    builderType,
    platform: isWordPress ? 'WordPress' : undefined,
    cms: isWordPress ? 'WordPress' : undefined,
    version: wordpress.version || undefined,
    
    // WordPress-specific
    isWordPress,
    wordPressType,
    wordPressHost,
    
    // Server environment
    serverType,
    controlPanel: controlPanelData,
    
    // Language detection
    primaryLanguage,
    isStaticSite,
    
    // Software versions
    phpVersion: php.version || undefined,
    frameworks: [],
    libraries: [],
  };

  return result;
}

/**
 * Helper: Detect if site needs cPanel-specific recommendations
 */
export function needsCPanelRecommendations(tech: TechnologyResult): boolean {
  return (
    tech.controlPanel?.recommendation === 'cpanel' &&
    !tech.isWebsiteBuilder &&
    tech.wordPressType !== 'managed'
  );
}

/**
 * Helper: Detect if site is managed WordPress
 */
export function isManagedWordPress(tech: TechnologyResult): boolean {
  return tech.isWordPress === true && tech.wordPressType === 'managed';
}

/**
 * Helper: Detect if site is self-hosted WordPress
 */
export function isSelfHostedWordPress(tech: TechnologyResult): boolean {
  return tech.isWordPress === true && tech.wordPressType === 'self-hosted';
}

/**
 * Helper: Detect if site is on Apache
 */
export function isApacheServer(tech: TechnologyResult): boolean {
  return tech.serverType === 'apache';
}

/**
 * Helper: Get hosting environment description
 */
export function getHostingEnvironmentDescription(tech: TechnologyResult): string {
  if (tech.isWebsiteBuilder) {
    return `${tech.builderType ?? 'Unknown Builder'} (Website Builder)`;
  }
  
  if (tech.isWordPress) {
    if (tech.wordPressType === 'managed') {
      return `Managed WordPress${tech.wordPressHost ? ` (${tech.wordPressHost})` : ''}`;
    } else if (tech.wordPressType === 'self-hosted') {
      const serverType = tech.serverType ?? tech.server?.type ?? 'unknown';
      const server = serverType !== 'unknown' ? serverType.toUpperCase() : 'Unknown Server';
      const panel = tech.controlPanel?.recommendation === 'cpanel' ? ' with cPanel' : '';
      return `Self-Hosted WordPress on ${server}${panel}`;
    }
  }
  
  if (tech.isStaticSite) {
    return 'Static Site (HTML/CSS/JS)';
  }
  
  if (tech.primaryLanguage === 'php') {
    const serverType = tech.serverType ?? tech.server?.type ?? 'unknown';
    const server = serverType !== 'unknown' ? serverType.toUpperCase() : 'Unknown Server';
    return `Custom PHP Site on ${server}`;
  }
  
  return 'Unknown Environment';
}
