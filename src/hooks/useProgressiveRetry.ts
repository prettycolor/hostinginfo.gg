import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface RetryMetadata {
  needed?: boolean;
  fields?: string[];
  retryId?: string;
  completed?: boolean;
  failed?: boolean;
  timestamp?: string;
}

interface RetryableData {
  _retry?: RetryMetadata;
  wordpress?: Record<string, unknown>;
  php?: Record<string, unknown>;
  server?: Record<string, unknown>;
  [key: string]: unknown;
}

interface RetryResponse {
  results: {
    wordpress?: Record<string, unknown>;
    php?: Record<string, unknown>;
    server?: Record<string, unknown>;
  };
  timestamp?: string;
}

function normalizeDomain(rawDomain: string): string {
  return rawDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

/**
 * Progressive Retry Hook
 *
 * Automatically triggers background retries when scan data is incomplete
 * Updates state progressively as retry results arrive
 */
export function useProgressiveRetry<T extends RetryableData | null>(
  initialData: T,
  domain: string,
) {
  const [data, setData] = useState(initialData);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCompleted, setRetryCompleted] = useState(false);
  const [retryFields, setRetryFields] = useState<string[]>([]);

  // Update data when initialData changes
  useEffect(() => {
    setData(initialData);
    setRetryCompleted(false);
  }, [initialData]);

  // Trigger retry
  const triggerRetry = useCallback(async () => {
    const cleanDomain = normalizeDomain(domain || "");
    if (!data?._retry || isRetrying || !cleanDomain) return;

    setIsRetrying(true);
    console.log("[Progressive Retry] Starting background retry...");

    try {
      const response = await fetch("/api/scan/technology/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: cleanDomain,
          retryFields: data._retry.fields,
          retryId: data._retry.retryId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Retry failed: ${response.statusText}`);
      }

      const retryResult = (await response.json()) as RetryResponse;
      console.log("[Progressive Retry] Retry completed:", retryResult);

      // Merge retry results into existing data
      setData((prev) => {
        if (!prev) return prev;
        const merged = {
          ...prev,
          // Deep merge wordpress
          ...(retryResult.results.wordpress && {
            wordpress: {
              ...prev.wordpress,
              ...retryResult.results.wordpress,
            },
          }),
          // Deep merge php
          ...(retryResult.results.php && {
            php: {
              ...prev.php,
              ...retryResult.results.php,
            },
          }),
          // Deep merge server
          ...(retryResult.results.server && {
            server: {
              ...prev.server,
              ...retryResult.results.server,
            },
          }),
          _retry: {
            ...prev._retry,
            completed: true,
            timestamp: retryResult.timestamp,
          },
        };

        console.log("[Progressive Retry] Merged data:", merged);
        return merged as T;
      });

      setRetryCompleted(true);

      // Show success notification
      const updatedFields = Object.keys(retryResult.results);
      if (updatedFields.length > 0) {
        const fieldNames = updatedFields.map((f) => {
          if (f === "wordpress") return "WordPress version";
          if (f === "php") return "PHP version";
          if (f === "server") return "Server version";
          return f;
        });

        toast.success("Additional details detected!", {
          description: `Found ${fieldNames.join(", ")}`,
        });
      }
    } catch (error) {
      console.error("[Progressive Retry] Error:", error);

      // Mark as completed even on error (don't retry again)
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          _retry: {
            ...prev._retry,
            completed: true,
            failed: true,
          },
        } as T;
      });

      setRetryCompleted(true);
    } finally {
      setIsRetrying(false);
    }
  }, [data, domain, isRetrying]);

  // Detect if retry is needed
  useEffect(() => {
    if (!data || retryCompleted || isRetrying) return;

    if (data._retry?.needed && data._retry?.fields?.length > 0) {
      console.log("[Progressive Retry] Retry needed:", data._retry.fields);
      setRetryFields(data._retry.fields);

      // Trigger retry automatically after 1 second
      const timer = setTimeout(() => {
        triggerRetry();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [data, retryCompleted, isRetrying, triggerRetry]);

  return {
    data,
    isRetrying,
    retryCompleted,
    retryFields,
    triggerRetry,
  };
}
