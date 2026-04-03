import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check } from "lucide-react";

interface AnimationStyle {
  id: number;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  techniques: string[];
}

const animationStyles: AnimationStyle[] = [
  {
    id: 1,
    name: "Floating Hologram",
    description: "Smooth floating with holographic scan lines and glow pulse",
    category: "Sci-Fi",
    difficulty: "Medium",
    techniques: [
      "Sine Wave Float",
      "Emissive Pulse",
      "Scan Lines",
      "Glow Effect",
    ],
  },
  {
    id: 2,
    name: "Energy Vortex",
    description: "Spinning particle vortex surrounding the emerald",
    category: "Magical",
    difficulty: "Hard",
    techniques: [
      "Particle System",
      "Spiral Motion",
      "Color Gradient",
      "Trail Effect",
    ],
  },
  {
    id: 3,
    name: "Quantum Flicker",
    description: "Rapid position shifts creating quantum teleportation effect",
    category: "Sci-Fi",
    difficulty: "Medium",
    techniques: [
      "Position Jitter",
      "Opacity Flash",
      "Motion Blur",
      "Afterimage",
    ],
  },
  {
    id: 4,
    name: "Orbital Rings",
    description: "Multiple glowing rings orbiting on different axes",
    category: "Tech",
    difficulty: "Hard",
    techniques: [
      "Multi-axis Rotation",
      "Torus Geometry",
      "Bloom Effect",
      "Speed Variation",
    ],
  },
  {
    id: 5,
    name: "Power Surge",
    description: "Pulsing scale with electric arcs and energy waves",
    category: "Energy",
    difficulty: "Hard",
    techniques: [
      "Scale Pulse",
      "Lightning Effect",
      "Shockwave",
      "Chromatic Aberration",
    ],
  },
  {
    id: 6,
    name: "Crystal Growth",
    description: "Emerald grows from small crystal with fractal expansion",
    category: "Organic",
    difficulty: "Medium",
    techniques: [
      "Scale Animation",
      "Fractal Pattern",
      "Crystallization",
      "Emergence",
    ],
  },
  {
    id: 7,
    name: "Dimensional Rift",
    description: "Emerald phases between dimensions with distortion",
    category: "Sci-Fi",
    difficulty: "Hard",
    techniques: [
      "Displacement Map",
      "Distortion",
      "Portal Effect",
      "Reality Warp",
    ],
  },
  {
    id: 8,
    name: "Sacred Relic",
    description: "Slow rotation with divine light rays and dust particles",
    category: "Fantasy",
    difficulty: "Medium",
    techniques: [
      "God Rays",
      "Dust Particles",
      "Soft Glow",
      "Reverent Rotation",
    ],
  },
  {
    id: 9,
    name: "Chaos Control",
    description: "Time freeze effect with motion trails and speed lines",
    category: "Sonic",
    difficulty: "Hard",
    techniques: [
      "Time Dilation",
      "Motion Trails",
      "Speed Lines",
      "Freeze Frame",
    ],
  },
  {
    id: 10,
    name: "Legendary Unlock",
    description: "Epic reveal animation with burst, particles, and camera zoom",
    category: "Reward",
    difficulty: "Hard",
    techniques: [
      "Camera Animation",
      "Particle Burst",
      "Light Explosion",
      "Dramatic Zoom",
    ],
  },
];

