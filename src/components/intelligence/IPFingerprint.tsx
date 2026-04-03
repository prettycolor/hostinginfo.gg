import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Shield } from "lucide-react";

interface IPFingerprintProps {
  ipAddress: string;
  asn: string | null;
  asnOrg: string | null;
  country: string | null;
  city: string | null;
  openPorts: number[];
  serviceBanners: Record<string, string>;
  tlsCertData: string | TLSCertificateData | null;
  httpResponses: Record<string, string>;
}

interface TLSCertificateSubject {
  CN?: string;
  commonName?: string;
}

interface TLSCertificateData {
  valid?: boolean;
  validTo?: string;
  valid_to?: string;
  issuer?: string;
  protocol?: string;
  cipher?: string;
  certType?: string;
  daysUntilExpiry?: number;
  daysRemaining?: number;
  altNames?: string;
  domains?: string[];
  wildcardCert?: boolean;
  subject?: string | TLSCertificateSubject;
  [key: string]: unknown;
}

export function IPFingerprint({
  ipAddress,
  asn,
  asnOrg,
  country,
  city,
  openPorts,
  serviceBanners,
  tlsCertData,
  httpResponses,
}: IPFingerprintProps) {
  const location = [city, country].filter(Boolean).join(", ") || "Unknown";
  const asnDisplay = asn && asnOrg ? `${asn} (${asnOrg})` : asn || "Unknown";

  // Normalize SSL data using the same mapping used by the Security tab.
  let sslData: TLSCertificateData | null = null;
  if (tlsCertData) {
    try {
      const cert =
        typeof tlsCertData === "string"
          ? (JSON.parse(tlsCertData) as TLSCertificateData)
          : tlsCertData;
      const altNameDomains =
        typeof cert.altNames === "string"
          ? cert.altNames
              .split(",")
              .map((name: string) => name.trim().replace(/^DNS:/i, ""))
              .filter(Boolean)
          : [];

      sslData = {
        ...cert,
        daysRemaining: cert.daysUntilExpiry ?? cert.daysRemaining ?? 0,
        domains: Array.isArray(cert.domains) ? cert.domains : altNameDomains,
        wildcardCert:
          typeof cert.wildcardCert === "boolean"
            ? cert.wildcardCert
            : String(cert.certType || "")
                .toLowerCase()
                .includes("wildcard"),
      };
    } catch {
      // Ignore parse errors
    }
  }

  // Get server type from service banners or HTTP headers
  const serverType =
    serviceBanners?.["80"] ||
    serviceBanners?.["443"] ||
    httpResponses?.["server"] ||
    httpResponses?.["Server"] ||
    null;

  const sslSubject = (() => {
    if (!sslData?.subject) return null;
    if (typeof sslData.subject === "string") return sslData.subject;
    if (typeof sslData.subject === "object") {
      return sslData.subject.CN || sslData.subject.commonName || null;
    }
    return null;
  })();

  const sslValidTo = sslData?.validTo || sslData?.valid_to || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>IP Fingerprint</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* IP Address */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">IP Address</div>
          <Badge variant="secondary" className="font-mono text-base">
            {ipAddress}
          </Badge>
        </div>

        {/* Geolocation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4" />
            Location
          </div>
          <div className="text-sm">{location}</div>
        </div>

        {/* ASN */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm font-semibold">ASN & Organization</div>
          <div className="text-sm font-mono">{asnDisplay}</div>
        </div>

        {/* Open Ports */}
        {openPorts && openPorts.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4" />
              Open Ports
            </div>
            <div className="flex flex-wrap gap-1.5">
              {openPorts.slice(0, 10).map((port) => (
                <Badge
                  key={port}
                  variant="outline"
                  className="text-xs font-mono"
                >
                  {port}
                </Badge>
              ))}
              {openPorts.length > 10 && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  +{openPorts.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Server Type */}
        {serverType && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-semibold">Server</div>
            <Badge variant="secondary" className="text-sm">
              {serverType}
            </Badge>
          </div>
        )}

        {/* SSL/TLS Certificate (simple infrastructure view) */}
        {sslData?.valid !== undefined && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-semibold">SSL/TLS Certificate</div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={
                    sslData.valid
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {sslData.valid ? "Valid" : "Invalid"}
                </span>
              </div>
              {sslValidTo && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valid until:</span>
                  <span className="font-mono text-xs">
                    {String(sslValidTo)}
                  </span>
                </div>
              )}
              {sslData.issuer && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Issuer:</span>
                  <span className="text-xs">{String(sslData.issuer)}</span>
                </div>
              )}
              {sslSubject && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subject:</span>
                  <span
                    className="text-xs truncate max-w-[200px]"
                    title={sslSubject}
                  >
                    {sslSubject}
                  </span>
                </div>
              )}
              {sslData.protocol && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Protocol:</span>
                  <span className="text-xs">{String(sslData.protocol)}</span>
                </div>
              )}
              {sslData.cipher && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cipher:</span>
                  <span
                    className="text-xs truncate max-w-[200px]"
                    title={String(sslData.cipher)}
                  >
                    {String(sslData.cipher)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HTTP Headers */}
        {httpResponses && Object.keys(httpResponses).length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-semibold">HTTP Headers</div>
            <div className="space-y-1">
              {Object.entries(httpResponses)
                .slice(0, 5)
                .map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground font-mono min-w-[100px]">
                      {key}:
                    </span>
                    <span className="font-mono truncate" title={value}>
                      {value}
                    </span>
                  </div>
                ))}
              {Object.keys(httpResponses).length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{Object.keys(httpResponses).length - 5} more headers
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
