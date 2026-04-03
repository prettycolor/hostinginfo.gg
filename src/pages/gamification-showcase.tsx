import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Package,
  Award,
  Zap,
  Crown,
  Sparkles,
  Target,
  TrendingUp,
  Medal,
  Flame,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  getSpecialTitle,
  getRankBadge,
  formatScore,
} from "@/lib/leaderboard-system";
import { getItemsByCategory } from "@/lib/items/item-catalog";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements-system";

export default function GamificationShowcase() {
  type DemoTab = "overview" | "items" | "achievements" | "leaderboard";
  const [activeDemo, setActiveDemo] = useState<DemoTab>("overview");
  const handleDemoChange = (value: string) => {
    const validTabs: DemoTab[] = [
      "overview",
      "items",
      "achievements",
      "leaderboard",
    ];
    if (validTabs.includes(value as DemoTab)) {
      setActiveDemo(value as DemoTab);
    }
  };

  // Sample data for demos
  const sampleItems = getItemsByCategory("badge").slice(0, 6);
  const sampleAchievements = ACHIEVEMENT_CATALOG.slice(0, 6);
  const sampleLeaderboard = [
    {
      userId: 1,
      username: "TechMaster",
      rank: 1,
      score: 100,
      level: 100,
      specialTitle: getSpecialTitle(1, "level"),
    },
    {
      userId: 2,
      username: "CodeNinja",
      rank: 2,
      score: 95,
      level: 95,
      specialTitle: getSpecialTitle(2, "level"),
    },
    {
      userId: 3,
      username: "WebWizard",
      rank: 3,
      score: 87,
      level: 87,
      specialTitle: getSpecialTitle(3, "level"),
    },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "from-amber-400 to-orange-600";
      case "epic":
        return "from-purple-400 to-pink-600";
      case "rare":
        return "from-blue-400 to-cyan-600";
      case "uncommon":
        return "from-green-400 to-emerald-600";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "diamond":
        return "from-cyan-400 to-blue-600";
      case "platinum":
        return "from-gray-300 to-gray-500";
      case "gold":
        return "from-yellow-400 to-amber-600";
      case "silver":
        return "from-gray-400 to-gray-600";
      default:
        return "from-amber-600 to-amber-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-6 mb-12">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-2xl">
              <Sparkles className="w-12 h-12 text-yellow-500" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Gamification System
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive system featuring 70+ items, 30+ achievements, and
            competitive leaderboards to engage and reward users
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6 text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">70+</p>
                <p className="text-sm text-muted-foreground">Unique Items</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-purple-500/20">
              <CardContent className="pt-6 text-center">
                <Award className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-3xl font-bold">30+</p>
                <p className="text-sm text-muted-foreground">Achievements</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-yellow-500/20">
              <CardContent className="pt-6 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-3xl font-bold">6</p>
                <p className="text-sm text-muted-foreground">Leaderboards</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-500/20">
              <CardContent className="pt-6 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold">100</p>
                <p className="text-sm text-muted-foreground">Max Level</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs
          value={activeDemo}
          onValueChange={handleDemoChange}
          className="space-y-8"
        >
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  System Overview
                </CardTitle>
                <CardDescription>
                  Complete gamification system with items, achievements, and
                  competitive features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <CardContent className="pt-6 space-y-3">
                      <Package className="w-10 h-10 text-blue-500" />
                      <h3 className="font-bold text-lg">Item System</h3>
                      <p className="text-sm text-muted-foreground">
                        70+ collectible items across 6 categories with 5 rarity
                        tiers. Dynamic unlock system based on level, XP, and
                        achievements.
                      </p>
                      <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Common
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Uncommon
                          </Badge>
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Rare
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Epic
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Legendary
                          </Badge>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardContent className="pt-6 space-y-3">
                      <Award className="w-10 h-10 text-purple-500" />
                      <h3 className="font-bold text-lg">Achievements</h3>
                      <p className="text-sm text-muted-foreground">
                        30+ achievements across 6 categories with 5 tiers.
                        Progress tracking and rewards including XP, items, and
                        titles.
                      </p>
                      <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Bronze
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Silver
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Gold
                          </Badge>
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Platinum
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Diamond
                          </Badge>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
                    <CardContent className="pt-6 space-y-3">
                      <Trophy className="w-10 h-10 text-yellow-500" />
                      <h3 className="font-bold text-lg">Leaderboards</h3>
                      <p className="text-sm text-muted-foreground">
                        6 competitive leaderboards with special titles for top 3
                        users. Track rankings across level, XP, scans, and more.
                      </p>
                      <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          <span>Supreme Champion</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Medal className="w-4 h-4 text-gray-400" />
                          <span>Elite Contender</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Medal className="w-4 h-4 text-amber-600" />
                          <span>Rising Legend</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Key Features */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Key Features</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                      <Zap className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold">Dynamic Unlock System</p>
                        <p className="text-sm text-muted-foreground">
                          Items unlock based on level, XP, achievements, and
                          activity milestones
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                      <Target className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold">Progress Tracking</p>
                        <p className="text-sm text-muted-foreground">
                          Real-time tracking of achievement progress and item
                          unlock requirements
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                      <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold">XP & Leveling</p>
                        <p className="text-sm text-muted-foreground">
                          Earn XP from scans, achievements, and item unlocks.
                          Level up to 100!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                      <Flame className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold">Competitive Rankings</p>
                        <p className="text-sm text-muted-foreground">
                          Compete globally across 6 categories with special
                          rewards for top players
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Pages */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Live Pages</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Link to="/inventory">
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Package className="w-8 h-8 text-primary" />
                              <div>
                                <p className="font-semibold">Inventory Page</p>
                                <p className="text-sm text-muted-foreground">
                                  View all items
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>

                    <Link to="/leaderboard">
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Trophy className="w-8 h-8 text-yellow-500" />
                              <div>
                                <p className="font-semibold">
                                  Leaderboard Page
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Global rankings
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Item System Preview
                </CardTitle>
                <CardDescription>
                  Sample items from the collection (6 of 70+ total items)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {sampleItems.map((item) => (
                    <Card
                      key={item.itemKey}
                      className={`relative overflow-hidden border-2 bg-gradient-to-br ${getRarityColor(item.rarity)} bg-opacity-10`}
                    >
                      <div
                        className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${getRarityColor(item.rarity)} opacity-20 rounded-bl-full`}
                      />
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex justify-center">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 object-contain"
                          />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-bold">{item.name}</p>
                          <Badge
                            className={`bg-gradient-to-r ${getRarityColor(item.rarity)} text-white border-0`}
                          >
                            {item.rarity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          {item.description}
                        </p>
                        <div className="text-xs text-center text-muted-foreground">
                          Unlock: Level {item.levelRequired}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Link to="/inventory">
                    <Button size="lg" className="gap-2">
                      View Full Inventory
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Item Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Item Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Badges (20)</p>
                    <p className="text-sm text-muted-foreground">
                      Achievement markers and status symbols
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Tools (15)</p>
                    <p className="text-sm text-muted-foreground">
                      Functional items with XP and scan bonuses
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Cosmetics (15)</p>
                    <p className="text-sm text-muted-foreground">
                      Visual customization items
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Consumables (10)</p>
                    <p className="text-sm text-muted-foreground">
                      Single-use or limited-use items
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Special (5)</p>
                    <p className="text-sm text-muted-foreground">
                      Rare items with unique effects
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Prestige (5)</p>
                    <p className="text-sm text-muted-foreground">
                      End-game exclusive items
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  Achievement System Preview
                </CardTitle>
                <CardDescription>
                  Sample achievements (6 of 30+ total achievements)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleAchievements.map((achievement) => (
                    <Card
                      key={achievement.id}
                      className="border-2 bg-gradient-to-r from-card to-card/50"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{achievement.icon}</div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-lg">
                                  {achievement.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {achievement.description}
                                </p>
                              </div>
                              <Badge
                                className={`bg-gradient-to-r ${getTierColor(achievement.tier)} text-white border-0`}
                              >
                                {achievement.tier}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Progress
                                </span>
                                <span className="font-semibold">
                                  0 / {achievement.requirements.target}
                                </span>
                              </div>
                              <Progress value={0} className="h-2" />
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              <span className="font-semibold">
                                +{achievement.rewards.xp} XP
                              </span>
                              {achievement.rewards.items &&
                                achievement.rewards.items.length > 0 && (
                                  <>
                                    <span className="text-muted-foreground">
                                      •
                                    </span>
                                    <Package className="w-4 h-4 text-primary" />
                                    <span>
                                      {achievement.rewards.items.length} items
                                    </span>
                                  </>
                                )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievement Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Achievement Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Scanning (6)</p>
                    <p className="text-sm text-muted-foreground">
                      Domain scan milestones
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Security (3)</p>
                    <p className="text-sm text-muted-foreground">
                      Security score achievements
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Performance (2)</p>
                    <p className="text-sm text-muted-foreground">
                      Performance optimization
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Collection (4)</p>
                    <p className="text-sm text-muted-foreground">
                      Item collection progress
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Social (2)</p>
                    <p className="text-sm text-muted-foreground">
                      Domain verification
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <p className="font-semibold">Mastery (6)</p>
                    <p className="text-sm text-muted-foreground">
                      Level and streak milestones
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Leaderboard System Preview
                </CardTitle>
                <CardDescription>
                  Top 3 special titles and competitive rankings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Top 3 Podium */}
                <div className="grid md:grid-cols-3 gap-4">
                  {sampleLeaderboard.map((entry) => (
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
                      <div className="absolute top-2 right-2 text-3xl">
                        {getRankBadge(entry.rank)}
                      </div>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex flex-col items-center space-y-2">
                          <Avatar className="w-20 h-20 border-4 border-background">
                            <AvatarFallback className="text-2xl font-bold">
                              {entry.username[0]}
                            </AvatarFallback>
                          </Avatar>
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
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p className="text-2xl font-bold">
                            {formatScore(entry.score, "level")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Link to="/leaderboard">
                    <Button size="lg" className="gap-2">
                      View Full Leaderboard
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Level</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Highest level achieved
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <p className="font-semibold">XP</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total experience points
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Scans</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total scans completed
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Achievements</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Achievements unlocked
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Items</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Items collected
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Streak</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Consecutive days active
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tier System */}
            <Card>
              <CardHeader>
                <CardTitle>Tier System</CardTitle>
                <CardDescription>
                  7 tiers based on leaderboard ranking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    {
                      name: "Champion",
                      ranks: "Rank 1",
                      color: "from-yellow-400 to-amber-600",
                    },
                    {
                      name: "Elite",
                      ranks: "Ranks 2-3",
                      color: "from-gray-300 to-gray-600",
                    },
                    {
                      name: "Master",
                      ranks: "Ranks 4-10",
                      color: "from-purple-400 to-purple-600",
                    },
                    {
                      name: "Expert",
                      ranks: "Ranks 11-25",
                      color: "from-blue-400 to-blue-600",
                    },
                    {
                      name: "Advanced",
                      ranks: "Ranks 26-50",
                      color: "from-green-400 to-green-600",
                    },
                    {
                      name: "Intermediate",
                      ranks: "Ranks 51-100",
                      color: "from-cyan-400 to-cyan-600",
                    },
                    {
                      name: "Beginner",
                      ranks: "Rank 101+",
                      color: "from-gray-400 to-gray-600",
                    },
                  ].map((tier) => (
                    <div
                      key={tier.name}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`bg-gradient-to-r ${tier.color} text-white border-0`}
                        >
                          {tier.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {tier.ranks}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Documentation Link */}
        <Card className="mt-8 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-lg">Complete Documentation</p>
                <p className="text-sm text-muted-foreground">
                  View the full implementation guide and technical documentation
                </p>
              </div>
              <Button variant="outline" asChild>
                <a
                  href="/GAMIFICATION_SYSTEM_COMPLETE.md"
                  target="_blank"
                  className="gap-2"
                >
                  View Docs
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