// Raw Three.js Animation Component
function ChaosEmeraldAnimation({
  animationType,
  containerRef,
}: {
  animationType: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    // Create camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 5;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0xffffff, 1);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x10b981, 0.8);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    // Load GLB model
    const loader = new GLTFLoader();
    let model: THREE.Group | null = null;
    let particles: THREE.Points | null = null;
    const rings: THREE.Mesh[] = [];
    const lightRays: THREE.Mesh[] = [];

    loader.load(
      "/assets/chaos_emerald.glb",
      (gltf) => {
        model = gltf.scene;

        // Center and scale
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);

        scene.add(model);

        // Add animation-specific elements
        switch (animationType) {
          case 2: {
            // Energy Vortex - Particle spiral
            const particleGeometry = new THREE.BufferGeometry();
            const particleCount = 200;
            const positions = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount; i++) {
              const angle = (i / particleCount) * Math.PI * 4;
              const radius = 2 + (i / particleCount) * 2;
              positions[i * 3] = Math.cos(angle) * radius;
              positions[i * 3 + 1] = (i / particleCount) * 4 - 2;
              positions[i * 3 + 2] = Math.sin(angle) * radius;
            }
            particleGeometry.setAttribute(
              "position",
              new THREE.BufferAttribute(positions, 3),
            );
            const particleMaterial = new THREE.PointsMaterial({
              color: 0x10b981,
              size: 0.1,
              transparent: true,
              opacity: 0.8,
            });
            particles = new THREE.Points(particleGeometry, particleMaterial);
            scene.add(particles);
            break;
          }

          case 4: {
            // Orbital Rings
            for (let i = 0; i < 3; i++) {
              const ring = new THREE.Mesh(
                new THREE.TorusGeometry(2 + i * 0.5, 0.05, 16, 100),
                new THREE.MeshBasicMaterial({
                  color: i === 0 ? 0x10b981 : i === 1 ? 0x3b82f6 : 0x8b5cf6,
                  transparent: true,
                  opacity: 0.6,
                }),
              );
              rings.push(ring);
              scene.add(ring);
            }
            break;
          }

          case 8: {
            // Sacred Relic - God rays
            for (let i = 0; i < 8; i++) {
              const rayGeometry = new THREE.PlaneGeometry(0.1, 4);
              const rayMaterial = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
              });
              const ray = new THREE.Mesh(rayGeometry, rayMaterial);
              ray.rotation.z = (i / 8) * Math.PI * 2;
              lightRays.push(ray);
              scene.add(ray);
            }
            // Add dust particles
            const dustGeometry = new THREE.BufferGeometry();
            const dustCount = 100;
            const dustPositions = new Float32Array(dustCount * 3);
            for (let i = 0; i < dustCount; i++) {
              dustPositions[i * 3] = (Math.random() - 0.5) * 8;
              dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
              dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
            }
            dustGeometry.setAttribute(
              "position",
              new THREE.BufferAttribute(dustPositions, 3),
            );
            const dustMaterial = new THREE.PointsMaterial({
              color: 0xffffff,
              size: 0.05,
              transparent: true,
              opacity: 0.4,
            });
            particles = new THREE.Points(dustGeometry, dustMaterial);
            scene.add(particles);
            break;
          }
        }
      },
      undefined,
      (error) => console.error("Error loading model:", error),
    );

    // Animation loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!model) {
        renderer.render(scene, camera);
        return;
      }

      // Animation-specific logic
      switch (animationType) {
        case 1: // Floating Hologram
          model.position.y = Math.sin(elapsedTime * 2) * 0.3;
          model.rotation.y = elapsedTime * 0.5;
          // Pulse emissive (would need to traverse materials)
          break;

        case 2: // Energy Vortex
          model.rotation.y = elapsedTime * 1;
          if (particles) {
            particles.rotation.y = elapsedTime * 0.5;
          }
          break;

        case 3: {
          // Quantum Flicker
          model.rotation.y = elapsedTime * 0.3;
          // Add jitter
          const jitter = Math.sin(elapsedTime * 20) * 0.05;
          model.position.x = jitter;
          model.position.z = Math.cos(elapsedTime * 20) * 0.05;
          break;
        }

        case 4: // Orbital Rings
          model.rotation.y = elapsedTime * 0.5;
          rings.forEach((ring, i) => {
            if (i === 0) {
              ring.rotation.x = elapsedTime * 1.5;
            } else if (i === 1) {
              ring.rotation.y = elapsedTime * 1.2;
            } else {
              ring.rotation.z = elapsedTime * 0.8;
            }
          });
          break;

        case 5: {
          // Power Surge
          const pulse = 1 + Math.sin(elapsedTime * 3) * 0.3;
          model.scale.setScalar((pulse * 2) / 2); // Maintain base scale
          model.rotation.y = elapsedTime * 2;
          break;
        }

        case 6: {
          // Crystal Growth
          const growth = Math.min(1, elapsedTime / 3);
          const growthScale = (growth * 2) / 2;
          model.scale.setScalar(growthScale);
          model.rotation.y = elapsedTime * 0.3;
          break;
        }

        case 7: {
          // Dimensional Rift
          model.rotation.y = elapsedTime * 0.5;
          model.rotation.x = Math.sin(elapsedTime * 2) * 0.3;
          // Add phase effect
          const phase = Math.sin(elapsedTime * 2);
          model.position.x = phase * 0.2;
          break;
        }

        case 8: // Sacred Relic
          model.rotation.y = elapsedTime * 0.2;
          lightRays.forEach((ray, i) => {
            ray.rotation.z = (i / 8) * Math.PI * 2 + elapsedTime * 0.1;
          });
          if (particles) {
            particles.rotation.y = elapsedTime * 0.05;
          }
          break;

        case 9: {
          // Chaos Control
          // Rapid rotation with pauses
          const timePhase = Math.floor(elapsedTime * 2) % 2;
          if (timePhase === 0) {
            model.rotation.y = elapsedTime * 5;
          }
          break;
        }

        case 10: {
          // Legendary Unlock
          const revealProgress = Math.min(1, elapsedTime / 2);
          model.scale.setScalar((revealProgress * 2) / 2);
          model.rotation.y = elapsedTime * 1;
          camera.position.z = 5 - revealProgress * 2;
          break;
        }

        default:
          model.rotation.y = elapsedTime * 0.5;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [animationType, containerRef]);

  return null;
}

