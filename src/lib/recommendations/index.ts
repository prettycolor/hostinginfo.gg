/**
 * Recommendations Module - Barrel Export
 * 
 * Centralized exports for the recommendation system
 */

// Core engine
export {
  generateRecommendations,
  generateRecommendationSummary,
  getPriorityColor,
  getPriorityBgColor,
  getPriorityIcon,
  getCategoryIcon,
  getCategoryColor,
  getDifficultyColor,
  filterByCategory,
  filterByPriority,
  searchRecommendations,
  groupByPriority,
  groupByCategory,
} from '../recommendation-engine';

// Individual recommendation generators
export { generateSSLRecommendations } from './ssl';
export { generateSecurityRecommendations } from './security';
export { generateEmailRecommendations } from './email';
export { generatePerformanceRecommendations } from './performance';
export { generateInfrastructureRecommendations } from './infrastructure';
export { generateHostingRecommendations } from './hosting';

// Technology detection mapper
export {
  mapTechnologyData,
  needsCPanelRecommendations,
  isManagedWordPress,
  isSelfHostedWordPress,
  isApacheServer,
  getHostingEnvironmentDescription,
} from './technology-mapper';

// Types
export type {
  Recommendation,
  RecommendationPriority,
  RecommendationCategory,
  RecommendationDifficulty,
  RecommendationOptions,
  RecommendationSummary,
  ActionStep,
  Resource,
  ComprehensiveScanData,
  TechnologyResult,
  SecurityResult,
  SSLResult,
  EmailResult,
  PerformanceResult,
  DNSResult,
  HostingResult,
} from './types';
