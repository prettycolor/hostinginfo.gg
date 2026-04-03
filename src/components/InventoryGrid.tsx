import { useState } from "react";
import { Lock, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { Item, RARITY_COLORS, ItemRarity } from "@/lib/items/item-catalog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InventoryItem {
  item: Item;
  isOwned: boolean;
  isNew?: boolean;
  quantity?: number;
  acquiredAt?: string;
  canUnlock?: boolean;
  missingRequirements?: string[];
}

interface InventoryGridProps {
  items: InventoryItem[];
  userLevel: number;
  userXP: number;
  onItemClick?: (item: Item) => void;
  onEquipItem?: (item: Item) => void;
}

export default function InventoryGrid({
  items,
  userLevel,
  userXP,
  onItemClick,
  onEquipItem,
}: InventoryGridProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [filterRarity, setFilterRarity] = useState<ItemRarity | "all">("all");
  const [filterCategory] = useState<string>("all");
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);

  // Filter items
  const filteredItems = items.filter((invItem) => {
    if (filterRarity !== "all" && invItem.item.rarity !== filterRarity)
      return false;
    if (filterCategory !== "all" && invItem.item.category !== filterCategory)
      return false;
    if (showOnlyOwned && !invItem.isOwned) return false;
    return true;
  });

  // Group by rarity
  const groupedItems = {
    legendary: filteredItems.filter((i) => i.item.rarity === "legendary"),
    epic: filteredItems.filter((i) => i.item.rarity === "epic"),
    rare: filteredItems.filter((i) => i.item.rarity === "rare"),
    uncommon: filteredItems.filter((i) => i.item.rarity === "uncommon"),
    common: filteredItems.filter((i) => i.item.rarity === "common"),
  };

  const handleItemClick = (invItem: InventoryItem) => {
    setSelectedItem(invItem);
    onItemClick?.(invItem.item);
  };

  const getRarityIcon = (rarity: ItemRarity) => {
    switch (rarity) {
      case "legendary":
        return <Star className="w-4 h-4" />;
      case "epic":
        return <Sparkles className="w-4 h-4" />;
      case "rare":
        return <Trophy className="w-4 h-4" />;
      case "uncommon":
        return <Zap className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs
          value={filterRarity}
          onValueChange={(v) => setFilterRarity(v as ItemRarity | "all")}
          className="flex-1"
        >
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="legendary">Legendary</TabsTrigger>
            <TabsTrigger value="epic">Epic</TabsTrigger>
            <TabsTrigger value="rare">Rare</TabsTrigger>
            <TabsTrigger value="uncommon">Uncommon</TabsTrigger>
            <TabsTrigger value="common">Common</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button
            variant={showOnlyOwned ? "default" : "outline"}
            onClick={() => setShowOnlyOwned(!showOnlyOwned)}
            size="sm"
          >
            {showOnlyOwned ? "Owned Only" : "Show All"}
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Items</div>
          <div className="text-2xl font-bold">
            {items.filter((i) => i.isOwned).length}
          </div>
          <div className="text-xs text-muted-foreground">of {items.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Level</div>
          <div className="text-2xl font-bold">{userLevel}</div>
          <div className="text-xs text-muted-foreground">Current</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">XP</div>
          <div className="text-2xl font-bold">{userXP.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Legendary</div>
          <div className="text-2xl font-bold text-amber-500">
            {
              items.filter((i) => i.isOwned && i.item.rarity === "legendary")
                .length
            }
          </div>
          <div className="text-xs text-muted-foreground">
            of {items.filter((i) => i.item.rarity === "legendary").length}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Epic</div>
          <div className="text-2xl font-bold text-purple-500">
            {items.filter((i) => i.isOwned && i.item.rarity === "epic").length}
          </div>
          <div className="text-xs text-muted-foreground">
            of {items.filter((i) => i.item.rarity === "epic").length}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Completion</div>
          <div className="text-2xl font-bold">
            {Math.round(
              (items.filter((i) => i.isOwned).length / items.length) * 100,
            )}
            %
          </div>
          <div className="text-xs text-muted-foreground">Collection</div>
        </div>
      </div>

      {/* Inventory Grid - Grouped by Rarity */}
      <div className="space-y-8">
        {Object.entries(groupedItems).map(
          ([rarity, rarityItems]) =>
            rarityItems.length > 0 && (
              <div key={rarity}>
                <div className="flex items-center gap-2 mb-4">
                  {getRarityIcon(rarity as ItemRarity)}
                  <h3 className="text-lg font-semibold capitalize">
                    {rarity} Items
                  </h3>
                  <Badge variant="outline">{rarityItems.length}</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {rarityItems.map((invItem) => (
                    <ItemCard
                      key={invItem.item.itemKey}
                      invItem={invItem}
                      onClick={() => handleItemClick(invItem)}
                    />
                  ))}
                </div>
              </div>
            ),
        )}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No items found with the selected filters.</p>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        invItem={selectedItem}
        onClose={() => setSelectedItem(null)}
        onEquip={onEquipItem}
      />
    </div>
  );
}

// Item Card Component
function ItemCard({
  invItem,
  onClick,
}: {
  invItem: InventoryItem;
  onClick: () => void;
}) {
  const { item, isOwned, isNew, quantity } = invItem;
  const colors = RARITY_COLORS[item.rarity];

  return (
    <button
      onClick={onClick}
      className={`
        relative group
        bg-card border-2 rounded-lg overflow-hidden
        transition-all duration-300
        hover:scale-105 hover:shadow-lg
        ${isOwned ? colors.border : "border-border"}
        ${isOwned ? colors.glow : ""}
        ${!isOwned ? "opacity-60 grayscale" : ""}
      `}
    >
      {/* NEW Badge */}
      {isNew && isOwned && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-red-500 text-white text-xs">NEW</Badge>
        </div>
      )}

      {/* Lock Icon for Locked Items */}
      {!isOwned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <Lock className="w-8 h-8 text-white" />
        </div>
      )}

      {/* Item Image */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Rarity Gradient Overlay */}
        {isOwned && (
          <div
            className={`absolute inset-0 bg-gradient-to-t ${colors.gradient} opacity-20 group-hover:opacity-30 transition-opacity`}
          />
        )}
      </div>

      {/* Item Info */}
      <div className="p-2 space-y-1">
        <div className="text-xs font-semibold truncate">{item.name}</div>
        <div className="flex items-center justify-between text-xs">
          <Badge
            variant="outline"
            className={`text-xs capitalize ${isOwned ? "" : "opacity-50"}`}
          >
            {item.rarity}
          </Badge>
          {quantity && quantity > 1 && (
            <span className="text-xs font-bold">x{quantity}</span>
          )}
        </div>
      </div>

      {/* Level Requirement Badge */}
      {item.levelRequired > 1 && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            Lv {item.levelRequired}
          </Badge>
        </div>
      )}
    </button>
  );
}

