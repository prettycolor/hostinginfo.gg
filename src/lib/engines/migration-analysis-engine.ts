/**
 * Migration Analysis Engine
 * 
 * Analyzes websites to determine:
 * 1. If they're custom-coded (hard to migrate)
 * 2. If they're cPanel-compatible
 * 3. What HostingInfo hosting tier they need
 * 4. Migration difficulty and timeline
 */

// Tech stack structure for migration analysis
export interface TechStack {
  frameworks?: string[];
  server?: string[];
  buildTools?: string[];
  cms?: string;
  devOps?: string[];
  apis?: string[];
  databases?: string[];
  languages?: string[];
  frontend?: string[];
  backend?: string[];
}

export interface MigrationAnalysis {
  isCustomCode: boolean;
  customCodeConfidence: number;
  customCodeReasons: string[];
  
  cPanelCompatible: boolean;
  cPanelConfidence: number;
  cPanelReasons: string[];
  
  recommendedTier: 'shared' | 'cpanel' | 'vps' | 'managed-wordpress';
  alternativeTier: string;
  tierReasons: string[];
  
  migrationDifficulty: number; // 1-10 scale
  estimatedMigrationTime: string;
  migrationBlockers: string[];
  
  confidence: number; // Overall confidence 0-100
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value];
  }
  return [];
}

/**
 * Detect if a site is custom-coded (not easily migrated)
 */
export function detectCustomCode(techStack: TechStack): {
  isCustom: boolean;
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let customScore = 0;
  const frameworks = asStringArray(techStack.frameworks);
  const servers = asStringArray(techStack.server);
  const buildToolsDetected = asStringArray(techStack.buildTools);
  const devOps = asStringArray(techStack.devOps);
  const apis = asStringArray(techStack.apis);
  const databases = asStringArray(techStack.databases);

  // Custom frameworks (strong indicator)
  const customFrameworks = [
    'Next.js', 'Nuxt', 'Remix', 'SvelteKit', 'Astro',
    'Gatsby', 'Eleventy', 'Hugo', 'Jekyll'
  ];
  
  const detectedFrameworks = frameworks.filter((f: string) => 
    customFrameworks.some(cf => f.toLowerCase().includes(cf.toLowerCase()))
  );
  
  if (detectedFrameworks.length > 0) {
    customScore += 40;
    reasons.push(`Custom framework detected: ${detectedFrameworks.join(', ')}`);
  }

  // Custom server software (strong indicator)
  const customServers = [
    'Node.js', 'Express', 'Fastify', 'Koa', 'Hapi',
    'Python', 'Django', 'Flask', 'FastAPI',
    'Ruby', 'Rails', 'Sinatra',
    'Go', 'Gin', 'Echo',
    'Rust', 'Actix'
  ];
  
  const detectedServers = servers.filter((s: string) => 
    customServers.some(cs => s.toLowerCase().includes(cs.toLowerCase()))
  );
  
  if (detectedServers.length > 0) {
    customScore += 35;
    reasons.push(`Custom server detected: ${detectedServers.join(', ')}`);
  }

  // Build tools (medium indicator)
  const buildTools = [
    'Webpack', 'Vite', 'Rollup', 'Parcel', 'esbuild',
    'Turbopack', 'Snowpack'
  ];
  
  const detectedBuildTools = buildToolsDetected.filter((b: string) => 
    buildTools.some(bt => b.toLowerCase().includes(bt.toLowerCase()))
  );
  
  if (detectedBuildTools.length > 0) {
    customScore += 15;
    reasons.push(`Build tools detected: ${detectedBuildTools.join(', ')}`);
  }

  // React/Vue/Angular without CMS (medium indicator)
  const jsFrameworks = ['React', 'Vue', 'Angular', 'Svelte'];
  const hasJSFramework = frameworks.some((f: string) => 
    jsFrameworks.some(jsf => f.toLowerCase().includes(jsf.toLowerCase()))
  );
  
  if (hasJSFramework && !techStack.cms) {
    customScore += 20;
    reasons.push('JavaScript framework without CMS (likely custom SPA)');
  }

  // Docker/Kubernetes indicators
  const containerTech = ['Docker', 'Kubernetes', 'K8s'];
  const hasContainers = devOps.some((d: string) => 
    containerTech.some(ct => d.toLowerCase().includes(ct.toLowerCase()))
  );
  
  if (hasContainers) {
    customScore += 25;
    reasons.push('Containerization detected (Docker/Kubernetes)');
  }

  // GraphQL (medium indicator of custom backend)
  if (apis.some((api: string) => api.toLowerCase().includes('graphql'))) {
    customScore += 15;
    reasons.push('GraphQL API detected');
  }

  // Microservices indicators
  const microserviceIndicators = ['gRPC', 'RabbitMQ', 'Kafka', 'Redis'];
  const hasMicroservices = databases.some((d: string) => 
    microserviceIndicators.some(mi => d.toLowerCase().includes(mi.toLowerCase()))
  );
  
  if (hasMicroservices) {
    customScore += 20;
    reasons.push('Microservices architecture detected');
  }

  // If no custom indicators but has standard CMS, definitely not custom
  if (customScore === 0 && techStack.cms) {
    reasons.push(`Standard CMS detected: ${techStack.cms}`);
  }

  const isCustom = customScore >= 30; // Threshold for "custom"
  const confidence = Math.min(100, customScore);

  return {
    isCustom,
    confidence,
    reasons: reasons.length > 0 ? reasons : ['No custom code indicators detected']
  };
}

