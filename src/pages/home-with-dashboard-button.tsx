import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HomeWithDashboardButton() {
  const [domain, setDomain] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Dashboard Button */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/g-dollar-clean-6pC4m1.png"
              alt="HostingInfo Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              HostingInfo
            </span>
          </Link>

          {/* Right Side - Dashboard Button */}
          <div className="flex items-center gap-3">
            {/* Dashboard Button - THIS IS WHAT WE'RE SHOWCASING */}
            <Link to="/dashboard-demo">
              <Button
                variant="default"
                className="gap-2 shadow-lg shadow-primary/20"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Analyze Your
              <span className="block bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Domain Intelligence
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get comprehensive insights into domain performance, security, and
              hosting infrastructure.
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter domain name (e.g., example.com)"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="pl-10 h-14 text-lg bg-card border-border"
                />
              </div>
              <Button
                size="lg"
                className="h-14 px-8 w-full sm:w-auto"
                disabled={!domain.trim()}
              >
                <Search className="h-5 w-5 mr-2" />
                Analyze
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="p-6 rounded-lg border bg-card">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Security Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive security scoring and vulnerability detection
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Performance Metrics
              </h3>
              <p className="text-sm text-muted-foreground">
                Real-time performance monitoring and optimization insights
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Infrastructure Intel
              </h3>
              <p className="text-sm text-muted-foreground">
                Detailed hosting provider and infrastructure attribution
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-8 rounded-lg border bg-card">
            <h2 className="text-2xl font-bold mb-4">Ready to dive deeper?</h2>
            <p className="text-muted-foreground mb-6">
              Access your dashboard to view saved scans, analytics, and
              comprehensive reports.
            </p>
            <Link to="/dashboard-demo">
              <Button size="lg" className="gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 mt-20">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2026 HostingInfo. Domain Intelligence Platform.</p>
        </div>
      </footer>
    </div>
  );
}
