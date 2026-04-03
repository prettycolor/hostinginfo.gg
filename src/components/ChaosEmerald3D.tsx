import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

interface ChaosEmerald3DProps {
  size?: number; // Size in pixels (width and height)
  autoRotate?: boolean;
  rotationSpeed?: number;
  animation?: "none" | "floating-hologram"; // Animation style
}

export default function ChaosEmerald3D({
  size = 80,
  autoRotate = true,
  rotationSpeed = 1,
  animation = "none",
}: ChaosEmerald3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = size;
    const height = size;
    const isFirefox =
      typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);

    // Firefox-only reliability path: use the lightweight animated fallback
    // instead of WebGL to avoid context/init failures on certain Firefox setups.
    if (isFirefox) {
      setShowFallback(true);
      return;
    }

    // Create scene
    const scene = new THREE.Scene();
    let renderObject: THREE.Object3D | null = null;

    // Create camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 3;

    const rendererConfigs: THREE.WebGLRendererParameters[] = [
      {
        antialias: true,
        alpha: true, // Transparent background
      },
    ];

    let renderer: THREE.WebGLRenderer | null = null;
    for (const [index, config] of rendererConfigs.entries()) {
      try {
        renderer = new THREE.WebGLRenderer(config);
        break;
      } catch (error) {
        console.warn(
          `Chaos Emerald renderer init attempt ${index + 1} failed:`,
          error,
        );
      }
    }

    if (!renderer) {
      console.error("Error creating WebGL renderer for Chaos Emerald.");
      setShowFallback(true);
      return;
    }

    const handleContextCreationError = (event: Event) => {
      const contextEvent = event as Event & { statusMessage?: string };
      console.error(
        "Chaos Emerald WebGL context creation failed:",
        contextEvent.statusMessage ?? "Unknown status",
      );
      setShowFallback(true);
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      renderer?.setAnimationLoop(null);
      setShowFallback(true);
    };

    renderer.domElement.addEventListener(
      "webglcontextcreationerror",
      handleContextCreationError as EventListener,
    );
    renderer.domElement.addEventListener(
      "webglcontextlost",
      handleContextLost as EventListener,
    );

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // Transparent
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.sortObjects = true;
    container.appendChild(renderer.domElement);
    setShowFallback(false);

    // PBR environment light so embedded GLB material layers render correctly.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    // Use mostly neutral lighting so original GLB textures/material layers render faithfully.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 0.95);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.7);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x10b981, 0.35);
    pointLight3.position.set(0, -5, 5);
    scene.add(pointLight3);

    const spotLight = new THREE.SpotLight(0xffffff, 1.0);
    spotLight.position.set(0, 10, 10);
    spotLight.angle = 0.5;
    scene.add(spotLight);

    // Load model (prefer external-texture glTF to avoid blob texture decode issues in some browsers)
    const loader = new GLTFLoader();
    loader.setCrossOrigin("anonymous");

    const loadModel = (modelUrl: string, onErrorFallback?: () => void) => {
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;
          const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

          // Center the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);

          // Scale to fit
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          model.scale.setScalar(scale);

          // Keep authored material settings; only improve sampling/fidelity.
          model.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            const materials = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            for (const material of materials) {
              if (!material) continue;
              const std = material as THREE.MeshStandardMaterial;
              std.envMapIntensity = 1.2;

              const maps = [
                std.map,
                std.normalMap,
                std.metalnessMap,
                std.roughnessMap,
                std.aoMap,
                std.emissiveMap,
                std.alphaMap,
              ].filter(Boolean) as THREE.Texture[];
              for (const tex of maps) {
                tex.anisotropy = Math.min(8, maxAnisotropy);
                tex.needsUpdate = true;
              }

              if ((std as unknown as { transparent?: boolean }).transparent) {
                std.depthWrite = false;
              }
              std.needsUpdate = true;
            }
          });

          scene.add(model);
          renderObject = model;
          setShowFallback(false);
        },
        undefined,
        (error) => {
          console.error(
            `Error loading Chaos Emerald model (${modelUrl}):`,
            error,
          );
          if (onErrorFallback) {
            onErrorFallback();
          } else {
            renderer.setAnimationLoop(null);
            setShowFallback(true);
          }
        },
      );
    };

    const gltfUrl = `${import.meta.env.BASE_URL}assets/chaos-emerald/chaos_emerald.gltf`;
    const glbUrl = `${import.meta.env.BASE_URL}assets/chaos_emerald.glb`;
    loadModel(gltfUrl, () => loadModel(glbUrl));

    // Animation loop
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Rotate model if loaded
      if (renderObject && autoRotate) {
        if (animation === "floating-hologram") {
          // Floating Hologram Animation
          // Smooth sine wave floating
          renderObject.position.y = Math.sin(elapsedTime * 2) * 0.3;

          // Smooth rotation
          renderObject.rotation.y = elapsedTime * rotationSpeed * 0.5;

          // Subtle X-axis wobble
          renderObject.rotation.x = Math.sin(elapsedTime * 1.5) * 0.1;

          // Subtle pulse without tint-shifting the model.
          const glowPulse = Math.sin(elapsedTime * 3) * 0.22 + 1;
          pointLight1.intensity = glowPulse * 1.2;
          pointLight2.intensity = glowPulse * 0.9;
          spotLight.intensity = glowPulse * 1.0;
        } else {
          // Default rotation
          renderObject.rotation.y = elapsedTime * rotationSpeed;
          renderObject.rotation.x = Math.sin(elapsedTime * 0.5) * 0.1;
        }
      }

      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    // Cleanup
    return () => {
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener(
        "webglcontextcreationerror",
        handleContextCreationError as EventListener,
      );
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        handleContextLost as EventListener,
      );
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      envRT.dispose();
      pmremGenerator.dispose();
      if (renderObject) {
        scene.remove(renderObject);
      }
    };
  }, [size, autoRotate, rotationSpeed, animation]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
      }}
    >
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.35)] animate-emerald-fallback-shell">
          <div
            className="rounded-full bg-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-emerald-fallback-core"
            style={{
              width: `${Math.max(14, Math.floor(size * 0.28))}px`,
              height: `${Math.max(14, Math.floor(size * 0.28))}px`,
            }}
          />
        </div>
      )}
    </div>
  );
}
