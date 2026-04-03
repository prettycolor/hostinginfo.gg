import { Shield, CheckCircle2, XCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { shouldRecommendWaf } from "@/lib/security-waf";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WafEvidenceDetail {
  type?: string;
  signal?: string;
  provider?: string;
  confidence?: number;
  role?: string;
  matchedIp?: string;
}

interface WafHistorySummary {
  sampleSize?: number;
  detectionRate?: number;
  managedEdgeRate?: number;
  lastDetectedAt?: string | null;
}

interface WAFProtectionCardProps {
  wafDetected: boolean;
  wafProvider: string | null;
  wafConfidence: number;
  ddosProtection: boolean;
  methods?: string[];
  hostProvider?: string | null;
  corroborated?: boolean;
  evidenceDetails?: WafEvidenceDetail[];
  historySummary?: WafHistorySummary | null;
}

export function WAFProtectionCard({
  wafDetected,
  wafProvider,
  wafConfidence,
  ddosProtection,
  methods = [],
  hostProvider = null,
  corroborated = false,
  evidenceDetails = [],
  historySummary = null,
}: WAFProtectionCardProps) {
  const showWafRecommendation = shouldRecommendWaf({
    wafDetected,
    hostProvider,
    wafConfidence,
    corroborated,
  });

  const displayMethods =
    methods.length > 0
      ? methods
      : evidenceDetails
          .slice(0, 6)
          .map((detail) => detail.signal)
          .filter((signal): signal is string => Boolean(signal));

  const hasManagedEdgeHint = !wafDetected && Boolean(hostProvider);

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`p-3 rounded-lg ${wafDetected ? "bg-green-500/10" : "bg-red-500/10"}`}
          >
            <Shield
              className={`h-6 w-6 ${wafDetected ? "text-green-500" : "text-red-500"}`}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">WAF & DDoS Protection</h3>
            <p className="text-sm text-muted-foreground">
              Web Application Firewall detection
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button>
                  <Info className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  A Web Application Firewall (WAF) protects your site from
                  common attacks like SQL injection, XSS, and other OWASP Top 10
                  vulnerabilities.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* WAF Detection Status */}
        <div
          className={`p-6 rounded-lg border-2 mb-6 ${wafDetected ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}
        >
          <div className="flex items-center gap-3 mb-4">
            {wafDetected ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
            <div className="flex-1">
              <div
                className={`text-2xl font-bold ${wafDetected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              >
                {wafDetected ? "WAF Detected" : "No WAF Detected"}
              </div>
              {wafDetected && wafProvider && (
                <div className="text-lg text-muted-foreground mt-1">
                  Provider:{" "}
                  <span className="font-semibold text-foreground">
                    {wafProvider}
                  </span>
                </div>
              )}
              {!wafDetected && hasManagedEdgeHint && (
                <div className="text-sm text-muted-foreground mt-2">
                  Managed edge host detected:{" "}
                  <span className="font-semibold text-foreground">
                    {hostProvider}
                  </span>
                </div>
              )}
              {wafConfidence > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  Detection confidence: {Math.round(wafConfidence)}%
                  {corroborated ? " (corroborated)" : ""}
                </div>
              )}
            </div>
            {wafDetected && (
              <Badge
                variant="outline"
                className="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 text-lg px-3 py-1"
              >
                Protected
              </Badge>
            )}
          </div>
        </div>

        {/* DDoS Protection */}
        <div
          className={`p-4 rounded-lg border-2 mb-6 ${ddosProtection ? "bg-blue-500/5 border-blue-500/20" : "bg-muted/50 border-border"}`}
        >
          <div className="flex items-center gap-3">
            {ddosProtection ? (
              <CheckCircle2 className="h-6 w-6 text-blue-500" />
            ) : (
              <XCircle className="h-6 w-6 text-muted-foreground" />
            )}
            <div className="flex-1">
              <div className="font-semibold">DDoS Protection</div>
              <div className="text-sm text-muted-foreground">
                {ddosProtection
                  ? "Active - Your site is protected from distributed denial-of-service attacks"
                  : "Not detected - Consider enabling DDoS protection"}
              </div>
            </div>
            {ddosProtection && (
              <Badge
                variant="outline"
                className="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
              >
                Active
              </Badge>
            )}
          </div>
        </div>

        {/* Detection Methods */}
        {displayMethods.length > 0 && (
          <div className="pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Detection Methods
              </span>
            </div>
            <div className="space-y-2">
              {displayMethods.map((method, index) => (
                <div
                  key={index}
                  className="text-sm bg-muted/50 px-3 py-2 rounded flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-mono">{method}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {historySummary && (historySummary.sampleSize ?? 0) > 0 && (
          <div className="mt-6 p-4 bg-muted/40 border rounded-lg">
            <div className="text-sm font-semibold mb-2">
              Historical Certainty (New Scan Model)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
              <div>Samples: {historySummary.sampleSize}</div>
              <div>WAF detections: {historySummary.detectionRate}%</div>
              <div>Managed edge: {historySummary.managedEdgeRate}%</div>
            </div>
          </div>
        )}

        {/* Why This Matters */}
        <div className="mt-6 p-4 bg-blue-500/5 border-2 border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                Why WAF Protection Matters
              </div>
              <p className="text-sm text-muted-foreground">
                A WAF acts as a shield between your website and the internet,
                filtering malicious traffic and blocking common attack patterns.
                It's essential for protecting sensitive data and maintaining
                site availability.
              </p>
            </div>
          </div>
        </div>

        {/* Recommendation for unprotected sites */}
        {showWafRecommendation && (
          <div className="mt-6 p-4 bg-orange-500/5 border-2 border-orange-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <div className="font-semibold text-orange-600 dark:text-orange-400 mb-1">
                  Recommendation: Enable WAF Protection
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Your site is not protected by a Web Application Firewall.
                  Consider using:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Cloudflare (Free tier available)</li>
                  <li>• Sucuri Website Firewall</li>
                  <li>• AWS WAF</li>
                  <li>• Wordfence (WordPress)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!showWafRecommendation && !wafDetected && hasManagedEdgeHint && (
          <div className="mt-6 p-4 bg-emerald-500/5 border-2 border-emerald-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                  Managed Edge Protection Likely
                </div>
                <p className="text-sm text-muted-foreground">
                  Edge-host indicators were detected for {hostProvider}. Review
                  firewall policy configuration in your edge platform dashboard
                  to confirm active blocking rules.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
