import { useState, useEffect } from "react";
import { Package, Sparkles, TrendingUp } from "lucide-react";
import InventoryGrid from "@/components/InventoryGrid";
import { ITEM_CATALOG } from "@/lib/items/item-catalog";
import type { Item } from "@/lib/items/item-catalog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface InventoryItem {
  item: Item;
  isOwned: boolean;
  isNew?: boolean;
  quantity?: number;
  acquiredAt?: string;
  canUnlock?: boolean;
  missingRequirements?: string[];
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [userStats] = useState({
    level: 12,
    xp: 3450,
    scans: 45,
    achievements: 8,
  });
  const [loading, setLoading] = useState(true);

  // Mock data for demo - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Mock: User owns first 3 items
      const mockInventory = ITEM_CATALOG.map((item, index) => ({
        item,
        isOwned: index < 3, // First 3 items are owned
        isNew: index === 2, // Third item is new
        quantity: 1,
        acquiredAt: index < 3 ? new Date().toISOString() : undefined,
        canUnlock: item.levelRequired <= userStats.level,
        missingRequirements:
          item.levelRequired > userStats.level
            ? [
                `Level ${item.levelRequired} required (current: ${userStats.level})`,
              ]
            : [],
      }));

      setInventory(mockInventory);
      setLoading(false);
    }, 500);
  }, [userStats.level]);

  const handleItemClick = (item: Item) => {
    console.log("Item clicked:", item);
  };

  const handleEquipItem = (item: Item) => {
    toast.success(`Equipped ${item.name}!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Package className="w-12 h-12 animate-pulse mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Item Inventory</h1>
            <p className="text-muted-foreground">
              Collect items by leveling up, completing achievements, and
              scanning domains
            </p>
          </div>
        </div>
      </div>

      {/* User Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.level}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.xp.toLocaleString()} XP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.scans}</div>
            <p className="text-xs text-muted-foreground">Domains analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.achievements}</div>
            <p className="text-xs text-muted-foreground">Unlocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (inventory.filter((i) => i.isOwned).length / inventory.length) *
                  100,
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {inventory.filter((i) => i.isOwned).length} of {inventory.length}{" "}
              items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <CardTitle>How to Unlock Items</CardTitle>
            </div>
            <CardDescription>
              Items are unlocked through various activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
              <div>
                <strong>Level Up:</strong> Reach specific levels to unlock new
                items
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
              <div>
                <strong>Complete Scans:</strong> Scan domains to progress toward
                unlocks
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
              <div>
                <strong>Verify Domains:</strong> Claim and verify domains for
                rare items
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5" />
              <div>
                <strong>Achievements:</strong> Complete achievements for
                exclusive rewards
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <CardTitle>Item Effects</CardTitle>
            </div>
            <CardDescription>Items provide powerful bonuses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
              <div>
                <strong>XP Boost:</strong> Earn more XP from all activities
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
              <div>
                <strong>Scan Speed:</strong> Complete scans faster
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
              <div>
                <strong>Prestige Points:</strong> Earn exclusive prestige
                currency
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
              <div>
                <strong>Unlock Bonuses:</strong> Get instant XP when unlocking
                items
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Your Collection</CardTitle>
          <CardDescription>
            Browse all available items. Locked items show requirements to
            unlock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryGrid
            items={inventory}
            userLevel={userStats.level}
            userXP={userStats.xp}
            onItemClick={handleItemClick}
            onEquipItem={handleEquipItem}
          />
        </CardContent>
      </Card>
    </div>
  );
}
