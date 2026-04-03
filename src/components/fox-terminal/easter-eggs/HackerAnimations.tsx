/**
 * Hacker Animations Component
 * GSAP animations for hacker-related easter eggs
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';

interface HackerAnimationProps {
  type: 'hack' | 'matrix' | 'sudo';
  onComplete?: () => void;
}

export function HackerAnimation({ type, onComplete }: HackerAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

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

    if (type === 'hack') {
      // Progress bar with glitch effect
      timeline
        .to({}, {
          duration: 2,
          onUpdate: function() {
            const prog = Math.floor(this.progress() * 100);
            setProgress(prog);
            
            // Random glitch effect
            if (Math.random() > 0.9) {
              gsap.to('.progress-bar', {
                x: Math.random() * 10 - 5,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
              });
            }
          },
        })
        .to('.progress-bar', {
          backgroundColor: '#22c55e',
          duration: 0.25,
          repeat: 4,
          yoyo: true,
        }, 0)
        .to('.hacker-text', {
          opacity: 1,
          scale: 1.2,
          duration: 0.3,
          ease: 'back.out(1.7)',
        }, 2)
        .to('.hacker-text', {
          scale: 1,
          duration: 0.2,
        }, 2);
    } else if (type === 'matrix') {
      // Binary code rain
      timeline
        .to('.binary-char', {
          y: 200,
          opacity: 0,
          duration: 2,
          stagger: 0.05,
          ease: 'none',
          repeat: 1,
          yoyo: true,
        })
        .to('.matrix-text', {
          opacity: 1,
          scale: 1.2,
          textShadow: '0 0 20px #00ff00',
          duration: 0.6,
          ease: 'power2.out',
        }, 1)
        .to('.matrix-text', {
          scale: 1,
          textShadow: '0 0 10px #00ff00',
          duration: 0.4,
        }, 1);
    } else if (type === 'sudo') {
      // Lock unlocking animation
      timeline
        .to('.lock', {
          rotation: -10,
          duration: 0.2,
        })
        .to('.lock', {
          rotation: 10,
          duration: 0.2,
        })
        .to('.lock', {
          rotation: 0,
          scale: 1.2,
          duration: 0.3,
        })
        .to('.lock', {
          opacity: 0,
          scale: 0,
          duration: 0.5,
          ease: 'back.in(1.7)',
        })
        .to('.unlocked', {
          opacity: 1,
          scale: 1.5,
          rotation: 360,
          duration: 0.5,
          ease: 'power2.out',
        })
        .to('.unlocked', {
          scale: 1,
          duration: 0.3,
          ease: 'elastic.out(1, 0.3)',
        })
        .fromTo('.sudo-text', {
          opacity: 0,
          y: 20,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
    }

    } catch (error) {
      console.error('[HackerAnimation] Error:', error);
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

  const binaryChars = '01';
  const generateBinaryGrid = () => {
    return Array.from({ length: 50 }, () => 
      binaryChars[Math.floor(Math.random() * binaryChars.length)]
    );
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="hacker-animation flex flex-col items-center justify-center py-8 relative"
    >
      {type === 'hack' && (
        <>
          <div className="text-green-400 text-xl font-mono mb-4">
            💻 Hacking in progress...
          </div>
          <div className="w-full max-w-md bg-gray-800 rounded-lg p-4">
            <div className="progress-bar-container relative h-8 bg-gray-700 rounded overflow-hidden">
              <div
                className="progress-bar absolute inset-y-0 left-0 bg-green-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-white font-mono font-bold">
                {progress}%
              </div>
            </div>
          </div>
          <div className="hacker-text text-green-400 text-2xl font-bold mt-4 opacity-0">
            ✅ ACCESS GRANTED!
          </div>
        </>
      )}

      {type === 'matrix' && (
        <>
          <div className="binary-grid grid grid-cols-10 gap-2 mb-8">
            {generateBinaryGrid().map((char, i) => (
              <div
                key={i}
                className="binary-char text-green-400 font-mono text-xl"
              >
                {char}
              </div>
            ))}
          </div>
          <div className="matrix-text text-green-400 text-3xl font-mono font-bold opacity-0">
            💊 ENTERING THE MATRIX 💊
          </div>
        </>
      )}

      {type === 'sudo' && (
        <>
          <div className="lock text-6xl mb-4">
            🔒
          </div>
          <div className="unlocked text-6xl mb-4 opacity-0 absolute">
            🔓
          </div>
          <div className="sudo-text text-red-400 text-2xl font-mono font-bold opacity-0 mt-16">
            🔐 ROOT ACCESS GRANTED!
          </div>
        </>
      )}
    </motion.div>
  );
}

// Export individual components for easier use
export function HackAnimation({ onComplete }: { onComplete?: () => void }) {
  return <HackerAnimation type="hack" onComplete={onComplete} />;
}

export function MatrixAnimation({ onComplete }: { onComplete?: () => void }) {
  return <HackerAnimation type="matrix" onComplete={onComplete} />;
}

export function SudoAnimation({ onComplete }: { onComplete?: () => void }) {
  return <HackerAnimation type="sudo" onComplete={onComplete} />;
}
