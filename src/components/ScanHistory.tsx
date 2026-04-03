"use client";

import { useState, useEffect } from "react";
import { History, Clock, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getScanHistory,
  clearScanHistory,
  formatTimestamp,
  type ScanRecord,
} from "@/lib/scan-history";

interface ScanHistoryProps {
  onSelectDomain: (domain: string) => void;
}

export function ScanHistory({ onSelectDomain }: ScanHistoryProps) {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      // Refresh every 10 seconds when open
      const interval = setInterval(loadHistory, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadHistory = () => {
    setHistory(getScanHistory());
  };

  const handleClear = () => {
    clearScanHistory();
    setHistory([]);
  };

  const handleSelect = (domain: string) => {
    onSelectDomain(domain);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 sm:h-10 sm:w-10 border-2 shadow-sm flex items-center justify-center"
          title="Scan History"
        >
          <History className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[90vw] sm:w-[400px] p-0 z-50"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Scan History
              </CardTitle>
              <div className="flex gap-1">
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="h-8 w-8"
                    title="Clear History"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Recent scans (last 30 minutes)
            </p>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent scans</p>
              </div>
            ) : (
              <ScrollArea className="h-full max-h-[400px] pr-4">
                <div className="space-y-2">
                  {history.map((record, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelect(record.domain)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent hover:border-primary transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">
                            {record.domain}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(record.timestamp)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {record.technology && (
                            <Badge variant="outline" className="text-xs">
                              Tech
                            </Badge>
                          )}
                          {record.dns && (
                            <Badge variant="outline" className="text-xs">
                              DNS
                            </Badge>
                          )}
                          {record.email && (
                            <Badge variant="outline" className="text-xs">
                              Email
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
