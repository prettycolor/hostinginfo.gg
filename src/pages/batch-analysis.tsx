/**
 * Batch Analysis Page
 *
 * Batch domain analysis dashboard for analyzing multiple domains simultaneously.
 * Features job management, progress tracking, and results visualization.
 */

import { BatchAnalysisDashboard } from "@/components/intelligence/BatchAnalysisDashboard";

export default function BatchAnalysisPage() {
  return (
    <div className="container mx-auto py-8">
      <BatchAnalysisDashboard />
    </div>
  );
}
