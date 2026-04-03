import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import {
  attachRendererFailureGuards,
  createEasterEggRenderer,
  renderFrameSafely,
} from "./webgl-safety";

/**
 * Sonic Chaos Emeralds Easter Egg - WebGL/Three.js
 * 7 spinning emeralds with energy effects
 */
export function ChaosEasterEgg({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const containerElement = containerRef.current;
    let completionTimeoutId: number | null = null;
    let completed = false;

    const completeSafely = (delayMs = 0) => {
      if (completionTimeoutId !== null) {
        window.clearTimeout(completionTimeoutId);
      }
      completionTimeoutId = window.setTimeout(() => {
        if (completed) return;
        completed = true;
        onComplete();
      }, delayMs);
    };

    // Setup Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      containerElement.clientWidth / containerElement.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 8;

    const renderer = createEasterEggRenderer(containerElement, "chaos");
    if (!renderer) {
      completeSafely();
      return () => {
        if (completionTimeoutId !== null) {
          window.clearTimeout(completionTimeoutId);
        }
      };
    }

    const removeRendererGuards = attachRendererFailureGuards(
      renderer,
      "chaos",
      () => completeSafely(),
    );

    // Chaos Emerald colors (7 emeralds)
    const emeraldColors = [
      0x00ff00, // Green
      0xff0000, // Red
      0x0000ff, // Blue
      0xffff00, // Yellow
      0xff00ff, // Purple
      0x00ffff, // Cyan
      0xffffff, // White
    ];

    const emeralds: THREE.Mesh[] = [];
    const emeraldGeometry = new THREE.OctahedronGeometry(0.4, 0);

    emeraldColors.forEach((color, index) => {
      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7,
        shininess: 100,
        transparent: true,
        opacity: 0,
      });

      const emerald = new THREE.Mesh(emeraldGeometry, material);
      const angle = (index / emeraldColors.length) * Math.PI * 2;
      const radius = 3;
      emerald.position.x = Math.cos(angle) * radius;
      emerald.position.y = Math.sin(angle) * radius;
      emerald.position.z = 0;
      scene.add(emerald);
      emeralds.push(emerald);

      // Add glow rings around each emerald
      const ringGeometry = new THREE.TorusGeometry(0.6, 0.05, 16, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(emerald.position);
      scene.add(ring);
    });

    // Add energy particles
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 15;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 15;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 15;

      const color = new THREE.Color(
        emeraldColors[Math.floor(Math.random() * emeraldColors.length)],
      );
      particleColors[i3] = color.r;
      particleColors[i3 + 1] = color.g;
      particleColors[i3 + 2] = color.b;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3),
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    emeraldColors.forEach((color, index) => {
      const light = new THREE.PointLight(color, 0, 10);
      const angle = (index / emeraldColors.length) * Math.PI * 2;
      light.position.x = Math.cos(angle) * 3;
      light.position.y = Math.sin(angle) * 3;
      light.position.z = 0;
      scene.add(light);
    });

    // GSAP Animation Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        completeSafely(1000);
      },
    });

    // Fade in particles
    tl.to(particleMaterial, {
      opacity: 0.8,
      duration: 1,
      ease: "power2.inOut",
    });

    // Animate emeralds appearing with stagger
    emeralds.forEach((emerald, index) => {
      tl.to(
        emerald.material,
        {
          opacity: 1,
          duration: 0.4,
          ease: "back.out(3)",
        },
        index * 0.15,
      );

      tl.to(
        emerald.scale,
        {
          x: 1.3,
          y: 1.3,
          z: 1.3,
          duration: 0.3,
          ease: "elastic.out(1, 0.3)",
        },
        index * 0.15,
      );
    });

    // Spin emeralds in circle
    tl.to(
      {},
      {
        duration: 3,
        onUpdate: function () {
          const progress = this.progress();
          emeralds.forEach((emerald, index) => {
            const angle =
              (index / emeralds.length) * Math.PI * 2 + progress * Math.PI * 6;
            const radius = 3 - progress * 0.5; // Spiral inward
            emerald.position.x = Math.cos(angle) * radius;
            emerald.position.y = Math.sin(angle) * radius;
            emerald.rotation.x += 0.1;
            emerald.rotation.y += 0.1;
          });
        },
      },
      "-=0.5",
    );

    // Converge to center and explode
    tl.to(
      emeralds.map((e) => e.position),
      {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.5,
        ease: "power4.in",
      },
    );

    tl.to(
      emeralds.map((e) => e.scale),
      {
        x: 3,
        y: 3,
        z: 3,
        duration: 0.3,
        ease: "power2.out",
      },
    );

    // Fade out
    tl.to([particleMaterial, ...emeralds.map((e) => e.material)], {
      opacity: 0,
      duration: 1,
      ease: "power2.inOut",
    });

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      particles.rotation.y += 0.002;
      particles.rotation.x += 0.001;
      const rendered = renderFrameSafely(renderer, scene, camera, "chaos", () =>
        completeSafely(),
      );
      if (!rendered) {
        cancelAnimationFrame(animationId);
      }
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      tl.kill();
      removeRendererGuards();
      renderer.dispose();
      if (containerElement.contains(renderer.domElement)) {
        containerElement.removeChild(renderer.domElement);
      }
      if (completionTimeoutId !== null) {
        window.clearTimeout(completionTimeoutId);
      }
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ background: "rgba(0, 0, 0, 0.9)" }}
    />
  );
}
