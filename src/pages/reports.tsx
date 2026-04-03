/**
 * Reports Page
 *
 * Main page for report generation, viewing, and scheduling
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportGenerator } from "@/components/reports/ReportGenerator";
import { ReportsList } from "@/components/reports/ReportsList";
import { ScheduledReports } from "@/components/reports/ScheduledReports";
import { TemplateManager } from "@/components/reports/TemplateManager";
import { FileText, Calendar, Layout, List } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <>
      <SEOHead
        title={PAGE_META.reports.title}
        description={PAGE_META.reports.description}
        keywords={PAGE_META.reports.keywords}
        noindex={PAGE_META.reports.noindex}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate comprehensive reports from your domain intelligence data
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Generate</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Scheduled</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <ReportGenerator />
          </TabsContent>

          {/* Reports List Tab */}
          <TabsContent value="reports" className="space-y-6">
            <ReportsList />
          </TabsContent>

          {/* Scheduled Reports Tab */}
          <TabsContent value="scheduled" className="space-y-6">
            <ScheduledReports />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <TemplateManager />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
