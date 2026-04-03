/**
 * Dynamic Recommendation Engine
 *
 * Analyzes comprehensive scan data and generates prioritized,
 * context-aware recommendations for security, performance, email, and more.
 *
 * Design Principles:
 * - CONCISE: Group related issues, don't overwhelm users
 * - ACTIONABLE: Every recommendation has clear steps
 * - CONTEXT-AWARE: Filter based on website builder detection
 * - PRIORITIZED: Critical issues first, nice-to-haves last
 */

import type {
  Recommendation,
  ComprehensiveScanData,
  RecommendationOptions,
  RecommendationSummary,
  RecommendationPriority,
  RecommendationCategory,
} from "./recommendations/types";

import { generateSSLRecommendations } from "./recommendations/ssl";
import { generateSecurityRecommendations } from "./recommendations/security";
import { generateEmailRecommendations } from "./recommendations/email";
import { generatePerformanceRecommendations } from "./recommendations/performance";
import { generateInfrastructureRecommendations } from "./recommendations/infrastructure";
import { generateHostingRecommendations } from "./recommendations/hosting";
import { mapTechnologyData } from "./recommendations/technology-mapper";

type TechnologyApiResponse = Parameters<typeof mapTechnologyData>[0];

function isTechnologyApiResponse(
  value: unknown,
): value is TechnologyApiResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.wordpress === "object" &&
    record.wordpress !== null &&
    typeof record.php === "object" &&
    record.php !== null &&
    typeof record.server === "object" &&
    record.server !== null &&
    typeof record.hosting === "object" &&
    record.hosting !== null &&
    typeof record.controlPanel === "object" &&
    record.controlPanel !== null
  );
}

/**
 * Generate all recommendations from scan data
 */
export function generateRecommendations(
  data: ComprehensiveScanData,
  options?: RecommendationOptions,
): Recommendation[] {
  let recommendations: Recommendation[] = [];

  // 0. Map technology data if it's in raw API format
  const processedData = { ...data };
  const possibleRawTechnology = data.technology as unknown;
  if (isTechnologyApiResponse(possibleRawTechnology)) {
    // Raw API format detected, map it to recommendation format
    processedData.technology = mapTechnologyData(possibleRawTechnology);
  }

  // 1. Generate recommendations from each module
  const sslRecs = generateSSLRecommendations(processedData);
  const securityRecs = generateSecurityRecommendations(processedData);
  const emailRecs = generateEmailRecommendations(processedData);
  const performanceRecs = generatePerformanceRecommendations(processedData);
  const infrastructureRecs =
    generateInfrastructureRecommendations(processedData);
  const hostingRecs = generateHostingRecommendations(processedData);

  // Combine all recommendations
  recommendations = [
    ...sslRecs,
    ...securityRecs,
    ...emailRecs,
    ...performanceRecs,
    ...infrastructureRecs,
    ...hostingRecs,
  ];

  // 2. Filter by context (website builders)
  const isWebsiteBuilder = processedData.technology?.isWebsiteBuilder || false;
  if (isWebsiteBuilder) {
    recommendations = recommendations.filter(
      (rec) => !rec.skipForWebsiteBuilders,
    );
  }

  // 3. Apply user options
  if (options) {
    recommendations = applyOptions(recommendations, options);
  }

  // 4. Sort by priority (Critical → High → Medium → Low)
  recommendations = sortByPriority(recommendations);

  // 5. Limit total recommendations if specified
  if (
    options?.maxRecommendations &&
    recommendations.length > options.maxRecommendations
  ) {
    recommendations = recommendations.slice(0, options.maxRecommendations);
  }

  return recommendations;
}

/**
 * Apply user-specified options to filter recommendations
 */
function applyOptions(
  recommendations: Recommendation[],
  options: RecommendationOptions,
): Recommendation[] {
  let filtered = [...recommendations];

  // Filter by included categories
  if (options.includeCategories && options.includeCategories.length > 0) {
    filtered = filtered.filter((rec) =>
      options.includeCategories!.includes(rec.category),
    );
  }

  // Filter by excluded categories
  if (options.excludeCategories && options.excludeCategories.length > 0) {
    filtered = filtered.filter(
      (rec) => !options.excludeCategories!.includes(rec.category),
    );
  }

  // Filter by minimum priority
  if (options.minPriority) {
    const priorityOrder: RecommendationPriority[] = [
      "critical",
      "high",
      "medium",
      "low",
    ];
    const minIndex = priorityOrder.indexOf(options.minPriority);
    filtered = filtered.filter((rec) => {
      const recIndex = priorityOrder.indexOf(rec.priority);
      return recIndex <= minIndex;
    });
  }

  return filtered;
}

/**
 * Sort recommendations by priority
 * Order: Critical → High → Medium → Low
 */
