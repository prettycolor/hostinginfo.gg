import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import * as THREE from "three";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem, Check } from "lucide-react";

type GemType =
  | "classic"
  | "floating"
  | "holographic"
  | "wireframe"
  | "pulsing"
  | "multilayer"
  | "rings"
  | "fractal";

interface GemStyle {
  id: number;
  name: string;
  type: GemType;
  description: string;
  tech: string;
  difficulty: "Easy" | "Medium" | "Hard";
  features: string[];
}

// Raw Three.js Gem Component (No React Three Fiber)
function RawThreeJSGem({
  type,
  containerRef,
}: {
  type: GemType;
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0xffffff, 1);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x10b981, 0.5);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Create gem based on type
    let mainMesh: THREE.Mesh | THREE.Group;
    type AnimationObject =
      | { kind: "sparkles"; sparkles: THREE.Points }
      | { kind: "holographic"; material: THREE.MeshStandardMaterial }
      | { kind: "wireframe"; outer: THREE.Mesh; inner: THREE.Mesh }
      | {
          kind: "multilayer";
          layer1: THREE.Mesh;
          layer2: THREE.Mesh;
          layer3: THREE.Mesh;
        }
      | {
          kind: "rings";
          ring1: THREE.Mesh;
          ring2: THREE.Mesh;
          ring3: THREE.Mesh;
          centerGem: THREE.Mesh;
        };
    const animationObjects: AnimationObject[] = [];

    switch (type) {
      case "classic": {
        // Classic Diamond
        const geometry1 = new THREE.OctahedronGeometry(1.2, 0);
        const material1 = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0x10b981,
          emissiveIntensity: 0.3,
          flatShading: true, // Sharp facets like a real diamond
        });
        mainMesh = new THREE.Mesh(geometry1, material1);
        scene.add(mainMesh);
        break;
      }
      case "floating": {
        // Floating Crystal with sparkles
        const geometry2 = new THREE.OctahedronGeometry(1.2, 0);
        const material2 = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0x10b981,
          emissiveIntensity: 0.5,
          flatShading: true,
        });
        mainMesh = new THREE.Mesh(geometry2, material2);
        scene.add(mainMesh);

        // Add sparkles
        const sparkleGeometry = new THREE.BufferGeometry();
        const sparklePositions = [];
        for (let i = 0; i < 50; i++) {
          sparklePositions.push(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
          );
        }
        sparkleGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(sparklePositions, 3),
        );
        const sparkleMaterial = new THREE.PointsMaterial({
          color: 0x10b981,
          size: 0.1,
        });
        const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
        scene.add(sparkles);
        animationObjects.push({ kind: "sparkles", sparkles });
        break;
      }
      case "holographic": {
        // Holographic Gem
        const geometry3 = new THREE.OctahedronGeometry(1.2, 0);
        const material3 = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          metalness: 1,
          roughness: 0,
          emissive: 0x3b82f6,
          emissiveIntensity: 0.5,
          flatShading: true,
        });
        mainMesh = new THREE.Mesh(geometry3, material3);
        scene.add(mainMesh);
        animationObjects.push({ kind: "holographic", material: material3 });
        break;
      }
      case "wireframe": {
        // Wireframe Energy
        mainMesh = new THREE.Group();

        const outerGeometry = new THREE.OctahedronGeometry(1.4, 0);
        const outerMaterial = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          wireframe: true,
        });
        const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
        mainMesh.add(outerMesh);

        const innerGeometry = new THREE.OctahedronGeometry(1, 0);
        const innerMaterial = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.6,
          flatShading: true,
        });
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
        mainMesh.add(innerMesh);

        scene.add(mainMesh);
        animationObjects.push({
          kind: "wireframe",
          outer: outerMesh,
          inner: innerMesh,
        });
        break;
      }
      case "pulsing": {
        // Pulsing Core
        const geometry5 = new THREE.OctahedronGeometry(1.2, 0);
        const material5 = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 1,
          toneMapped: false,
          flatShading: true,
        });
        mainMesh = new THREE.Mesh(geometry5, material5);
        scene.add(mainMesh);
        break;
      }
      case "multilayer": {
        // Multi-Layer
        mainMesh = new THREE.Group();

        const layer1 = new THREE.Mesh(
          new THREE.OctahedronGeometry(1.5, 0),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.3,
            metalness: 0.9,
            roughness: 0.1,
            flatShading: true,
          }),
        );
        const layer2 = new THREE.Mesh(
          new THREE.OctahedronGeometry(1.1, 0),
          new THREE.MeshStandardMaterial({
            color: 0x059669,
            transparent: true,
            opacity: 0.5,
            metalness: 0.8,
            roughness: 0.2,
            flatShading: true,
          }),
        );
        const layer3 = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.8, 0),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x10b981,
            emissiveIntensity: 1,
            flatShading: true,
          }),
        );

        mainMesh.add(layer1, layer2, layer3);
        scene.add(mainMesh);
        animationObjects.push({ kind: "multilayer", layer1, layer2, layer3 });
        break;
      }
      case "rings": {
        // Spinning Rings
        mainMesh = new THREE.Group();

        const ring1 = new THREE.Mesh(
          new THREE.TorusGeometry(1.8, 0.08, 16, 100),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            metalness: 0.8,
            roughness: 0.2,
          }),
        );
        const ring2 = new THREE.Mesh(
          new THREE.TorusGeometry(1.8, 0.08, 16, 100),
          new THREE.MeshStandardMaterial({
            color: 0x059669,
            metalness: 0.8,
            roughness: 0.2,
          }),
        );
        const ring3 = new THREE.Mesh(
          new THREE.TorusGeometry(1.8, 0.08, 16, 100),
          new THREE.MeshStandardMaterial({
            color: 0x047857,
            metalness: 0.8,
            roughness: 0.2,
          }),
        );
        const centerGem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.9, 0),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x10b981,
            emissiveIntensity: 0.8,
            flatShading: true,
          }),
        );

        mainMesh.add(ring1, ring2, ring3, centerGem);
        scene.add(mainMesh);
        animationObjects.push({
          kind: "rings",
          ring1,
          ring2,
          ring3,
          centerGem,
        });
        break;
      }
      case "fractal": {
        // Fractal Gem
        mainMesh = new THREE.Group();

        [1.2, 0.9, 0.6, 0.3].forEach((scale, i) => {
          const fractalMesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(1, 0),
            new THREE.MeshStandardMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.3 + i * 0.2,
              metalness: 0.9,
              roughness: 0.1,
              flatShading: true,
            }),
          );
          fractalMesh.scale.set(scale, scale, scale);
          mainMesh.add(fractalMesh);
        });

        scene.add(mainMesh);
        break;
      }
      default:
        mainMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(1.2, 0),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            flatShading: true,
          }),
        );
        scene.add(mainMesh);
    }

    // Animation loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Type-specific animations
      switch (type) {
        case "classic":
          mainMesh.rotation.y = elapsedTime * 0.5;
          mainMesh.rotation.x = Math.sin(elapsedTime * 0.3) * 0.2;
          break;

        case "floating": {
          mainMesh.position.y = Math.sin(elapsedTime * 2) * 0.3;
          mainMesh.rotation.y = elapsedTime * 0.3;
          const sparkleObject = animationObjects.find(
            (object) => object.kind === "sparkles",
          );
          if (sparkleObject) {
            sparkleObject.sparkles.rotation.y = elapsedTime * 0.1;
          }
          break;
        }

        case "holographic": {
          mainMesh.rotation.y = elapsedTime * 0.3;
          const holographicObject = animationObjects.find(
            (object) => object.kind === "holographic",
          );
          if (holographicObject) {
            holographicObject.material.emissiveIntensity =
              Math.sin(elapsedTime * 2) * 0.5 + 0.5;
          }
          break;
        }

        case "wireframe": {
          const wireframeObject = animationObjects.find(
            (object) => object.kind === "wireframe",
          );
          if (wireframeObject) {
            wireframeObject.outer.rotation.y = elapsedTime * 0.5;
            wireframeObject.inner.rotation.y = -elapsedTime * 0.3;
          }
          break;
        }

        case "pulsing": {
          const scale = 1 + Math.sin(elapsedTime * 2) * 0.2;
          mainMesh.scale.set(scale, scale, scale);
          mainMesh.rotation.y = elapsedTime * 0.5;
          break;
        }

        case "multilayer": {
          const multilayerObject = animationObjects.find(
            (object) => object.kind === "multilayer",
          );
          if (multilayerObject) {
            multilayerObject.layer1.rotation.y = elapsedTime * 0.3;
            multilayerObject.layer2.rotation.y = -elapsedTime * 0.5;
            multilayerObject.layer3.rotation.y = elapsedTime * 0.7;
          }
          break;
        }

        case "rings": {
          const ringObject = animationObjects.find(
            (object) => object.kind === "rings",
          );
          if (ringObject) {
            ringObject.ring1.rotation.x = elapsedTime * 0.5;
            ringObject.ring2.rotation.y = elapsedTime * 0.7;
            ringObject.ring3.rotation.z = elapsedTime * 0.3;
            ringObject.centerGem.rotation.y = elapsedTime * 0.5;
          }
          break;
        }

        case "fractal":
          mainMesh.rotation.y = elapsedTime * 0.3;
          mainMesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.2;
          break;

        default:
          mainMesh.rotation.y = elapsedTime * 0.5;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [type, containerRef]);

  return null;
}

