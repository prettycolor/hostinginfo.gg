/**
 * Intelligence Orchestrator
 * 
 * Unified system that coordinates all intelligence engines and provides
 * a single interface for comprehensive domain analysis.
 */

import { PerformanceEngine } from './engines/performance-engine.js';
import { TechnologyStackEngine } from './engines/technology-stack-engine.js';
import { DNSInfrastructureEngine } from './engines/dns-infrastructure-engine.js';
import { CostAnalysisEngine } from './engines/cost-analysis-engine.js';
import { HostingRecommendationsEngine } from './engines/hosting-recommendations-engine.js';
import { PerformanceScoringEngine } from './engines/performance-scoring-engine.js';

export interface ScanData {
  domain: string;
  hosting: {
    originHost: string | null;
    edgeProvider: string | null;
    framework: string | null;
  };
  security: {
    ssl: {
      valid: boolean;
      issuer?: string;
      expiresAt?: string;
    };
    headers: Record<string, string | undefined>;
  };
  dns: {
    nameservers: string[];
    a: string[];
    aaaa?: string[];
    mx?: Array<{ priority: number; exchange: string }>;
    txt?: string[];
    dnssec?: boolean;
    ttl?: number;
  };
  tech: {
    technologies: Array<{
      name: string;
      version?: string;
      category: string;
      confidence: number;
    }>;
  };
  ip: {
    address: string;
    location?: {
      country: string;
      city?: string;
      region?: string;
    };
    asn?: {
      number: string;
      organization: string;
    };
  };
  performance?: {
    loadTime?: number;
    ttfb?: number;
    fcp?: number;
    lcp?: number;
    cls?: number;
    fid?: number;
  };
}

export interface IntelligenceReport {
  domain: string;
  scannedAt: string;
  
  // Engine results
  performance: ReturnType<typeof PerformanceEngine.analyzePerformance>;
  performanceScore: ReturnType<typeof PerformanceScoringEngine.calculateScore>;
  techStack: ReturnType<typeof TechnologyStackEngine.analyzeTechStack>;
  dns: ReturnType<typeof DNSInfrastructureEngine.analyzeDNS>;
  costAnalysis: ReturnType<typeof CostAnalysisEngine.analyzeCosts>;
  hostingRecommendations: ReturnType<typeof HostingRecommendationsEngine.generateRecommendations>;
  
  // Summary metrics
  summary: {
    overallScore: number;
    criticalIssues: number;
    warnings: number;
    recommendations: number;
    estimatedMonthlyCost: number;
    potentialSavings: number;
  };
  
  // Raw scan data for reference
  rawScanData: ScanData;
}

