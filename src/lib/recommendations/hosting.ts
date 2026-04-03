/**
 * Hosting Recommendations Module
 *
 * Generates recommendations for managed WordPress hosting migration
 * based on WordPress version, PHP version, and server type.
 *
 * Migration Standards:
 * - WordPress >= 6.6
 * - PHP >= 7.4
 * - Server: Apache, Nginx, or LiteSpeed (traditional hosting)
 */

import type { ActionStep, Recommendation, ComprehensiveScanData } from './types';

function toActionSteps(steps: string[]): ActionStep[] {
  return steps.map((description, index) => ({
    step: index + 1,
    description,
  }));
}

export function generateHostingRecommendations(
  data: ComprehensiveScanData
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const technology = data.technology;
  const wordpress = technology?.wordpress;
  const php = technology?.php;
  const server = technology?.server;

  // Skip if not WordPress
  if (!wordpress?.detected) {
    return recommendations;
  }

  // Skip if website builder (already platform-managed)
  if (server?.isWebsiteBuilder || technology?.isWebsiteBuilder) {
    return recommendations;
  }

  // Skip if already on managed WordPress hosting
  if (technology?.hosting?.isManagedWordPress) {
    return recommendations;
  }

  // Skip if not on traditional hosting (Apache, Nginx, LiteSpeed)
  const isTraditionalHosting =
    server?.type === 'apache' ||
    server?.type === 'nginx' ||
    server?.type === 'litespeed';

  if (!isTraditionalHosting) {
    return recommendations;
  }

  // Parse versions
  const wpVersion = wordpress.version
    ? parseFloat(wordpress.version.split('.').slice(0, 2).join('.'))
    : 0;
  const phpVersionNum = php?.version
    ? parseFloat(php.version.split('.').slice(0, 2).join('.'))
    : 0;

  // Check migration standards
  const meetsWPStandard = wpVersion >= 6.6;
  const meetsPHPStandard = phpVersionNum >= 7.4;

  // Check if needs updates
  const needsWPUpdate = wpVersion > 0 && wpVersion >= 5.0 && wpVersion < 6.6;
  const needsPHPUpdate =
    phpVersionNum > 0 && phpVersionNum >= 7.0 && phpVersionNum < 7.4;

  // Check if too old
  const isTooOldWP = wpVersion > 0 && wpVersion < 5.0;
  const isTooOldPHP = phpVersionNum > 0 && phpVersionNum < 7.0;

  // SCENARIO 1: Perfect Candidate (WP >= 6.6, PHP >= 7.4)
  if (meetsWPStandard && meetsPHPStandard) {
    recommendations.push({
      id: 'hosting-managed-wordpress-migration',
      category: 'Infrastructure',
      priority: 'high',
      title: 'Migrate to Managed WordPress Hosting',
      issue: `WordPress ${wordpress.version ?? 'unknown'} and PHP ${php?.version ?? 'unknown'} already meet migration standards.`,
      impact:
        'High impact on performance, security, and maintenance effort through managed infrastructure.',
      recommendation:
        'Plan a managed WordPress migration and run a full post-migration validation.',
      actionSteps: toActionSteps([
        'Review your current hosting plan and create a full backup.',
        'Choose a managed WordPress provider and prepare the target environment.',
        'Run migration tooling or request professional migration support.',
        'Test site functionality, logins, plugins, and forms in staging.',
        'Cut over DNS and monitor traffic and errors after launch.',
      ]),
      estimatedTime: '1-2 hours',
      difficulty: 'medium',
      resources: [
        {
          title: 'WordPress Migration Guide',
          url: 'https://wordpress.org/documentation/article/moving-wordpress/',
          type: 'documentation',
        },
      ],
      tags: ['hosting', 'wordpress', 'migration', 'managed-hosting'],
      skipForWebsiteBuilders: true,
    });
  }
  // SCENARIO 2: Needs Updates (WP 5.0-6.5 or PHP 7.0-7.3)
  else if (needsWPUpdate || needsPHPUpdate) {
    const updatesList: string[] = [];

    if (needsWPUpdate) {
      updatesList.push(`update WordPress from ${wordpress.version} to 6.6 or higher`);
    }
    if (needsPHPUpdate) {
      updatesList.push(`upgrade PHP from ${php?.version} to 7.4 or higher`);
    }

    const scenarioSteps: string[] = [
      'Create a complete backup before any updates.',
    ];

    if (needsWPUpdate) {
      scenarioSteps.push(
        `Update WordPress from ${wordpress.version} to 6.6+ and validate core site behavior.`
      );
    }

    if (needsPHPUpdate) {
      scenarioSteps.push(
        `Upgrade PHP from ${php?.version} to 7.4+ through your host control panel and run compatibility checks.`
      );
    }

    scenarioSteps.push('Re-scan to verify migration eligibility after updates.');
    scenarioSteps.push('Proceed with managed WordPress migration once standards are met.');

    recommendations.push({
      id: 'hosting-update-before-migration',
      category: 'Infrastructure',
      priority: 'medium',
      title: 'Update Stack Before Managed Migration',
      issue: `Current environment is close but does not yet meet migration standards: ${updatesList.join(' and ')}.`,
      impact:
        'Medium impact because migration value is blocked until core software versions are upgraded.',
      recommendation:
        'Complete required WordPress/PHP updates first, then migrate to managed hosting.',
      actionSteps: toActionSteps(scenarioSteps),
      estimatedTime: '1-3 hours',
      difficulty: 'medium',
      resources: [
        {
          title: 'Updating WordPress',
          url: 'https://wordpress.org/support/article/updating-wordpress/',
          type: 'documentation',
        },
      ],
      tags: ['hosting', 'wordpress', 'php', 'upgrade-path'],
      skipForWebsiteBuilders: true,
    });
  }
  // SCENARIO 3: Too Old (WP < 5.0 or PHP < 7.0)
  else if (isTooOldWP || isTooOldPHP) {
    const issues: string[] = [];

    if (isTooOldWP) {
      issues.push(`WordPress ${wordpress.version ?? 'unknown'} is below 5.0`);
    }

    if (isTooOldPHP) {
      issues.push(`PHP ${php?.version ?? 'unknown'} is below 7.0`);
    }

    recommendations.push({
      id: 'hosting-major-updates-required',
      category: 'Infrastructure',
      priority: 'critical',
      title: 'Major Updates Required Before Migration',
      issue: `Environment is significantly outdated: ${issues.join(' and ')}.`,
      impact:
        'Critical impact due to elevated security and compatibility risk from end-of-life software.',
      recommendation:
        'Use a staged, professionally supported upgrade path before migration.',
      actionSteps: toActionSteps([
        'Request a full technical audit and migration plan from a qualified engineer.',
        'Take full backups and snapshot rollback points.',
        'Update WordPress and PHP in controlled stages with compatibility validation.',
        'Retest plugins, themes, and checkout/contact flows after each stage.',
        'Migrate to managed WordPress hosting after the stack is stabilized.',
      ]),
      estimatedTime: '1-2 days',
      difficulty: 'hard',
      resources: [
        {
          title: 'WordPress Security Best Practices',
          url: 'https://wordpress.org/documentation/article/hardening-wordpress/',
          type: 'documentation',
        },
      ],
      tags: ['hosting', 'critical', 'legacy-stack', 'security'],
      skipForWebsiteBuilders: true,
    });
  }
  // SCENARIO 4: Version Unknown
  else if (!wordpress.version || !php?.version) {
    recommendations.push({
      id: 'hosting-version-check-required',
      category: 'Infrastructure',
      priority: 'low',
      title: 'Verify Version Eligibility for Migration',
      issue:
        'WordPress or PHP version could not be detected, so migration readiness cannot be confirmed.',
      impact:
        'Low immediate impact, but migration planning is blocked without accurate version data.',
      recommendation:
        'Collect WordPress and PHP versions, then rerun analysis for a deterministic migration path.',
      actionSteps: toActionSteps([
        'Open WordPress dashboard and check the installed WordPress version.',
        'Check PHP version via Site Health or hosting control panel.',
        'Document plugin/theme versions before making changes.',
        'Rerun the scan after version data is available.',
      ]),
      estimatedTime: '10-20 minutes',
      difficulty: 'easy',
      resources: [
        {
          title: 'WordPress Site Health',
          url: 'https://wordpress.org/support/article/site-health-screen/',
          type: 'documentation',
        },
      ],
      tags: ['hosting', 'inventory', 'version-check'],
      skipForWebsiteBuilders: true,
    });
  }

  return recommendations;
}
