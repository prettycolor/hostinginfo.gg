/**
 * Filter Presets Component
 * Allows users to save, load, and manage filter combinations
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Save, Bookmark, Trash2, Edit2, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFilters, type FilterState } from "@/contexts/FilterContext";
import { toast } from "sonner";

interface FilterPresetsProps {
  disabled?: boolean;
}

export function FilterPresets({ disabled = false }: FilterPresetsProps) {
  const {
    presets,
    presetsLoading,
    presetsError,
    savePreset,
    loadPreset,
    deletePreset,
    updatePreset,
    activeFilterCount,
  } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyPresetId, setBusyPresetId] = useState<string | null>(null);
  const [savingNewPreset, setSavingNewPreset] = useState(false);

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    if (activeFilterCount === 0) {
      toast.error("No filters to save");
      return;
    }

    try {
      setSavingNewPreset(true);
      await savePreset(presetName.trim());
      toast.success(`Preset "${presetName}" saved`);
      setPresetName("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save preset",
      );
    } finally {
      setSavingNewPreset(false);
    }
  };

  const handleLoadPreset = (id: string, name: string) => {
    loadPreset(id);
    toast.success(`Loaded preset "${name}"`);
    setIsOpen(false);
  };

  const handleDeletePreset = async (id: string, name: string) => {
    if (confirm(`Delete preset "${name}"?`)) {
      try {
        setBusyPresetId(id);
        await deletePreset(id);
        toast.success(`Preset "${name}" deleted`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete preset",
        );
      } finally {
        setBusyPresetId(null);
      }
    }
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) {
      toast.error("Preset name cannot be empty");
      return;
    }
    try {
      setBusyPresetId(id);
      await updatePreset(id, editingName.trim());
      toast.success("Preset renamed");
      setEditingId(null);
      setEditingName("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename preset",
      );
    } finally {
      setBusyPresetId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFilterSummary = (filterState: FilterState) => {
    const parts = [];
    if (filterState.securityScores.length)
      parts.push(`Security: ${filterState.securityScores.length}`);
    if (filterState.performanceScores.length)
      parts.push(`Performance: ${filterState.performanceScores.length}`);
    if (filterState.technologies.length)
      parts.push(`Tech: ${filterState.technologies.length}`);
    if (filterState.hostingProviders.length)
      parts.push(`Hosting: ${filterState.hostingProviders.length}`);
    if (filterState.sslStatus.length)
      parts.push(`SSL: ${filterState.sslStatus.length}`);
    return parts.join(" • ") || "No filters";
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!disabled) {
          setIsOpen(open);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="bg-purple-600/10 border-purple-500/50 text-purple-400 hover:bg-purple-600/20 disabled:bg-muted/40 disabled:border-border disabled:text-muted-foreground disabled:opacity-70"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Presets
          {presets.length > 0 && (
            <Badge className="ml-2 bg-purple-600 text-white">
              {presets.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-purple-400" />
            Filter Presets
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Save and manage your favorite filter combinations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Save Current Filters */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Save className="w-5 h-5 text-green-400" />
                Save Current Filters
              </CardTitle>
              <CardDescription className="text-gray-400">
                {activeFilterCount > 0
                  ? `${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}`
                  : "No active filters"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePreset();
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={activeFilterCount === 0}
                />
                <Button
                  onClick={handleSavePreset}
                  disabled={
                    activeFilterCount === 0 ||
                    !presetName.trim() ||
                    savingNewPreset
                  }
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingNewPreset ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saved Presets */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-purple-400" />
              Saved Presets ({presets.length})
            </h3>

            {presetsLoading ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12 text-center text-gray-400">
                  Loading presets...
                </CardContent>
              </Card>
            ) : presetsError ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12 text-center text-red-300">
                  {presetsError}
                </CardContent>
              </Card>
            ) : presets.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bookmark className="w-16 h-16 text-gray-600 mb-4" />
                  <h4 className="text-xl font-semibold text-white mb-2">
                    No presets saved yet
                  </h4>
                  <p className="text-gray-400 text-center max-w-md">
                    Apply some filters and save them as a preset for quick
                    access later
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {presets.map((preset) => (
                    <motion.div
                      key={preset.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-all group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {editingId === preset.id ? (
                                <div className="flex items-center gap-2 mb-2">
                                  <Input
                                    value={editingName}
                                    onChange={(e) =>
                                      setEditingName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleSaveEdit(preset.id);
                                      if (e.key === "Escape")
                                        handleCancelEdit();
                                    }}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSaveEdit(preset.id)}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <h4 className="text-lg font-semibold text-white mb-1 truncate">
                                  {preset.name}
                                </h4>
                              )}

                              <p className="text-sm text-gray-400 mb-2">
                                {getFilterSummary(preset.filters)}
                              </p>

                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Created {formatDate(preset.createdAt)}
                                </span>
                                {preset.updatedAt !== preset.createdAt && (
                                  <span>
                                    • Updated {formatDate(preset.updatedAt)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleLoadPreset(preset.id, preset.name)
                                }
                                disabled={busyPresetId === preset.id}
                                className="bg-purple-600/10 border-purple-500/50 text-purple-400 hover:bg-purple-600/20"
                              >
                                Load
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleStartEdit(preset.id, preset.name)
                                }
                                disabled={busyPresetId === preset.id}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-600/10"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleDeletePreset(preset.id, preset.name)
                                }
                                disabled={busyPresetId === preset.id}
                                className="text-red-400 hover:text-red-300 hover:bg-red-600/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
