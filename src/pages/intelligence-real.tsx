/**
 * Real Intelligence Dashboard Page
 *
 * Live domain intelligence dashboard with real API integration.
 * Displays comprehensive security analysis, WHOIS data, infrastructure details,
 * DNS records, technology stack, and actionable recommendations.
 */

import { RealIntelligenceDashboard } from "@/components/intelligence/RealIntelligenceDashboard";

export default function IntelligenceRealPage() {
  return (
    <div className="container mx-auto py-8">
      <RealIntelligenceDashboard initialDomain="example.com" />
    </div>
  );
}
