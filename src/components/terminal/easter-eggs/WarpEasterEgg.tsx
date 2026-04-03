import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import {
  attachRendererFailureGuards,
  createEasterEggRenderer,
  renderFrameSafely,
} from "./webgl-safety";

/**
 * Mario Warp Zone Easter Egg - WebGL/Three.js
 * Warp pipe tunnel effect with coins
 */
export function WarpEasterEgg({ onComplete }: { onComplete: () => void }) {
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
    camera.position.z = 5;

    const renderer = createEasterEggRenderer(containerElement, "warp");
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
      "warp",
      () => completeSafely(),
    );

    // Create warp pipe tunnel
    const tunnelSegments: THREE.Mesh[] = [];
    const segmentCount = 20;

    for (let i = 0; i < segmentCount; i++) {
      const geometry = new THREE.TorusGeometry(2 - i * 0.05, 0.3, 16, 100);
      const material = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? 0x00ff00 : 0x008800,
        emissive: i % 2 === 0 ? 0x00ff00 : 0x008800,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0,
      });

      const segment = new THREE.Mesh(geometry, material);
      segment.position.z = -i * 2;
      scene.add(segment);
      tunnelSegments.push(segment);
    }

    // Create coins
    const coins: THREE.Mesh[] = [];
    const coinCount = 30;
    const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);

    for (let i = 0; i < coinCount; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5,
        shininess: 100,
        transparent: true,
        opacity: 0,
      });

      const coin = new THREE.Mesh(coinGeometry, material);
      const angle = (i / coinCount) * Math.PI * 4;
      const radius = 1.5;
      coin.position.x = Math.cos(angle) * radius;
      coin.position.y = Math.sin(angle) * radius;
      coin.position.z = -i * 1.5;
      coin.rotation.x = Math.PI / 2;
      scene.add(coin);
      coins.push(coin);
    }

    // Add question blocks
    const blocks: THREE.Mesh[] = [];
    const blockCount = 10;
    const blockGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    for (let i = 0; i < blockCount; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0,
      });

      const block = new THREE.Mesh(blockGeometry, material);
      const angle = (i / blockCount) * Math.PI * 2;
      block.position.x = Math.cos(angle) * 2.5;
      block.position.y = Math.sin(angle) * 2.5;
      block.position.z = -i * 3;
      scene.add(block);
      blocks.push(block);
    }

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const greenLight = new THREE.PointLight(0x00ff00, 1, 20);
    greenLight.position.set(0, 0, 0);
    scene.add(greenLight);

    const yellowLight = new THREE.PointLight(0xffff00, 0.5, 15);
    yellowLight.position.set(0, 0, -10);
    scene.add(yellowLight);

    // GSAP Animation Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        completeSafely(1000);
      },
    });

    // Fade in tunnel segments
    tunnelSegments.forEach((segment, index) => {
      tl.to(
        segment.material,
        {
          opacity: 0.8,
          duration: 0.3,
          ease: "power2.out",
        },
        index * 0.05,
      );
    });

    // Fade in coins
    coins.forEach((coin, index) => {
      tl.to(
        coin.material,
        {
          opacity: 1,
          duration: 0.2,
          ease: "back.out(2)",
        },
        index * 0.03,
      );
    });

    // Fade in blocks
    blocks.forEach((block, index) => {
      tl.to(
        block.material,
        {
          opacity: 1,
          duration: 0.2,
          ease: "back.out(2)",
        },
        index * 0.08,
      );
    });

    // Camera zoom through tunnel
    tl.to(
      camera.position,
      {
        z: -30,
        duration: 3,
        ease: "power2.inOut",
      },
      "-=1",
    );

    // Spin coins
    tl.to(
      {},
      {
        duration: 3,
        onUpdate: function () {
          coins.forEach((coin) => {
            coin.rotation.z += 0.1;
          });
          blocks.forEach((block) => {
            block.rotation.y += 0.05;
          });
        },
      },
      "-=3",
    );

    // Fade out
    tl.to(
      [
        ...tunnelSegments.map((s) => s.material),
        ...coins.map((c) => c.material),
        ...blocks.map((b) => b.material),
      ],
      {
        opacity: 0,
        duration: 1,
        ease: "power2.inOut",
      },
    );

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const rendered = renderFrameSafely(renderer, scene, camera, "warp", () =>
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
      style={{ background: "rgba(0, 50, 0, 0.9)" }}
    />
  );
}
