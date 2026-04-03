/**
 * Simple Logger Utility
 *
 * Provides consistent logging across the application with different log levels.
 */

export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger: Logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};
