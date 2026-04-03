export function normalizeScanDomainInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let candidate = trimmed.replace(/^["'`]+|["'`]+$/g, "");
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidate);
  const looksLikeUrlWithoutProtocol =
    /[/?#]/.test(candidate) || candidate.includes("@");

  let hostname = "";
  if (hasProtocol || looksLikeUrlWithoutProtocol) {
    try {
      const parsed = new URL(hasProtocol ? candidate : `https://${candidate}`);
      hostname = parsed.hostname;
    } catch {
      return null;
    }
  } else {
    hostname = candidate;
  }

  hostname = hostname
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .toLowerCase();

  if (!hostname || hostname.length > 253 || hostname.includes("..")) {
    return null;
  }

  const labels = hostname.split(".");
  if (labels.length < 2) {
    return null;
  }

  for (const label of labels) {
    if (
      !label ||
      label.length > 63 ||
      !/^[a-z0-9-]+$/.test(label) ||
      label.startsWith("-") ||
      label.endsWith("-")
    ) {
      return null;
    }
  }

  return hostname;
}