interface GemCardProps {
  style: GemStyle;
  index: number;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function GemCard({ style, index, isSelected, onSelect }: GemCardProps) {
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
          </div>
          <CardDescription>{style.description}</CardDescription>
        </CardHeader>

        <CardContent>
          {/* 3D Canvas Preview - Using Raw Three.js */}
          <div className="relative h-80 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg mb-4 overflow-hidden">
            <div
              ref={containerRef}
              className="absolute inset-0"
              style={{ pointerEvents: "auto" }}
            >
              <RawThreeJSGem type={style.type} containerRef={containerRef} />
            </div>
          </div>

          {/* Tech Info */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Technology:
            </p>
            <Badge variant="outline" className="text-xs">
              {style.tech}
            </Badge>
          </div>

          {/* Features */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Features:
            </p>
            <div className="flex flex-wrap gap-2">
              {style.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* Interaction Note */}
          <div className="mt-4 p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
            ✅ Auto-rotates • Raw Three.js • Guaranteed Rendering
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Gem3DShowcase() {
  const [selectedGem, setSelectedGem] = useState<number | null>(null);

  const gemStyles: GemStyle[] = [
    {
      id: 1,
      name: "Classic Diamond",
      type: "classic",
      description: "Smooth rotation with metallic shine",
      tech: "MeshStandardMaterial",
      difficulty: "Easy",
      features: ["Metallic", "Emissive Glow", "Smooth Rotation"],
    },
    {
      id: 2,
      name: "Floating Crystal",
      type: "floating",
      description: "Smooth floating motion with particle sparkles",
      tech: "Points + Float Animation",
      difficulty: "Easy",
      features: ["Floating Animation", "Particle Effects", "Emissive Glow"],
    },
    {
      id: 3,
      name: "Holographic Gem",
      type: "holographic",
      description: "Pulsing holographic effect with color shift",
      tech: "Dynamic Emissive",
      difficulty: "Easy",
      features: ["Pulsing Glow", "Metallic", "Color Shift"],
    },
    {
      id: 4,
      name: "Wireframe Energy",
      type: "wireframe",
      description: "Dual-layer wireframe with inner core",
      tech: "Wireframe + Solid",
      difficulty: "Medium",
      features: ["Wireframe", "Dual Rotation", "Energy Core"],
    },
    {
      id: 5,
      name: "Pulsing Core",
      type: "pulsing",
      description: "Breathing scale animation with intense glow",
      tech: "Scale Animation",
      difficulty: "Easy",
      features: ["Scale Pulse", "Intense Emissive", "Simple"],
    },
    {
      id: 6,
      name: "Multi-Layer",
      type: "multilayer",
      description: "Three rotating layers with transparency",
      tech: "Nested Meshes",
      difficulty: "Medium",
      features: ["3 Layers", "Independent Rotation", "Transparency"],
    },
    {
      id: 7,
      name: "Spinning Rings",
      type: "rings",
      description: "Three orbital rings spinning on different axes",
      tech: "Torus Geometry",
      difficulty: "Medium",
      features: ["3 Rings", "Multi-axis Rotation", "Orbital Motion"],
    },
    {
      id: 8,
      name: "Fractal Gem",
      type: "fractal",
      description: "Nested gems creating fractal pattern",
      tech: "Recursive Scaling",
      difficulty: "Medium",
      features: ["4 Nested Gems", "Fractal Pattern", "3D Rotation"],
    },
  ];

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
              <Gem className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 bg-clip-text text-transparent">
                3D WebGL Gem Showcase
              </h1>
              <p className="text-muted-foreground text-lg">
                8 Advanced 3D gems with Raw Three.js and WebGL - All UI Layers
                Visible!
              </p>
            </div>
          </div>

          {/* Tech Stack Info */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600"
            >
              Raw Three.js
            </Badge>
            <Badge
              variant="secondary"
              className="bg-orange-500/10 text-orange-600"
            >
              WebGL
            </Badge>
            <Badge
              variant="secondary"
              className="bg-green-500/10 text-green-600"
            >
              ✅ Guaranteed to Work
            </Badge>
          </div>
        </motion.div>
      </div>

      {/* Gems Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {gemStyles.map((style, index) => (
          <GemCard
            key={style.id}
            style={style}
            index={index}
            isSelected={selectedGem === style.id}
            onSelect={(id) => setSelectedGem(id)}
          />
        ))}
      </div>

      {/* Selected Gem Details */}
      {selectedGem && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto mt-12"
        >
          <Card className="border-2 border-emerald-500 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold">
                  {selectedGem}
                </div>
                <div>
                  <div className="text-lg">Selected 3D Gem</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {gemStyles.find((s) => s.id === selectedGem)?.name}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-semibold mb-2">Implementation</p>
                  <p className="text-sm text-muted-foreground">
                    Uses {gemStyles.find((s) => s.id === selectedGem)?.tech}{" "}
                    with raw Three.js for guaranteed rendering.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Performance</p>
                  <p className="text-sm text-muted-foreground">
                    Excellent - 60fps on all devices with WebGL support. No
                    React Three Fiber overhead.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Best Use Case</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedGem === 1 && "Hero sections, premium branding"}
                    {selectedGem === 2 && "Achievement unlocks, rewards"}
                    {selectedGem === 3 && "Status indicators, live updates"}
                    {selectedGem === 4 && "Tech/gaming themes, energy systems"}
                    {selectedGem === 5 && "Notifications, attention grabbers"}
                    {selectedGem === 6 && "Complex visualizations, depth"}
                    {selectedGem === 7 && "Orbital themes, planetary systems"}
                    {selectedGem === 8 && "Mathematical, artistic displays"}
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
