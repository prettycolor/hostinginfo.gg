/**
 * Smart Navigation Utility
 *
 * Provides context-aware back navigation that returns users to where they came from:
 * - Dashboard users → Back to dashboard
 * - Homepage users → Back to homepage
 * - Direct visitors → Back to homepage (default)
 */

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

interface NavigationState {
  from?: string;
}

/**
 * Get the smart back destination based on where the user came from
 *
 * Logic:
 * 1. Check if user came from dashboard (referrer or state)
 * 2. Check if user is signed in and likely using dashboard
 * 3. Default to homepage
 */
export function useSmartBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const goBack = () => {
    // Check if we have navigation state indicating source
    const state = location.state as NavigationState | null;
    if (state?.from) {
      console.log("✅ Smart back: Returning to", state.from);
      navigate(state.from, { replace: true });
      return;
    }

    // Check if user came from dashboard (via referrer)
    const referrer = document.referrer;
    if (referrer && referrer.includes("/dashboard")) {
      console.log(
        "✅ Smart back: Detected dashboard referrer, returning to dashboard",
      );
      navigate("/dashboard", { replace: true });
      return;
    }

    // If user is signed in, assume they're using dashboard
    if (user) {
      console.log("✅ Smart back: User signed in, returning to dashboard");
      navigate("/dashboard", { replace: true });
      return;
    }

    // Default: Return to homepage
    console.log("✅ Smart back: Returning to homepage (default)");
    navigate("/", { replace: true });
  };

  return goBack;
}

/**
 * Get the smart back destination path (without navigating)
 * Useful for displaying "Back to Dashboard" vs "Back to Home"
 */
export function useSmartBackDestination(): { path: string; label: string } {
  const location = useLocation();
  const { user } = useAuth();

  // Check navigation state
  const state = location.state as NavigationState | null;
  if (state?.from) {
    if (state.from === "/dashboard") {
      return { path: "/dashboard", label: "Dashboard" };
    }
    return { path: state.from, label: "Back" };
  }

  // Check referrer
  const referrer = document.referrer;
  if (referrer && referrer.includes("/dashboard")) {
    return { path: "/dashboard", label: "Dashboard" };
  }

  // If user is signed in, assume dashboard
  if (user) {
    return { path: "/dashboard", label: "Dashboard" };
  }

  // Default: Homepage
  return { path: "/", label: "Home" };
}
