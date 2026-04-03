/**
 * Normalize user-provided domains into a stable dedupe key.
 */
export function normalizeDomainForRewards(input: string): string {
  const trimmed = String(input ?? '').trim().toLowerCase();
  if (!trimmed) {
    return '';
  }

  const fallbackNormalized = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    .split(':')[0]
    .replace(/\.+$/, '');

  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, '').replace(/\.+$/, '');
  } catch {
    return fallbackNormalized;
  }
}
