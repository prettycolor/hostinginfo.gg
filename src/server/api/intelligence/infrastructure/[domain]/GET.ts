/**
 * GET /api/intelligence/infrastructure/:domain
 * 
 * Identify and attribute infrastructure providers for a domain
 * 
 * Returns:
 * - Hosting provider detection
 * - CDN identification
 * - Cloud platform recognition
 * - Email provider attribution
 * - DNS provider detection
 * - Infrastructure fingerprint
 * - Technology mapping
 * - Confidence scores
 */

import type { Request, Response } from 'express';
import { attributeInfrastructure } from '../../../../lib/infrastructure-attribution.js';
import { detectInfrastructure } from '../../../../lib/intelligence/infrastructure-attribution.js';

function normalizeDomainInput(rawDomain: string): string {
  let normalized = decodeURIComponent(rawDomain).trim().toLowerCase();
  normalized = normalized.replace(/^[a-z]+:\/\//i, '');
  normalized = normalized.split(/[/?#]/)[0] ?? normalized;
  normalized = normalized.replace(/^www\./, '').replace(/\.$/, '');
  return normalized;
}

function buildFallbackInfrastructure(domain: string, reason?: string) {
  return {
    domain,
    hostingProvider: {
      name: 'Unknown',
      type: 'unknown',
      confidence: 0,
    },
    cdnProvider: null,
    isSharedHosting: false,
    serverLocation: {
      city: 'Unknown',
      country: 'Unknown',
      region: 'Unknown',
    },
    notes: reason ? [reason] : [],
  };
}

export default async function handler(req: Request, res: Response) {
  const { domain } = req.params;

  if (!domain) {
    return res.status(400).json({ error: 'Domain parameter is required' });
  }

  const normalizedDomain = normalizeDomainInput(domain);
  if (!normalizedDomain) {
    return res.status(400).json({ error: 'Invalid domain parameter' });
  }

  // Primary path: legacy attribution engine.
  try {
    const attribution = await attributeInfrastructure(normalizedDomain);
    const firstOrg = attribution?.infrastructureFingerprint?.organizations?.[0] || 'Unknown';

    return res.json({
      ...attribution,
      domain: normalizedDomain,
      hostingProvider: {
        name: attribution?.hostingProvider?.name || 'Unknown',
        type: attribution?.hostingProvider?.type || 'unknown',
        confidence: attribution?.hostingProvider?.confidence || 0,
      },
      cdnProvider: attribution?.cdnProvider
        ? {
            name: attribution.cdnProvider.name,
            confidence: attribution.cdnProvider.confidence || 0,
          }
        : null,
      isSharedHosting: attribution?.hostingProvider?.tier === 'shared',
      serverLocation: {
        city: 'Unknown',
        country: 'Unknown',
        region: firstOrg,
      },
    });
  } catch (legacyError) {
    console.error('[Infrastructure API] Legacy attribution failed:', legacyError);
  }

  // Fallback path: newer detector that is more schema-aligned.
  try {
    const detected = await detectInfrastructure(normalizedDomain);
    if (detected) {
      const firstIp = detected.ipAddresses?.[0];
      return res.json({
        domain: normalizedDomain,
        hostingProvider: {
          name: detected.hostingProvider?.name || 'Unknown',
          type: detected.hostingProvider?.type || 'unknown',
          confidence: detected.hostingProvider?.confidence || 0,
        },
        cdnProvider: detected.cdnProvider
          ? {
              name: detected.cdnProvider.name,
              confidence: detected.cdnProvider.confidence || 0,
            }
          : null,
        isSharedHosting: Boolean(detected.sharedInfrastructure?.isShared),
        serverLocation: {
          city: 'Unknown',
          country: firstIp?.country || 'Unknown',
          region: firstIp?.organization || 'Unknown',
        },
        detectionMethods: detected.detectionMethods || [],
      });
    }
  } catch (fallbackError) {
    console.error('[Infrastructure API] Fallback detector failed:', fallbackError);
  }

  return res.json(
    buildFallbackInfrastructure(
      normalizedDomain,
      'No infrastructure attribution data available for this domain yet.'
    )
  );
}
