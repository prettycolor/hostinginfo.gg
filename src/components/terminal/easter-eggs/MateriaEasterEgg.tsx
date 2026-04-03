import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import {
  attachRendererFailureGuards,
  createEasterEggRenderer,
  renderFrameSafely,
} from "./webgl-safety";

/**
 * FF7 Materia Easter Egg - WebGL/Three.js
 * Spinning materia orbs with particle effects
 */
export function MateriaEasterEgg({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    materia: THREE.Mesh[];
    particles: THREE.Points;
  } | null>(null);

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

    const renderer = createEasterEggRenderer(containerElement, "materia");
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
      "materia",
      () => completeSafely(),
    );

    // Create materia orbs (7 colors for 7 materia types)
    const materiaColors = [
      0x00ff00, // Green - Magic
      0xff0000, // Red - Summon
      0xffff00, // Yellow - Command
      0x0000ff, // Blue - Support
      0xff00ff, // Purple - Independent
      0x00ffff, // Cyan - Special
      0xffffff, // White - Master
    ];

    const materia: THREE.Mesh[] = [];
    const materiaGeometry = new THREE.SphereGeometry(0.3, 32, 32);

    materiaColors.forEach((color, index) => {
      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        shininess: 100,
        transparent: true,
        opacity: 0,
      });

      const sphere = new THREE.Mesh(materiaGeometry, material);
      const angle = (index / materiaColors.length) * Math.PI * 2;
      sphere.position.x = Math.cos(angle) * 2;
      sphere.position.y = Math.sin(angle) * 2;
      sphere.position.z = 0;
      scene.add(sphere);
      materia.push(sphere);
    });

    // Add particles
    const particleCount = 1000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      particlePositions[i] = (Math.random() - 0.5) * 10;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.05,
      transparent: true,
      opacity: 0,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    sceneRef.current = { scene, camera, renderer, materia, particles };

    // GSAP Animation Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        completeSafely(1000);
      },
    });

    // Fade in particles
    tl.to(particleMaterial, {
      opacity: 0.6,
      duration: 1,
      ease: "power2.inOut",
    });

    // Animate materia orbs appearing
    materia.forEach((sphere, index) => {
      tl.to(
        sphere.material,
        {
          opacity: 1,
          duration: 0.5,
          ease: "back.out(2)",
        },
        index * 0.1,
      );

      tl.to(
        sphere.scale,
        {
          x: 1.5,
          y: 1.5,
          z: 1.5,
          duration: 0.3,
          ease: "elastic.out(1, 0.5)",
        },
        index * 0.1,
      );
    });

    // Spin materia
    tl.to(
      {},
      {
        duration: 2,
        onUpdate: function () {
          materia.forEach((sphere, index) => {
            const angle =
              (index / materia.length) * Math.PI * 2 +
              this.progress() * Math.PI * 4;
            sphere.position.x = Math.cos(angle) * 2;
            sphere.position.y = Math.sin(angle) * 2;
            sphere.rotation.y += 0.05;
          });
        },
      },
      "-=1",
    );

    // Fade out
    tl.to([particleMaterial, ...materia.map((m) => m.material)], {
      opacity: 0,
      duration: 1,
      ease: "power2.inOut",
    });

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      particles.rotation.y += 0.001;
      const rendered = renderFrameSafely(
        renderer,
        scene,
        camera,
        "materia",
        () => completeSafely(),
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
      style={{ background: "rgba(0, 0, 0, 0.8)" }}
    />
  );
}
