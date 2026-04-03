import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

/**
 * 404 Not Found page component
 *
 * Displays a generic error page when a route is not found.
 * Includes a single back button.
 * The layout (header/footer) is handled by RootLayout in App.tsx.
 */
export default function NotFoundPage() {
  return (
    <>
      <SEOHead
        title={PAGE_META.notFound.title}
        description={PAGE_META.notFound.description}
        keywords={PAGE_META.notFound.keywords}
        noindex
      />

      <div className="min-h-screen bg-background">
        <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 max-w-2xl text-center relative z-10">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-6xl font-bold text-foreground">404</h1>
                <h2 className="text-2xl font-semibold text-foreground">
                  Something went wrong
                </h2>
                <p className="text-muted-foreground">
                  The page you requested is unavailable.
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  className="px-8 py-3 bg-card border border-border text-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
