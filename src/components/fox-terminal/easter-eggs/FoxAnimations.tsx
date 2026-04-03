/**
 * Fox Animations Component
 * GSAP animations for fox-related easter eggs
 */

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';

interface FoxAnimationProps {
  type: 'pet' | 'dance' | 'howl';
  onComplete?: () => void;
}

export function FoxAnimation({ type, onComplete }: FoxAnimationProps) {
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

    if (type === 'pet') {
      // Bounce animation with hearts
      timeline
        .to('.fox-ascii', {
          y: -20,
          duration: 0.3,
          repeat: 3,
          yoyo: true,
          ease: 'power1.inOut',
        })
        .to('.heart', {
          y: -30,
          opacity: 1,
          scale: 1.2,
          duration: 0.5,
          stagger: 0.2,
          ease: 'power2.out',
          repeat: 1,
          yoyo: true,
        }, 0.2);
    } else if (type === 'dance') {
      // Rotation with music notes
      timeline
        .to('.fox-ascii', {
          rotation: 10,
          scale: 1.1,
          duration: 2,
          ease: 'power1.inOut',
          repeat: 3,
          yoyo: true,
        })
        .to('.music-note', {
          y: -40,
          x: (index: number) => (index % 2 === 0 ? -20 : 20),
          rotation: (index: number) => (index % 2 === 0 ? -15 : 15),
          opacity: 1,
          scale: 1.2,
          duration: 0.75,
          stagger: 0.15,
          ease: 'power2.out',
          repeat: 1,
          yoyo: true,
        }, 0.3);
    } else if (type === 'howl') {
      // Moon glow with sound wave ripples
      timeline
        .to('.fox-ascii', {
          scale: 1.2,
          duration: 0.25,
          ease: 'power2.inOut',
          repeat: 1,
          yoyo: true,
        })
        .to('.moon', {
          scale: 1.2,
          opacity: 0.9,
          boxShadow: '0 0 40px rgba(255, 255, 200, 0.8)',
          duration: 0.5,
          ease: 'sine.inOut',
          repeat: 3,
          yoyo: true,
        }, 0)
        .to('.sound-wave', {
          scale: 2,
          opacity: 0,
          duration: 1.5,
          stagger: 0.3,
          ease: 'power2.out',
        }, 0.5);
    }

    } catch (error) {
      console.error('[FoxAnimation] Error:', error);
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

  const foxAscii = `
    /\\_/\\
   ( o.o )
    > ^ <
  `;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="fox-animation flex flex-col items-center justify-center py-8 relative"
    >
      {type === 'pet' && (
        <>
          <pre className="fox-ascii text-orange-400 text-2xl font-mono mb-4">
            {foxAscii}
          </pre>
          <div className="hearts-container absolute top-0 left-1/2 -translate-x-1/2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="heart absolute text-3xl text-pink-400"
                style={{
                  left: `${(i - 2) * 30}px`,
                  top: '0px',
                }}
              >
                ❤️
              </div>
            ))}
          </div>
          <div className="text-pink-400 text-xl font-bold mt-8 animate-pulse">
            🦊 The fox loves you! ❤️
          </div>
        </>
      )}

      {type === 'dance' && (
        <>
          <pre className="fox-ascii text-orange-400 text-2xl font-mono mb-4">
            {foxAscii}
          </pre>
          <div className="music-notes-container absolute inset-0">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="music-note absolute text-3xl text-purple-400"
                style={{
                  left: `${30 + (i % 3) * 30}%`,
                  top: '50%',
                }}
              >
                {i % 2 === 0 ? '♪' : '♫'}
              </div>
            ))}
          </div>
          <div className="text-purple-400 text-xl font-bold mt-8 animate-pulse">
            🕺 Fox is dancing! ♪♫
          </div>
        </>
      )}

      {type === 'howl' && (
        <>
          <div className="moon text-6xl mb-4 relative">
            🌙
            <div className="sound-waves-container absolute inset-0">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="sound-wave absolute inset-0 border-2 border-blue-400 rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
            </div>
          </div>
          <pre className="fox-ascii text-orange-400 text-2xl font-mono mb-4">
            {foxAscii}
          </pre>
          <div className="text-blue-400 text-xl font-bold animate-pulse">
            🌙 AWOOOOO! 🦊
          </div>
        </>
      )}
    </motion.div>
  );
}

// Export individual components for easier use
export function PetAnimation({ onComplete }: { onComplete?: () => void }) {
  return <FoxAnimation type="pet" onComplete={onComplete} />;
}

export function DanceAnimation({ onComplete }: { onComplete?: () => void }) {
  return <FoxAnimation type="dance" onComplete={onComplete} />;
}

export function HowlAnimation({ onComplete }: { onComplete?: () => void }) {
  return <FoxAnimation type="howl" onComplete={onComplete} />;
}