/**
 * Check if a site is cPanel-compatible
 */
export function checkCPanelCompatibility(techStack: TechStack): {
  compatible: boolean;
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 50; // Start neutral
  const frameworks = asStringArray(techStack.frameworks);
  const servers = asStringArray(techStack.server);
  const databases = asStringArray(techStack.databases);
  const languages = asStringArray(techStack.languages);

  // Standard CMS (strong positive)
  const cPanelFriendlyCMS = ['WordPress', 'Joomla', 'Drupal', 'PrestaShop', 'Magento'];
  if (techStack.cms && cPanelFriendlyCMS.some(cms => 
    techStack.cms?.toLowerCase().includes(cms.toLowerCase())
  )) {
    score += 30;
    reasons.push(`${techStack.cms} is cPanel-compatible`);
  }

  // PHP (strong positive)
  const hasPhp = languages.some((lang: string) => 
    lang.toLowerCase().includes('php')
  );
  if (hasPhp) {
    score += 25;
    reasons.push('PHP detected (cPanel optimized for PHP)');
  } else if (languages.length > 0) {
    score -= 20;
    reasons.push('No PHP detected (cPanel is PHP-optimized)');
  }

  // Standard web server (positive)
  const cPanelServers = ['Apache', 'nginx', 'LiteSpeed'];
  const hasStandardServer = servers.some((s: string) => 
    cPanelServers.some(cs => s.toLowerCase().includes(cs.toLowerCase()))
  );
  if (hasStandardServer) {
    score += 15;
    reasons.push('Standard web server detected');
  }

  // MySQL/MariaDB (positive)
  const hasStandardDB = databases.some((db: string) => 
    db.toLowerCase().includes('mysql') || db.toLowerCase().includes('mariadb')
  );
  if (hasStandardDB) {
    score += 10;
    reasons.push('MySQL/MariaDB detected (cPanel default)');
  }

  // Static HTML (positive)
  if (!techStack.cms && !frameworks.length &&
      languages.some((l: string) => l.toLowerCase().includes('html'))) {
    score += 20;
    reasons.push('Static HTML site (easy cPanel migration)');
  }

  // Custom frameworks (strong negative)
  const customFrameworks = ['Next.js', 'Nuxt', 'Remix', 'SvelteKit'];
  const hasCustomFramework = frameworks.some((f: string) => 
    customFrameworks.some(cf => f.toLowerCase().includes(cf.toLowerCase()))
  );
  if (hasCustomFramework) {
    score -= 40;
    reasons.push('Custom framework detected (requires VPS)');
  }

  // Custom server (strong negative)
  const customServers = ['Node.js', 'Express', 'Python', 'Django', 'Ruby', 'Rails'];
  const hasCustomServer = servers.some((s: string) => 
    customServers.some(cs => s.toLowerCase().includes(cs.toLowerCase()))
  );
  if (hasCustomServer) {
    score -= 35;
    reasons.push('Custom server software (not cPanel-compatible)');
  }

  // NoSQL databases (negative)
  const noSqlDbs = ['MongoDB', 'Cassandra', 'CouchDB', 'DynamoDB'];
  const hasNoSql = databases.some((db: string) => 
    noSqlDbs.some(ndb => db.toLowerCase().includes(ndb.toLowerCase()))
  );
  if (hasNoSql) {
    score -= 20;
    reasons.push('NoSQL database detected (limited cPanel support)');
  }

  const compatible = score >= 50;
  const confidence = Math.max(0, Math.min(100, score));

  return {
    compatible,
    confidence,
    reasons: reasons.length > 0 ? reasons : ['Unable to determine cPanel compatibility']
  };
}

