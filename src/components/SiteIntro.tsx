import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface SiteIntroProps {
  onComplete: () => void;
}

export default function SiteIntro({ onComplete }: SiteIntroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Preload image before starting animation
  useEffect(() => {
    const img = new Image();
    img.src = '/assets/placeholder.png
    img.onload = () => {
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load intro logo');
      setImageLoaded(true); // Continue anyway
    };
  }, []);

  useEffect(() => {
    // Wait for image to load before starting animation
    if (!imageLoaded) return;

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(onComplete, 50);
      },
    });

    // Initial state - Set immediately without delay
    gsap.set(logoRef.current, {
      scale: 0.3,
      rotation: -180,
      opacity: 0,
      force3D: true,
      transformOrigin: 'center center',
    });

    gsap.set(glowRef.current, {
      scale: 0,
      opacity: 0,
      force3D: true,
    });

    gsap.set(ringRef.current, {
      scale: 0,
      rotation: 0,
      opacity: 0,
      force3D: true,
      transformOrigin: 'center center',
    });

    gsap.set(particlesRef.current, {
      opacity: 0,
    });

    // Animation sequence - Professional timing
    tl
      // Fade in container
      .to(containerRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      })
      // Glow appears
      .to(glowRef.current, {
        scale: 2,
        opacity: 0.6,
        duration: 0.6,
        ease: 'power2.out',
        force3D: true,
      }, 0.2)
      // Logo spins in with 360° rotation
      .to(logoRef.current, {
        scale: 1,
        rotation: 360,
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out',
        force3D: true,
      }, 0.3)
      // Ring expands and rotates
      .to(ringRef.current, {
        scale: 1,
        rotation: 180,
        opacity: 0.8,
        duration: 1.0,
        ease: 'power2.out',
        force3D: true,
      }, 0.4)
      // Particles fade in
      .to(particlesRef.current, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.inOut',
      }, 0.7)
      // Logo pulse (subtle)
      .to(logoRef.current, {
        scale: 1.08,
        duration: 0.25,
        ease: 'power2.inOut',
        force3D: true,
      }, 1.3)
      .to(logoRef.current, {
        scale: 1,
        duration: 0.25,
        ease: 'power2.inOut',
        force3D: true,
      }, 1.55)
      // Glow intensifies
      .to(glowRef.current, {
        scale: 2.5,
        opacity: 0.8,
        duration: 0.4,
        ease: 'power2.in',
        force3D: true,
      }, 1.6)
      // "Pull into site" effect - Everything scales up and fades
      .to([logoRef.current, ringRef.current], {
        scale: 3.5,
        rotation: '+=360',
        opacity: 0,
        duration: 0.6,
        ease: 'power3.in',
        force3D: true,
      }, 2.0)
      .to(glowRef.current, {
        scale: 5,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.in',
        force3D: true,
      }, 2.0)
      .to(particlesRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
      }, 2.0)
      // Container fade out
      .to(containerRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      }, 2.3);

    return () => {
      tl.kill();
    };
  }, [onComplete, imageLoaded]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden"
      style={{
        opacity: 0,
        background: 'linear-gradient(135deg, rgb(147, 51, 234) 0%, rgb(99, 102, 241) 50%, rgb(139, 92, 246) 100%)',
        pointerEvents: 'none',
        willChange: 'opacity',
      }}
    >
      {/* Particles background */}
      <div
        ref={particlesRef}
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 60%)
          `,
        }}
      />

      {/* Glow effect */}
      <div
        ref={glowRef}
        className="absolute"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(168, 85, 247, 0.6) 30%, rgba(99, 102, 241, 0.4) 50%, transparent 70%)',
          filter: 'blur(40px)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Rotating ring */}
      <div
        ref={ringRef}
        className="absolute"
        style={{
          width: '280px',
          height: '280px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          borderTopColor: 'rgba(255, 255, 255, 0.8)',
          borderRightColor: 'rgba(255, 255, 255, 0.6)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Logo - G$ Emoji */}
      <img
        ref={logoRef}
        src="/assets/placeholder.png"
        alt="HostingInfo G$ Logo"
        className="relative z-10"
        style={{
          width: '200px',
          height: '200px',
          objectFit: 'contain',
          filter: 'drop-shadow(0 10px 40px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 60px rgba(255, 255, 255, 0.3))',
          imageRendering: '-webkit-optimize-contrast',
          willChange: 'transform, opacity',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        loading="eager"
        decoding="sync"
      />
    </div>
  );
}