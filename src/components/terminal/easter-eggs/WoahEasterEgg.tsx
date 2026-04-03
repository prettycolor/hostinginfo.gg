import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import {
  attachRendererFailureGuards,
  createEasterEggRenderer,
  renderFrameSafely,
} from "./webgl-safety";

/**
 * Crash Bandicoot Woah Easter Egg - WebGL/Three.js
 * Aku Aku mask with Wumpa fruit and TNT crates
 */
export function WoahEasterEgg({ onComplete }: { onComplete: () => void }) {
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

    const renderer = createEasterEggRenderer(containerElement, "woah");
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
      "woah",
      () => completeSafely(),
    );

    // Create Aku Aku mask (golden tiki mask)
    const maskGroup = new THREE.Group();

    // Mask face (golden cylinder)
    const faceGeometry = new THREE.CylinderGeometry(1, 1.2, 2, 32);
    const faceMaterial = new THREE.MeshPhongMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
      shininess: 100,
      transparent: true,
      opacity: 0,
    });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    maskGroup.add(face);

    // Mask eyes (dark spheres)
    const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    leftEye.position.set(-0.4, 0.3, 1);
    maskGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
    rightEye.position.set(0.4, 0.3, 1);
    maskGroup.add(rightEye);

    // Mask feathers (colorful triangles on top)
    const featherColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    const feathers: THREE.Mesh[] = [];

    featherColors.forEach((color, index) => {
      const featherGeometry = new THREE.ConeGeometry(0.2, 0.8, 3);
      const featherMaterial = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0,
      });

      const feather = new THREE.Mesh(featherGeometry, featherMaterial);
      feather.position.set((index - 1.5) * 0.4, 1.5, 0);
      feather.rotation.z = Math.PI;
      maskGroup.add(feather);
      feathers.push(feather);
    });

    scene.add(maskGroup);

    // Create Wumpa fruits (orange spheres)
    const wumpaFruits: THREE.Mesh[] = [];
    const wumpaCount = 20;
    const wumpaGeometry = new THREE.SphereGeometry(0.3, 16, 16);

    for (let i = 0; i < wumpaCount; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: 0xff8800,
        emissive: 0xff8800,
        emissiveIntensity: 0.4,
        shininess: 80,
        transparent: true,
        opacity: 0,
      });

      const wumpa = new THREE.Mesh(wumpaGeometry, material);
      const angle = (i / wumpaCount) * Math.PI * 2;
      const radius = 3;
      wumpa.position.x = Math.cos(angle) * radius;
      wumpa.position.y = Math.sin(angle) * radius;
      wumpa.position.z = 0;
      scene.add(wumpa);
      wumpaFruits.push(wumpa);
    }

    // Create TNT crates
    const crates: THREE.Mesh[] = [];
    const crateCount = 8;
    const crateGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);

    for (let i = 0; i < crateCount; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: 0x8b4513,
        transparent: true,
        opacity: 0,
      });

      const crate = new THREE.Mesh(crateGeometry, material);
      const angle = (i / crateCount) * Math.PI * 2;
      const radius = 5;
      crate.position.x = Math.cos(angle) * radius;
      crate.position.y = Math.sin(angle) * radius;
      crate.position.z = 0;
      scene.add(crate);
      crates.push(crate);

      // Add TNT label (red box on crate)
      const tntGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.4);
      const tntMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0,
      });
      const tnt = new THREE.Mesh(tntGeometry, tntMaterial);
      tnt.position.copy(crate.position);
      tnt.position.z += 0.4;
      scene.add(tnt);
    }

    // Add explosion particles
    const particleCount = 1500;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 10;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 10;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 10;

      // Orange particles (Wumpa fruit colors)
      particleColors[i3] = 1;
      particleColors[i3 + 1] = 0.5 + Math.random() * 0.5;
      particleColors[i3 + 2] = 0;
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
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const orangeLight = new THREE.PointLight(0xff8800, 1, 15);
    orangeLight.position.set(0, 0, 3);
    scene.add(orangeLight);

    const redLight = new THREE.PointLight(0xff0000, 0.5, 20);
    redLight.position.set(0, 0, -5);
    scene.add(redLight);

    // GSAP Animation Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        completeSafely(1000);
      },
    });

    // Fade in Aku Aku mask with bounce
    tl.to([faceMaterial, ...feathers.map((f) => f.material), eyeMaterial], {
      opacity: 1,
      duration: 0.5,
      ease: "back.out(3)",
    });

    tl.to(
      maskGroup.scale,
      {
        x: 1.5,
        y: 1.5,
        z: 1.5,
        duration: 0.4,
        ease: "elastic.out(1, 0.3)",
      },
      "-=0.3",
    );

    // Fade in Wumpa fruits
    wumpaFruits.forEach((wumpa, index) => {
      tl.to(
        wumpa.material,
        {
          opacity: 1,
          duration: 0.3,
          ease: "back.out(2)",
        },
        index * 0.05,
      );
    });

    // Fade in TNT crates
    crates.forEach((crate, index) => {
      tl.to(
        crate.material,
        {
          opacity: 1,
          duration: 0.2,
          ease: "power2.out",
        },
        index * 0.08,
      );
    });

    // Spin mask and orbit Wumpa fruits
    tl.to(
      {},
      {
        duration: 2.5,
        onUpdate: function () {
          const progress = this.progress();

          // Rotate mask
          maskGroup.rotation.y = progress * Math.PI * 4;
          maskGroup.rotation.z = Math.sin(progress * Math.PI * 2) * 0.2;

          // Orbit Wumpa fruits
          wumpaFruits.forEach((wumpa, index) => {
            const angle =
              (index / wumpaFruits.length) * Math.PI * 2 +
              progress * Math.PI * 4;
            const radius = 3 + Math.sin(progress * Math.PI * 4) * 0.5;
            wumpa.position.x = Math.cos(angle) * radius;
            wumpa.position.y = Math.sin(angle) * radius;
            wumpa.rotation.x += 0.1;
            wumpa.rotation.y += 0.1;
          });

          // Bounce crates
          crates.forEach((crate, index) => {
            crate.rotation.x += 0.05;
            crate.rotation.y += 0.05;
            crate.position.z = Math.sin(progress * Math.PI * 4 + index) * 0.5;
          });
        },
      },
      "-=1",
    );

    // Explode particles
    tl.to(particleMaterial, {
      opacity: 1,
      duration: 0.3,
      ease: "power2.out",
    });

    tl.to(
      {},
      {
        duration: 1,
        onUpdate: function () {
          particles.rotation.x += 0.02;
          particles.rotation.y += 0.03;
        },
      },
      "-=0.3",
    );

    // Fade out everything
    tl.to(
      [
        faceMaterial,
        ...feathers.map((f) => f.material),
        eyeMaterial,
        ...wumpaFruits.map((w) => w.material),
        ...crates.map((c) => c.material),
        particleMaterial,
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
      const rendered = renderFrameSafely(renderer, scene, camera, "woah", () =>
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
      style={{ background: "rgba(50, 20, 0, 0.9)" }}
    />
  );
}
