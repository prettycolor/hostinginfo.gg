import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Minus, Plus, X } from "lucide-react";

interface ScanData {
  id: number;
  domain: string;
  edgeProvider: string | null;
  originHost: string | null;
  confidenceScore: number | null;
  techCount: number;
  createdAt: string;
  hostingData: Record<string, unknown> | null;
  dnsData: Record<string, unknown> | null;
  ipData: Record<string, unknown> | null;
  techData: {
    technologies?: Array<{
      name: string;
    }>;
  } | null;
}

interface ScanComparisonProps {
  oldScan: ScanData;
  newScan: ScanData;
}

export function ScanComparison({ oldScan, newScan }: ScanComparisonProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTechChanges = () => {
    try {
      const oldTech = oldScan.techData?.technologies || [];
      const newTech = newScan.techData?.technologies || [];

      const oldTechNames = oldTech.map((technology) => technology.name);
      const newTechNames = newTech.map((technology) => technology.name);

      const added = newTechNames.filter(
        (name: string) => !oldTechNames.includes(name),
      );
      const removed = oldTechNames.filter(
        (name: string) => !newTechNames.includes(name),
      );
      const unchanged = newTechNames.filter((name: string) =>
        oldTechNames.includes(name),
      );

      return { added, removed, unchanged };
    } catch (err) {
      console.error("Error comparing tech stacks:", err);
      return { added: [], removed: [], unchanged: [] };
    }
  };

  const techChanges = getTechChanges();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Comparison</CardTitle>
          <CardDescription>
            Comparing scans from {formatDate(oldScan.createdAt)} to{" "}
            {formatDate(newScan.createdAt)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Hosting Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hosting Infrastructure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* Old Scan */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Previous Scan
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Edge Provider</p>
                  <p className="font-medium">
                    {oldScan.edgeProvider || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Origin Host</p>
                  <p className="font-medium">
                    {oldScan.originHost || "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            {/* New Scan */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Latest Scan</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Edge Provider</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {newScan.edgeProvider || "Unknown"}
                    </p>
                    {oldScan.edgeProvider !== newScan.edgeProvider && (
                      <Badge
                        variant="outline"
                        className="text-xs text-orange-600 border-orange-600"
                      >
                        Changed
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Origin Host</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {newScan.originHost || "Unknown"}
                    </p>
                    {oldScan.originHost !== newScan.originHost && (
                      <Badge
                        variant="outline"
                        className="text-xs text-orange-600 border-orange-600"
                      >
                        Changed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Score Comparison */}
      {/* Technology Stack Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Technology Stack Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Added Technologies */}
            {techChanges.added.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <p className="font-medium text-green-600">
                    Added ({techChanges.added.length})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {techChanges.added.map((tech: string) => (
                    <Badge key={tech} className="bg-green-600">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Removed Technologies */}
            {techChanges.removed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <X className="h-4 w-4 text-red-600" />
                  <p className="font-medium text-red-600">
                    Removed ({techChanges.removed.length})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {techChanges.removed.map((tech: string) => (
                    <Badge
                      key={tech}
                      variant="outline"
                      className="text-red-600 border-red-600"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Unchanged Technologies */}
            {techChanges.unchanged.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-muted-foreground">
                    Unchanged ({techChanges.unchanged.length})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {techChanges.unchanged.slice(0, 10).map((tech: string) => (
                    <Badge key={tech} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                  {techChanges.unchanged.length > 10 && (
                    <Badge variant="outline">
                      +{techChanges.unchanged.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* No Changes */}
            {techChanges.added.length === 0 &&
              techChanges.removed.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  <p>No technology stack changes detected</p>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time between scans:</span>
              <span className="font-medium">
                {Math.round(
                  (new Date(newScan.createdAt).getTime() -
                    new Date(oldScan.createdAt).getTime()) /
                    (1000 * 60 * 60 * 24),
                )}{" "}
                days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hosting changes:</span>
              <span className="font-medium">
                {oldScan.edgeProvider !== newScan.edgeProvider ||
                oldScan.originHost !== newScan.originHost
                  ? "Yes"
                  : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Technologies added:</span>
              <span className="font-medium text-green-600">
                {techChanges.added.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Technologies removed:
              </span>
              <span className="font-medium text-red-600">
                {techChanges.removed.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
