import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface DDCTransitionProps {
  variant?: 'wipe' | 'zoom' | 'fade' | 'morph' | 'energy' | 'matrix' | 'portal' | 'quantum' | 'hologram';
  onComplete?: () => void;
  startPosition?: { x: number; y: number };
}

/**
 * DDC Calculator Transition Component
 * 
 * Variants:
 * - wipe: Purple gradient bar wipe (0.8s)
 * - zoom: Modern zoom and blur effect (0.9s)
 * - fade: Simple fade transition (0.5s)
 * - morph: Calculator icon morphs into page (0.9s)
 * - energy: Icon Morph + Particle Trail + Glow Pulse + Screen Shake
 * - matrix: Icon Morph + Number Rain + Ripple Waves + Glow
 * - portal: Icon Morph + Vortex Spiral + Particle Trail + Grid Warp + Sound
 * - quantum: Icon Morph + Glitch Effect + Binary Rain + Neon Pulse
 * - hologram: Icon Morph + Scan Lines + Projection Effect + Flicker
 */
export default function DDCTransition({ 
  variant = 'morph', 
  onComplete,
  startPosition 
}: DDCTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const numbersRef = useRef<HTMLDivElement>(null);
  const vortexRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const glitchRef = useRef<HTMLDivElement>(null);
  const scanLinesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setTimeout(() => onComplete?.(), 100);
        }
      });

      // VARIANT: Purple Wipe
      if (variant === 'wipe') {
        tl.fromTo('.wipe-bar',
          { scaleX: 0, transformOrigin: 'left' },
          { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }
        );
      }

      // VARIANT: Zoom Blur
      else if (variant === 'zoom') {
        tl.fromTo(containerRef.current,
          { scale: 1, filter: 'blur(0px)' },
          { scale: 1.5, filter: 'blur(20px)', duration: 0.9, ease: 'power2.in' }
        );
      }

      // VARIANT: Simple Fade
      else if (variant === 'fade') {
        tl.to(containerRef.current, {
          opacity: 0,
          duration: 0.5,
          ease: 'power2.inOut'
        });
      }

      // VARIANT: Icon Morph (Base)
      else if (variant === 'morph') {
        const startX = startPosition?.x || window.innerWidth / 2;
        const startY = startPosition?.y || window.innerHeight / 2;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        tl.set(iconRef.current, {
          x: startX - centerX,
          y: startY - centerY,
          scale: 1,
          rotation: 0,
          opacity: 1
        })
        .to(iconRef.current, {
          x: 0,
          y: 0,
          rotation: 180,
          duration: 0.5,
          ease: 'power2.inOut'
        })
        .to(iconRef.current, {
          scale: 50,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in'
        });
      }

      // VARIANT: Energy Charge (Morph + Particles + Glow + Shake)
      else if (variant === 'energy') {
        const startX = startPosition?.x || window.innerWidth / 2;
        const startY = startPosition?.y || window.innerHeight / 2;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Icon morph
        tl.set(iconRef.current, {
          x: startX - centerX,
          y: startY - centerY,
          scale: 1,
          rotation: 0,
          opacity: 1
        })
        .to(iconRef.current, {
          x: 0,
          y: 0,
          rotation: 180,
          duration: 0.5,
          ease: 'power2.inOut'
        })
        // Glow pulse during movement
        .to('.energy-glow', {
          scale: 1.5,
          opacity: 0.8,
          duration: 0.5,
          ease: 'power2.inOut'
        }, 0)
        // Screen shake at center
        .to(containerRef.current, {
          x: '+=3',
          duration: 0.05,
          yoyo: true,
          repeat: 3
        }, 0.5)
        // Particles spawn
        .to('.particle', {
          opacity: 1,
          scale: 1,
          stagger: 0.02,
          duration: 0.3
        }, 0)
        .to('.particle', {
          y: '+=100',
          opacity: 0,
          stagger: 0.02,
          duration: 0.5,
          ease: 'power1.in'
        }, 0.2)
        // Final expansion
        .to(iconRef.current, {
          scale: 50,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in'
        });
      }

      // VARIANT: Calculator Matrix (Morph + Number Rain + Ripples)
      else if (variant === 'matrix') {
        const startX = startPosition?.x || window.innerWidth / 2;
        const startY = startPosition?.y || window.innerHeight / 2;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Icon morph
        tl.set(iconRef.current, {
          x: startX - centerX,
          y: startY - centerY,
          scale: 1,
          rotation: 0,
          opacity: 1
        })
        // Ripple waves
        .to('.ripple', {
          scale: 3,
          opacity: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out'
        }, 0)
        // Icon movement
        .to(iconRef.current, {
          x: 0,
          y: 0,
          rotation: 180,
          duration: 0.5,
          ease: 'power2.inOut'
        }, 0)
        // Number rain starts
        .to('.number-rain', {
          y: '+=800',
          opacity: 0,
          stagger: 0.05,
          duration: 1.2,
          ease: 'none'
        }, 0.2)
        // Glow pulse
        .to('.matrix-glow', {
          scale: 1.3,
          opacity: 0.6,
          duration: 0.5,
          ease: 'power2.inOut'
        }, 0)
        // Final expansion
        .to(iconRef.current, {
          scale: 50,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in'
        });
      }

      // VARIANT: Dimension Portal (Morph + Vortex + Grid Warp)
      else if (variant === 'portal') {
        const startX = startPosition?.x || window.innerWidth / 2;
        const startY = startPosition?.y || window.innerHeight / 2;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Vortex spiral
        tl.to('.vortex', {
          rotation: 720,
          scale: 2,
          opacity: 0,
          duration: 1.2,
          ease: 'power2.in'
        }, 0)
        // Grid warp
        .to('.grid-line', {
          scaleY: 0.5,
          opacity: 0.3,
          stagger: 0.02,
          duration: 0.6,
          ease: 'power2.inOut'
        }, 0)
        // Icon morph
        .set(iconRef.current, {
          x: startX - centerX,
          y: startY - centerY,
          scale: 1,
          rotation: 0,
          opacity: 1
        }, 0)
        .to(iconRef.current, {
          x: 0,
          y: 0,
          rotation: 180,
          duration: 0.5,
          ease: 'power2.inOut'
        }, 0)
        // Particles trail
        .to('.portal-particle', {
          opacity: 1,
          scale: 1,
          stagger: 0.02,
          duration: 0.3
        }, 0)
        .to('.portal-particle', {
          scale: 0,
          opacity: 0,
          stagger: 0.02,
          duration: 0.5
        }, 0.3)
        // Final expansion
        .to(iconRef.current, {
          scale: 50,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in'
        }, 0.5);
      }

      // VARIANT: Quantum Glitch (Morph + Glitch + Binary Rain)
      else if (variant === 'quantum') {
        const startX = startPosition?.x || window.innerWidth / 2;
        const startY = startPosition?.y || window.innerHeight / 2;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Glitch effect
        tl.to('.glitch-layer', {
          x: '+=10',
          duration: 0.05,
          yoyo: true,
          repeat: 8,
          stagger: 0.02
        }, 0)
        // Binary rain
        .to('.binary-rain', {
          y: '+=600',
          opacity: 0,
          stagger: 0.03,
          duration: 1,
          ease: 'none'
        }, 0)
        // Icon morph with glitch
        .set(iconRef.current, {
          x: startX - centerX,
          y: startY - centerY,
          scale: 1,
          rotation: 0,
          opacity: 1
        }, 0)
        .to(iconRef.current, {
          x: 0,
          y: 0,
          rotation: 180,
          duration: 0.5,
          ease: 'power2.inOut'
        }, 0.2)
        // Neon pulse
        .to('.quantum-glow', {
          scale: 1.5,
          opacity: 0.9,
          duration: 0.3,
          yoyo: true,
          repeat: 2
        }, 0)
        // Final expansion
        .to(iconRef.current, {
          scale: 50,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in'
        }, 0.7);
      }

      // VARIANT: Hologram Projection (Morph + Scan Lines + Flicker)
      else if (variant === 'hologram') {
        const startX = startPosition?.x || window.innerWidth / 2;
        const startY = startPosition?.y || window.innerHeight / 2;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Scan lines
        tl.to('.scan-line', {
          y: '+=800',
          stagger: 0.1,
          duration: 0.8,
          ease: 'none',
          repeat: 1
        }, 0)
        // Icon morph with flicker
        .set(iconRef.current, {
          x: startX - centerX,
          y: startY - centerY,
          scale: 1,
          rotation: 0,
          opacity: 1
        }, 0)
        .to(iconRef.current, {
          opacity: 0.3,
          duration: 0.05,
          yoyo: true,
          repeat: 6
        }, 0)
        .to(iconRef.current, {
          x: 0,
          y: 0,
          rotation: 180,
          duration: 0.5,
          ease: 'power2.inOut'
        }, 0.3)
        // Hologram glow
        .to('.hologram-glow', {
          scale: 1.4,
          opacity: 0.7,
          duration: 0.5,
          ease: 'power2.inOut'
        }, 0.3)
        // Final expansion
        .to(iconRef.current, {
          scale: 50,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in'
        }, 0.8);
      }
    }, containerRef);

    return () => ctx.revert();
  }, [variant, onComplete, startPosition]);

  // Generate particles for energy variant
  const energyParticles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
    delay: Math.random() * 0.3
  }));

  // Generate numbers for matrix variant
  const matrixNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '×', '÷'];
  const numberRain = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    symbol: matrixNumbers[Math.floor(Math.random() * matrixNumbers.length)],
    x: (i * 3.33) % 100,
    delay: Math.random() * 0.5
  }));

  // Generate binary for quantum variant
  const binaryRain = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    value: Math.random() > 0.5 ? '1' : '0',
    x: (i * 2.5) % 100,
    delay: Math.random() * 0.3
  }));

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Purple Wipe Variant */}
      {variant === 'wipe' && (
        <div className="wipe-bar absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600" />
      )}

      {/* Zoom Blur Variant */}
      {variant === 'zoom' && (
        <div className="absolute inset-0 bg-background" />
      )}

      {/* Simple Fade Variant */}
      {variant === 'fade' && (
        <div className="absolute inset-0 bg-background" />
      )}

      {/* Icon Morph Variants (morph, energy, matrix, portal, quantum, hologram) */}
      {['morph', 'energy', 'matrix', 'portal', 'quantum', 'hologram'].includes(variant) && (
        <>
          {/* Calculator Icon */}
          <div 
            ref={iconRef}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ willChange: 'transform, opacity' }}
          >
            <svg
              className="w-12 h-12 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="4" y="2" width="16" height="20" rx="2" strokeWidth="2" />
              <rect x="8" y="6" width="8" height="4" rx="1" strokeWidth="2" />
              <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="18" x2="8" y2="18" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="18" x2="16" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Energy Variant Effects */}
          {variant === 'energy' && (
            <>
              {/* Glow */}
              <div className="energy-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 blur-3xl opacity-0" />
              
              {/* Particles */}
              <div ref={particlesRef}>
                {energyParticles.map((p) => (
                  <div
                    key={p.id}
                    className="particle absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-purple-400 opacity-0"
                    style={{
                      transform: `translate(${p.x}px, ${p.y}px)`,
                      willChange: 'transform, opacity'
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Matrix Variant Effects */}
          {variant === 'matrix' && (
            <>
              {/* Ripple Waves */}
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="ripple absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-purple-500 opacity-60"
                  style={{ willChange: 'transform, opacity' }}
                />
              ))}
              
              {/* Glow */}
              <div className="matrix-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 blur-3xl opacity-0" />
              
              {/* Number Rain */}
              <div ref={numbersRef}>
                {numberRain.map((n) => (
                  <div
                    key={n.id}
                    className="number-rain absolute text-2xl font-bold text-purple-500 opacity-80"
                    style={{
                      left: `${n.x}%`,
                      top: '-50px',
                      willChange: 'transform, opacity'
                    }}
                  >
                    {n.symbol}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Portal Variant Effects */}
          {variant === 'portal' && (
            <>
              {/* Vortex Spiral */}
              <div ref={vortexRef}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="vortex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      width: `${200 + i * 100}px`,
                      height: `${200 + i * 100}px`,
                      border: '3px solid',
                      borderColor: i % 2 === 0 ? '#a855f7' : '#06b6d4',
                      borderRadius: '50%',
                      opacity: 0.4 - i * 0.1,
                      willChange: 'transform, opacity'
                    }}
                  />
                ))}
              </div>
              
              {/* Grid Warp */}
              <div ref={gridRef} className="absolute inset-0">
                {Array.from({ length: 20 }, (_, i) => (
                  <div
                    key={i}
                    className="grid-line absolute bg-purple-500/20"
                    style={{
                      left: `${i * 5}%`,
                      top: 0,
                      width: '2px',
                      height: '100%',
                      willChange: 'transform, opacity'
                    }}
                  />
                ))}
              </div>
              
              {/* Particles */}
              {energyParticles.map((p) => (
                <div
                  key={p.id}
                  className="portal-particle absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-cyan-400 opacity-0"
                  style={{
                    transform: `translate(${p.x}px, ${p.y}px)`,
                    willChange: 'transform, opacity'
                  }}
                />
              ))}
            </>
          )}

          {/* Quantum Variant Effects */}
          {variant === 'quantum' && (
            <>
              {/* Glitch Layers */}
              <div ref={glitchRef}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="glitch-layer absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20"
                    style={{
                      mixBlendMode: 'screen',
                      willChange: 'transform'
                    }}
                  />
                ))}
              </div>
              
              {/* Binary Rain */}
              {binaryRain.map((b) => (
                <div
                  key={b.id}
                  className="binary-rain absolute text-lg font-mono text-cyan-400 opacity-70"
                  style={{
                    left: `${b.x}%`,
                    top: '-30px',
                    willChange: 'transform, opacity'
                  }}
                >
                  {b.value}
                </div>
              ))}
              
              {/* Neon Glow */}
              <div className="quantum-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 blur-3xl opacity-0" />
            </>
          )}

          {/* Hologram Variant Effects */}
          {variant === 'hologram' && (
            <>
              {/* Scan Lines */}
              <div ref={scanLinesRef}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="scan-line absolute left-0 right-0 h-1 bg-cyan-400/60"
                    style={{
                      top: `${i * 25}%`,
                      willChange: 'transform'
                    }}
                  />
                ))}
              </div>
              
              {/* Hologram Glow */}
              <div className="hologram-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 blur-3xl opacity-0" />
              
              {/* Projection Grid */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, 0.3) 25%, rgba(6, 182, 212, 0.3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.3) 75%, rgba(6, 182, 212, 0.3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, 0.3) 25%, rgba(6, 182, 212, 0.3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.3) 75%, rgba(6, 182, 212, 0.3) 76%, transparent 77%, transparent)',
                backgroundSize: '50px 50px'
              }} />
            </>
          )}
        </>
      )}
    </div>
  );
}
