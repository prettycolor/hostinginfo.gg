import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "@dr.pogodin/react-helmet";
import App from "./App";
import "./styles/globals.css";

const CHUNK_RECOVERY_KEY = "hostinginfo_chunk_recovery_ts";
const CHUNK_RECOVERY_WINDOW_MS = 30_000;

function isChunkLoadError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? `${error.name}: ${error.message}`
        : "";

  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("chunkloaderror")
  );
}

function attemptChunkRecovery() {
  try {
    const now = Date.now();
    const lastAttempt = Number(
      sessionStorage.getItem(CHUNK_RECOVERY_KEY) || "0",
    );
    if (now - lastAttempt < CHUNK_RECOVERY_WINDOW_MS) {
      return;
    }
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(now));
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

window.addEventListener("error", (event) => {
  const candidate = event.error || event.message;
  if (isChunkLoadError(candidate)) {
    attemptChunkRecovery();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) {
    event.preventDefault();
    attemptChunkRecovery();
  }
});

// Add robots meta tag only in development mode
if (import.meta.env.DEV) {
  const meta = document.createElement("meta");
  meta.name = "robots";
  meta.content = "noindex, nofollow";
  document.head.appendChild(meta);
}

// Reload the page after a hot reload
if (import.meta.hot) {
  import.meta.hot.on("vite:afterUpdate", () => {
    window.location.reload();
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Support both client-side navigation and SSR hydration
const rootElement = document.getElementById("app");
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