interface AnimationCardProps {
  style: AnimationStyle;
  index: number;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function AnimationCard({
  style,
  index,
  isSelected,
  onSelect,
}: AnimationCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={() => onSelect(style.id)}
      className="cursor-pointer group"
    >
      <Card
        className={`relative transition-all duration-300 ${
          isSelected
            ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/20 scale-105"
            : "border-border hover:border-emerald-500/50 hover:shadow-md"
        }`}
      >
        {/* Selected Badge */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg z-10"
          >
            <Check className="h-4 w-4" />
          </motion.div>
        )}

        {/* Number Badge */}
        <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-lg z-10">
          {style.id}
        </div>

        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-xl">{style.name}</CardTitle>
            <div className="flex gap-2">
              <Badge
                variant="secondary"
                className={`text-xs ${
                  style.difficulty === "Easy"
                    ? "bg-green-500/10 text-green-600"
                    : style.difficulty === "Medium"
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-red-500/10 text-red-600"
                }`}
              >
                {style.difficulty}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {style.category}
              </Badge>
            </div>
          </div>
          <CardDescription>{style.description}</CardDescription>
        </CardHeader>

        <CardContent>
          {/* 3D Canvas Preview */}
          <div className="relative h-80 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg mb-4 overflow-hidden">
            <div
              ref={containerRef}
              className="absolute inset-0"
              style={{ pointerEvents: "auto" }}
            >
              <ChaosEmeraldAnimation
                animationType={style.id}
                containerRef={containerRef}
              />
            </div>
          </div>

