import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  Calendar,
  Clock,
  Edit2,
  Plus,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { FavoriteDomainModal } from "./FavoriteDomainModal";
import { PerformanceHistoryModal } from "./PerformanceHistoryModal";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

interface FavoriteSummary {
  performanceScore: number;
  securityScore: string;
  rawSecurityScore: number | null;
  sslStatus: string;
  technology: string | null;
  hostingProvider: string | null;
  scannedAt: string | null;
  scanType: string;
}

export interface FavoriteDomainRecord {
  id: number;
  domain: string;
  alias: string | null;
  notes: string | null;
  createdAt: string;
  lastScannedAt: string | null;
  scanCount: number;
  latestScan: FavoriteSummary | null;
}

interface FavoritesListResponse {
  favorites?: FavoriteDomainRecord[];
}

interface FavoritesTabProps {
  selectedDomain?: string | null;
  onSelectDomain?: (domain: string | null) => void;
  onFavoritesChange?: (favorites: FavoriteDomainRecord[]) => void;
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

function getSecurityColor(grade: string) {
  if (grade === "A" || grade === "A+") return "bg-green-500";
  if (grade === "B") return "bg-blue-500";
  if (grade === "C") return "bg-yellow-500";
  if (grade === "D") return "bg-orange-500";
  return "bg-red-500";
}

export function FavoritesTab({
  selectedDomain = null,
  onSelectDomain,
  onFavoritesChange,
}: FavoritesTabProps) {
  const [favorites, setFavorites] = useState<FavoriteDomainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"30" | "60" | "90" | "180">("30");
  const [searchQuery, setSearchQuery] = useState("");
  const [newFavoriteDomain, setNewFavoriteDomain] = useState("");
  const [submittingFavorite, setSubmittingFavorite] = useState(false);
  const [scanFavorite, setScanFavorite] = useState<FavoriteDomainRecord | null>(
    null,
  );
  const [performanceDomain, setPerformanceDomain] = useState<string | null>(
    null,
  );
  const [editingFavorite, setEditingFavorite] =
    useState<FavoriteDomainRecord | null>(null);
  const [editAlias, setEditAlias] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const onFavoritesChangeRef = useRef(onFavoritesChange);

  useEffect(() => {
    onFavoritesChangeRef.current = onFavoritesChange;
  }, [onFavoritesChange]);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<FavoritesListResponse>(
        `/favorites/list?days=${dateRange}`,
      );
      const nextFavorites = Array.isArray(response.favorites)
        ? response.favorites
        : [];
      setFavorites(nextFavorites);
      onFavoritesChangeRef.current?.(nextFavorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  const favoriteDomains = useMemo(
    () => new Set(favorites.map((favorite) => favorite.domain)),
    [favorites],
  );

  const filteredFavorites = useMemo(
    () =>
      favorites.filter((favorite) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;

        return (
          favorite.domain.toLowerCase().includes(query) ||
          favorite.alias?.toLowerCase().includes(query) ||
          favorite.notes?.toLowerCase().includes(query)
        );
      }),
    [favorites, searchQuery],
  );

  const handleAddFavorite = async (domainInput = newFavoriteDomain) => {
    const domain = normalizeDomain(domainInput);
    if (!domain) {
      toast.error("Enter a domain to favorite");
      return;
    }

    try {
      setSubmittingFavorite(true);
      await apiClient.post("/favorites", { domain });
      toast.success(`${domain} added to favorites`);
      setNewFavoriteDomain("");
      await fetchFavorites();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add favorite",
      );
    } finally {
      setSubmittingFavorite(false);
    }
  };

