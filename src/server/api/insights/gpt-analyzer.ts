import OpenAI from "openai";
import { getSecret } from "#secrets";
import crypto from "crypto";

// Simple in-memory cache for GPT responses (24 hour TTL)
const gptCache = new Map<
  string,
  { insights: AIInsight[]; timestamp: number }
>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface AIInsight {
  id: string;
  type:
    | "security"
    | "performance"
    | "optimization"
    | "prediction"
    | "explanation";
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  impact: {
    score?: number;
    metric?: string;
    business?: string;
  };
  recommendation: {
    summary: string;
    steps?: string[];
    timeEstimate?: string;
    difficulty?: "easy" | "medium" | "hard";
    codeSnippet?: string;
    learnMoreUrl?: string;
  };
  relatedTab?: string;
}

interface ScanDataContext {
  technologyData?: {
    framework?: string;
    wordpress?: { version?: string; detected?: boolean };
    ecommerce?: { detected?: boolean };
    server?: { name?: string };
  };
  securityData?: {
    score?: number;
  };
  performanceData?: {
    mobile?: { score?: number };
    desktop?: { score?: number };
  };
  providerData?: {
    provider?: string;
    category?: string;
  };
}

interface GPTInsightRaw {
  type?: AIInsight["type"];
  priority?: AIInsight["priority"];
  category?: string;
  title: string;
  description: string;
  impact?:
    | {
        score?: number;
        metric?: string;
        business?: string;
      }
    | string;
  recommendation?:
    | {
        summary?: string;
        steps?: string[];
        timeEstimate?: string;
        difficulty?: AIInsight["recommendation"]["difficulty"];
        codeSnippet?: string;
        learnMoreUrl?: string;
      }
    | string;
  relatedTab?: string;
}

/**
 * Enhance rule-based insights with GPT-4 analysis
 * Uses hybrid approach: rule-based insights + GPT enhancement
 */
export async function enhanceInsightsWithGPT(
  scanData: ScanDataContext,
  ruleBasedInsights: AIInsight[],
): Promise<AIInsight[]> {
  const apiKeySecret = getSecret("OPENAI_API_KEY");
  const apiKey = typeof apiKeySecret === "string" ? apiKeySecret : null;

  if (!apiKey) {
    console.log("OpenAI API key not found, skipping GPT enhancement");
    return [];
  }

  try {
    // Generate cache key from scan data
    const cacheKey = crypto
      .createHash("md5")
      .update(
        JSON.stringify({
          tech: scanData.technologyData?.framework,
          wp: scanData.technologyData?.wordpress?.version,
          hosting: scanData.providerData?.provider,
          mobileScore: scanData.performanceData?.mobile?.score,
          securityScore: scanData.securityData?.score,
        }),
      )
      .digest("hex");

    // Check cache
    const cached = gptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Using cached GPT insights (cache hit)");
      return cached.insights;
    }

    // Clean old cache entries (simple cleanup)
    if (gptCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of gptCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          gptCache.delete(key);
        }
      }
    }

    const openai = new OpenAI({ apiKey });

    // Build context-aware prompt
    const prompt = buildGPTPrompt(scanData, ruleBasedInsights);

    console.log("Calling GPT-4 Turbo for enhanced insights...");
    const startTime = Date.now();

    // Call GPT-4 Turbo (latest model with better performance)
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional web consultant specializing in website optimization, security, and performance. Provide actionable, specific recommendations based on scan data. Focus on business impact with real numbers, step-by-step instructions, and ROI calculations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const duration = Date.now() - startTime;

    // Log token usage and cost
    const usage = response.usage;
    if (usage) {
      const inputCost = (usage.prompt_tokens / 1000) * 0.01; // $0.01 per 1K tokens
      const outputCost = (usage.completion_tokens / 1000) * 0.03; // $0.03 per 1K tokens
      const totalCost = inputCost + outputCost;

      console.log(`GPT-4 response received in ${duration}ms`);
      console.log(
        `Token usage: ${usage.prompt_tokens} input + ${usage.completion_tokens} output = ${usage.total_tokens} total`,
      );
      console.log(
        `Estimated cost: ${totalCost.toFixed(4)} (input: ${inputCost.toFixed(4)}, output: ${outputCost.toFixed(4)})`,
      );
    }

    const content = response.choices[0].message.content;
    if (!content) {
      console.log("GPT returned empty response");
      return [];
    }

    // Parse GPT response with error handling
    let gptData;
    try {
      gptData = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse GPT response:", parseError);
      console.error("Raw response:", content);
      return [];
    }
    const gptInsights = gptData.insights || [];

    // Convert to AIInsight format and add unique IDs
    const formattedInsights = gptInsights.map(
      (insight: GPTInsightRaw, index: number) => ({
        id: `gpt-${Date.now()}-${index}`,
        type: insight.type || "optimization",
        priority: insight.priority || "medium",
        category: insight.category || "AI Recommendation",
        title: insight.title,
        description: insight.description,
        impact: {
          score: insight.impact?.score,
          metric: insight.impact?.metric,
          business: insight.impact?.business || insight.impact,
        },
        recommendation: {
          summary: insight.recommendation?.summary || insight.recommendation,
          steps: insight.recommendation?.steps,
          timeEstimate: insight.recommendation?.timeEstimate,
          difficulty: insight.recommendation?.difficulty,
          codeSnippet: insight.recommendation?.codeSnippet,
          learnMoreUrl: insight.recommendation?.learnMoreUrl,
        },
        relatedTab: insight.relatedTab,
      }),
    );

    // Cache the results
    gptCache.set(cacheKey, {
      insights: formattedInsights,
      timestamp: Date.now(),
    });
    console.log(`Cached GPT insights with key: ${cacheKey}`);

    return formattedInsights;
  } catch {
    console.error("GPT enhancement failed:", "An internal error occurred");
    // Graceful fallback - return empty array
    return [];
  }
}