export class IntelligenceOrchestrator {
  /**
   * Run comprehensive intelligence analysis on a domain
   */
  static async analyze(scanData: ScanData): Promise<IntelligenceReport> {
    const startTime = Date.now();
    
    try {
      // Run all engines in parallel for speed
      const [performance, techStack, dns, costAnalysis, hostingRecommendations] = await Promise.all([
        Promise.resolve(PerformanceEngine.analyzePerformance(scanData)),
        Promise.resolve(TechnologyStackEngine.analyzeTechStack(scanData)),
        Promise.resolve(DNSInfrastructureEngine.analyzeDNS(scanData)),
        Promise.resolve(CostAnalysisEngine.analyzeCosts(scanData)),
        Promise.resolve(HostingRecommendationsEngine.generateRecommendations(scanData)),
      ]);
      
      // Calculate performance score
      const performanceScore = PerformanceScoringEngine.calculateScore(scanData);
      
      // Generate summary metrics
      const summary = this.generateSummary({
        performance,
        performanceScore,
        techStack,
        dns,
        costAnalysis,
        hostingRecommendations,
      });
      
      const report: IntelligenceReport = {
        domain: scanData.domain,
        scannedAt: new Date().toISOString(),
        performance,
        performanceScore,
        techStack,
        dns,
        costAnalysis,
        hostingRecommendations,
        summary,
        rawScanData: scanData,
      };
      
      const duration = Date.now() - startTime;
      console.log(`[Intelligence] Analysis completed for ${scanData.domain} in ${duration}ms`);
      
      return report;
    } catch (error) {
      console.error('[Intelligence] Analysis failed:', error);
      throw new Error(`Intelligence analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate summary metrics from all engine results
   */
  private static generateSummary(results: {
    performance: ReturnType<typeof PerformanceEngine.analyzePerformance>;
    performanceScore: ReturnType<typeof PerformanceScoringEngine.calculateScore>;
    techStack: ReturnType<typeof TechnologyStackEngine.analyzeTechStack>;
    dns: ReturnType<typeof DNSInfrastructureEngine.analyzeDNS>;
    costAnalysis: ReturnType<typeof CostAnalysisEngine.analyzeCosts>;
    hostingRecommendations: ReturnType<typeof HostingRecommendationsEngine.generateRecommendations>;
  }) {
    const { performance, performanceScore, techStack, dns, costAnalysis, hostingRecommendations } = results;
    
    // Count issues by severity
    let criticalIssues = 0;
    let warnings = 0;
    let recommendations = 0;
    
    // Performance issues
    performance.issues.forEach(issue => {
      if (issue.severity === 'critical') criticalIssues++;
      else if (issue.severity === 'warning') warnings++;
    });
    
    // Tech stack issues (derived from security concerns)
    techStack.securityConcerns.forEach((concern) => {
      if (concern.severity === 'critical') criticalIssues++;
      else if (concern.severity === 'high' || concern.severity === 'medium') warnings++;
    });

    // DNS warnings (derived from configuration and recommendations)
    if (!dns.configuration.hasDNSSEC) warnings++;
    if (dns.nameservers.length < 2) warnings++;
    warnings += dns.recommendations.filter((recommendation) => recommendation.priority === 'high').length;
    
    // Count recommendations
    recommendations = hostingRecommendations.recommendations.length;
    
    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      performanceScore.overall * 0.4 + // 40% weight on performance
      (dns.securityScore / 100) * 100 * 0.3 + // 30% weight on DNS
      (techStack.modernityScore / 100) * 100 * 0.3 // 30% weight on tech stack
    );

    const potentialSavings = Math.max(
      0,
      Math.round(costAnalysis.optimizations.reduce((sum, optimization) => sum + optimization.savings, 0))
    );
    
    return {
      overallScore,
      criticalIssues,
      warnings,
      recommendations,
      estimatedMonthlyCost: costAnalysis.monthly.total.typical,
      potentialSavings,
    };
  }
  
  /**
   * Compare two intelligence reports to identify changes
   */
  static compareReports(current: IntelligenceReport, previous: IntelligenceReport) {
    const currentTechnologies = current.techStack.categories.flatMap((category) => category.technologies);
    const previousTechnologies = previous.techStack.categories.flatMap((category) => category.technologies);

    return {
      domain: current.domain,
      timeRange: {
        from: previous.scannedAt,
        to: current.scannedAt,
      },
      changes: {
        overallScore: {
          previous: previous.summary.overallScore,
          current: current.summary.overallScore,
          change: current.summary.overallScore - previous.summary.overallScore,
        },
        performance: {
          previous: previous.performanceScore.overall,
          current: current.performanceScore.overall,
          change: current.performanceScore.overall - previous.performanceScore.overall,
        },
        criticalIssues: {
          previous: previous.summary.criticalIssues,
          current: current.summary.criticalIssues,
          change: current.summary.criticalIssues - previous.summary.criticalIssues,
        },
        technologies: {
          added: currentTechnologies.filter(
            (technology) => !previousTechnologies.some((existing) => existing.name === technology.name)
          ),
          removed: previousTechnologies.filter(
            (technology) => !currentTechnologies.some((existing) => existing.name === technology.name)
          ),
          updated: currentTechnologies.filter((technology) => {
            const previousTechnology = previousTechnologies.find(
              (existing) => existing.name === technology.name
            );
            return previousTechnology && previousTechnology.version !== technology.version;
          }),
        },
        cost: {
          previous: previous.summary.estimatedMonthlyCost,
          current: current.summary.estimatedMonthlyCost,
          change: current.summary.estimatedMonthlyCost - previous.summary.estimatedMonthlyCost,
        },
      },
    };
  }
  
  /**
   * Generate actionable insights from intelligence report
   */
  static generateInsights(report: IntelligenceReport): Array<{
    type: 'critical' | 'warning' | 'info' | 'success';
    category: string;
    title: string;
    description: string;
    action?: string;
  }> {
    const insights: Array<{
      type: 'critical' | 'warning' | 'info' | 'success';
      category: string;
      title: string;
      description: string;
      action?: string;
    }> = [];
    
    // Overall score insight
    if (report.summary.overallScore >= 90) {
      insights.push({
        type: 'success',
        category: 'Overall',
        title: 'Excellent Configuration',
        description: `Your domain scores ${report.summary.overallScore}/100. Great job maintaining a high-quality setup!`,
      });
    } else if (report.summary.overallScore < 60) {
      insights.push({
        type: 'critical',
        category: 'Overall',
        title: 'Configuration Needs Attention',
        description: `Your domain scores ${report.summary.overallScore}/100. Consider implementing the recommended improvements.`,
        action: 'Review recommendations below',
      });
    }
    
    // Critical issues
    if (report.summary.criticalIssues > 0) {
      insights.push({
        type: 'critical',
        category: 'Issues',
        title: `${report.summary.criticalIssues} Critical Issue${report.summary.criticalIssues > 1 ? 's' : ''} Found`,
        description: 'These issues require immediate attention to ensure optimal performance and security.',
        action: 'Address critical issues first',
      });
    }
    
    // Cost savings opportunity
    if (report.summary.potentialSavings > 50) {
      insights.push({
        type: 'info',
        category: 'Cost',
        title: `Save $${report.summary.potentialSavings}/month`,
        description: 'We identified opportunities to reduce your hosting costs without sacrificing performance.',
        action: 'View cost analysis',
      });
    }
    
    // Performance insights
    if (report.performanceScore.overall < 70) {
      insights.push({
        type: 'warning',
        category: 'Performance',
        title: 'Performance Below Target',
        description: `Current score: ${report.performanceScore.overall}/100. Improving performance can boost user engagement and SEO.`,
        action: 'View performance recommendations',
      });
    }
    
    // Technology insights
    const outdatedTechnologyCount = new Set(
      report.techStack.securityConcerns
        .filter((concern) => {
          const issue = concern.issue.toLowerCase();
          return (
            issue.includes('outdated') ||
            issue.includes('end-of-life') ||
            issue.includes('vulnerabilities')
          );
        })
        .map((concern) => concern.technology)
    ).size;

    if (outdatedTechnologyCount > 0) {
      insights.push({
        type: 'warning',
        category: 'Technology',
        title: `${outdatedTechnologyCount} Outdated Technolog${outdatedTechnologyCount > 1 ? 'ies' : 'y'}`,
        description: 'Updating to newer versions can improve security, performance, and developer experience.',
        action: 'View technology stack',
      });
    }
    
    // DNS insights
    if (!report.dns.configuration.hasDNSSEC) {
      insights.push({
        type: 'warning',
        category: 'Security',
        title: 'DNSSEC Not Enabled',
        description: 'DNSSEC adds an extra layer of security to prevent DNS spoofing attacks.',
        action: 'Enable DNSSEC',
      });
    }
    
    return insights;
  }
}