  const handleRemoveFavorite = async (favorite: FavoriteDomainRecord) => {
    if (!confirm(`Remove ${favorite.domain} from favorites?`)) {
      return;
    }

    try {
      await apiClient.delete(`/favorites/${favorite.id}`);
      toast.success(`${favorite.domain} removed from favorites`);
      await fetchFavorites();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove favorite",
      );
    }
  };

  const handleOpenEdit = (favorite: FavoriteDomainRecord) => {
    setEditingFavorite(favorite);
    setEditAlias(favorite.alias ?? "");
    setEditNotes(favorite.notes ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editingFavorite) return;

    try {
      setSavingEdit(true);
      await apiClient.patch(`/favorites/${editingFavorite.id}`, {
        alias: editAlias.trim() || null,
        notes: editNotes.trim() || null,
      });
      toast.success("Favorite updated");
      setEditingFavorite(null);
      setEditAlias("");
      setEditNotes("");
      await fetchFavorites();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update favorite",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Favorite Domains</h2>
          <p className="mt-1 text-sm text-gray-400">
            Save domains, run favorite scans, and keep quick access to history.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:max-w-2xl">
          <Input
            placeholder="Add a domain to favorites"
            value={newFavoriteDomain}
            onChange={(event) => setNewFavoriteDomain(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleAddFavorite();
              }
            }}
            className="bg-gray-800 border-gray-700 text-white"
          />
          <Button
            onClick={() => void handleAddFavorite()}
            disabled={submittingFavorite}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            {submittingFavorite ? "Adding..." : "Add Favorite"}
          </Button>
        </div>
      </div>

      {selectedDomain && !favoriteDomains.has(selectedDomain) && (
        <Card className="border-purple-500/30 bg-purple-900/10">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-white">
                Selected dashboard domain
              </p>
              <p className="text-sm text-gray-400">{selectedDomain}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setNewFavoriteDomain(selectedDomain);
                void handleAddFavorite(selectedDomain);
              }}
              disabled={submittingFavorite}
              className="border-purple-500/50 bg-purple-600/10 text-purple-300 hover:bg-purple-600/20"
            >
              <Star className="mr-2 h-4 w-4" />
              Add Selected Domain
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <Input
          placeholder="Search favorites..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="bg-gray-800 border-gray-700 text-white md:max-w-sm"
        />

        <Select
          value={dateRange}
          onValueChange={(value) =>
            setDateRange(value as "30" | "60" | "90" | "180")
          }
        >
          <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white md:w-48">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="30" className="text-white">
              Last 30 days
            </SelectItem>
            <SelectItem value="60" className="text-white">
              Last 60 days
            </SelectItem>
            <SelectItem value="90" className="text-white">
              Last 90 days
            </SelectItem>
            <SelectItem value="180" className="text-white">
              Last 180 days
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={index}
              className="animate-pulse border-gray-700 bg-gray-800/50"
            >
              <CardHeader>
                <div className="h-6 w-3/4 rounded bg-gray-700" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 rounded bg-gray-700" />
                <div className="h-4 w-2/3 rounded bg-gray-700" />
                <div className="h-10 rounded bg-gray-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredFavorites.length === 0 && (
        <Card className="border-gray-700 bg-gray-800/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="mb-4 h-16 w-16 text-gray-600" />
            <h3 className="mb-2 text-xl font-semibold text-white">
              {searchQuery ? "No favorites found" : "No favorites yet"}
            </h3>
            <p className="max-w-md text-center text-gray-400">
              {searchQuery
                ? "Try a different search term."
                : "Add domains here or from the dashboard Domains tab to keep them handy for repeat scans."}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && filteredFavorites.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredFavorites.map((favorite) => (
              <motion.div
                key={favorite.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <Card
                  className={`h-full border-gray-700 bg-gray-800/50 transition-all hover:border-purple-500/50 ${
                    selectedDomain === favorite.domain
                      ? "border-purple-500/60 bg-purple-900/10"
                      : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-lg text-white">
                          {favorite.alias || favorite.domain}
                        </CardTitle>
                        <p className="mt-1 truncate text-sm text-gray-400">
                          {favorite.domain}
                        </p>
                      </div>
                      <Star className="h-5 w-5 flex-shrink-0 fill-yellow-500 text-yellow-500" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {favorite.notes && (
                      <p className="line-clamp-2 text-sm text-gray-300">
                        {favorite.notes}
                      </p>
                    )}

                    {favorite.latestScan ? (
                      <div className="space-y-2 rounded-lg border border-gray-700 bg-black/10 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">
                            Performance
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {favorite.latestScan.performanceScore}/100
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">
                            Security
                          </span>
                          <Badge
                            className={`${getSecurityColor(favorite.latestScan.securityScore)} text-white`}
                          >
                            {favorite.latestScan.securityScore}
                          </Badge>
                        </div>
                        {favorite.latestScan.hostingProvider && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">
                              Hosting
                            </span>
                            <span className="truncate text-sm text-white">
                              {favorite.latestScan.hostingProvider}
                            </span>
                          </div>
                        )}
                        {favorite.latestScan.technology && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">
                              Technology
                            </span>
                            <span className="truncate text-sm text-white">
                              {favorite.latestScan.technology}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-700 p-3 text-sm text-gray-400">
                        No favorite scan yet. Run a performance, security, or
                        full scan from this card.
                      </div>
                    )}

                    <div className="flex items-center gap-4 border-t border-gray-700 pt-2 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {favorite.lastScannedAt
                            ? new Date(
                                favorite.lastScannedAt,
                              ).toLocaleDateString()
                            : "Never scanned"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        <span>{favorite.scanCount} scans</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-500/50 bg-purple-600/10 text-purple-300 hover:bg-purple-600/20"
                        onClick={() => {
                          setPerformanceDomain(favorite.domain);
                          onSelectDomain?.(favorite.domain);
                        }}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        History
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/50 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20"
                        onClick={() => {
                          setScanFavorite(favorite);
                          onSelectDomain?.(favorite.domain);
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Scan
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 bg-gray-700/20 text-gray-200 hover:bg-gray-700/40"
                        onClick={() => {
                          handleOpenEdit(favorite);
                          onSelectDomain?.(favorite.domain);
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 bg-red-600/10 text-red-300 hover:bg-red-600/20"
                        onClick={() => void handleRemoveFavorite(favorite)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <FavoriteDomainModal
        open={Boolean(scanFavorite)}
        onOpenChange={(open) => {
          if (!open) {
            setScanFavorite(null);
          }
        }}
        favorite={
          scanFavorite
            ? {
                id: scanFavorite.id,
                domain: scanFavorite.domain,
                alias: scanFavorite.alias,
              }
            : null
        }
        onScanComplete={() => {
          void fetchFavorites();
        }}
      />

      <PerformanceHistoryModal
        open={Boolean(performanceDomain)}
        onOpenChange={(open) => {
          if (!open) {
            setPerformanceDomain(null);
          }
        }}
        domain={performanceDomain || ""}
      />

      <Dialog
        open={Boolean(editingFavorite)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingFavorite(null);
          }
        }}
      >
        <DialogContent className="border-gray-700 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>Edit Favorite</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the label and notes for this saved domain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-gray-400">Domain</p>
              <p className="rounded-md border border-gray-700 bg-black/20 px-3 py-2 text-sm">
                {editingFavorite?.domain}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Alias</label>
              <Input
                value={editAlias}
                onChange={(event) => setEditAlias(event.target.value)}
                placeholder="Optional display name"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Notes</label>
              <Textarea
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                placeholder="Why are you tracking this domain?"
                className="min-h-28 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingFavorite(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSaveEdit()}
                disabled={savingEdit}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
