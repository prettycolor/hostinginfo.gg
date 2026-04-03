import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { Suspense, useEffect } from "react";
import RootLayout from "./layouts/RootLayout";
import { routes } from "./routes";
import Spinner from "./components/Spinner";
import GoogleAnalytics from "./components/GoogleAnalytics";
import CookieBanner from "./components/CookieBanner";
import AnalyticsConsentBootstrap from "./components/AnalyticsConsentBootstrap";
import { AuthProvider } from "./lib/auth-provider";
import { UnlockNotificationProvider } from "./components/UnlockNotificationProvider";
import { SignupConfetti } from "./components/SignupConfetti";
import { ToastProvider } from "./contexts/ToastProvider";
import { Toaster } from "./components/ui/sonner";
import ScrollToTop from "./components/ScrollToTop";
import { Terminal } from "@/components/terminal/Terminal";
import { useTerminalStore } from "@/lib/terminal/terminal-store";
import { PerformanceProvider } from "@/lib/performance/performance-provider";
import { PerformanceOptimizer } from "@/components/PerformanceOptimizer";
import { FilterProvider } from "@/contexts/FilterProvider";
import { applyFirefoxWebGLCompatibilityPatch } from "@/lib/firefox-compat";
import RouteErrorFallback from "@/components/RouteErrorFallback";

const SpinnerFallback = () => (
  <div className="flex justify-center py-8 h-screen items-center">
    <Spinner />
  </div>
);

// Terminal wrapper component
function TerminalWrapper() {
  const { isOpen, closeTerminal } = useTerminalStore();
  return <Terminal isOpen={isOpen} onClose={closeTerminal} />;
}

function LayoutWrapper() {
  return (
    <FilterProvider>
      <PerformanceOptimizer />
      <ScrollToTop />
      <GoogleAnalytics />
      <SignupConfetti />
      <TerminalWrapper />
      <RootLayout>
        <Outlet />
      </RootLayout>
    </FilterProvider>
  );
}

// Create router with layout wrapper
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProvider>
        <Suspense fallback={<SpinnerFallback />}>
          <LayoutWrapper />
        </Suspense>
      </AuthProvider>
    ),
    errorElement: <RouteErrorFallback />,
    children: routes,
  },
]);

export default function App() {
  useEffect(() => {
    applyFirefoxWebGLCompatibilityPatch();
  }, []);

  useEffect(() => {
    const reloadGuardKey = "ht_chunk_reload_ts";

    const tryReload = () => {
      const now = Date.now();
      const lastReloadAt = Number(
        sessionStorage.getItem(reloadGuardKey) || "0",
      );

      // Guard against reload loops if CDN/proxy is still stale.
      if (now - lastReloadAt < 15000) {
        return;
      }

      sessionStorage.setItem(reloadGuardKey, String(now));
      window.location.reload();
    };

    const onVitePreloadError = (event: Event) => {
      event.preventDefault?.();
      tryReload();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonMessage =
        typeof event.reason === "string" ? event.reason : event.reason?.message;

      if (
        typeof reasonMessage === "string" &&
        reasonMessage.includes("Failed to fetch dynamically imported module")
      ) {
        event.preventDefault();
        tryReload();
      }
    };

    window.addEventListener("vite:preloadError", onVitePreloadError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("vite:preloadError", onVitePreloadError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <PerformanceProvider>
      <ToastProvider>
        <UnlockNotificationProvider>
          <AnalyticsConsentBootstrap />
          <RouterProvider router={router} />
          <CookieBanner />
          <Toaster />
        </UnlockNotificationProvider>
      </ToastProvider>
    </PerformanceProvider>
  );
}
