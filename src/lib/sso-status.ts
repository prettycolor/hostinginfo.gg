export interface SsoProviderStatus {
  google: boolean;
  github: boolean;
  microsoft: boolean;
  apple: boolean;
}

export const DEFAULT_SSO_PROVIDER_STATUS: SsoProviderStatus = {
  google: false,
  github: false,
  microsoft: false,
  apple: false,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function normalizeSsoProviderStatus(value: unknown): SsoProviderStatus {
  const record = asRecord(value);

  return {
    google: record?.google === true,
    github: record?.github === true,
    microsoft: record?.microsoft === true,
    apple: record?.apple === true,
  };
}

export async function fetchSsoProviderStatus(
  signal?: AbortSignal,
): Promise<SsoProviderStatus> {
  try {
    const response = await fetch("/api/auth/sso-status", { signal });
    if (!response.ok) return { ...DEFAULT_SSO_PROVIDER_STATUS };

    const payload = (await response.json()) as { providers?: unknown };
    return normalizeSsoProviderStatus(payload.providers);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return { ...DEFAULT_SSO_PROVIDER_STATUS };
  }
}