/**
 * Build context-aware prompt for GPT-4
 */
function buildGPTPrompt(
  scanData: ScanDataContext,
  ruleBasedInsights: AIInsight[],
): string {
  const { technologyData, securityData, performanceData, providerData } =
    scanData;

  // Extract key metrics
  const mobileScore = performanceData?.mobile?.score || "N/A";
  const desktopScore = performanceData?.desktop?.score || "N/A";
  const securityScore = securityData?.score || "N/A";
  const isWordPress = technologyData?.wordpress?.detected;
  const isEcommerce = technologyData?.ecommerce?.detected;
  const framework = technologyData?.framework;
  const hosting = providerData?.provider || "Unknown";
  const hostingCategory = providerData?.category || "Unknown";

  // Build technology stack summary
  const techStack = [
    isWordPress && "WordPress",
    isEcommerce && "E-commerce",
    framework,
    technologyData?.server?.name,
  ]
    .filter(Boolean)
    .join(", ");

  // Summarize rule-based insights
  const ruleBasedSummary = ruleBasedInsights
    .slice(0, 5) // Top 5 insights
    .map((i) => `- ${i.title} (${i.priority})`)
    .join("\n");

  return `You are analyzing a website scan. Provide 2-3 ADDITIONAL insights that the rule-based system may have missed.

Domain Profile:
- Technology Stack: ${techStack || "Unknown"}
- Hosting: ${hosting} (${hostingCategory})
- WordPress: ${isWordPress ? "Yes" : "No"}
- E-commerce: ${isEcommerce ? "Yes" : "No"}

Performance Metrics:
- Mobile Score: ${mobileScore}/100
- Desktop Score: ${desktopScore}/100
- Security Score: ${securityScore}/100

Rule-Based Insights Already Found:
${ruleBasedSummary || "None"}

Your Task:
Provide 2-3 UNIQUE insights that focus on:
1. Subtle patterns or correlations the rule-based system missed
2. Industry-specific best practices for this tech stack
3. Emerging trends or modern optimization techniques (HTTP/3, Brotli, WebP, etc.)
4. Cost-benefit analysis with REAL NUMBERS (e.g., "$30/month hosting upgrade saves $5,000 in lost sales")
5. Strategic recommendations based on hosting/technology choices
6. Competitive analysis (how this site compares to industry standards)
7. Future-proofing recommendations (preparing for upcoming changes)

IMPORTANT:
- Do NOT repeat insights already found by the rule-based system
- Focus on actionable, specific recommendations
- Include business impact with real numbers when possible
- Provide step-by-step instructions
- Consider the specific technology stack (WordPress, e-commerce, etc.)

Format your response as JSON:
{
  "insights": [
    {
      "type": "security|performance|optimization|prediction|explanation",
      "priority": "critical|high|medium|low",
      "category": "Category name",
      "title": "Insight title",
      "description": "What's the issue or opportunity",
      "impact": {
        "score": 10,
        "metric": "Performance Score",
        "business": "Business impact with numbers"
      },
      "recommendation": {
        "summary": "How to fix",
        "steps": ["Step 1", "Step 2", "Step 3"],
        "timeEstimate": "30 minutes",
        "difficulty": "easy|medium|hard",
        "codeSnippet": "Optional code example"
      },
      "relatedTab": "security|performance|hosting|email"
    }
  ]
}`;
}

/**
 * Check if user can use GPT (for freemium gating)
 */
export function canUseGPT(user: unknown, gptScansThisMonth: number): boolean {
  const normalizedUser = user as { subscription?: string; isPremium?: boolean };
  // Premium users get unlimited GPT scans
  if (normalizedUser?.subscription === "premium" || normalizedUser?.isPremium) {
    return true;
  }

  // Free users get 3 GPT scans per month
  const FREE_GPT_SCANS_PER_MONTH = 3;
  return gptScansThisMonth < FREE_GPT_SCANS_PER_MONTH;
}
