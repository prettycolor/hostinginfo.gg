/**
 * Public API Client - NO AUTHENTICATION
 *
 * Use this for public endpoints that don't require authentication.
 * This client does NOT send Authorization headers.
 *
 * Examples:
 * - Intelligence scan APIs
 * - Public data endpoints
 * - External API proxies
 *
 * For authenticated endpoints, use apiClient from './api-client.ts'
 */

const API_BASE = "/api";

type QueryValue = string | number | boolean | null | undefined;

interface PublicGetOptions {
  params?: Record<string, QueryValue>;
}

function buildUrl(endpoint: string, options?: PublicGetOptions): string {
  const basePath = `${API_BASE}${endpoint}`;
  if (!options?.params) return basePath;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.params)) {
    if (value === null || value === undefined) continue;
    query.set(key, String(value));
  }

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export class PublicApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

/**
 * Public API client object with HTTP methods - NO AUTHENTICATION
 * Mirrors apiClient structure but without auth headers
 */
export const publicApiClient = {
  async get<T>(endpoint: string, options?: PublicGetOptions): Promise<T> {
    // NO AUTH TOKEN - this is intentional for public endpoints
    const response = await fetch(buildUrl(endpoint, options), {
      headers: {
        // No Authorization header
      },
    });

    if (!response.ok) {
      // Try to get error details from response body
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `${errorMessage}: ${errorData.error}`;
        }
        if (errorData.message) {
          errorMessage = `${errorMessage} - ${errorData.message}`;
        }
      } catch {
        // Response body is not JSON, use status text
      }
      console.error(
        `[Public API Client] GET ${endpoint} failed:`,
        errorMessage,
      );
      throw new PublicApiError(errorMessage, response.status);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    // NO AUTH TOKEN - this is intentional for public endpoints
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `${errorMessage}: ${errorData.error}`;
        }
        if (errorData.message) {
          errorMessage = `${errorMessage} - ${errorData.message}`;
        }
      } catch {
        // Response body is not JSON
      }
      console.error(
        `[Public API Client] POST ${endpoint} failed:`,
        errorMessage,
      );
      throw new PublicApiError(errorMessage, response.status);
    }
    return response.json();
  },

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    // NO AUTH TOKEN - this is intentional for public endpoints
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new PublicApiError(
        `API request failed: ${response.statusText}`,
        response.status,
      );
    }
    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    // NO AUTH TOKEN - this is intentional for public endpoints
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "DELETE",
      headers: {
        // No Authorization header
      },
    });

    if (!response.ok) {
      throw new PublicApiError(
        `API request failed: ${response.statusText}`,
        response.status,
      );
    }
    return response.json();
  },
};
