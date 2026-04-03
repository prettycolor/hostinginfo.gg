/**
 * Scan Input Component
 * Domain input and scan button
 */

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface ScanInputProps {
  onScanComplete: (scanId: string) => void;
  selectedDomain?: string | null;
}

export function ScanInput({
  onScanComplete,
  selectedDomain = null,
}: ScanInputProps) {
  const { user } = useAuth();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDomain) return;
    setDomain((current) => current.trim() || selectedDomain);
  }, [selectedDomain]);

  const handleScan = async () => {
    if (!domain.trim()) {
      setError("Please enter a domain");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check if user is authenticated
      if (!user) {
        setError("Please log in to scan domains");
        setLoading(false);
        return;
      }

      // Get auth token from localStorage (using correct key name)
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Authentication error. Please try logging in again.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/seo-checklist/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target: domain }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start scan");
      }

      const data = await response.json();
      onScanComplete(data.scan_id);
      setDomain("");
    } catch (err) {
      console.error("SEO scan error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check SEO Readiness</CardTitle>
        <CardDescription>
          Find out if your site is ready for SEO investment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="Enter domain (e.g., example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            disabled={loading}
          />
          {selectedDomain && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDomain(selectedDomain)}
              disabled={loading}
            >
              Use Selected
            </Button>
          )}
          <Button onClick={handleScan} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Scan
              </>
            )}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
