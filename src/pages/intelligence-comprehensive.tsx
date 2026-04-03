/**
 * Comprehensive Intelligence Dashboard Page
 *
 * Showcases the complete Phase 3 intelligence system with:
 * - Executive Summary
 * - Risk Assessment
 * - Recommendations
 * - Action Items
 * - All Intelligence Modules
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ComprehensiveIntelligenceDashboard from "@/components/intelligence/ComprehensiveIntelligenceDashboard";
import { Search } from "lucide-react";

export default function IntelligenceComprehensivePage() {
  const [domain, setDomain] = useState("");
  const [searchedDomain, setSearchedDomain] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      setSearchedDomain(domain.trim());
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Comprehensive Intelligence
        </h1>
        <p className="text-lg text-muted-foreground">
          Complete domain intelligence with executive summary, risk assessment,
          and actionable recommendations
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Analysis</CardTitle>
          <CardDescription>
            Enter a domain to generate a comprehensive intelligence report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dashboard */}
      {searchedDomain && (
        <ComprehensiveIntelligenceDashboard domain={searchedDomain} />
      )}

      {/* Info Card */}
      {!searchedDomain && (
        <Card>
          <CardHeader>
            <CardTitle>What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Executive Summary</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Overall health score (0-100)</li>
                  <li>• Critical issues count</li>
                  <li>• Key findings</li>
                  <li>• Top recommendations</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Risk Assessment</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Overall risk level</li>
                  <li>• Risk factors by category</li>
                  <li>• Impact & likelihood analysis</li>
                  <li>• Mitigation priorities</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Intelligence Modules</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Domain expiry monitoring</li>
                  <li>• Registrar analysis</li>
                  <li>• WHOIS historical tracking</li>
                  <li>• Security posture scoring</li>
                  <li>• Infrastructure attribution</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Actionable Insights</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Prioritized recommendations</li>
                  <li>• Action items with due dates</li>
                  <li>• Effort & impact estimates</li>
                  <li>• Implementation timeframes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
