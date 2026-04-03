import { useEffect, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface LevelingStats {
  level: number;
  totalXp: number;
  progress: {
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progress: number;
  };
  levelTitle: {
    title: string;
    description: string;
  };
  globalRank: number | null;
  rankPercentile: string | null;
}

export function LevelingXpBar() {
  const [stats, setStats] = useState<LevelingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const location = useLocation();

  // Fetch stats function with useCallback to prevent unnecessary re-renders
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/leveling/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch leveling stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Refresh stats when navigating back to dashboard
  useEffect(() => {
    if (location.pathname === "/dashboard") {
      fetchStats();
    }
  }, [location.pathname, fetchStats]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchStats();
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [fetchStats]);

  // Listen for custom XP update events
  useEffect(() => {
    const handleXpUpdate = () => {
      console.log("🎮 XP update event received, refreshing stats...");
      fetchStats();
    };

    window.addEventListener("xp-updated", handleXpUpdate);
    window.addEventListener("level-up", handleXpUpdate);
    window.addEventListener("scan-complete", handleXpUpdate);

    return () => {
      window.removeEventListener("xp-updated", handleXpUpdate);
      window.removeEventListener("level-up", handleXpUpdate);
      window.removeEventListener("scan-complete", handleXpUpdate);
    };
  }, [fetchStats]);

  useEffect(() => {
    if (stats) {
      // Animate progress bar
      const timer = setTimeout(() => {
        setAnimatedProgress(stats.progress.progress);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [stats]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-2 bg-muted rounded w-full"></div>
      </div>
    );
  }

  if (!stats) return null;

  const { level, progress, levelTitle, globalRank, rankPercentile } = stats;
  const hasRank = typeof globalRank === "number" && globalRank > 0;
  const showTopSpot = hasRank && globalRank <= 5;

  return (
    <Link
      to="/leveling"
      className="block bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-lg p-4 hover:border-primary/40 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">
                Level {level}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                {levelTitle.title}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {levelTitle.description}
            </p>
          </div>
        </div>

        {/* Rank Badge */}
        {hasRank && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30">
            <TrendingUp className="w-4 h-4 text-accent" />
            {showTopSpot && (
              <span className="text-sm font-semibold text-accent">
                #{globalRank}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Top {rankPercentile}%
            </span>
          </div>
        )}
      </div>

      {/* XP Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {progress.currentLevelXp.toLocaleString()} /{" "}
            {progress.nextLevelXp.toLocaleString()} XP
          </span>
          <span className="text-primary font-semibold">
            {Math.round(progress.progress)}%
          </span>
        </div>
        <Progress value={animatedProgress} className="h-3 bg-muted/50" />
        <p className="text-xs text-muted-foreground text-center">
          {progress.nextLevelXp - progress.currentLevelXp} XP to next level
        </p>
      </div>

      {/* Hover hint */}
      <div className="mt-3 text-center">
        <span className="text-xs text-primary/60 group-hover:text-primary transition-colors">
          Click to view achievements and stats →
        </span>
      </div>
    </Link>
  );
}
