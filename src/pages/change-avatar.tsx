import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type SyntheticEvent,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Lock,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { getUserDisplayName, getUserInitials } from "@/lib/user-display";
import { useUnlockNotifications } from "@/components/UnlockNotificationSystem";
import {
  getTierBadgeClasses,
  getTierProgress,
  type TierName,
} from "@/lib/tier-system";
import {
  getNextAvatarGridImageState,
  type AvatarGridImageState,
} from "@/lib/avatar-grid-image-state";

interface AvatarData {
  id: number;
  name: string;
  description: string | null;
  rarity: TierName;
  unlockLevel: number;
  imagePath: string;
  isUnlocked: boolean;
  isCurrent: boolean;
  tier: {
    name: TierName;
    label: string;
    borderColor: string;
    glowColor: string;
  };
  imageHealth?: {
    status: "ok" | "legacy" | "invalid";
    issue: string | null;
    rawPath: string | null;
    normalizedPath: string;
    expectedPattern: string;
    expectedFolder: string;
    suggestedPath: string | null;
  };
}

interface AvatarsResponse {
  avatars: AvatarData[];
  userTier: {
    name: TierName;
    label: string;
    level: number;
    borderColor: string;
    glowColor: string;
    description: string;
  };
  nextTier: {
    name: TierName;
    label: string;
    levelsNeeded: number;
    unlockLevel: number;
  } | null;
  stats: {
    unlockedCount: number;
    totalCount: number;
    unlockedTiers: number;
    totalTiers: number;
  };
  imageAudit?: {
    total: number;
    okCount: number;
    legacyCount: number;
    invalidCount: number;
  };
}

interface AvatarGridDiagnostic {
  avatarId: number;
  avatarName: string;
  originalSrc: string;
  lastAttemptSrc: string;
  retryCount: number;
  exhausted: boolean;
  updatedAt: string;
}

type AvatarGridImageStateMap = Record<number, AvatarGridImageState>;
type AvatarGridDiagnosticMap = Record<number, AvatarGridDiagnostic>;

type WindowWithAvatarDiagnostics = Window & {
  __HOSTINGINFO_AVATAR_DIAGNOSTICS__?: {
    page: "change-avatar";
    capturedAt: string;
    failedAvatars: AvatarGridDiagnostic[];
  };
};

