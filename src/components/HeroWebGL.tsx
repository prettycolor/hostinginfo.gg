import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Hero Text Component with 3D CSS Effects
 * Inspired by ToyFight.co
 *
 * Features:
 * - 3D CSS transforms with depth
 * - Gradient shimmer effect
 * - Floating particles background
 * - Smooth entrance animation
 * - Performance optimized (no WebGL overhead)
 */

export function HeroWebGL() {
  const [showHero, setShowHero] = useState(true);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has seen the hero before
    const hasSeenHero = sessionStorage.getItem("hasSeenWebGLHero");

    if (hasSeenHero) {
      setShowHero(false);
    } else {
      // Mark as seen after showing
      sessionStorage.setItem("hasSeenWebGLHero", "true");
    }
  }, []);

  useEffect(() => {
    if (!showHero || !textRef.current || !containerRef.current) return;
    const containerElement = containerRef.current;

    // Entrance animation
    const tl = gsap.timeline();

    tl.fromTo(
      textRef.current,
      {
        opacity: 0,
        y: 100,
        scale: 0.8,
        rotationX: -30,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotationX: 0,
        duration: 1.5,
        ease: "power3.out",
      },
    );

    // Continuous floating animation
    gsap.to(textRef.current, {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    // Subtle rotation
    gsap.to(textRef.current, {
      rotationY: 5,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    // Create floating particles
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "absolute rounded-full bg-primary/20";

      const size = Math.random() * 6 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;

      containerElement.appendChild(particle);

      // Animate each particle
      gsap.to(particle, {
        y: Math.random() * 100 - 50,
        x: Math.random() * 100 - 50,
        opacity: Math.random() * 0.5 + 0.2,
        duration: Math.random() * 3 + 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    return () => {
      // Cleanup particles
      const particles = containerElement.querySelectorAll(
        ".absolute.rounded-full",
      );
      particles.forEach((p) => p.remove());
    };
  }, [showHero]);

  if (!showHero) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[250px] md:h-[350px] mb-8 overflow-hidden"
      style={{ perspective: "1000px" }}
    >
      {/* Main Hero Text */}
      <div
        ref={textRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-center px-4">
          <span
            className="inline-block bg-gradient-to-br from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent"
            style={{
              textShadow: "0 10px 30px rgba(147, 51, 234, 0.3)",
              filter: "drop-shadow(0 0 20px rgba(147, 51, 234, 0.4))",
            }}
          >
            All-In-One
          </span>
          <br />
          <span
            className="inline-block bg-gradient-to-br from-primary/80 via-primary/60 to-primary/40 bg-clip-text text-transparent"
            style={{
              textShadow: "0 10px 30px rgba(147, 51, 234, 0.2)",
            }}
          >
            Web Tool
          </span>
        </h1>
      </div>

      {/* Glow effect */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(147, 51, 234, 0.15) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
