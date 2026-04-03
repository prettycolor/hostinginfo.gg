import {
  // Intelligence & Brain
  Brain,
  // Eyes & Vision
  Eye,
  EyeOff,
  Scan,
  ScanLine,
  // Search & Discovery
  Search,
  SearchCheck,
  SearchCode,
  SearchSlash,
  SearchX,
  // Analytics & Charts
  BarChart,
  BarChart2,
  BarChart3,
  BarChart4,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  // Data & Database
  Database,
  DatabaseZap,
  Server,
  ServerCog,
  HardDrive,
  Cpu,
  Workflow,
  // Sparkles & Magic
  Sparkles,
  Star,
  Zap,
  // Target & Focus
  Target,
  Focus,
  Crosshair,
  Radar,
  Radio,
  // Network & Connection
  Network,
  Share2,
  GitBranch,
  GitMerge,
  Waypoints,
  // Shield & Security
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  // Gauge & Metrics
  Gauge,
  Activity as ActivityIcon,
  // Light & Insight
  Lightbulb,
  Sun,
  Moon,
  // Layers & Structure
  Layers,
  Box,
  Boxes,
  Package,
  // Arrows & Direction
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp as TrendUp,
  // Tech & Code
  Code,
  Terminal,
  Binary,
  // Globe & World
  Globe,
  Map,
  MapPin,
  Compass,
  // File & Document
  FileSearch,
  FileCode,
  FileText,
  FileCheck,
  // Misc Unique
  Fingerprint,
  Microscope,
  Telescope,
  Atom,
  Orbit,
  Rocket,
  Satellite,
  Wifi,
  CircuitBoard,
  Cpu as CpuIcon,
  Webhook,
  Infinity as InfinityIcon,
  Hexagon,
  Triangle,
  Circle,
  Aperture,
  Camera,
  Scan as ScanIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function IntelligenceIconMegaList() {
  const [searchTerm, setSearchTerm] = useState("");

  const iconCategories = [
    {
      category: "🧠 Intelligence & Brain",
      icons: [
        {
          name: "Brain",
          icon: Brain,
          color: "from-cyan-500 to-blue-500",
          desc: "Classic intelligence",
        },
      ],
    },
    {
      category: "👁️ Eyes & Vision",
      icons: [
        {
          name: "Eye",
          icon: Eye,
          color: "from-blue-500 to-cyan-500",
          desc: "Monitoring",
        },
        {
          name: "EyeOff",
          icon: EyeOff,
          color: "from-gray-500 to-slate-500",
          desc: "Hidden analysis",
        },
        {
          name: "Scan",
          icon: Scan,
          color: "from-green-500 to-emerald-500",
          desc: "Scanning",
        },
        {
          name: "ScanLine",
          icon: ScanLine,
          color: "from-blue-500 to-indigo-500",
          desc: "Line scan",
        },
      ],
    },
    {
      category: "🔍 Search & Discovery",
      icons: [
        {
          name: "Search",
          icon: Search,
          color: "from-teal-500 to-green-500",
          desc: "Basic search",
        },
        {
          name: "SearchCheck",
          icon: SearchCheck,
          color: "from-green-500 to-emerald-500",
          desc: "Verified search",
        },
        {
          name: "SearchCode",
          icon: SearchCode,
          color: "from-purple-500 to-indigo-500",
          desc: "Code search",
        },
        {
          name: "SearchSlash",
          icon: SearchSlash,
          color: "from-orange-500 to-red-500",
          desc: "Quick search",
        },
        {
          name: "SearchX",
          icon: SearchX,
          color: "from-red-500 to-rose-500",
          desc: "Clear search",
        },
      ],
    },
    {
      category: "📊 Analytics & Charts",
      icons: [
        {
          name: "BarChart",
          icon: BarChart,
          color: "from-blue-500 to-cyan-500",
          desc: "Bar chart",
        },
        {
          name: "BarChart2",
          icon: BarChart2,
          color: "from-indigo-500 to-blue-500",
          desc: "Bar chart alt",
        },
        {
          name: "BarChart3",
          icon: BarChart3,
          color: "from-purple-500 to-pink-500",
          desc: "Bar chart 3",
        },
        {
          name: "BarChart4",
          icon: BarChart4,
          color: "from-pink-500 to-rose-500",
          desc: "Bar chart 4",
        },
        {
          name: "LineChart",
          icon: LineChart,
          color: "from-green-500 to-teal-500",
          desc: "Line chart",
        },
        {
          name: "PieChart",
          icon: PieChart,
          color: "from-yellow-500 to-orange-500",
          desc: "Pie chart",
        },
        {
          name: "TrendingUp",
          icon: TrendingUp,
          color: "from-green-500 to-emerald-500",
          desc: "Growth",
        },
        {
          name: "TrendingDown",
          icon: TrendingDown,
          color: "from-red-500 to-orange-500",
          desc: "Decline",
        },
        {
          name: "Activity",
          icon: Activity,
          color: "from-cyan-500 to-blue-500",
          desc: "Activity",
        },
      ],
    },
    {
      category: "💾 Data & Database",
      icons: [
        {
          name: "Database",
          icon: Database,
          color: "from-blue-500 to-indigo-500",
          desc: "Database",
        },
        {
          name: "DatabaseZap",
          icon: DatabaseZap,
          color: "from-yellow-500 to-orange-500",
          desc: "Fast database",
        },
        {
          name: "Server",
          icon: Server,
          color: "from-gray-500 to-slate-500",
          desc: "Server",
        },
        {
          name: "ServerCog",
          icon: ServerCog,
          color: "from-purple-500 to-indigo-500",
          desc: "Server config",
        },
        {
          name: "HardDrive",
          icon: HardDrive,
          color: "from-teal-500 to-cyan-500",
          desc: "Storage",
        },
        {
          name: "Cpu",
          icon: Cpu,
          color: "from-orange-500 to-red-500",
          desc: "Processing",
        },
        {
          name: "Workflow",
          icon: Workflow,
          color: "from-purple-500 to-pink-500",
          desc: "Workflow",
        },
      ],
    },
    {
      category: "✨ Sparkles & Magic",
      icons: [
        {
          name: "Sparkles",
          icon: Sparkles,
          color: "from-yellow-500 to-amber-500",
          desc: "Magic sparkles",
        },
        {
          name: "Star",
          icon: Star,
          color: "from-yellow-500 to-orange-500",
          desc: "Single star",
        },
        {
          name: "Zap",
          icon: Zap,
          color: "from-yellow-500 to-amber-500",
          desc: "Lightning",
        },
      ],
    },
    {
      category: "🎯 Target & Focus",
      icons: [
        {
          name: "Target",
          icon: Target,
          color: "from-red-500 to-rose-500",
          desc: "Target",
        },
        {
          name: "Focus",
          icon: Focus,
          color: "from-blue-500 to-cyan-500",
          desc: "Focus",
        },
        {
          name: "Crosshair",
          icon: Crosshair,
          color: "from-purple-500 to-indigo-500",
          desc: "Crosshair",
        },
        {
          name: "Radar",
          icon: Radar,
          color: "from-green-500 to-teal-500",
          desc: "Radar",
        },
        {
          name: "Radio",
          icon: Radio,
          color: "from-cyan-500 to-blue-500",
          desc: "Radio waves",
        },
      ],
    },
    {
      category: "🌐 Network & Connection",
      icons: [
        {
          name: "Network",
          icon: Network,
          color: "from-blue-500 to-purple-500",
          desc: "Network",
        },
        {
          name: "Share2",
          icon: Share2,
          color: "from-teal-500 to-cyan-500",
          desc: "Share",
        },
        {
          name: "GitBranch",
          icon: GitBranch,
          color: "from-purple-500 to-pink-500",
          desc: "Branching",
        },
        {
          name: "GitMerge",
          icon: GitMerge,
          color: "from-indigo-500 to-purple-500",
          desc: "Merging",
        },
        {
          name: "Waypoints",
          icon: Waypoints,
          color: "from-green-500 to-emerald-500",
          desc: "Waypoints",
        },
      ],
    },
    {
      category: "🛡️ Shield & Security",
      icons: [
        {
          name: "Shield",
          icon: Shield,
          color: "from-blue-500 to-indigo-500",
          desc: "Shield",
        },
        {
          name: "ShieldCheck",
          icon: ShieldCheck,
          color: "from-green-500 to-emerald-500",
          desc: "Verified",
        },
        {
          name: "ShieldAlert",
          icon: ShieldAlert,
          color: "from-red-500 to-orange-500",
          desc: "Alert",
        },
        {
          name: "Lock",
          icon: Lock,
          color: "from-gray-500 to-slate-500",
          desc: "Locked",
        },
        {
          name: "Unlock",
          icon: Unlock,
          color: "from-green-500 to-teal-500",
          desc: "Unlocked",
        },
        {
          name: "Key",
          icon: Key,
          color: "from-yellow-500 to-amber-500",
          desc: "Key",
        },
      ],
    },
    {
      category: "⚡ Gauge & Metrics",
      icons: [
        {
          name: "Gauge",
          icon: Gauge,
          color: "from-blue-500 to-cyan-500",
          desc: "Gauge",
        },
        {
          name: "Activity",
          icon: ActivityIcon,
          color: "from-green-500 to-emerald-500",
          desc: "Activity",
        },
      ],
    },
    {
      category: "💡 Light & Insight",
      icons: [
        {
          name: "Lightbulb",
          icon: Lightbulb,
          color: "from-yellow-500 to-amber-500",
          desc: "Idea",
        },
        {
          name: "Sun",
          icon: Sun,
          color: "from-yellow-500 to-orange-500",
          desc: "Sun",
        },
        {
          name: "Moon",
          icon: Moon,
          color: "from-indigo-500 to-purple-500",
          desc: "Moon",
        },
      ],
    },
    {
      category: "📦 Layers & Structure",
      icons: [
        {
          name: "Layers",
          icon: Layers,
          color: "from-blue-500 to-indigo-500",
          desc: "Layers",
        },
        {
          name: "Box",
          icon: Box,
          color: "from-orange-500 to-red-500",
          desc: "Box",
        },
        {
          name: "Boxes",
          icon: Boxes,
          color: "from-green-500 to-teal-500",
          desc: "Boxes",
        },
        {
          name: "Package",
          icon: Package,
          color: "from-amber-500 to-orange-500",
          desc: "Package",
        },
      ],
    },
    {
      category: "➡️ Arrows & Direction",
      icons: [
        {
          name: "ArrowUpRight",
          icon: ArrowUpRight,
          color: "from-green-500 to-emerald-500",
          desc: "Up right",
        },
        {
          name: "ArrowDownRight",
          icon: ArrowDownRight,
          color: "from-red-500 to-orange-500",
          desc: "Down right",
        },
        {
          name: "TrendingUp",
          icon: TrendUp,
          color: "from-green-500 to-teal-500",
          desc: "Trending",
        },
      ],
    },
    {
      category: "💻 Tech & Code",
      icons: [
        {
          name: "Code",
          icon: Code,
          color: "from-purple-500 to-indigo-500",
          desc: "Code",
        },
        {
          name: "Terminal",
          icon: Terminal,
          color: "from-green-500 to-emerald-500",
          desc: "Terminal",
        },
        {
          name: "Binary",
          icon: Binary,
          color: "from-gray-500 to-slate-500",
          desc: "Binary",
        },
      ],
    },
    {
      category: "🌍 Globe & World",
      icons: [
        {
          name: "Globe",
          icon: Globe,
          color: "from-blue-500 to-cyan-500",
          desc: "Globe",
        },
        {
          name: "Map",
          icon: Map,
          color: "from-green-500 to-emerald-500",
          desc: "Map",
        },
        {
          name: "MapPin",
          icon: MapPin,
          color: "from-red-500 to-rose-500",
          desc: "Location",
        },
        {
          name: "Compass",
          icon: Compass,
          color: "from-purple-500 to-pink-500",
          desc: "Compass",
        },
      ],
    },
    {
      category: "📄 File & Document",
      icons: [
        {
          name: "FileSearch",
          icon: FileSearch,
          color: "from-blue-500 to-indigo-500",
          desc: "File search",
        },
        {
          name: "FileCode",
          icon: FileCode,
          color: "from-green-500 to-teal-500",
          desc: "Code file",
        },
        {
          name: "FileText",
          icon: FileText,
          color: "from-gray-500 to-slate-500",
          desc: "Text file",
        },
        {
          name: "FileCheck",
          icon: FileCheck,
          color: "from-green-500 to-emerald-500",
          desc: "Verified file",
        },
      ],
    },
    {
      category: "🔬 Science & Tech",
      icons: [
        {
          name: "Fingerprint",
          icon: Fingerprint,
          color: "from-purple-500 to-indigo-500",
          desc: "Fingerprint",
        },
        {
          name: "Microscope",
          icon: Microscope,
          color: "from-blue-500 to-cyan-500",
          desc: "Microscope",
        },
        {
          name: "Telescope",
          icon: Telescope,
          color: "from-indigo-500 to-purple-500",
          desc: "Telescope",
        },
        {
          name: "Atom",
          icon: Atom,
          color: "from-orange-500 to-red-500",
          desc: "Atom",
        },
        {
          name: "Orbit",
          icon: Orbit,
          color: "from-cyan-500 to-blue-500",
          desc: "Orbit",
        },
      ],
    },
    {
      category: "🚀 Space & Future",
      icons: [
        {
          name: "Rocket",
          icon: Rocket,
          color: "from-red-500 to-orange-500",
          desc: "Rocket",
        },
        {
          name: "Satellite",
          icon: Satellite,
          color: "from-blue-500 to-indigo-500",
          desc: "Satellite",
        },
        {
          name: "Wifi",
          icon: Wifi,
          color: "from-cyan-500 to-blue-500",
          desc: "Wifi",
        },
      ],
    },
    {
      category: "⚙️ Circuit & Hardware",
      icons: [
        {
          name: "CircuitBoard",
          icon: CircuitBoard,
          color: "from-green-500 to-emerald-500",
          desc: "Circuit",
        },
        {
          name: "Cpu",
          icon: CpuIcon,
          color: "from-orange-500 to-red-500",
          desc: "CPU",
        },
        {
          name: "Webhook",
          icon: Webhook,
          color: "from-blue-500 to-cyan-500",
          desc: "Webhook",
        },
      ],
    },
    {
      category: "🔷 Shapes & Geometry",
      icons: [
        {
          name: "Infinity",
          icon: InfinityIcon,
          color: "from-purple-500 to-pink-500",
          desc: "Infinity",
        },
        {
          name: "Hexagon",
          icon: Hexagon,
          color: "from-blue-500 to-indigo-500",
          desc: "Hexagon",
        },
        {
          name: "Triangle",
          icon: Triangle,
          color: "from-yellow-500 to-orange-500",
          desc: "Triangle",
        },
        {
          name: "Circle",
          icon: Circle,
          color: "from-cyan-500 to-blue-500",
          desc: "Circle",
        },
      ],
    },
    {
      category: "📸 Camera & Scan",
      icons: [
        {
          name: "Aperture",
          icon: Aperture,
          color: "from-purple-500 to-indigo-500",
          desc: "Aperture",
        },
        {
          name: "Camera",
          icon: Camera,
          color: "from-gray-500 to-slate-500",
          desc: "Camera",
        },
        {
          name: "Scan",
          icon: ScanIcon,
          color: "from-green-500 to-emerald-500",
          desc: "Scan",
        },
      ],
    },
  ];

  // Flatten all icons for search
  const allIcons = iconCategories.flatMap((cat) =>
    cat.icons.map((icon) => ({ ...icon, category: cat.category })),
  );

  // Filter icons based on search
  const filteredCategories = iconCategories
    .map((cat) => ({
      ...cat,
      icons: cat.icons.filter(
        (icon) =>
          icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          icon.desc.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.icons.length > 0);

  const totalIcons = allIcons.length;
  const displayedIcons = filteredCategories.reduce(
    (sum, cat) => sum + cat.icons.length,
    0,
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">
                Intelligence Icon Mega List
              </h1>
              <p className="text-muted-foreground text-lg mt-2">
                70+ professional icons from Lucide React - Search, filter, and
                choose your favorite!
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Showing {displayedIcons} of {totalIcons} icons
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search icons by name or description... (e.g., 'brain', 'chart', 'security')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-6 text-lg"
            />
          </div>
        </div>

        {/* Icon Categories */}
        {filteredCategories.map((category) => (
          <div key={category.category} className="space-y-4">
            <h2 className="text-2xl font-bold">{category.category}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {category.icons.map((iconData) => {
                const IconComponent = iconData.icon;
                return (
                  <Card
                    key={iconData.name}
                    className="relative overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Large Icon */}
                      <div className="flex justify-center">
                        <div
                          className={`p-4 bg-gradient-to-br ${iconData.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        >
                          <IconComponent className="h-10 w-10 text-white" />
                        </div>
                      </div>

                      {/* Icon Name */}
                      <div className="text-center space-y-1">
                        <p className="font-semibold text-sm">{iconData.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {iconData.desc}
                        </p>
                      </div>

                      {/* Preview Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                      >
                        <IconComponent className="h-3 w-3 mr-1" />
                        Use This
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* No Results */}
        {filteredCategories.length === 0 && (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <SearchX className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-2xl font-bold">No icons found</h3>
              <p className="text-muted-foreground">
                Try searching for different keywords like "brain", "chart",
                "security", or "network"
              </p>
              <Button onClick={() => setSearchTerm("")} variant="outline">
                Clear Search
              </Button>
            </div>
          </Card>
        )}

        {/* Recommendations */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>🎯 Top Recommendations for Intelligence</CardTitle>
            <CardDescription>
              Based on meaning, clarity, and professional appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">🏆 Best Overall</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    • <strong>Brain</strong> - Classic, clear
                  </li>
                  <li>
                    • <strong>Eye</strong> - Monitoring
                  </li>
                  <li>
                    • <strong>Scan</strong> - Scanning
                  </li>
                  <li>
                    • <strong>Activity</strong> - Metrics
                  </li>
                  <li>
                    • <strong>Target</strong> - Precision
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">✨ Most Unique</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    • <strong>Fingerprint</strong> - Identity
                  </li>
                  <li>
                    • <strong>Orbit</strong> - Circular analysis
                  </li>
                  <li>
                    • <strong>Radar</strong> - Detection
                  </li>
                  <li>
                    • <strong>Aperture</strong> - Focus
                  </li>
                  <li>
                    • <strong>Atom</strong> - Molecular
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">🚀 Most Modern</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    • <strong>Sparkles</strong> - AI magic
                  </li>
                  <li>
                    • <strong>Zap</strong> - Speed
                  </li>
                  <li>
                    • <strong>CircuitBoard</strong> - Tech
                  </li>
                  <li>
                    • <strong>Rocket</strong> - Fast
                  </li>
                  <li>
                    • <strong>Network</strong> - Connected
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Choose Your Icon</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Browse through 70+ icons above or use the search bar</li>
              <li>Click on icons to see them larger and in context</li>
              <li>Consider the meaning and vibe of each icon</li>
              <li>
                Pick your favorite and tell me the name (e.g., "BrainCircuit" or
                "ScanEye")
              </li>
              <li>
                I'll update the dashboard Intelligence tab with your chosen icon
                instantly
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
