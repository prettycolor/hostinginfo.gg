import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";
import { Trophy, Crown } from "lucide-react";
import { getUserTier } from "@/lib/tier-system";
import ChaosEmerald3D from "@/components/ChaosEmerald3D";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Tabs removed - using unified master leaderboard
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LeaderboardEntry,
  getSpecialTitle,
  getRankBadge,
  getRankColor,
  getLeaderboardTier,
  calculatePercentile,
} from "@/lib/leaderboard-system";

interface LeaderboardResponse {
  rank: number | null;
  totalUsers: number;
  percentile: string | null;
  level: number;
  totalXp: number;
  message: string;
  entries?: LeaderboardEntry[];
  currentUser?: LeaderboardEntry | null;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [leaderboardMessage, setLeaderboardMessage] = useState("");
  const [isFirefox] = useState(() => {
    if (
      typeof navigator !== "undefined" &&
      /(firefox|fxios)/i.test(navigator.userAgent)
    ) {
      return true;
    }

    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("is-firefox");
    }

    return false;
  });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const headers: HeadersInit | undefined = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const response = await fetch("/api/leveling/leaderboard", {
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to load leaderboard (${response.status})`);
        }

        const data = (await response.json()) as LeaderboardResponse;

        const entries = Array.isArray(data.entries)
          ? data.entries.map((entry) => ({
              ...entry,
              specialTitle: getSpecialTitle(entry.rank, "level"),
            }))
          : [];

        const currentUser = data.currentUser
          ? {
              ...data.currentUser,
              specialTitle: getSpecialTitle(data.currentUser.rank, "level"),
            }
          : null;

        setLeaderboard(entries);
        setUserEntry(currentUser);
        setTotalUsers(data.totalUsers || entries.length);
        setLeaderboardMessage(data.message || "");
      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
        setLeaderboard([]);
        setUserEntry(null);
        setTotalUsers(0);
        setLeaderboardMessage("Leaderboard data is unavailable right now.");
      } finally {
        setLoading(false);
      }
    };

    void fetchLeaderboard();
  }, []);

  // getCategoryIcon removed - no longer needed with unified leaderboard

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Trophy className="w-12 h-12 animate-pulse mx-auto text-primary" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title={PAGE_META.leaderboard.title}
        description={PAGE_META.leaderboard.description}
        keywords={PAGE_META.leaderboard.keywords}
      />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {isFirefox ? (
              <div
                className="relative inline-flex items-center justify-center animate-emerald-fallback-shell"
                style={{
                  width: 64,
                  height: 64,
                  filter: "drop-shadow(0 0 14px rgba(16, 185, 129, 0.45))",
                }}
                aria-label="Leaderboard emerald"
              >
                <svg
                  className="animate-emerald-fallback-core"
                  width="56"
                  height="56"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="leaderboardEmeraldMain"
                      x1="14"
                      y1="4"
                      x2="50"
                      y2="60"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#6EE7B7" />
                      <stop offset="0.5" stopColor="#10B981" />
                      <stop offset="1" stopColor="#065F46" />
                    </linearGradient>
                    <linearGradient
                      id="leaderboardEmeraldFacetA"
                      x1="24"
                      y1="10"
                      x2="40"
                      y2="30"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#A7F3D0" />
                      <stop offset="1" stopColor="#34D399" />
                    </linearGradient>
                    <linearGradient
                      id="leaderboardEmeraldFacetB"
                      x1="20"
                      y1="28"
                      x2="44"
                      y2="56"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#10B981" />
                      <stop offset="1" stopColor="#047857" />
                    </linearGradient>
                  </defs>

                  <polygon
                    points="32,4 49,15 49,34 32,60 15,34 15,15"
                    fill="url(#leaderboardEmeraldMain)"
                    stroke="rgba(209, 250, 229, 0.9)"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points="32,8 43,16 41,26 32,32 23,26 21,16"
                    fill="url(#leaderboardEmeraldFacetA)"
                    opacity="0.95"
                  />
                  <polygon
                    points="32,34 41,27 46,35 32,54 18,35 23,27"
                    fill="url(#leaderboardEmeraldFacetB)"
                    opacity="0.95"
                  />
                  <line
                    x1="32"
                    y1="8"
                    x2="32"
                    y2="54"
                    stroke="rgba(187, 247, 208, 0.6)"
                    strokeWidth="1"
                  />
                  <line
                    x1="21"
                    y1="16"
                    x2="43"
                    y2="16"
                    stroke="rgba(187, 247, 208, 0.45)"
                    strokeWidth="1"
                  />
                  <line
                    x1="23"
                    y1="27"
                    x2="41"
                    y2="27"
                    stroke="rgba(187, 247, 208, 0.45)"
                    strokeWidth="1"
                  />
                  <line
                    x1="15"
                    y1="34"
                    x2="49"
                    y2="34"
                    stroke="rgba(187, 247, 208, 0.4)"
                    strokeWidth="1"
                  />
                </svg>
              </div>
            ) : (
              <ChaosEmerald3D
                size={64}
                autoRotate
                rotationSpeed={1.5}
                animation="floating-hologram"
              />
            )}
            <div>
              <div className="relative">
                <div className="absolute inset-0 blur-md opacity-30">
                  <h1 className="text-3xl font-bold text-emerald-400">
                    HT Leaderboard
                  </h1>
                </div>
                <h1 className="text-3xl font-bold text-white relative z-10">
                  HT Leaderboard
                </h1>
                <div className="absolute inset-0 pointer-events-none">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-emerald-400 blur-sm"
                      style={{
                        left: `${20 + i * 20}%`,
                        top: `${30 + (i % 2) * 40}%`,
                      }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 0.5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Your Rank Card */}
        {userEntry && (
          <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Your Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Rank</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold">
                      #{userEntry.rank}
                    </span>
                    <span className="text-2xl">
                      {getRankBadge(userEntry.rank)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Top {calculatePercentile(userEntry.rank, totalUsers)}%
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="text-2xl font-bold">{userEntry.level}</p>
                  <p className="text-xs text-muted-foreground">
                    {userEntry.title || "Novice"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tier</p>
                  <div
                    className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${getLeaderboardTier(userEntry.rank).color} text-white font-semibold`}
                  >
                    {getLeaderboardTier(userEntry.rank).name}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {!userEntry && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>Your Ranking</CardTitle>
              <CardDescription>
                {leaderboardMessage ||
                  "Complete your first scan to appear on the leaderboard."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Category Tabs */}
        <div className="space-y-4">
          {leaderboard.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Rankings</CardTitle>
                <CardDescription>
                  {leaderboardMessage || "No leaderboard data yet."}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              {/* Tabs removed - using unified master leaderboard */}
              {/* Top 3 Podium */}
              <Card className="bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10 border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Top 3 Nerds
                  </CardTitle>
                  <CardDescription>
                    The elite leaders of HostingInfo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {leaderboard.slice(0, 3).map((entry) => (
                      <Card
                        key={entry.userId}
                        className={`relative overflow-hidden border-2 ${
                          entry.rank === 1
                            ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-amber-600/10"
                            : entry.rank === 2
                              ? "border-gray-400/50 bg-gradient-to-br from-gray-300/10 to-gray-500/10"
                              : "border-amber-600/50 bg-gradient-to-br from-amber-600/10 to-amber-800/10"
                        }`}
                      >
                        {/* Rank Badge */}
                        <div
                          className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${getRankColor(entry.rank)} opacity-20 rounded-bl-full`}
                        />
                        <div className="absolute top-2 right-2 text-3xl">
                          {getRankBadge(entry.rank)}
                        </div>

                        <CardContent className="pt-6 space-y-4">
                          {/* Avatar & Username */}
                          <div className="flex flex-col items-center space-y-2">
                            <div className="relative">
                              {/* Legendary Pulse Rings */}
                              {entry.level >= 100 && (
                                <>
                                  {/* Outer pulse ring */}
                                  <motion.div
                                    className="absolute inset-0 rounded-full pointer-events-none"
                                    style={{
                                      border: `3px solid ${getUserTier(entry.level).borderColor}`,
                                      filter: `drop-shadow(0 0 8px ${getUserTier(entry.level).glowColor})`,
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
                                    className="absolute inset-0 rounded-full pointer-events-none"
                                    style={{
                                      border: `3px solid ${getUserTier(entry.level).borderColor}`,
                                      filter: `drop-shadow(0 0 12px ${getUserTier(entry.level).glowColor})`,
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
                                className="w-20 h-20 relative"
                                style={{
                                  border: `3px solid ${getUserTier(entry.level).borderColor}`,
                                  boxShadow: `0 0 20px ${getUserTier(entry.level).glowColor}`,
                                }}
                              >
                                <AvatarImage src={entry.avatar} />
                                <AvatarFallback className="text-2xl font-bold">
                                  {entry.username[0]}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-lg">
                                {entry.username}
                              </p>
                              {entry.specialTitle && (
                                <Badge
                                  className={`bg-gradient-to-r ${entry.specialTitle.color} text-white border-0 mt-1`}
                                >
                                  {entry.specialTitle.icon}{" "}
                                  {entry.specialTitle.name}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="space-y-2 text-center">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Level
                              </p>
                              <p className="text-2xl font-bold">
                                {entry.level}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {entry.score.toLocaleString()} pts
                              </p>
                            </div>
                            {entry.title && (
                              <Badge variant="outline" className="mt-2">
                                {entry.title}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rest of Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle>Rankings</CardTitle>
                  <CardDescription>
                    Top players ranked by overall performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard.slice(3).map((entry) => (
                      <div
                        key={entry.userId}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        {/* Rank */}
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <span className="text-2xl font-bold text-muted-foreground">
                            #{entry.rank}
                          </span>
                          <span className="text-xl">
                            {getRankBadge(entry.rank)}
                          </span>
                        </div>

                        {/* Avatar with Tier Border */}
                        <div className="relative">
                          {/* Legendary Pulse Rings */}
                          {entry.level >= 100 && (
                            <>
                              {/* Outer pulse ring */}
                              <motion.div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                  border: `3px solid ${getUserTier(entry.level).borderColor}`,
                                  filter: `drop-shadow(0 0 8px ${getUserTier(entry.level).glowColor})`,
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
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                  border: `3px solid ${getUserTier(entry.level).borderColor}`,
                                  filter: `drop-shadow(0 0 12px ${getUserTier(entry.level).glowColor})`,
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
                            className="w-12 h-12 relative"
                            style={{
                              border: `3px solid ${getUserTier(entry.level).borderColor}`,
                              boxShadow: `0 0 20px ${getUserTier(entry.level).glowColor}`,
                            }}
                          >
                            <AvatarImage src={entry.avatar} />
                            <AvatarFallback>{entry.username[0]}</AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Username & Title */}
                        <div className="flex-1">
                          <p className="font-semibold">{entry.username}</p>
                          {entry.title && (
                            <p className="text-sm text-muted-foreground">
                              {entry.title}
                            </p>
                          )}
                        </div>

                        {/* Level Only */}
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            Level {entry.level}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {entry.score.toLocaleString()} pts
                          </p>
                        </div>

                        {/* Tier Badge */}
                        <Badge
                          className={`bg-gradient-to-r ${getLeaderboardTier(entry.rank).color} text-white border-0`}
                        >
                          {getLeaderboardTier(entry.rank).name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
