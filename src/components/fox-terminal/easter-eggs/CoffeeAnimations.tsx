/**
 * Coffee Animations Component
 * GSAP animations for coffee-related easter eggs
 */

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';

interface CoffeeAnimationProps {
  type: 'brew' | 'roast' | 'espresso';
  onComplete?: () => void;
}

export function CoffeeAnimation({ type, onComplete }: CoffeeAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let timeline: gsap.core.Timeline | null = null;

    try {
      timeline = gsap.timeline({
        onComplete: () => {
          if (onComplete) {
            setTimeout(onComplete, 1000);
          }
        },
      });

    if (type === 'brew') {
      // Steam rising animation
      timeline
        .to('.steam-particle', {
          y: -50,
          opacity: 0,
          duration: 2,
          stagger: 0.1,
          ease: 'power1.out',
          repeat: 2,
        })
        .to('.coffee-cup', {
          scale: 1.1,
          duration: 0.25,
          ease: 'power2.inOut',
          repeat: 1,
          yoyo: true,
        }, 0);
    } else if (type === 'roast') {
      // Fire flickering effect
      timeline
        .to('.fire-emoji', {
          scale: 1.15,
          filter: 'hue-rotate(20deg) brightness(1.2)',
          duration: 0.15,
          repeat: 9,
          yoyo: true,
          ease: 'power1.inOut',
        })
        .to('.bean', {
          rotation: 360,
          scale: 1.2,
          duration: 1,
          stagger: 0.2,
          ease: 'back.out(1.7)',
          repeat: 1,
          yoyo: true,
        }, 0.5);
    } else if (type === 'espresso') {
      // Energy burst animation
      timeline
        .to('.espresso', {
          scale: 1.5,
          duration: 0.2,
          ease: 'power2.out',
        })
        .to('.espresso', {
          boxShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
          duration: 0.3,
          repeat: 3,
          yoyo: true,
        })
        .to('.espresso', {
          scale: 1,
          duration: 0.3,
          ease: 'elastic.out(1, 0.3)',
        })
        .to('.energy-particle', {
          x: () => (Math.random() - 0.5) * 100,
          y: () => (Math.random() - 0.5) * 100,
          opacity: 0,
          scale: 0,
          duration: 1,
          stagger: 0.05,
          ease: 'power2.out',
        }, 0.5);
    }

    } catch (error) {
      console.error('[CoffeeAnimation] Error:', error);
      if (onComplete) {
        setTimeout(onComplete, 1000);
      }
    }

    return () => {
      if (timeline) {
        timeline.kill();
      }
    };
  }, [type, onComplete]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="coffee-animation flex flex-col items-center justify-center py-8 relative"
    >
      {type === 'brew' && (
        <>
          <div className="coffee-cup text-6xl mb-4">☕</div>
          <div className="steam-container relative">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="steam-particle absolute text-2xl text-gray-400"
                style={{
                  left: `${i * 20 - 40}px`,
                  top: '-20px',
                }}
              >
                ~
              </div>
            ))}
          </div>
          <div className="text-green-400 text-xl font-bold mt-4 animate-pulse">
            ☕ Brewing your perfect cup...
          </div>
        </>
      )}

      {type === 'roast' && (
        <>
          <div className="fire-emoji text-6xl mb-4">🔥</div>
          <div className="beans-container flex gap-4 mb-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bean text-4xl">
                🫘
              </div>
            ))}
          </div>
          <div className="text-orange-400 text-xl font-bold animate-pulse">
            🔥 Roasting beans to perfection...
          </div>
        </>
      )}

      {type === 'espresso' && (
        <>
          <div className="espresso text-6xl mb-4 relative">
            ☕
            <div className="energy-particles absolute inset-0">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="energy-particle absolute text-2xl"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  ⚡
                </div>
              ))}
            </div>
          </div>
          <div className="text-yellow-400 text-xl font-bold animate-pulse">
            ⚡ ESPRESSO ENERGY BOOST! ⚡
          </div>
        </>
      )}
    </motion.div>
  );
}

// Export individual components for easier use
export function BrewAnimation({ onComplete }: { onComplete?: () => void }) {
  return <CoffeeAnimation type="brew" onComplete={onComplete} />;
}

export function RoastAnimation({ onComplete }: { onComplete?: () => void }) {
  return <CoffeeAnimation type="roast" onComplete={onComplete} />;
}

export function EspressoAnimation({ onComplete }: { onComplete?: () => void }) {
  return <CoffeeAnimation type="espresso" onComplete={onComplete} />;
}
