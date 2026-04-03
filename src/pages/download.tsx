import { useState } from 'react';
import { Download, Package, FileArchive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    setDownloadComplete(false);

    try {
      const response = await fetch('/api/download/package');
      
      if (!response.ok) {
        throw new Error('Download failed. Please try again.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hostinginfo-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <title>Download HostingInfo - Complete Package</title>
      <meta name="description" content="Download the complete HostingInfo application package as a ZIP file for deployment to your own server." />

      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Download HostingInfo</h1>
                <p className="text-sm text-muted-foreground">Complete application package</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Download Card */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileArchive className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Download Complete Package</CardTitle>
            <CardDescription className="text-base">
              Get the full HostingInfo application ready for deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Messages */}
            {downloadComplete && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-500">
                  Download complete! Check your downloads folder for the ZIP file.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Download Button */}
            <div className="flex flex-col items-center gap-4 py-6">
              <Button
                size="lg"
                onClick={handleDownload}
                disabled={downloading}
                className="w-full max-w-md h-14 text-lg"
              >
                {downloading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Download hostinginfo.zip
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Package size: ~25-30 MB (without node_modules)
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Includes SHA-256 checksums for verification
              </p>
            </div>

            {/* Package Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  What's Included
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ 500+ source files (all code)</li>
                  <li>✓ 100+ React components</li>
                  <li>✓ 80+ API endpoints</li>
                  <li>✓ 24 database migrations</li>
                  <li>✓ All assets (images, fonts, avatars)</li>
                  <li>✓ Complete documentation (50+ guides)</li>
                  <li>✓ SHA-256 checksums (verification)</li>
                  <li>✓ Package manifest (metadata)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  Not Included
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✗ node_modules (install on server)</li>
                  <li>✗ dist folder (build on server)</li>
                  <li>✗ .env file (configure on server)</li>
                  <li>✗ .git folder (version control)</li>
                </ul>
              </div>
            </div>
            
            {/* Package Integrity */}
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-green-500">Corruption-Free Guarantee</p>
                  <p className="text-muted-foreground mt-1">
                    Every file includes SHA-256 checksum verification. Check <code className="text-xs bg-muted px-1 py-0.5 rounded">PACKAGE_MANIFEST.json</code> after extraction to verify integrity.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Homepage Scanner</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• 6 analysis tabs</li>
                <li>• 91.7% average accuracy</li>
                <li>• 81 hosting providers</li>
                <li>• Real-time scanning</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Client management</li>
                <li>• Performance tracking</li>
                <li>• Historical charts</li>
                <li>• XP/leveling system</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Features</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Domain calculator (552 TLDs)</li>
                <li>• Web archives search</li>
                <li>• Intelligence scanner</li>
                <li>• API documentation</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Links */}
        <Card>
          <CardHeader>
            <CardTitle>📚 Documentation Included</CardTitle>
            <CardDescription>
              All guides are included in the ZIP file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold">Essential Guides:</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• DOWNLOAD_AND_DEPLOY_SUMMARY.md</li>
                  <li>• DEPLOYMENT_PACKAGE_GUIDE.md (850+ lines)</li>
                  <li>• DOWNLOAD_CHECKLIST.md (670+ lines)</li>
                  <li>• DEPLOYMENT_QUICK_START.md</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Setup Guides:</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• GOOGLE_SAFE_BROWSING_API_SETUP.md</li>
                  <li>• DASHBOARD_DEMO_ACCESS.md</li>
                  <li>• HOMEPAGE_ACCURACY_AUDIT_REPORT.md</li>
                  <li>• 50+ additional implementation docs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Info */}
        <div className="mt-8 p-6 bg-muted/50 rounded-lg border">
          <h3 className="font-semibold mb-3">🚀 Quick Deployment Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">Requirements:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Ubuntu 22.04 (recommended)</li>
                <li>• Node.js 20.x</li>
                <li>• MySQL 8.0+</li>
                <li>• NGINX</li>
                <li>• PM2 (process manager)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">Deployment Time:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Extract & install: ~5 minutes</li>
                <li>• Database setup: ~5 minutes</li>
                <li>• Build & configure: ~10 minutes</li>
                <li>• NGINX & SSL: ~10 minutes</li>
                <li><strong>Total: ~30-45 minutes</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dashboard Demo Link */}
        <Card className="mt-8 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Try the Dashboard Demo
            </CardTitle>
            <CardDescription>
              See the full dashboard interface (no login required)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('/dashboard-demo', '_blank')}
            >
              View Dashboard Demo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