export default function ChangeAvatar() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const displayName = getUserDisplayName(user);
  const userInitials = getUserInitials(user);
  const { addNotification } = useUnlockNotifications();
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [avatarData, setAvatarData] = useState<AvatarsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTier, setActiveTier] = useState<TierName | "all">("all");
  const fallbackAvatarPath =
    "/avatars/default/shutterstock_2518667991_avatar_01.png";
  const saveFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const loggedImageFailureKeysRef = useRef<Set<string>>(new Set());
  const [gridImageStateByAvatarId, setGridImageStateByAvatarId] =
    useState<AvatarGridImageStateMap>({});
  const [gridImageDiagnostics, setGridImageDiagnostics] =
    useState<AvatarGridDiagnosticMap>({});

  const clearSaveFeedbackTimer = useCallback(() => {
    if (saveFeedbackTimerRef.current) {
      clearTimeout(saveFeedbackTimerRef.current);
      saveFeedbackTimerRef.current = null;
    }
  }, []);

  const showTransientSaveFeedback = useCallback(
    (status: "success" | "error") => {
      clearSaveFeedbackTimer();
      setSaveFeedback(status);
      saveFeedbackTimerRef.current = setTimeout(() => {
        setSaveFeedback("idle");
        saveFeedbackTimerRef.current = null;
      }, 2200);
    },
    [clearSaveFeedbackTimer],
  );

  const getTierFallbackAvatarPath = useCallback(
    (tier?: TierName | null) => {
      switch (tier) {
        case "uncommon":
          return "/avatars/common/shutterstock_2519522981_avatar_04.png";
        case "rare":
          return "/avatars/rare/shutterstock_2525711475_avatar_03.png";
        case "epic":
          return "/avatars/epic/shutterstock_2537889383_avatar_02.png";
        case "legendary":
          return "/avatars/legendary/shutterstock_2546236877_avatar_01.png";
        case "common":
        default:
          return fallbackAvatarPath;
      }
    },
    [fallbackAvatarPath],
  );

  const logAvatarImageFailure = useCallback(
    (params: {
      context: "preview" | "grid";
      avatarId?: number;
      tier?: TierName | null;
      source: string;
      fallbackStage: number;
      nextSource?: string;
    }) => {
      const key = `${params.context}:${params.avatarId ?? "na"}:${params.fallbackStage}:${params.source}`;
      if (loggedImageFailureKeysRef.current.has(key)) return;
      loggedImageFailureKeysRef.current.add(key);

      console.warn("[Avatar Render] Image load failed", {
        context: params.context,
        avatarId: params.avatarId ?? null,
        tier: params.tier ?? null,
        source: params.source,
        fallbackStage: params.fallbackStage,
        nextSource: params.nextSource ?? null,
      });
    },
    [],
  );

  const handlePreviewAvatarImageError = useCallback(
    (params: {
      target: HTMLImageElement;
      context: "preview";
      avatarId?: number;
      tier?: TierName | null;
    }) => {
      const { target, context, avatarId, tier } = params;
      const fallbackStage = Number(target.dataset.fallbackStage || "0");
      const currentSource = target.currentSrc || target.src || "(empty-src)";

      if (fallbackStage === 0) {
        const nextSource = getTierFallbackAvatarPath(tier);
        logAvatarImageFailure({
          context,
          avatarId,
          tier,
          source: currentSource,
          fallbackStage,
          nextSource,
        });
        target.dataset.fallbackStage = "1";
        target.src = nextSource;
        return;
      }

      if (fallbackStage === 1) {
        logAvatarImageFailure({
          context,
          avatarId,
          tier,
          source: currentSource,
          fallbackStage,
          nextSource: fallbackAvatarPath,
        });
        target.dataset.fallbackStage = "2";
        target.src = fallbackAvatarPath;
        return;
      }

      logAvatarImageFailure({
        context,
        avatarId,
        tier,
        source: currentSource,
        fallbackStage,
      });
      target.onerror = null;
    },
    [getTierFallbackAvatarPath, fallbackAvatarPath, logAvatarImageFailure],
  );

  const handlePreviewAvatarImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      event.currentTarget.dataset.fallbackStage = "0";
    },
    [],
  );

  const handleGridAvatarImageLoad = useCallback((avatarId: number) => {
    setGridImageStateByAvatarId((previous) => {
      if (!previous[avatarId]) return previous;
      const next = { ...previous };
      delete next[avatarId];
      return next;
    });

    setGridImageDiagnostics((previous) => {
      const currentDiagnostic = previous[avatarId];
      if (!currentDiagnostic || currentDiagnostic.exhausted) {
        return previous;
      }
      const next = { ...previous };
      delete next[avatarId];
      return next;
    });
  }, []);

  const handleGridAvatarImageError = useCallback(
    (avatar: AvatarData, event: SyntheticEvent<HTMLImageElement>) => {
      const currentSource =
        event.currentTarget.currentSrc ||
        event.currentTarget.src ||
        avatar.imagePath;

      setGridImageStateByAvatarId((previous) => {
        const nextState = getNextAvatarGridImageState({
          currentState: previous[avatar.id],
          originalSrc: avatar.imagePath,
          retryToken: `${avatar.id}-${Date.now()}`,
        });

        logAvatarImageFailure({
          context: "grid",
          avatarId: avatar.id,
          tier: avatar.rarity,
          source: currentSource,
          fallbackStage: nextState.retryCount,
          nextSource: nextState.retrySrc ?? "neutral-placeholder",
        });

        return {
          ...previous,
          [avatar.id]: nextState,
        };
      });

      setGridImageDiagnostics((previous) => {
        const currentDiagnostic = previous[avatar.id];
        const nextRetryCount = (currentDiagnostic?.retryCount || 0) + 1;
        const exhausted = nextRetryCount >= 2;

        return {
          ...previous,
          [avatar.id]: {
            avatarId: avatar.id,
            avatarName: avatar.name,
            originalSrc: avatar.imagePath,
            lastAttemptSrc: currentSource,
            retryCount: nextRetryCount,
            exhausted,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },
    [logAvatarImageFailure],
  );

  const failedGridDiagnostics = useMemo(
    () =>
      Object.values(gridImageDiagnostics).filter(
        (diagnostic) => diagnostic.exhausted,
      ),
    [gridImageDiagnostics],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const diagnosticsWindow = window as WindowWithAvatarDiagnostics;

    if (failedGridDiagnostics.length === 0) {
      delete diagnosticsWindow.__HOSTINGINFO_AVATAR_DIAGNOSTICS__;
      return;
    }

    diagnosticsWindow.__HOSTINGINFO_AVATAR_DIAGNOSTICS__ = {
      page: "change-avatar",
      capturedAt: new Date().toISOString(),
      failedAvatars: failedGridDiagnostics,
    };
  }, [failedGridDiagnostics]);

  const fetchAvatars = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<AvatarsResponse>("/avatars");
      console.log("Avatars loaded:", data.avatars?.length || 0);
      console.log("User tier:", data.userTier);
      console.log("Stats:", data.stats);
      if (
        (data.imageAudit?.legacyCount || 0) > 0 ||
        (data.imageAudit?.invalidCount || 0) > 0
      ) {
        console.warn("[Avatar Render] API image audit reported path issues", {
          legacyCount: data.imageAudit?.legacyCount || 0,
          invalidCount: data.imageAudit?.invalidCount || 0,
          total: data.imageAudit?.total || data.avatars?.length || 0,
        });
      }
      setAvatarData(data);
      setGridImageStateByAvatarId({});
      setGridImageDiagnostics({});

      // Set selected avatar if user has one
      const currentAvatar = data.avatars?.find((a) => a.isCurrent);
      if (currentAvatar) {
        setSelectedAvatar(currentAvatar.id);
      }
    } catch (error) {
      console.error("Error fetching avatars:", error);
      addNotification({
        type: "achievement",
        title: "Error",
        description: "Failed to load avatars. Please refresh the page.",
        rarity: "common",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Fetch avatars from API
  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  useEffect(() => {
    return () => clearSaveFeedbackTimer();
  }, [clearSaveFeedbackTimer]);

  // Filter avatars by active tier
  const filteredAvatars =
    activeTier === "all"
      ? avatarData?.avatars || []
      : (avatarData?.avatars || []).filter(
          (avatar) => avatar.rarity === activeTier,
        );

  // Group avatars by tier
  const avatarsByTier = {
    common: (avatarData?.avatars || []).filter((a) => a.rarity === "common"),
    uncommon: (avatarData?.avatars || []).filter(
      (a) => a.rarity === "uncommon",
    ),
    rare: (avatarData?.avatars || []).filter((a) => a.rarity === "rare"),
    epic: (avatarData?.avatars || []).filter((a) => a.rarity === "epic"),
    legendary: (avatarData?.avatars || []).filter(
      (a) => a.rarity === "legendary",
    ),
  };

  const handleSave = useCallback(async () => {
    if (!selectedAvatar) {
      addNotification({
        type: "achievement",
        title: "No avatar selected",
        description: "Please select an avatar before saving.",
        rarity: "common",
      });
      return;
    }

    // Check if selected avatar is locked
    const avatar = avatarData?.avatars.find((a) => a.id === selectedAvatar);
    if (avatar && !avatar.isUnlocked) {
      addNotification({
        type: "achievement",
        title: "Avatar locked",
        description: `Reach level ${avatar.unlockLevel} to unlock this avatar.`,
        rarity: "common",
      });
      return;
    }

    setIsSaving(true);
    setSaveFeedback("idle");
    clearSaveFeedbackTimer();

    try {
      const saveEndpoints = [
        "/avatars/current/",
        "/avatars/current",
        "/avatars/set-current/",
        "/avatars/set-current",
        "/avatars/select/",
        "/avatars/select",
      ] as const;

      let saveSucceeded = false;
      let lastSaveError: Error | null = null;

      for (const endpoint of saveEndpoints) {
        try {
          await apiClient.post(endpoint, { avatarId: selectedAvatar });
          saveSucceeded = true;
          break;
        } catch (endpointError) {
          lastSaveError =
            endpointError instanceof Error
              ? endpointError
              : new Error(String(endpointError));
          console.error(
            `[Change Avatar] Save attempt failed for ${endpoint}:`,
            lastSaveError.message,
          );
        }
      }

      if (!saveSucceeded) {
        throw (
          lastSaveError ??
          new Error("Failed to update avatar. Please try again.")
        );
      }

      // Refresh user data in AuthContext (includes new avatar)
      await refreshUser();

      addNotification({
        type: "achievement",
        title: "Avatar updated!",
        description: "Your new avatar has been saved successfully.",
        rarity: "epic",
      });

      // Refresh the avatar list to show updated current avatar
      await fetchAvatars();
      showTransientSaveFeedback("success");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update avatar. Please try again.";
      console.error("[Change Avatar] Save failed:", errorMessage);
      addNotification({
        type: "achievement",
        title: "Error",
        description: errorMessage,
        rarity: "common",
      });
      showTransientSaveFeedback("error");
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedAvatar,
    avatarData,
    refreshUser,
    addNotification,
    fetchAvatars,
    showTransientSaveFeedback,
    clearSaveFeedbackTimer,
  ]);

  const handleAvatarClick = useCallback(
    (avatarId: number, isUnlocked: boolean) => {
      if (isUnlocked) {
        setSelectedAvatar(avatarId);
        setSaveFeedback("idle");
        clearSaveFeedbackTimer();
      }
    },
    [clearSaveFeedbackTimer],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading avatars...</p>
        </div>
      </div>
    );
  }

  if (!avatarData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load avatar data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchAvatars}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierProgress = getTierProgress(avatarData.userTier.level);
  const selectedAvatarData = avatarData.avatars.find(
    (a) => a.id === selectedAvatar,
  );
  const isCurrentSelection = Boolean(selectedAvatarData?.isCurrent);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Avatars
            </h1>
          </div>
          <p className="text-muted-foreground text-lg ml-14">
            Choose your profile avatar and unlock new ones as you level up
          </p>
        </div>

        {/* Save Button - Moved to top right */}
        <div className="flex flex-col items-end gap-2 mb-6">
          <Button
            onClick={handleSave}
            disabled={isSaving || !selectedAvatar || isCurrentSelection}
            size="lg"
            className={`gap-2 min-w-[170px] transition-all duration-300 ${
              saveFeedback === "success"
                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                : saveFeedback === "error"
                  ? "bg-red-600 hover:bg-red-600 text-white"
                  : ""
            }`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : isCurrentSelection ? (
              <>
                <Check className="h-4 w-4" />
                Current Avatar
              </>
            ) : saveFeedback === "success" ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : saveFeedback === "error" ? (
              <>
                <Lock className="h-4 w-4" />
                Try Again
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Avatar
              </>
            )}
          </Button>
          {saveFeedback === "success" && (
            <p className="text-sm text-emerald-500">
              Avatar saved successfully.
            </p>
          )}
          {saveFeedback === "error" && (
            <p className="text-sm text-red-500">
              Could not save avatar. Please retry.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Current Avatar & Progress */}
          <div className="lg:col-span-1 space-y-6">
            {/* Current Avatar Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedAvatarData && !selectedAvatarData.isCurrent
                    ? "Preview"
                    : "Current Avatar"}
                </CardTitle>
                <CardDescription>
                  {selectedAvatarData && !selectedAvatarData.isCurrent
                    ? 'Click "Save Avatar" below to make this your permanent avatar'
                    : "This is how you currently appear to others"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <motion.div
                    key={selectedAvatar || "default"}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, type: "spring" }}
                    className="relative"
                  >
                    {/* Legendary Pulse Rings */}
                    {selectedAvatarData?.rarity === "legendary" && (
                      <>
                        {/* Outer pulse ring */}
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            border: `3px solid ${selectedAvatarData.tier.borderColor}`,
                            filter: `drop-shadow(0 0 8px ${selectedAvatarData.tier.glowColor})`,
                          }}
                          animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.6, 0.3, 0.6],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        {/* Middle pulse ring */}
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            border: `3px solid ${selectedAvatarData.tier.borderColor}`,
                            filter: `drop-shadow(0 0 12px ${selectedAvatarData.tier.glowColor})`,
                          }}
                          animate={{
                            scale: [1, 1.25, 1],
                            opacity: [0.4, 0.1, 0.4],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.3,
                          }}
                        />
                      </>
                    )}

                    <Avatar
                      className="h-24 w-24 shadow-lg relative"
                      style={{
                        border: `3px solid ${selectedAvatarData?.tier.borderColor || "#22c55e"}`,
                        boxShadow: `0 0 20px ${selectedAvatarData?.tier.glowColor || "rgba(34, 197, 94, 0.4)"}`,
                      }}
                    >
                      <AvatarImage
                        src={
                          selectedAvatarData?.imagePath || fallbackAvatarPath
                        }
                        alt={displayName}
                        onLoad={handlePreviewAvatarImageLoad}
                        onError={(event) => {
                          handlePreviewAvatarImageError({
                            target: event.currentTarget,
                            context: "preview",
                            avatarId: selectedAvatarData?.id,
                            tier: selectedAvatarData?.rarity,
                          });
                        }}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {displayName}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {user?.email}
                    </p>
                    {selectedAvatarData && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={getTierBadgeClasses(
                            selectedAvatarData.rarity,
                          )}
                        >
                          {selectedAvatarData.tier.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tier Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Your Tier Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Tier */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current Tier</span>
                    <Badge
                      className={getTierBadgeClasses(avatarData.userTier.name)}
                    >
                      {avatarData.userTier.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Level {avatarData.userTier.level} •{" "}
                    {avatarData.userTier.description}
                  </p>
                </div>

                {/* Progress to Next Tier */}
                {avatarData.nextTier && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Next Tier</span>
                        <Badge
                          className={getTierBadgeClasses(
                            avatarData.nextTier.name,
                          )}
                        >
                          {avatarData.nextTier.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {avatarData.nextTier.levelsNeeded} levels to unlock
                      </p>
                      <Progress value={tierProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {tierProgress}% complete
                      </p>
                    </div>
                  </>
                )}

                {/* Stats */}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">
                      {avatarData.stats.unlockedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avatars Unlocked
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {avatarData.stats.unlockedTiers}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tiers Unlocked
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Avatar Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-400" />
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Select Avatar
                  </span>
                </CardTitle>
                <CardDescription>
                  {avatarData.stats.unlockedCount} of{" "}
                  {avatarData.stats.totalCount} avatars unlocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tier Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Button
                    variant={activeTier === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTier("all")}
                  >
                    All ({avatarData.avatars.length})
                  </Button>
                  {(
                    [
                      "common",
                      "uncommon",
                      "rare",
                      "epic",
                      "legendary",
                    ] as TierName[]
                  ).map((tier) => {
                    const tierAvatars = avatarsByTier[tier];
                    const unlockedCount = tierAvatars.filter(
                      (a) => a.isUnlocked,
                    ).length;
                    const tierConfig = tierAvatars[0]?.tier;

                    return (
                      <Button
                        key={tier}
                        variant={activeTier === tier ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveTier(tier)}
                        className="gap-2"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              tierConfig?.borderColor || "#22c55e",
                          }}
                        />
                        {tierConfig?.label} ({unlockedCount}/
                        {tierAvatars.length})
                      </Button>
                    );
                  })}
                </div>

                {/* Avatar Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredAvatars.map((avatar, index) => (
                      <motion.div
                        key={avatar.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.02 }}
                        className="relative"
                      >
                        {(() => {
                          const gridImageState =
                            gridImageStateByAvatarId[avatar.id];
                          const gridImageUnavailable = Boolean(
                            gridImageState?.exhausted,
                          );
                          const gridImageSrc =
                            gridImageState?.retrySrc ?? avatar.imagePath;

                          return (
                            <>
                              {/* Legendary Pulse Rings for Grid Avatars */}
                              {avatar.rarity === "legendary" &&
                                avatar.isUnlocked && (
                                  <>
                                    {/* Outer pulse ring */}
                                    <motion.div
                                      className="absolute inset-0 rounded-lg pointer-events-none"
                                      style={{
                                        border: `3px solid ${avatar.tier.borderColor}`,
                                        filter: `drop-shadow(0 0 8px ${avatar.tier.glowColor})`,
                                      }}
                                      animate={{
                                        scale: [1, 1.15, 1],
                                        opacity: [0.6, 0.3, 0.6],
                                      }}
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                      }}
                                    />
                                    {/* Middle pulse ring */}
                                    <motion.div
                                      className="absolute inset-0 rounded-lg pointer-events-none"
                                      style={{
                                        border: `3px solid ${avatar.tier.borderColor}`,
                                        filter: `drop-shadow(0 0 12px ${avatar.tier.glowColor})`,
                                      }}
                                      animate={{
                                        scale: [1, 1.25, 1],
                                        opacity: [0.4, 0.1, 0.4],
                                      }}
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 0.3,
                                      }}
                                    />
                                  </>
                                )}

                              <button
                                onClick={() =>
                                  handleAvatarClick(
                                    avatar.id,
                                    avatar.isUnlocked,
                                  )
                                }
                                disabled={!avatar.isUnlocked}
                                className={`
                                  relative w-full aspect-square rounded-lg overflow-hidden
                                  transition-all duration-200
                                  ${avatar.isUnlocked ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-50"}
                                  ${selectedAvatar === avatar.id ? "ring-4 ring-primary" : ""}
                                `}
                                style={{
                                  border: `3px solid ${avatar.tier.borderColor}`,
                                  boxShadow:
                                    selectedAvatar === avatar.id
                                      ? `0 0 20px ${avatar.tier.glowColor}`
                                      : `0 0 8px ${avatar.tier.glowColor}`,
                                }}
                              >
                                {gridImageUnavailable ? (
                                  <div className="h-full w-full bg-muted/50 text-muted-foreground flex flex-col items-center justify-center gap-1 px-2 text-center">
                                    <AlertCircle className="h-5 w-5" />
                                    <span className="text-[10px] font-medium leading-tight">
                                      Image unavailable
                                    </span>
                                  </div>
                                ) : (
                                  <img
                                    src={gridImageSrc}
                                    alt={avatar.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                    onLoad={() =>
                                      handleGridAvatarImageLoad(avatar.id)
                                    }
                                    onError={(event) => {
                                      handleGridAvatarImageError(avatar, event);
                                    }}
                                  />
                                )}

                                {/* Locked Overlay */}
                                {!avatar.isUnlocked && (
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                    <Lock className="h-6 w-6 text-white mb-1" />
                                    <span className="text-xs text-white font-medium">
                                      Lvl {avatar.unlockLevel}
                                    </span>
                                  </div>
                                )}

                                {/* Current Badge */}
                                {avatar.isCurrent && (
                                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                                    Current
                                  </div>
                                )}

                                {/* Selected Checkmark */}
                                {selectedAvatar === avatar.id &&
                                  avatar.isUnlocked && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                      <div className="bg-primary rounded-full p-2">
                                        <Check className="h-6 w-6 text-primary-foreground" />
                                      </div>
                                    </div>
                                  )}
                              </button>
                            </>
                          );
                        })()}
                        {/* Avatar Name removed - no text under icons */}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {failedGridDiagnostics.length > 0 && (
                  <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
                    {failedGridDiagnostics.length} avatar image
                    {failedGridDiagnostics.length === 1 ? "" : "s"} could not be
                    loaded after one retry. Open DevTools and inspect
                    `window.__HOSTINGINFO_AVATAR_DIAGNOSTICS__` for details.
                  </div>
                )}

                {filteredAvatars.length === 0 && (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No avatars in this tier
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
