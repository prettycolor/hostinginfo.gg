import {
  Lock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface SSLCertificateCardProps {
  valid: boolean;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  protocol?: string;
  cipher?: string;
  grade: string;
  domains?: string[];
  wildcardCert?: boolean;
  compact?: boolean;
  showGrade?: boolean;
}

export function SSLCertificateCard({
  valid,
  issuer,
  validFrom,
  validTo,
  daysRemaining,
  protocol,
  cipher,
  grade,
  domains = [],
  wildcardCert = false,
  compact = false,
  showGrade = true,
}: SSLCertificateCardProps) {
  // Determine expiration status color
  const getExpirationColor = (days: number) => {
    if (days > 30) return "text-green-600 dark:text-green-400";
    if (days > 15) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getExpirationBgColor = (days: number) => {
    if (days > 30) return "bg-green-500/10 border-green-500/20";
    if (days > 15) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  // Determine grade color
  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A"))
      return "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400";
    if (grade.startsWith("B"))
      return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
    if (grade.startsWith("C"))
      return "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400";
    if (grade.startsWith("D"))
      return "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400";
    return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
  };

  return (
    <Card className="border-2">
      <CardContent className={compact ? "pt-5 pb-5" : "pt-6"}>
        <div className={`flex items-center gap-3 ${compact ? "mb-4" : "mb-6"}`}>
          <div
            className={`p-3 rounded-lg ${valid ? "bg-green-500/10" : "bg-red-500/10"}`}
          >
            {valid ? (
              <Lock className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">SSL/TLS Certificate</h3>
            <p className="text-sm text-muted-foreground">
              {valid ? "Valid and trusted" : "Invalid or expired"}
            </p>
          </div>
          {showGrade && (
            <Badge
              variant="outline"
              className={`text-lg font-bold px-3 py-1 ${getGradeColor(grade)}`}
            >
              {grade}
            </Badge>
          )}
        </div>

        {/* Validity Status */}
        <div className={compact ? "mb-4" : "mb-6"}>
          <div className="flex items-center gap-2 mb-2">
            {valid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            <span
              className={`font-semibold ${valid ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {valid ? "Certificate Valid" : "Certificate Invalid"}
            </span>
          </div>
        </div>

        {/* Expiration Countdown */}
        <div
          className={`p-4 rounded-lg border-2 ${compact ? "mb-4" : "mb-6"} ${getExpirationBgColor(daysRemaining)}`}
        >
          <div className="flex items-center gap-3">
            <Calendar
              className={`h-5 w-5 ${getExpirationColor(daysRemaining)}`}
            />
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Expires in</div>
              <div
                className={`text-2xl font-bold ${getExpirationColor(daysRemaining)}`}
              >
                {daysRemaining} days
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {format(new Date(validTo), "MMMM d, yyyy")}
          </div>
        </div>

        {/* Certificate Details */}
        <div className={compact ? "space-y-2" : "space-y-3"}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Issuer</span>
            <span className="text-sm font-medium">{issuer}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valid From</span>
            <span className="text-sm font-medium">
              {format(new Date(validFrom), "MMM d, yyyy")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valid To</span>
            <span className="text-sm font-medium">
              {format(new Date(validTo), "MMM d, yyyy")}
            </span>
          </div>

          {protocol && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Protocol</span>
              <span className="text-sm font-medium">{protocol}</span>
            </div>
          )}

          {cipher && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Cipher Suite
              </span>
              <span
                className="text-sm font-medium text-right max-w-[200px] truncate"
                title={cipher}
              >
                {cipher}
              </span>
            </div>
          )}

          {wildcardCert && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Certificate Type
              </span>
              <Badge variant="outline" className="text-xs">
                Wildcard
              </Badge>
            </div>
          )}
        </div>

        {/* Covered Domains */}
        {!compact && domains.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Covered Domains ({domains.length})
              </span>
            </div>
            <div className="space-y-2">
              {domains.slice(0, 3).map((domain, index) => (
                <div
                  key={index}
                  className="text-sm font-mono bg-muted/50 px-3 py-2 rounded"
                >
                  {domain}
                </div>
              ))}
              {domains.length > 3 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  + {domains.length - 3} more domain
                  {domains.length - 3 !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