function sortByPriority(recommendations: Recommendation[]): Recommendation[] {
  const priorityOrder: Record<RecommendationPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // If same priority, sort by category
    return a.category.localeCompare(b.category);
  });
}

/**
 * Generate summary statistics for recommendations
 */
export function generateRecommendationSummary(
  recommendations: Recommendation[],
): RecommendationSummary {
  const summary: RecommendationSummary = {
    total: recommendations.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byCategory: {
      Security: 0,
      Performance: 0,
      Email: 0,
      SEO: 0,
      Infrastructure: 0,
      Technology: 0,
    },
  };

  recommendations.forEach((rec) => {
    // Count by priority
    summary[rec.priority]++;

    // Count by category
    summary.byCategory[rec.category]++;
  });

  return summary;
}

/**
 * Get priority color for UI display
 */
export function getPriorityColor(priority: RecommendationPriority): string {
  switch (priority) {
    case "critical":
      return "text-red-600 dark:text-red-400";
    case "high":
      return "text-orange-600 dark:text-orange-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "low":
      return "text-green-600 dark:text-green-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

/**
 * Get priority background color for badges
 */
export function getPriorityBgColor(priority: RecommendationPriority): string {
  switch (priority) {
    case "critical":
      return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
    case "high":
      return "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400";
    case "medium":
      return "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400";
    case "low":
      return "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400";
    default:
      return "bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400";
  }
}

/**
 * Get priority icon name (for lucide-react)
 */
export function getPriorityIcon(priority: RecommendationPriority): string {
  switch (priority) {
    case "critical":
      return "AlertTriangle";
    case "high":
      return "AlertCircle";
    case "medium":
      return "Info";
    case "low":
      return "Lightbulb";
    default:
      return "Info";
  }
}

/**
 * Get category icon name (for lucide-react)
 */
export function getCategoryIcon(category: RecommendationCategory): string {
  switch (category) {
    case "Security":
      return "Shield";
    case "Performance":
      return "Zap";
    case "Email":
      return "Mail";
    case "SEO":
      return "Search";
    case "Infrastructure":
      return "Server";
    case "Technology":
      return "Code";
    default:
      return "Info";
  }
}

/**
 * Get category color for UI display
 */
export function getCategoryColor(category: RecommendationCategory): string {
  switch (category) {
    case "Security":
      return "text-red-600 dark:text-red-400";
    case "Performance":
      return "text-blue-600 dark:text-blue-400";
    case "Email":
      return "text-purple-600 dark:text-purple-400";
    case "SEO":
      return "text-green-600 dark:text-green-400";
    case "Infrastructure":
      return "text-orange-600 dark:text-orange-400";
    case "Technology":
      return "text-cyan-600 dark:text-cyan-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

/**
 * Get difficulty color for UI display
 */
export function getDifficultyColor(difficulty?: string): string {
  switch (difficulty) {
    case "easy":
      return "text-green-600 dark:text-green-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "hard":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

/**
 * Filter recommendations by category
 */
export function filterByCategory(
  recommendations: Recommendation[],
  category: RecommendationCategory | "all",
): Recommendation[] {
  if (category === "all") return recommendations;
  return recommendations.filter((rec) => rec.category === category);
}

/**
 * Filter recommendations by priority
 */
export function filterByPriority(
  recommendations: Recommendation[],
  priority: RecommendationPriority | "all",
): Recommendation[] {
  if (priority === "all") return recommendations;
  return recommendations.filter((rec) => rec.priority === priority);
}

/**
 * Search recommendations by text
 */
export function searchRecommendations(
  recommendations: Recommendation[],
  query: string,
): Recommendation[] {
  if (!query || query.trim() === "") return recommendations;

  const lowerQuery = query.toLowerCase();
  return recommendations.filter((rec) => {
    return (
      rec.title.toLowerCase().includes(lowerQuery) ||
      rec.issue.toLowerCase().includes(lowerQuery) ||
      rec.recommendation.toLowerCase().includes(lowerQuery) ||
      rec.category.toLowerCase().includes(lowerQuery) ||
      rec.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Group recommendations by priority
 */
export function groupByPriority(
  recommendations: Recommendation[],
): Record<RecommendationPriority, Recommendation[]> {
  const grouped: Record<RecommendationPriority, Recommendation[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  recommendations.forEach((rec) => {
    grouped[rec.priority].push(rec);
  });

  return grouped;
}

/**
 * Group recommendations by category
 */
export function groupByCategory(
  recommendations: Recommendation[],
): Record<RecommendationCategory, Recommendation[]> {
  const grouped: Record<RecommendationCategory, Recommendation[]> = {
    Security: [],
    Performance: [],
    Email: [],
    SEO: [],
    Infrastructure: [],
    Technology: [],
  };

  recommendations.forEach((rec) => {
    grouped[rec.category].push(rec);
  });

  return grouped;
}
