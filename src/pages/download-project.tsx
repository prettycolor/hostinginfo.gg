import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileArchive, Loader2 } from 'lucide-react';

export default function DownloadProject() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setProgress('Preparing files...');

    try {
      const response = await fetch('/api/download/project', {
        method: 'POST',
        headers: {
          'Accept': 'application/gzip, application/zip',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Download failed');
      }

      setProgress('Downloading...');
      const blob = await response.blob();
      
      // Verify blob is not empty
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Verify it's an archive file
      const validTypes = ['application/gzip', 'application/x-gzip', 'application/zip', 'application/x-tar'];
      if (!validTypes.some(type => blob.type.includes(type) || blob.type === type)) {
        console.warn('Unexpected content type:', blob.type);
      }

      setProgress(`Saving (${(blob.size / 1024 / 1024).toFixed(2)} MB)...`);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Determine file extension from content type
      const extension = blob.type.includes('gzip') ? 'tar.gz' : 'zip';
      a.download = `hostinginfo-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      setProgress('Download complete! ✓');
      setTimeout(() => {
        setDownloading(false);
        setProgress('');
      }, 3000);
    } catch (error) {
      console.error('Download error:', error);
      const message = error instanceof Error ? error.message : 'Download failed';
      setProgress(`Error: ${message}`);
      setTimeout(() => {
        setDownloading(false);
        setProgress('');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <FileArchive className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Download Complete Project</CardTitle>
          <CardDescription className="text-lg mt-2">
            Download all HostingInfo files as a ZIP archive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-lg">What's Included:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span><strong>~200 files</strong> - Complete source code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span><strong>All components</strong> - 60+ React components</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span><strong>API endpoints</strong> - 35+ backend routes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span><strong>Database schema</strong> - Complete migrations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span><strong>Configuration</strong> - All config files</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span><strong>Documentation</strong> - Setup guides</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-yellow-900 dark:text-yellow-100">📦 Package Size</h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Approximately <strong>5-10 MB</strong> (excludes node_modules)
            </p>
          </div>

          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {progress}
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Download Project ZIP
              </>
            )}
          </Button>

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">After Download:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Extract the ZIP file</li>
              <li>Run <code className="bg-muted px-2 py-1 rounded">npm install</code></li>
              <li>Create <code className="bg-muted px-2 py-1 rounded">.env</code> file with your database URL</li>
              <li>Run <code className="bg-muted px-2 py-1 rounded">npm run db:migrate</code></li>
              <li>Run <code className="bg-muted px-2 py-1 rounded">npm run dev</code></li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">📚 Documentation Included</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Check <strong>COMPLETE_DOWNLOAD_GUIDE.md</strong> and <strong>HOW_TO_DOWNLOAD_ALL_FILES.md</strong> for detailed setup instructions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