/**
 * Recommend HostingInfo hosting tier
 */
export function recommendHostingInfoHosting(
  techStack: TechStack,
  isCustomCode: boolean,
  cPanelCompatible: boolean
): {
  primary: string;
  alternative: string;
  reasoning: string[];
} {
  const reasoning: string[] = [];

  // Managed WordPress - highest priority for WP sites
  if (techStack.cms?.toLowerCase().includes('wordpress') && !isCustomCode) {
    reasoning.push('WordPress CMS detected');
    reasoning.push('Automatic updates and security patches');
    reasoning.push('Optimized performance and caching');
    reasoning.push('Expert WordPress support included');
    reasoning.push('Free SSL and CDN');
    
    return {
      primary: 'Managed WordPress Hosting',
      alternative: 'cPanel Hosting',
      reasoning
    };
  }

  // cPanel - for standard PHP/MySQL sites
  if (cPanelCompatible && !isCustomCode) {
    reasoning.push('Standard PHP/MySQL setup detected');
    reasoning.push('Easy migration with cPanel tools');
    reasoning.push('Full cPanel control panel access');
    reasoning.push('Scalable resources as you grow');
    reasoning.push('One-click app installations');
    
    return {
      primary: 'cPanel Hosting',
      alternative: 'Shared Hosting',
      reasoning
    };
  }

  // VPS - for custom or complex sites
  if (isCustomCode || !cPanelCompatible) {
    reasoning.push('Custom code or complex setup detected');
    reasoning.push('Root access for custom configurations');
    reasoning.push('Full server control and flexibility');
    reasoning.push('Dedicated resources (CPU, RAM)');
    reasoning.push('Support for custom software stacks');
    
    return {
      primary: 'VPS Hosting',
      alternative: 'Dedicated Server',
      reasoning
    };
  }

  // Shared - for simple static sites (fallback)
  reasoning.push('Simple static website detected');
  reasoning.push('Low resource requirements');
  reasoning.push('Cost-effective solution');
  reasoning.push('Easy to manage');
  reasoning.push('Perfect for small websites');
  
  return {
    primary: 'Shared Hosting',
    alternative: 'cPanel Hosting',
    reasoning
  };
}

/**
 * Calculate migration difficulty (1-10 scale)
 */
export function calculateMigrationDifficulty(
  isCustomCode: boolean,
  cPanelCompatible: boolean,
  techStack: TechStack
): number {
  let difficulty = 1; // Start easy
  const databases = asStringArray(techStack.databases);
  const frameworks = asStringArray(techStack.frameworks);
  const devOps = asStringArray(techStack.devOps);

  // Custom code adds significant difficulty
  if (isCustomCode) {
    difficulty += 5;
  }

  // Not cPanel compatible adds difficulty
  if (!cPanelCompatible) {
    difficulty += 2;
  }

  // Multiple databases increase difficulty
  if (databases.length > 1) {
    difficulty += 1;
  }

  // Complex frameworks increase difficulty
  const complexFrameworks = ['Next.js', 'Nuxt', 'Remix', 'Microservices'];
  if (frameworks.some(f =>
    complexFrameworks.some(cf => f.toLowerCase().includes(cf.toLowerCase()))
  )) {
    difficulty += 2;
  }

  // Docker/Kubernetes adds difficulty
  if (devOps.some(d =>
    d.toLowerCase().includes('docker') || d.toLowerCase().includes('kubernetes')
  )) {
    difficulty += 1;
  }

  return Math.min(10, difficulty);
}

/**
 * Estimate migration time
 */
