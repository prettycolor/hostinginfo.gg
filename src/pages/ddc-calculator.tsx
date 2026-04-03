import { Calculator as CalculatorComponent } from "@/components/ddc/Calculator";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTerminalStore } from "@/lib/terminal/terminal-store";

/**
 * Domain Calculator Page
 * Clean, professional domain discount calculator
 * No intro animation - instant access
 */
export default function DDCCalculatorPage() {
  const navigate = useNavigate();
  const { openTerminal } = useTerminalStore();

  const goBack = () => {
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title={PAGE_META.ddcCalculator.title}
        description={PAGE_META.ddcCalculator.description}
        keywords={PAGE_META.ddcCalculator.keywords}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="relative bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back Button + Title */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>

                <div className="h-8 w-px bg-border" />

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Domain Calculator
                  </h1>
                </div>
              </div>

              {/* Right: Logo + Badge */}
              <div className="flex items-center gap-4">
                {/* Logo with hover animation - EXACT MATCH to Guide page */}
                <div
                  className="relative group cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    openTerminal();
                  }}
                  title="Click to open HT Terminal 🔧"
                >
                  {/* Spinning gradient glow background */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-spin-slow" />

                  {/* Pulsing ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 dark:border-purple-500/50 group-hover:border-purple-500/60 animate-pulse" />

                  {/* Logo container */}
                  <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-purple-300/20 dark:border-purple-600/30 group-hover:border-purple-400/40 dark:group-hover:border-purple-500/50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 shadow-lg group-hover:shadow-2xl group-hover:shadow-purple-500/50">
                    <img
                      src="/assets/placeholder.png"
                      alt="HostingInfo Logo"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-125"
                    />

                    {/* Shine effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </div>
                </div>

                {/* Badge */}
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                    555+ TLDs Supported
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-8 py-12">
              {/* Animated Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r ff-allow-gradient from-purple-500/10 via-indigo-500/10 to-purple-500/10 border border-purple-300/30 dark:border-purple-700/50 backdrop-blur-sm animate-badge-float shadow-lg">
                <svg
                  className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm font-semibold bg-gradient-to-r ff-allow-gradient ff-gradient-text from-purple-700 via-indigo-600 to-purple-700 bg-clip-text text-transparent animate-text-shimmer">
                  Professional Domain Management Tool
                </span>
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-ping" />
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent leading-[1.2] pb-4">
                Calculate Your Domain Savings
              </h2>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Discover how much you can save on domain registrations. Simply
                paste your domains and see instant savings across Basic,
                Premium, and Pro tiers.
              </p>
            </div>

            {/* Calculator Component */}
            <div className="rounded-xl bg-card backdrop-blur-sm border border-border shadow-2xl overflow-hidden">
              <CalculatorComponent />
            </div>

            {/* Footer Info */}
            <div className="text-center space-y-4 py-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <svg
                  className="w-4 h-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-muted-foreground">
                  Pricing data is updated regularly. Actual savings may vary
                  based on current promotions.
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                This calculator is provided for informational purposes. Visit
                your domain registrar for official pricing details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