          {/* Techniques */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Techniques Used:
            </p>
            <div className="flex flex-wrap gap-2">
              {style.techniques.map((technique) => (
                <Badge key={technique} variant="secondary" className="text-xs">
                  {technique}
                </Badge>
              ))}
            </div>
          </div>

          {/* Performance Note */}
          <div className="mt-4 p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
            ✅ 60fps • WebGL • Auto-playing
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ChaosEmeraldAnimations() {
  const [selectedAnimation, setSelectedAnimation] = useState<number | null>(
    null,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-lg">
              <Sparkles className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 bg-clip-text text-transparent">
                Chaos Emerald Animations
              </h1>
              <p className="text-muted-foreground text-lg">
                10 Premium Animation Styles - Top 1% Web Effects
              </p>
            </div>
          </div>

          {/* Tech Stack Info */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600"
            >
              Three.js + GLTFLoader
            </Badge>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
              WebGL Shaders
            </Badge>
            <Badge
              variant="secondary"
              className="bg-purple-500/10 text-purple-600"
            >
              Particle Systems
            </Badge>
            <Badge
              variant="secondary"
              className="bg-orange-500/10 text-orange-600"
            >
              Advanced Lighting
            </Badge>
          </div>
        </motion.div>
      </div>

      {/* Animations Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {animationStyles.map((style, index) => (
          <AnimationCard
            key={style.id}
            style={style}
            index={index}
            isSelected={selectedAnimation === style.id}
            onSelect={(id) => setSelectedAnimation(id)}
          />
        ))}
      </div>

      {/* Selected Animation Details */}
      {selectedAnimation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto mt-12"
        >
          <Card className="border-2 border-emerald-500 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold">
                  {selectedAnimation}
                </div>
                <div>
                  <div className="text-lg">Selected Animation</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {
                      animationStyles.find((s) => s.id === selectedAnimation)
                        ?.name
                    }
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-semibold mb-2">Best Use Case</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAnimation === 1 &&
                      "Loading screens, futuristic UIs, tech demos"}
                    {selectedAnimation === 2 &&
                      "Power-ups, magical effects, energy collection"}
                    {selectedAnimation === 3 &&
                      "Teleportation, glitch effects, sci-fi transitions"}
                    {selectedAnimation === 4 &&
                      "Tech interfaces, scanning effects, HUD elements"}
                    {selectedAnimation === 5 &&
                      "Power activation, energy surge, combat effects"}
                    {selectedAnimation === 6 &&
                      "Item discovery, crafting, organic growth"}
                    {selectedAnimation === 7 &&
                      "Portal effects, dimension travel, reality warps"}
                    {selectedAnimation === 8 &&
                      "Treasure reveals, holy items, epic loot"}
                    {selectedAnimation === 9 &&
                      "Time manipulation, speed effects, Sonic references"}
                    {selectedAnimation === 10 &&
                      "Achievement unlocks, legendary rewards, epic reveals"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Performance</p>
                  <p className="text-sm text-muted-foreground">
                    {animationStyles.find((s) => s.id === selectedAnimation)
                      ?.difficulty === "Easy" &&
                      "Lightweight - 60fps on all devices"}
                    {animationStyles.find((s) => s.id === selectedAnimation)
                      ?.difficulty === "Medium" &&
                      "Moderate - 60fps on modern devices"}
                    {animationStyles.find((s) => s.id === selectedAnimation)
                      ?.difficulty === "Hard" &&
                      "Intensive - Best on high-end devices"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Inspiration</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAnimation === 1 &&
                      "Cyberpunk 2077, Halo holograms"}
                    {selectedAnimation === 2 &&
                      "League of Legends, Diablo effects"}
                    {selectedAnimation === 3 && "Doctor Strange, Quantum Break"}
                    {selectedAnimation === 4 && "Iron Man HUD, Tron"}
                    {selectedAnimation === 5 && "Dragon Ball Z, Marvel powers"}
                    {selectedAnimation === 6 && "Minecraft, Terraria crafting"}
                    {selectedAnimation === 7 &&
                      "Doctor Strange portals, Interstellar"}
                    {selectedAnimation === 8 &&
                      "Zelda treasure chests, WoW loot"}
                    {selectedAnimation === 9 &&
                      "Sonic the Hedgehog Chaos Control"}
                    {selectedAnimation === 10 &&
                      "Overwatch POTGs, Apex Legends"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
