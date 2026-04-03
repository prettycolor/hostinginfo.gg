import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Code2, Layers, CheckCircle2, Server, Info, AlertTriangle, XCircle } from 'lucide-react';

interface Technology {
  name: string;
  techCategory: string;
  techVersion: string | null;
  confidence: number;
}

interface TechnologyStackProps {
  technologies: Technology[];
  framework: string | null;
  serverType: string | null;
  isCustomCoded: boolean;
  isWebsiteBuilder?: boolean;
  builderType?: string | null;
  wordpressVersionUncertain?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  cdn: '🌐',
  framework: '⚛️',
  server: '🖥️',
  analytics: '📊',
  cms: '📝',
  javascript: '🟨',
  css: '🎨',
  font: '🔤',
  marketing: '📢',
  payment: '💳',
  security: '🔒',
};

export function TechnologyStack({
  technologies,
  framework,
  serverType,
  isCustomCoded,
  isWebsiteBuilder = false,
  builderType = null,
  wordpressVersionUncertain = true,
}: TechnologyStackProps) {
  const [showWordPressPluginsDialog, setShowWordPressPluginsDialog] = useState(false);
  const isUnknownServer = !serverType || serverType.toLowerCase() === 'unknown';
  const showCmsStatusCard = !isWebsiteBuilder && !framework && (isCustomCoded || isUnknownServer);
  const managedPlatformTechnologies = Array.from(
    new Map(
      technologies.map((tech) => [tech.name.trim().toLowerCase(), tech]),
    ).values(),
  );

  const parseMajorMinorVersion = (version: string | null | undefined): number | null => {
    if (!version) return null;
    const match = version.match(/^(\d+)\.(\d+)/);
    if (!match) return null;
    const major = Number(match[1]);
    const minor = Number(match[2]);
    if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
    return Number(`${major}.${minor}`);
  };

  const renderTechnologyBadge = (tech: Technology, idx: number) => {
    const techNameLower = tech.name.toLowerCase();

    if (techNameLower === 'wordpress' && tech.techVersion) {
      const version = tech.techVersion;
      const versionNumber = parseMajorMinorVersion(version);
      const isOutdated = versionNumber !== null && versionNumber < 6.6;

      if (wordpressVersionUncertain || isOutdated) {
        return (
          <Popover key={idx}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${
                  isOutdated
                    ? 'border-orange-500/50 text-orange-500 hover:text-orange-400'
                    : 'border-yellow-500/40 text-yellow-600 hover:text-yellow-500'
                }`}
              >
                {isOutdated ? (
                  <XCircle className="mr-1 h-3 w-3" />
                ) : (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                )}
                WordPress {version}
                <span className="ml-1 text-muted-foreground">
                  {isOutdated ? '(6.6+)' : '(public)'}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-80 space-y-1 text-xs">
              <p className="font-semibold text-foreground">
                {isOutdated ? 'WordPress update needed' : 'WordPress version is a public estimate'}
              </p>
              {isOutdated ? (
                <>
                  <p>Detected: WordPress {version}</p>
                  <p>Minimum recommended for migration: 6.6+</p>
                  <p>Confirm actual version in WP Admin before planning migration.</p>
                </>
              ) : (
                <>
                  <p>Public signals can be stale or masked by caching/security layers.</p>
                  <p>Verify actual version in WP Admin or with WP-CLI before migration.</p>
                </>
              )}
            </PopoverContent>
          </Popover>
        );
      }
    }

    if (techNameLower === 'php' && tech.techVersion) {
      const version = tech.techVersion;
      const versionNumber = parseMajorMinorVersion(version);
      const isOutdated = versionNumber !== null && versionNumber < 7.4;

      if (isOutdated) {
        return (
          <Popover key={idx}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-orange-500/50 px-2 py-0.5 text-xs text-orange-500 hover:text-orange-400"
              >
                <XCircle className="mr-1 h-3 w-3" />
                PHP {version}
                <span className="ml-1 text-muted-foreground">(7.4+)</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-80 space-y-1 text-xs">
              <p className="font-semibold text-foreground">PHP update needed</p>
              <p>Detected: PHP {version}</p>
              <p>Minimum recommended for migration: 7.4+</p>
              <p>Backup and compatibility-check plugins/themes before upgrading.</p>
            </PopoverContent>
          </Popover>
        );
      }
    }

    return (
      <Badge
        key={idx}
        variant="outline"
        className="text-xs"
        title={tech.techVersion ? `Version: ${tech.techVersion}` : tech.name}
      >
        {tech.name}
        {tech.techVersion && (
          <span className="ml-1 text-muted-foreground">
            {tech.techVersion}
            {techNameLower === 'wordpress' ? ' (public)' : ''}
          </span>
        )}
      </Badge>
    );
  };

  // Group technologies by category
  const grouped = technologies.reduce((acc, tech) => {
    const category = tech.techCategory.toLowerCase();
    if (!acc[category]) acc[category] = [];
    acc[category].push(tech);
    return acc;
  }, {} as Record<string, Technology[]>);

  // Sort categories by count (most technologies first)
  const sortedCategories = Object.entries(grouped)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 8); // Top 8 categories
  const wordpressPlugins = grouped['wordpress plugin'] || [];
  const sortedWordpressPlugins = [...wordpressPlugins].sort((a, b) => a.name.localeCompare(b.name));

  // If website builder, show managed infrastructure card
  if (isWebsiteBuilder && builderType) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Managed Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 h-full">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Server className="h-8 w-8 text-primary" />
            <div>
              <div className="font-semibold text-lg">{builderType}</div>
              <div className="text-sm text-muted-foreground">Website Builder Platform</div>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This site is built on <strong>{builderType}</strong>, a managed platform. 
              All infrastructure (servers, security, performance) is handled by {builderType}.
            </AlertDescription>
          </Alert>
          
          {/* Show detected technologies if any */}
          {managedPlatformTechnologies.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-semibold">Platform Technologies</div>
              <div className="flex flex-wrap gap-1.5">
                {managedPlatformTechnologies.slice(0, 8).map((tech, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs"
                  >
                    {tech.name}
                  </Badge>
                ))}
                {managedPlatformTechnologies.length > 8 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{managedPlatformTechnologies.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Normal technology stack display
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Technology Stack
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Technologies */}
        {(framework || serverType) && (
          <div className="space-y-3">
            {framework && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Framework</div>
                <Badge variant="secondary" className="text-sm">
                  {framework}
                </Badge>
              </div>
            )}
            {serverType && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Server</div>
                <Badge variant="secondary" className="text-sm">
                  {serverType}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* CMS Detection Status */}
        {showCmsStatusCard && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold">
              {isUnknownServer ? 'Platform Unverified' : 'Not Wordpress'}
            </span>
            <span className="text-xs text-muted-foreground">
              {isUnknownServer ? '(Signals inconclusive)' : '(No CMS detected)'}
            </span>
          </div>
        )}

        {/* Technologies by Category */}
        {sortedCategories.length > 0 && (
          <div className="space-y-4 pt-2 border-t">
            <div className="text-sm font-semibold">Detected Technologies</div>
            <div className="space-y-3">
              {sortedCategories.map(([category, techs]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{CATEGORY_ICONS[category] || '🔧'}</span>
                    <span>
                      {category === 'wordpress plugin'
                        ? 'WordPress Plugin'
                        : category.charAt(0).toUpperCase() + category.slice(1)}
                    </span>
                    <span className="text-muted-foreground/60">({techs.length})</span>
                    {category === 'wordpress plugin' && techs.length > 0 ? (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="ml-1 h-6 px-2 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => setShowWordPressPluginsDialog(true)}
                      >
                        View Plugins
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {techs.slice(0, 5).map((tech, idx) => renderTechnologyBadge(tech, idx))}
                    {techs.length > 5 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{techs.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Count */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {technologies.length} technologies detected
          </span>
        </div>

        <Dialog open={showWordPressPluginsDialog} onOpenChange={setShowWordPressPluginsDialog}>
          <DialogContent className="w-[92vw] max-w-[560px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>WordPress Plugins Detected</DialogTitle>
              <DialogDescription>
                Full list of plugins discovered from public scan signals.
              </DialogDescription>
            </DialogHeader>

            {sortedWordpressPlugins.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {sortedWordpressPlugins.length} plugin{sortedWordpressPlugins.length === 1 ? '' : 's'} detected
                </div>
                <div className="max-h-[50vh] overflow-y-auto rounded-md border p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sortedWordpressPlugins.map((plugin, idx) => (
                      <Badge key={`${plugin.name}-${idx}`} variant="outline" className="justify-start text-xs py-1">
                        {plugin.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    aria-label="Close plugin list"
                    onClick={() => setShowWordPressPluginsDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No WordPress plugins were detected in this scan.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
