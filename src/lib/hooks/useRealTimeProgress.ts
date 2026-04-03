/**
 * React Hook for Real-Time Progress Tracking
 *
 * Provides WebSocket-based real-time progress updates in React components.
 *
 * Usage:
 * ```tsx
 * const { progress, isConnected, subscribe } = useRealTimeProgress();
 *
 * // Subscribe to operation
 * useEffect(() => {
 *   subscribe({ operationId: 'scan_123' });
 * }, []);
 *
 * // Display progress
 * {progress && (
 *   <ProgressBar value={progress.progress} />
 * )}
 * ```
 */

import { useEffect, useState, useCallback, useRef } from "react";

interface ProgressEvent {
  type: string;
  operationId: string;
  operationType: "scan" | "batch" | "intelligence" | "report";
  progress: number;
  currentStage?: string;
  stages?: Array<{
    name: string;
    weight: number;
    status: "pending" | "in_progress" | "completed" | "failed";
  }>;
  startTime: Date;
  estimatedCompletion?: Date;
  elapsedTime?: number;
  remainingTime?: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  message?: string;
  error?: string;
  result?: unknown;
  timestamp: Date;
}

interface UseRealTimeProgressOptions {
  userId?: number;
  autoConnect?: boolean;
  onProgress?: (event: ProgressEvent) => void;
  onComplete?: (event: ProgressEvent) => void;
  onError?: (event: ProgressEvent) => void;
}

export function useRealTimeProgress(options: UseRealTimeProgressOptions = {}) {
  const {
    userId,
    autoConnect = false,
    onProgress,
    onComplete,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [activeOperations, setActiveOperations] = useState<ProgressEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws/progress`);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Authenticate if userId provided
        if (userId) {
          ws.send(
            JSON.stringify({
              type: "auth",
              data: { userId },
            }),
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "connected":
              console.log("[WebSocket] Connection confirmed");
              break;

            case "progress": {
              const progressEvent = data.event as ProgressEvent;
              setProgress(progressEvent);

              // Call callbacks
              if (onProgress) {
                onProgress(progressEvent);
              }

              if (progressEvent.status === "completed" && onComplete) {
                onComplete(progressEvent);
              }

              if (progressEvent.status === "failed" && onError) {
                onError(progressEvent);
              }
              break;
            }

            case "active_operations":
              setActiveOperations(data.operations);
              break;

            case "subscribed":
              console.log("[WebSocket] Subscribed to", data.subscription);
              break;

            case "auth_success":
              console.log("[WebSocket] Authenticated as user", data.userId);
              break;

            case "pong":
              // Heartbeat response
              break;

            default:
              console.log("[WebSocket] Unknown message type:", data.type);
          }
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
        }
      };

      ws.onerror = () => {
        // Silently handle WebSocket errors (server may not be available)
        console.warn(
          "[WebSocket] Connection failed - WebSocket server not available",
        );
        setError("WebSocket connection error");
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);

        // Don't attempt to reconnect if server is not available
        // This prevents console spam when WebSocket server is not running
        if (autoConnect && reconnectAttemptsRef.current < 2) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            5000,
          );
          console.log(`[WebSocket] Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= 2) {
          console.log(
            "[WebSocket] Max reconnection attempts reached - WebSocket features disabled",
          );
        }
      };

      wsRef.current = ws;
    } catch {
      console.warn(
        "[WebSocket] Failed to connect - WebSocket server not available",
      );
      setError("Failed to establish WebSocket connection");
      setIsConnected(false);
    }
  }, [userId, autoConnect, onProgress, onComplete, onError]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Subscribe to operation or user updates
   */
  const subscribe = useCallback(
    (params: { operationId?: string; userId?: number }) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn("[WebSocket] Not connected, cannot subscribe");
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "subscribe",
          data: params,
        }),
      );
    },
    [],
  );

  /**
   * Unsubscribe from operation or user updates
   */
  const unsubscribe = useCallback(
    (params: { operationId?: string; userId?: number }) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          type: "unsubscribe",
          data: params,
        }),
      );
    },
    [],
  );

  /**
   * Get all active operations
   */
  const getActiveOperations = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Not connected, cannot get active operations");
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: "get_active",
      }),
    );
  }, []);

  /**
   * Send ping to keep connection alive
   */
  const ping = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: "ping",
      }),
    );
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      ping();
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, ping]);

  return {
    // Connection state
    isConnected,
    error,

    // Progress data
    progress,
    activeOperations,

    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    getActiveOperations,
  };
}

/**
 * Hook for tracking a specific operation
 */
export function useOperationProgress(
  operationId: string,
  options: UseRealTimeProgressOptions = {},
) {
  const { progress, subscribe, ...rest } = useRealTimeProgress(options);

  useEffect(() => {
    if (operationId) {
      subscribe({ operationId });
    }
  }, [operationId, subscribe]);

  // Filter progress for this operation
  const operationProgress =
    progress?.operationId === operationId ? progress : null;

  return {
    progress: operationProgress,
    ...rest,
  };
}