// Item Detail Modal
function ItemDetailModal({
  invItem,
  onClose,
  onEquip,
}: {
  invItem: InventoryItem | null;
  onClose: () => void;
  onEquip?: (item: Item) => void;
}) {
  if (!invItem) return null;

  const { item, isOwned, quantity, acquiredAt, missingRequirements } = invItem;
  const colors = RARITY_COLORS[item.rarity];

  return (
    <Dialog open={!!invItem} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{item.name}</span>
            <Badge className={`capitalize ${colors.border}`}>
              {item.rarity}
            </Badge>
          </DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Image */}
          <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden border-4">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
            {!isOwned && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <Lock className="w-16 h-16 text-white" />
              </div>
            )}
          </div>

          {/* Item Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Requirements</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Level: {item.levelRequired}</div>
                {item.xpRequired && (
                  <div>XP: {item.xpRequired.toLocaleString()}</div>
                )}
                {item.achievementRequired && (
                  <div>Achievement: {item.achievementRequired}</div>
                )}
              </div>
            </div>

            {item.effects && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">Effects</div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {item.effects.xpBoost && (
                    <div className="text-green-500">
                      +{((item.effects.xpBoost - 1) * 100).toFixed(0)}% XP Boost
                    </div>
                  )}
                  {item.effects.scanSpeedBoost && (
                    <div className="text-blue-500">
                      +{((item.effects.scanSpeedBoost - 1) * 100).toFixed(0)}%
                      Scan Speed
                    </div>
                  )}
                  {item.effects.prestigePoints && (
                    <div className="text-purple-500">
                      +{item.effects.prestigePoints} Prestige Points
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Unlock Conditions */}
          {item.unlockConditions && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Unlock Conditions</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {item.unlockConditions.scansRequired && (
                  <div>
                    • {item.unlockConditions.scansRequired} scans required
                  </div>
                )}
                {item.unlockConditions.domainsVerified && (
                  <div>
                    • {item.unlockConditions.domainsVerified} domains verified
                  </div>
                )}
                {item.unlockConditions.achievementsCompleted && (
                  <div>
                    • {item.unlockConditions.achievementsCompleted} achievements
                    completed
                  </div>
                )}
                {item.unlockConditions.consecutiveDays && (
                  <div>
                    • {item.unlockConditions.consecutiveDays} day login streak
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Missing Requirements (if locked) */}
          {!isOwned &&
            missingRequirements &&
            missingRequirements.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="text-sm font-semibold text-destructive mb-2">
                  Missing Requirements:
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {missingRequirements.map((req, idx) => (
                    <li key={idx}>• {req}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Owned Info */}
          {isOwned && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-green-500">
                    Owned
                  </div>
                  {acquiredAt && (
                    <div className="text-xs text-muted-foreground">
                      Acquired: {new Date(acquiredAt).toLocaleDateString()}
                    </div>
                  )}
                  {quantity && quantity > 1 && (
                    <div className="text-xs text-muted-foreground">
                      Quantity: {quantity}
                    </div>
                  )}
                </div>
                {onEquip && (
                  <Button onClick={() => onEquip(item)} size="sm">
                    Equip
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