export function estimateMigrationTime(difficulty: number): string {
  if (difficulty <= 2) return '2-4 hours';
  if (difficulty <= 4) return '4-8 hours';
  if (difficulty <= 6) return '1-2 days';
  if (difficulty <= 8) return '3-5 days';
  return '1-2 weeks';
}

/**
 * Identify migration blockers
 */
export function identifyMigrationBlockers(
  techStack: TechStack,
  _isCustomCode: boolean,
  _cPanelCompatible: boolean
): string[] {
  const blockers: string[] = [];
  const servers = asStringArray(techStack.server);
  const buildTools = asStringArray(techStack.buildTools);
  const databases = asStringArray(techStack.databases);
  const devOps = asStringArray(techStack.devOps);
  const apis = asStringArray(techStack.apis);

  // Custom server software
  const customServers = ['Node.js', 'Python', 'Ruby', 'Go', 'Rust'];
  const hasCustomServer = servers.some(s =>
    customServers.some(cs => s.toLowerCase().includes(cs.toLowerCase()))
  );
  if (hasCustomServer) {
    blockers.push('Custom server software requires VPS or dedicated server');
  }

  // Build process required
  if (buildTools.length > 0) {
    blockers.push('Build process required (not supported on shared/cPanel)');
  }

  // NoSQL databases
  const noSqlDbs = ['MongoDB', 'Cassandra', 'Redis', 'DynamoDB'];
  const hasNoSql = databases.some(db =>
    noSqlDbs.some(ndb => db.toLowerCase().includes(ndb.toLowerCase()))
  );
  if (hasNoSql) {
    blockers.push('NoSQL database requires VPS with custom setup');
  }

  // Microservices
  if (devOps.some(d =>
    d.toLowerCase().includes('docker') || d.toLowerCase().includes('kubernetes')
  )) {
    blockers.push('Containerized architecture requires VPS or cloud hosting');
  }

  // Custom APIs
  if (apis.some(api => api.toLowerCase().includes('graphql'))) {
    blockers.push('GraphQL API may require custom server setup');
  }

  return blockers;
}

/**
 * Main migration analysis function
 */
export async function analyzeMigration(techStack: TechStack): Promise<MigrationAnalysis> {
  // Detect custom code
  const customCodeAnalysis = detectCustomCode(techStack);
  
  // Check cPanel compatibility
  const cPanelAnalysis = checkCPanelCompatibility(techStack);
  
  // Get hosting recommendation
  const recommendation = recommendHostingInfoHosting(
    techStack,
    customCodeAnalysis.isCustom,
    cPanelAnalysis.compatible
  );
  
  // Calculate difficulty
  const difficulty = calculateMigrationDifficulty(
    customCodeAnalysis.isCustom,
    cPanelAnalysis.compatible,
    techStack
  );
  
  // Estimate time
  const estimatedTime = estimateMigrationTime(difficulty);
  
  // Identify blockers
  const blockers = identifyMigrationBlockers(
    techStack,
    customCodeAnalysis.isCustom,
    cPanelAnalysis.compatible
  );
  
  // Map tier names to internal values
  const tierMap: Record<string, 'shared' | 'cpanel' | 'vps' | 'managed-wordpress'> = {
    'Shared Hosting': 'shared',
    'cPanel Hosting': 'cpanel',
    'VPS Hosting': 'vps',
    'Managed WordPress Hosting': 'managed-wordpress'
  };
  
  // Calculate overall confidence
  const confidence = Math.round(
    (customCodeAnalysis.confidence + cPanelAnalysis.confidence) / 2
  );
  
  return {
    isCustomCode: customCodeAnalysis.isCustom,
    customCodeConfidence: customCodeAnalysis.confidence,
    customCodeReasons: customCodeAnalysis.reasons,
    
    cPanelCompatible: cPanelAnalysis.compatible,
    cPanelConfidence: cPanelAnalysis.confidence,
    cPanelReasons: cPanelAnalysis.reasons,
    
    recommendedTier: tierMap[recommendation.primary] || 'cpanel',
    alternativeTier: recommendation.alternative,
    tierReasons: recommendation.reasoning,
    
    migrationDifficulty: difficulty,
    estimatedMigrationTime: estimatedTime,
    migrationBlockers: blockers.length > 0 ? blockers : ['No blockers detected'],
    
    confidence
  };
}
