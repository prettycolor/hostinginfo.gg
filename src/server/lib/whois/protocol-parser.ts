export interface ParsedWhoisProtocolData {
  registrar: string | null;
  registrarUrl: string | null;
  createdDate: string | null;
  expiryDate: string | null;
  updatedDate: string | null;
  nameServers: string[];
  status: string[];
  registrantOrg: string | null;
  registrantCountry: string | null;
  dnssec: string | null;
}

function extractFirst(raw: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function extractAll(raw: string, pattern: RegExp): string[] {
  const values: string[] = [];
  for (const match of raw.matchAll(pattern)) {
    const value = match[1]?.trim();
    if (value) values.push(value);
  }
  return Array.from(new Set(values));
}

function extractSectionValues(raw: string, sectionRegex: RegExp): string[] {
  const lines = raw.split(/\r?\n/);
  const values: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (!inSection) {
      const headingMatch = line.match(sectionRegex);
      if (!headingMatch) continue;

      inSection = true;
      const inlineValue = headingMatch[1]?.trim();
      if (inlineValue) values.push(inlineValue);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      if (values.length > 0) break;
      continue;
    }

    // Stop at the next section heading.
    if (/^[A-Za-z][A-Za-z0-9 \-_/]{1,60}:\s*$/.test(trimmed)) {
      break;
    }
    if (/^[A-Za-z][A-Za-z0-9 \-_/]{1,60}:\s+\S+/.test(trimmed)) {
      break;
    }

    values.push(trimmed);
  }

  return Array.from(new Set(values));
}

function cleanStatus(value: string): string {
  return value
    .replace(/\s+https?:\/\/\S+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNameserver(value: string): string | null {
  const cleaned = value
    .replace(/[(),]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!cleaned) return null;
  if (!/^[a-z0-9.-]+$/.test(cleaned)) return null;
  if (!cleaned.includes(".")) return null;
  return cleaned;
}

export function normalizeRegistrarFields(
  registrar: string | null,
  registrarUrl: string | null,
): { registrar: string | null; registrarUrl: string | null } {
  if (!registrar) {
    return { registrar, registrarUrl };
  }

  let normalizedRegistrar = registrar.replace(/\s+/g, " ").trim();
  let normalizedUrl = registrarUrl?.trim() || null;

  // Common format: "Registrar Name (http://example.com)"
  const registrarWithUrl = normalizedRegistrar.match(
    /^(.*?)\s*\((https?:\/\/[^)]+)\)\s*$/i,
  );
  if (registrarWithUrl) {
    normalizedRegistrar = registrarWithUrl[1].trim();
    if (!normalizedUrl) {
      normalizedUrl = registrarWithUrl[2].trim();
    }
  }

  return {
    registrar: normalizedRegistrar || null,
    registrarUrl: normalizedUrl || null,
  };
}

export function formatWhoisDate(dateString: string): string {
  const normalized = dateString
    .replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1")
    .replace(/\bat\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const hasExplicitTimezone =
      /\b(?:UTC|GMT)\b/i.test(normalized) ||
      /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
    const parseInput = hasExplicitTimezone ? normalized : `${normalized} UTC`;
    const date = new Date(parseInput);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return dateString;
  }
}

export function parseWhoisProtocolRaw(raw: string): ParsedWhoisProtocolData {
  const rawRegistrar = extractFirst(raw, [
    /^\s*Registrar:\s*(.+)$/im,
    /^\s*Sponsoring Registrar:\s*(.+)$/im,
  ]);
  const rawRegistrarUrl = extractFirst(raw, [
    /^\s*Registrar URL:\s*(.+)$/im,
    /^\s*Registrar WHOIS Server:\s*(https?:\/\/\S+)$/im,
  ]);
  const { registrar, registrarUrl } = normalizeRegistrarFields(
    rawRegistrar,
    rawRegistrarUrl,
  );

  const createdDateRaw = extractFirst(raw, [
    /^\s*Creation Date:\s*(.+)$/im,
    /^\s*Created On:\s*(.+)$/im,
    /^\s*Created:\s*(.+)$/im,
    /^\s*Registered on\s*(.+)$/im,
    /^\s*Registered:\s*(.+)$/im,
  ]);
  const expiryDateRaw = extractFirst(raw, [
    /^\s*Registry Expiry Date:\s*(.+)$/im,
    /^\s*Registrar Registration Expiration Date:\s*(.+)$/im,
    /^\s*Expiration Date:\s*(.+)$/im,
    /^\s*Expiry Date:\s*(.+)$/im,
    /^\s*Expires(?: on)?:\s*(.+)$/im,
  ]);
  const updatedDateRaw = extractFirst(raw, [
    /^\s*Updated Date:\s*(.+)$/im,
    /^\s*Last Updated On:\s*(.+)$/im,
    /^\s*Changed:\s*(.+)$/im,
    /^\s*Last modified:\s*(.+)$/im,
  ]);

  const explicitNameservers = extractAll(raw, /^\s*Name Server:\s*(.+)$/gim);
  const sectionNameservers = extractSectionValues(
    raw,
    /^\s*Name servers?:\s*(.*)$/i,
  );
  const nameServers = Array.from(
    new Set(
      [...explicitNameservers, ...sectionNameservers]
        .map(cleanNameserver)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const explicitStatuses = extractAll(raw, /^\s*Domain Status:\s*(.+)$/gim);
  const sectionStatuses = extractSectionValues(
    raw,
    /^\s*Domain Status:\s*(.*)$/i,
  );
  const status = Array.from(
    new Set(
      [...explicitStatuses, ...sectionStatuses]
        .map(cleanStatus)
        .filter((value) => value.length > 0),
    ),
  );

  const dnssec = extractFirst(raw, [/^\s*DNSSEC:\s*(.+)$/im]);
  const registrantOrg =
    extractFirst(raw, [
      /^\s*Registrant Organization:\s*(.+)$/im,
      /^\s*Registrant Org(?:anization)?:\s*(.+)$/im,
    ]) || extractFirst(raw, [/^\s*Registrant:\s*(.+)$/im]);
  const registrantCountry = extractFirst(raw, [
    /^\s*Registrant Country:\s*(.+)$/im,
  ]);

  return {
    registrar,
    registrarUrl,
    createdDate: createdDateRaw ? formatWhoisDate(createdDateRaw) : null,
    expiryDate: expiryDateRaw ? formatWhoisDate(expiryDateRaw) : null,
    updatedDate: updatedDateRaw ? formatWhoisDate(updatedDateRaw) : null,
    nameServers,
    status,
    registrantOrg,
    registrantCountry,
    dnssec,
  };
}
