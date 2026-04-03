import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Archive,
  Search,
  Loader2,
  ExternalLink,
  Copy,
  Calendar,
  FileText,
  Database,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useSmartBack, useSmartBackDestination } from "@/lib/smart-navigation";

interface ArchiveSnapshot {
  timestamp: string;
  date: string;
  url: string;
  originalUrl: string;
  statusCode: number;
  mimeType: string;
  contentLength: number;
  digest: string;
}

interface ArchivesResponse {
  domain: string;
  totalSnapshots: number;
  workingSnapshots: number;
  oldestSnapshot: string | null;
  newestSnapshot: string | null;
  yearRange: string;
  archives: ArchiveSnapshot[];
  fromCache?: boolean;
}

export default function ArchivesPage() {
  const goBack = useSmartBack();
  const backDestination = useSmartBackDestination();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ArchivesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain to search");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/scan/archives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch archives");
      }

      const data = await response.json();
      setResults(data);

      if (data.workingSnapshots === 0) {
        toast.info(`${domain} has not been archived by the Wayback Machine`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copied to clipboard");
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInYears > 0) {
      return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
    } else if (diffInMonths > 0) {
      return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
    } else if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } else {
      return "Today";
    }
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title={PAGE_META.archives.title}
        description={PAGE_META.archives.description}
        keywords={PAGE_META.archives.keywords}
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
                  {backDestination.label}
                </Button>

                <div className="h-8 w-px bg-border" />

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Web Archives
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          {/* Subtitle */}
          <div className="text-center mb-12">
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find working historical snapshots from the Wayback Machine. We
              filter out broken links so you only see archives that actually
              work.
            </p>
          </div>

          {/* Search Bar */}
          <Card className="max-w-3xl mx-auto mb-8">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter domain (e.g., example.com)"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="h-12 text-lg"
                    disabled={loading}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  size="lg"
                  className="gap-2 min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" />
              <p className="text-lg text-muted-foreground">
                Searching Wayback Machine...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This may take a few seconds
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Card className="max-w-3xl mx-auto border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive mb-1">
                      Error
                    </h3>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && !loading && (
            <div className="space-y-6">
              {/* Stats Cards */}
              {results.workingSnapshots > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Total Snapshots
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {results.totalSnapshots.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Working Archives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {results.workingSnapshots.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date Range
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {results.yearRange}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Archives List */}
              {results.workingSnapshots > 0 ? (
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">
                      Working Archives ({results.archives.length})
                    </h2>
                    {results.fromCache && (
                      <Badge variant="secondary" className="gap-1">
                        <Database className="h-3 w-3" />
                        Cached
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    {results.archives.map((archive, index) => (
                      <Card
                        key={index}
                        className="hover:shadow-lg transition-shadow"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                {archive.date}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {getRelativeTime(archive.date)}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              {archive.statusCode} OK
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {/* Original URL */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span className="font-mono">
                                {archive.originalUrl}
                              </span>
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                Size: {formatBytes(archive.contentLength)}
                              </span>
                              <span>•</span>
                              <span>Type: {archive.mimeType}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <Button asChild className="gap-2">
                                <a
                                  href={archive.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View Archive
                                </a>
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => copyToClipboard(archive.url)}
                                className="gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Copy URL
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Load More Info */}
                  {results.workingSnapshots > results.archives.length && (
                    <div className="text-center mt-6 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Showing {results.archives.length} of{" "}
                        {results.workingSnapshots} working archives
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Refine your search with date filters to see more
                        specific results
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty State */
                <Card className="max-w-3xl mx-auto">
                  <CardContent className="pt-12 pb-12 text-center">
                    <Archive className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      No Archives Found
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      This domain has not been archived by the Wayback Machine.
                    </p>
                    <Button asChild variant="outline">
                      <a
                        href="https://web.archive.org/save"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Submit to Wayback Machine →
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Info Section */}
          {!results && !loading && (
            <div className="max-w-5xl mx-auto mt-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Only Working Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      We automatically filter out broken archives so you only
                      see snapshots that actually work.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Historical Snapshots
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      See how websites looked in the past. Perfect for
                      competitive research and content recovery.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-purple-600" />
                      Powered by Wayback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Uses the Internet Archive's Wayback Machine - the world's
                      largest web archive with 800+ billion pages.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
