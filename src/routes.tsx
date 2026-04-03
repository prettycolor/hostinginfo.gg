import { RouteObject } from "react-router-dom";
import { lazy } from "react";
import HomePage from "./pages/index";
import { ProtectedRoute } from "./components/ProtectedRoute";

function lazyPage<T extends Record<string, unknown>>(loader: () => Promise<T>) {
  return lazy(async () => {
    const mod = await loader();

    if (mod && "default" in mod && mod.default) {
      return { default: mod.default as React.ComponentType };
    }

    const fallback = Object.values(mod || {}).find(
      (value) => typeof value === "function",
    );

    if (fallback) {
      console.warn(
        "[routes] Lazy module missing default export, using fallback export.",
      );
      return { default: fallback as React.ComponentType };
    }

    throw new Error("Lazy module has no usable component export.");
  });
}

// Lazy load components for code splitting (except HomePage for instant loading)
const NotFoundPage = lazyPage(() => import("./pages/_404"));

// Auth pages
const LoginPage = lazyPage(() => import("./pages/login"));
const ForgotPasswordPage = lazyPage(() => import("./pages/forgot-password"));
const ResetPasswordPage = lazyPage(() => import("./pages/reset-password"));
const SignUpPage = lazyPage(() => import("./pages/signup"));
const SignUpCreatePage = lazyPage(() => import("./pages/signup-create"));
const ChooseUsernamePage = lazyPage(() => import("./pages/choose-username"));
const AuthCallbackPage = lazyPage(() => import("./pages/auth-callback"));
const VerifyEmailPage = lazyPage(() => import("./pages/verify-email"));
const VerifyEmailRequiredPage = lazyPage(
  () => import("./pages/verify-email-required"),
);

// Public pages
const PrivacyPage = lazyPage(() => import("./pages/privacy"));
const TermsOfServicePage = lazyPage(() => import("./pages/terms-of-service"));
const GuidePage = lazyPage(() => import("./pages/guide"));
const ArchivesPage = lazyPage(() => import("./pages/archives"));

// Protected pages
const AccountSettingsPage = lazyPage(() => import("./pages/account-settings"));
const DashboardPage = lazyPage(() => import("./pages/dashboard"));
const AdminPage = lazyPage(() => import("./pages/admin"));
const DDCCalculatorPage = lazyPage(() => import("./pages/ddc-calculator"));
const LevelingPage = lazyPage(() => import("./pages/leveling"));
const InventoryPage = lazyPage(() => import("./pages/inventory"));
const LeaderboardPage = lazyPage(() => import("./pages/leaderboard"));
const GamificationShowcasePage = lazyPage(
  () => import("./pages/gamification-showcase"),
);
const ChangeAvatarPage = lazyPage(() => import("./pages/change-avatar"));
const Gem3DShowcasePage = lazyPage(() => import("./pages/gem-3d-showcase"));
const ChaosEmeraldAnimationsPage = lazyPage(
  () => import("./pages/chaos-emerald-animations"),
);
const HomeWithDashboardButtonPage = lazyPage(
  () => import("./pages/home-with-dashboard-button"),
);
const DownloadProjectPage = lazyPage(() => import("./pages/download-project"));
const DownloadPage = lazyPage(() => import("./pages/download"));

// Intelligence pages
const IntelligencePage = lazyPage(() => import("./pages/intelligence"));
const IntelligenceRealPage = lazyPage(
  () => import("./pages/intelligence-real"),
);
const IntelligenceComprehensivePage = lazyPage(
  () => import("./pages/intelligence-comprehensive"),
);
const IntelligenceIconMegaListPage = lazyPage(
  () => import("./pages/intelligence-icon-mega-list"),
);
const BatchAnalysisPage = lazyPage(() => import("./pages/batch-analysis"));
const AnalyticsPage = lazyPage(() => import("./pages/analytics"));
const MonitoringPage = lazyPage(() => import("./pages/monitoring"));
const ReportsPage = lazyPage(() => import("./pages/reports"));

export const routes: RouteObject[] = [
  // Public routes
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/signup", element: <SignUpPage /> },
  { path: "/signup/create", element: <SignUpCreatePage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/privacy", element: <PrivacyPage /> },
  { path: "/terms-of-service", element: <TermsOfServicePage /> },
  { path: "/guide", element: <GuidePage /> },
  { path: "/archives", element: <ArchivesPage /> },

  // Auth-required but unverified OK
  {
    path: "/choose-username",
    element: (
      <ProtectedRoute requireVerified={false}>
        <ChooseUsernamePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/verify-email-required",
    element: (
      <ProtectedRoute requireVerified={false}>
        <VerifyEmailRequiredPage />
      </ProtectedRoute>
    ),
  },

  // Protected routes
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/account-settings",
    element: (
      <ProtectedRoute>
        <AccountSettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/intelligence",
    element: (
      <ProtectedRoute>
        <IntelligencePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/intelligence-real",
    element: (
      <ProtectedRoute>
        <IntelligenceRealPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/intelligence-comprehensive",
    element: <IntelligenceComprehensivePage />,
  },
  {
    path: "/intelligence-icon-mega-list",
    element: <IntelligenceIconMegaListPage />,
  },
  {
    path: "/batch-analysis",
    element: (
      <ProtectedRoute>
        <BatchAnalysisPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/analytics",
    element: (
      <ProtectedRoute>
        <AnalyticsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/monitoring",
    element: (
      <ProtectedRoute>
        <MonitoringPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/reports",
    element: (
      <ProtectedRoute>
        <ReportsPage />
      </ProtectedRoute>
    ),
  },
  { path: "/ddc-calculator", element: <DDCCalculatorPage /> },
  {
    path: "/leveling",
    element: (
      <ProtectedRoute>
        <LevelingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/inventory",
    element: (
      <ProtectedRoute>
        <InventoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/leaderboard",
    element: (
      <ProtectedRoute>
        <LeaderboardPage />
      </ProtectedRoute>
    ),
  },
  { path: "/gamification-showcase", element: <GamificationShowcasePage /> },
  {
    path: "/change-avatar",
    element: (
      <ProtectedRoute>
        <ChangeAvatarPage />
      </ProtectedRoute>
    ),
  },
  { path: "/gem-3d-showcase", element: <Gem3DShowcasePage /> },
  { path: "/chaos-emerald-animations", element: <ChaosEmeraldAnimationsPage /> },
  { path: "/home-with-dashboard", element: <HomeWithDashboardButtonPage /> },
  { path: "/download-project", element: <DownloadProjectPage /> },
  { path: "/download", element: <DownloadPage /> },

  // Catch-all
  { path: "*", element: <NotFoundPage /> },
];

export type Path = "/";
export type Params = Record<string, string | undefined>;
