import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Trophy,
  Zap,
  Shield,
  Globe,
  Activity,
  CheckCircle2,
} from "lucide-react";

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
  totalScans: number;
  securityScans: number;
  performanceScans: number;
  dnsScans: number;
  domainsVerified: number;
  currentStreak: number;
  longestStreak: number;
  globalRank: number | null;
  rankPercentile: string | null;
}

interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  category: string;
  xpReward: number;
  lore: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  currentValue: number;
  requiredValue: number;
}

interface LeaderboardData {
  rank: number | null;
  totalUsers: number;
  percentile: string | null;
  level: number;
  totalXp: number;
  message: string;
}

const rarityColors = {
  common: "bg-gray-500/20 text-gray-700 border-gray-300",
  uncommon: "bg-green-500/20 text-green-700 border-green-300",
  rare: "bg-blue-500/20 text-blue-700 border-blue-300",
  epic: "bg-purple-500/20 text-purple-700 border-purple-300",
  legendary: "bg-amber-500/20 text-amber-700 border-amber-300",
};

const rarityGlow = {
  common: "shadow-gray-200",
  uncommon: "shadow-green-200",
  rare: "shadow-blue-200",
  epic: "shadow-purple-200",
  legendary: "shadow-amber-200",
};

export default function LevelingPage() {
  const achievementsTabEnabled = false;
  const [stats, setStats] = useState<LevelingStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [statsRes, achievementsRes, leaderboardRes] = await Promise.all([
        fetch("/api/leveling/stats", { headers }),
        fetch("/api/leveling/achievements", { headers }),
        fetch("/api/leveling/leaderboard", { headers }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (achievementsRes.ok) {
        const data = await achievementsRes.json();
        setAchievements(data.achievements || []);
      }

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Failed to fetch leveling data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAchievements = achievements.filter((a) => {
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (filterStatus === "unlocked" && !a.unlocked) return false;
    if (filterStatus === "locked" && a.unlocked) return false;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalAchievements = achievements.length;
  const handleTabChange = (value: string) => {
    if (!achievementsTabEnabled && value === "achievements") {
      setActiveTab("overview");
      return;
    }
    setActiveTab(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Failed to load leveling data
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Your Progression
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your journey to becoming a legendary webmaster
        </p>
      </div>

      {/* Level Overview Card */}
      <Card className="relative overflow-hidden border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
        <CardContent className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div>
                <h2 className="text-3xl font-bold">Level {stats.level}</h2>
                <p className="text-lg text-primary font-semibold">
                  {stats.levelTitle.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.levelTitle.description}
                </p>
              </div>
            </div>

            {leaderboard && leaderboard.rank && (
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <span className="text-3xl font-bold text-accent">
                    #{leaderboard.rank}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Top {leaderboard.percentile}% of{" "}
                  {leaderboard.totalUsers.toLocaleString()} users
                </p>
              </div>
            )}
          </div>

          {/* XP Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {stats.progress.currentLevelXp.toLocaleString()} /{" "}
                {stats.progress.nextLevelXp.toLocaleString()} XP
              </span>
              <span className="text-sm font-semibold text-primary">
                {Math.round(stats.progress.progress)}%
              </span>
            </div>
            <Progress value={stats.progress.progress} className="h-4" />
            <p className="text-xs text-center text-muted-foreground">
              {(
                stats.progress.nextLevelXp - stats.progress.currentLevelXp
              ).toLocaleString()}{" "}
              XP to Level {stats.level + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalScans.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All scan types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Streak
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak} days</div>
            <p className="text-xs text-muted-foreground">
              Longest: {stats.longestStreak} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {unlockedCount} / {totalAchievements}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((unlockedCount / totalAchievements) * 100)}% complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger
            value="achievements"
            disabled={!achievementsTabEnabled}
            className={
              !achievementsTabEnabled
                ? "cursor-not-allowed opacity-50"
                : undefined
            }
            title={
              !achievementsTabEnabled ? "Achievements coming soon" : undefined
            }
          >
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Detailed Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Breakdown</CardTitle>
              <CardDescription>Your scanning activity by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Security Scans</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {stats.securityScans}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Performance Scans</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {stats.performanceScans}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">DNS Scans</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {stats.dnsScans}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Your latest unlocks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements
                  .filter((a) => a.unlocked)
                  .sort(
                    (a, b) =>
                      new Date(b.unlockedAt!).getTime() -
                      new Date(a.unlockedAt!).getTime(),
                  )
                  .slice(0, 5)
                  .map((achievement) => (
                    <div
                      key={achievement.key}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">
                            {achievement.title}
                          </h4>
                          <Badge className={rarityColors[achievement.rarity]}>
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-primary">
                          +{achievement.xpReward} XP
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            achievement.unlockedAt!,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                {achievements.filter((a) => a.unlocked).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Complete your first scan to unlock achievements!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All ({totalAchievements})
                </button>
                <button
                  onClick={() => setFilterStatus("unlocked")}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === "unlocked"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Unlocked ({unlockedCount})
                </button>
                <button
                  onClick={() => setFilterStatus("locked")}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === "locked"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Locked ({totalAchievements - unlockedCount})
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredAchievements.map((achievement) => (
              <Card
                key={achievement.key}
                className={`relative overflow-hidden transition-all ${
                  achievement.unlocked
                    ? `border-${achievement.rarity} ${rarityGlow[achievement.rarity]}`
                    : "opacity-60 grayscale"
                }`}
              >
                {achievement.unlocked && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">
                      {achievement.unlocked ? achievement.icon : "🔒"}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">
                          {achievement.title}
                        </CardTitle>
                        <Badge className={rarityColors[achievement.rarity]}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <CardDescription>
                        {achievement.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {achievement.unlocked ? (
                    <div>
                      <p className="text-xs text-muted-foreground italic mb-2">
                        "{achievement.lore}"
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Unlocked{" "}
                          {new Date(
                            achievement.unlockedAt!,
                          ).toLocaleDateString()}
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          +{achievement.xpReward} XP
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {achievement.currentValue} /{" "}
                          {achievement.requiredValue}
                        </span>
                        <span className="text-xs font-semibold">
                          {achievement.progress}%
                        </span>
                      </div>
                      <Progress value={achievement.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        Reward: +{achievement.xpReward} XP
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
