import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Mail, Info } from "lucide-react";

interface DNSRecord {
  recordType: string;
  recordValue: string;
  ttl: number | null;
}

interface MXRecord {
  exchange: string;
  priority: number;
}

interface SecurityGatewayInfo {
  detected?: boolean;
  provider?: string;
}

interface EmailData {
  mx?: MXRecord[];
  providers?: string[];
  securityGateway?: string | SecurityGatewayInfo;
}

interface DNSInfrastructureProps {
  domain: string;
  records: DNSRecord[];
  authoritativeNameservers: string[];
  subdomainCount: number;
  discoveredSubdomains?: string[];
  emailData?: EmailData;
  isWebsiteBuilder?: boolean;
  builderType?: string | null;
}

const KNOWN_RECORD_TYPES = new Set(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]);

function toAccordionValue(prefix: string, value: string) {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function DNSInfrastructure({
  domain,
  records,
  authoritativeNameservers,
  subdomainCount,
  discoveredSubdomains = [],
  emailData,
  isWebsiteBuilder = false,
  builderType = null,
}: DNSInfrastructureProps) {
  const securityGatewayLabel =
    typeof emailData?.securityGateway === "string"
      ? emailData.securityGateway
      : emailData?.securityGateway?.provider;

  const aRecords = records.filter((r) => r.recordType === "A");
  const aaaaRecords = records.filter((r) => r.recordType === "AAAA");
  const cnameRecords = records.filter((r) => r.recordType === "CNAME");
  const mxRecords = records.filter((r) => r.recordType === "MX");
  const txtRecords = records.filter((r) => r.recordType === "TXT");

  const otherRecordTypes = records.reduce<Record<string, DNSRecord[]>>(
    (acc, record) => {
      if (KNOWN_RECORD_TYPES.has(record.recordType)) return acc;
      if (!acc[record.recordType]) {
        acc[record.recordType] = [];
      }
      acc[record.recordType].push(record);
      return acc;
    },
    {},
  );
  const otherRecordTypeEntries = Object.entries(otherRecordTypes).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  const cnameChain =
    cnameRecords.length > 0
      ? [domain, ...cnameRecords.map((r) => r.recordValue)]
      : null;

  if (isWebsiteBuilder && builderType) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Managed DNS Infrastructure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              DNS records are managed by <strong>{builderType}</strong>. You can
              configure custom domains through the {builderType} dashboard.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-semibold">Domain Information</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Domain</span>
                <span className="font-mono">{domain}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform</span>
                <Badge variant="secondary">{builderType}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>DNS Infrastructure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Accordion type="multiple" className="w-full">
          {aRecords.length > 0 && (
            <AccordionItem value="a-records">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  A Records (IPv4)
                  <Badge variant="outline" className="text-xs">
                    {aRecords.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {aRecords.slice(0, 3).map((record, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        {record.recordValue}
                      </Badge>
                      {record.ttl && (
                        <span className="text-xs text-muted-foreground">
                          TTL: {record.ttl}s
                        </span>
                      )}
                    </div>
                  ))}
                  {aRecords.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{aRecords.length - 3} more
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {aaaaRecords.length > 0 && (
            <AccordionItem value="aaaa-records">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  AAAA Records (IPv6)
                  <Badge variant="outline" className="text-xs">
                    {aaaaRecords.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {aaaaRecords.slice(0, 2).map((record, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        {record.recordValue}
                      </Badge>
                    </div>
                  ))}
                  {aaaaRecords.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{aaaaRecords.length - 2} more
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {cnameChain && (
            <AccordionItem value="cname-chain">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  CNAME Chain
                  <Badge variant="outline" className="text-xs">
                    {cnameRecords.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-1">
                  {cnameChain.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {idx > 0 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-sm font-mono">{name}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {discoveredSubdomains.length > 0 && (
            <AccordionItem value="discovered-subdomains">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Discovered Subdomains
                  <Badge variant="outline" className="text-xs">
                    {discoveredSubdomains.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  {discoveredSubdomains.slice(0, 20).map((subdomain, idx) => (
                    <div
                      key={`${subdomain}-${idx}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">-</span>
                      <span className="font-mono text-xs break-all">
                        {subdomain}
                      </span>
                    </div>
                  ))}
                  {discoveredSubdomains.length > 20 && (
                    <span className="text-xs text-muted-foreground">
                      +{discoveredSubdomains.length - 20} more
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {txtRecords.length > 0 && (
            <AccordionItem value="txt-records">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  TXT Records
                  <Badge variant="outline" className="text-xs">
                    {txtRecords.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {txtRecords.slice(0, 5).map((record, idx) => (
                    <div key={idx} className="rounded-md bg-muted/30 p-2">
                      <div className="text-xs font-mono break-all">
                        {record.recordValue.length > 100
                          ? `${record.recordValue.substring(0, 100)}...`
                          : record.recordValue}
                      </div>
                    </div>
                  ))}
                  {txtRecords.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{txtRecords.length - 5} more TXT records
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {otherRecordTypeEntries.map(([recordType, typeRecords]) => (
            <AccordionItem
              key={recordType}
              value={toAccordionValue("record-type", recordType)}
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {recordType} Records
                  <Badge variant="outline" className="text-xs">
                    {typeRecords.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {typeRecords.slice(0, 5).map((record, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        {record.recordValue}
                      </Badge>
                      {record.ttl && (
                        <span className="text-xs text-muted-foreground">
                          TTL: {record.ttl}s
                        </span>
                      )}
                    </div>
                  ))}
                  {typeRecords.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{typeRecords.length - 5} more
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}

          {authoritativeNameservers.length > 0 && (
            <AccordionItem value="nameservers">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Nameservers
                  <Badge variant="outline" className="text-xs">
                    {authoritativeNameservers.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  {authoritativeNameservers.slice(0, 4).map((ns, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">-</span>
                      <span className="font-mono text-xs">{ns}</span>
                    </div>
                  ))}
                  {authoritativeNameservers.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{authoritativeNameservers.length - 4} more
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {emailData?.mx && emailData.mx.length > 0 ? (
            <AccordionItem value="mail-servers">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="h-4 w-4 text-primary" />
                  Mail Servers
                  <Badge variant="outline" className="text-xs">
                    {emailData.mx.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {emailData.mx.slice(0, 3).map((mx, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-muted/30 p-2"
                    >
                      <div className="flex-1">
                        <div className="font-mono text-xs">{mx.exchange}</div>
                        <div className="text-xs text-muted-foreground">
                          Priority: {mx.priority}
                        </div>
                      </div>
                      {idx === 0 &&
                        emailData.providers &&
                        emailData.providers.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {emailData.providers[0]}
                          </Badge>
                        )}
                      {idx === 0 && securityGatewayLabel && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {securityGatewayLabel}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {emailData.mx.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{emailData.mx.length - 3} more mail servers
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : (
            mxRecords.length > 0 && (
              <AccordionItem value="mail-servers">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Mail className="h-4 w-4 text-primary" />
                    Mail Servers (MX)
                    <Badge variant="outline" className="text-xs">
                      {mxRecords.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1">
                    {mxRecords.slice(0, 3).map((record, idx) => (
                      <div key={idx} className="text-sm font-mono text-xs">
                        {record.recordValue}
                      </div>
                    ))}
                    {mxRecords.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{mxRecords.length - 3} more
                      </span>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          )}
        </Accordion>

        <div className="grid grid-cols-2 gap-4 border-t pt-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{records.length}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Subdomains</div>
            <div className="text-2xl font-bold">{subdomainCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
