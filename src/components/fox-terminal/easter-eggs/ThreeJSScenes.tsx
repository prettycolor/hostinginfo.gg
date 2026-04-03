/**
 * Three.js 3D Scenes Component
 * WebGL 3D models for gaming easter eggs
 */

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";

interface ThreeJSSceneProps {
  type: "chaos-emerald" | "sonic";
  onComplete?: () => void;
}

export function ThreeJSScene({ type, onComplete }: ThreeJSSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const containerElement = containerRef.current;

    let mounted = true;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      // Setup Three.js scene
      scene = new THREE.Scene();
      sceneRef.current = scene;

      camera = new THREE.PerspectiveCamera(
        75,
        400 / 400, // Square aspect ratio
        0.1,
        1000,
      );
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setSize(400, 400);
      renderer.setClearColor(0x000000, 0); // Transparent background

      if (mounted) {
        containerElement.appendChild(renderer.domElement);
      }
      rendererRef.current = renderer;

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);

      if (type === "chaos-emerald" || type === "sonic") {
        // Load Chaos Emerald GLB
        const loader = new GLTFLoader();
        loader.load(
          "/assets/chaos_emerald.glb",
          (gltf) => {
            if (!mounted || !scene) return;

            const emerald = gltf.scene;
            scene.add(emerald);

            // Scale and position
            emerald.scale.set(2, 2, 2);
            emerald.position.set(0, 0, 0);

            // Add point light for glow effect
            const pointLight = new THREE.PointLight(0x00ff00, 2, 10);
            pointLight.position.set(0, 0, 0);
            scene.add(pointLight);

            // Spin animation with GSAP
            gsap.to(emerald.rotation, {
              y: Math.PI * 2,
              duration: 3,
              repeat: -1,
              ease: "none",
            });

            // Float animation
            gsap.to(emerald.position, {
              y: 0.5,
              duration: 1.5,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });

            // Pulse glow
            gsap.to(pointLight, {
              intensity: 4,
              duration: 1,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });

            // Complete after 5 seconds
            if (onComplete && mounted) {
              setTimeout(onComplete, 5000);
            }
          },
          undefined,
          (error) => {
            console.error("[ThreeJSScene] Error loading Chaos Emerald:", error);
            if (onComplete && mounted) {
              setTimeout(onComplete, 1000);
            }
          },
        );
      }

      // Animation loop
      function animate() {
        if (!mounted || !renderer || !scene || !camera) return;
        animationFrameRef.current = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }
      animate();
    } catch (error) {
      console.error("[ThreeJSScene] Error:", error);
      if (onComplete) {
        setTimeout(onComplete, 1000);
      }
    }

    // Cleanup
    return () => {
      mounted = false;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (renderer) {
        renderer.dispose();
        if (
          renderer.domElement &&
          containerElement.contains(renderer.domElement)
        ) {
          containerElement.removeChild(renderer.domElement);
        }
      }

      if (scene) {
        scene.clear();
      }
    };
  }, [type, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="threejs-scene flex flex-col items-center justify-center py-8"
    >
      <div
        ref={containerRef}
        className="threejs-container rounded-lg overflow-hidden"
        style={{
          width: "400px",
          height: "400px",
        }}
      />
      {(type === "chaos-emerald" || type === "sonic") && (
        <div className="text-center mt-4">
          <div className="text-green-400 text-3xl font-bold mb-2 animate-pulse">
            💎 CHAOS EMERALD! 💎
          </div>
          <div className="text-blue-400 text-xl font-mono">
            "CHAOS CONTROL!"
          </div>
          <div className="text-yellow-400 text-sm mt-2">
            ⚡ Gotta go fast! ⚡
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Export individual scene components
export function ChaosEmeraldScene({ onComplete }: { onComplete?: () => void }) {
  return <ThreeJSScene type="chaos-emerald" onComplete={onComplete} />;
}

export function SonicScene({ onComplete }: { onComplete?: () => void }) {
  return <ThreeJSScene type="sonic" onComplete={onComplete} />;
}
