import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Server, TrendingUp } from "lucide-react";

interface HostingAttributionProps {
  edgeProvider: string | null;
  edgeConfidence: number;
  originHost: string | null;
  originConfidence: number;
  confidenceScore: number;
  evidenceWeights: Record<string, number>;
  detectionMethod: string;
}

const EVIDENCE_LABELS: Record<string, string> = {
  cnameMatch: "CNAME Match",
  httpHeader: "HTTP Headers",
  techSignature: "Tech Signature",
  asnMatch: "ASN Match",
  asnOrg: "ASN Organization",
  asnKeyword: "ASN Keyword",
  serviceBanner: "Service Banner",
  techStack: "Tech Stack",
};

export function HostingAttribution({
  edgeProvider,
  edgeConfidence,
  originHost,
  originConfidence,
  confidenceScore,
  evidenceWeights,
  detectionMethod,
}: HostingAttributionProps) {
  // Sort evidence by weight (highest first)
  const sortedEvidence = Object.entries(evidenceWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5

  const maxWeight = Math.max(...Object.values(evidenceWeights), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Hosting Attribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Edge Provider */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cloud className="h-4 w-4" />
            Edge Provider (CDN/WAF)
          </div>
          <div>
            {edgeProvider ? (
              <Badge variant="secondary" className="text-base">
                {edgeProvider}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">
                None detected
              </span>
            )}
          </div>
        </div>

        {/* Origin Host */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="h-4 w-4" />
            Origin Host
          </div>
          <div>
            {originHost ? (
              <Badge variant="secondary" className="text-base">
                {originHost}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Unknown</span>
            )}
          </div>
        </div>

        {/* Confidence Scores */}
        <div className="space-y-3 pt-2 border-t">
          <div className="text-sm font-semibold">Attribution Confidence</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Edge</div>
              <div className="font-semibold">{edgeConfidence}%</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Origin</div>
              <div className="font-semibold">{originConfidence}%</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Overall</div>
              <div className="font-semibold">{confidenceScore}%</div>
            </div>
          </div>
        </div>

        {/* Evidence Breakdown */}
        {sortedEvidence.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <div className="text-sm font-semibold">Evidence Breakdown</div>
            <div className="space-y-2">
              {sortedEvidence.map(([type, weight]) => (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {EVIDENCE_LABELS[type] || type}
                    </span>
                    <span className="font-semibold">{weight}pts</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(weight / maxWeight) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detection Method */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Detection method:{" "}
          <span className="font-semibold">{detectionMethod}</span>
        </div>
      </CardContent>
    </Card>
  );
}
