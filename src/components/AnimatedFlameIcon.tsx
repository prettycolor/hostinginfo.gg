import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Flame } from 'lucide-react';

interface AnimatedFlameIconProps {
  className?: string;
  /** If true, will activate on parent hover instead of self hover */
  useParentHover?: boolean;
}

export function AnimatedFlameIcon({ className = 'w-5 h-5', useParentHover = false }: AnimatedFlameIconProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!useParentHover) return;

    const handleParentHover = () => {
      // Find the closest button or link parent
      const parent = containerRef.current?.closest('button, a');
      if (!parent) return;

      const onMouseEnter = () => setIsHovered(true);
      const onMouseLeave = () => setIsHovered(false);

      parent.addEventListener('mouseenter', onMouseEnter);
      parent.addEventListener('mouseleave', onMouseLeave);

      return () => {
        parent.removeEventListener('mouseenter', onMouseEnter);
        parent.removeEventListener('mouseleave', onMouseLeave);
      };
    };

    const cleanup = handleParentHover();
    return cleanup;
  }, [useParentHover]);

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center"
      onMouseEnter={() => !useParentHover && setIsHovered(true)}
      onMouseLeave={() => !useParentHover && setIsHovered(false)}
    >
      <motion.div
        animate={isHovered ? {
          scale: [1, 1.02, 1],
          filter: [
            'drop-shadow(0 0 10px rgba(249, 115, 22, 0.6))',
            'drop-shadow(0 0 20px rgba(249, 115, 22, 0.9))',
            'drop-shadow(0 0 10px rgba(249, 115, 22, 0.6))',
          ],
        } : {}}
        transition={{ duration: 2, repeat: isHovered ? Infinity : 0, ease: 'easeInOut' }}
      >
        <Flame className={className} />
      </motion.div>
      {isHovered && (
        <>
          {/* Ultra Dense Ember Trail - MASTERFUL COMBINATION */}
          {/* 25 particles with 60px spread - Best of Ultra Wide + Dense Cluster */}
          {[...Array(25)].map((_, i) => {
            // MASTERFUL COMBINATION: Wide spread (60px) + Dense particles (25)
            const randomDelay = Math.random() * 0.7;
            const randomDuration = 1.0 + Math.random() * 0.9; // 1.0-1.9s
            const randomHeight = -42 - Math.random() * 38; // -42 to -80px (tall)
            const randomX = (Math.random() - 0.5) * 60; // ULTRA WIDE: 60px spread
            const randomSize = 0.6 + Math.random() * 1.0; // 0.6-1.6px (good variety)
            const randomOpacity = 0.75 + Math.random() * 0.25; // 0.75-1.0 (bright)
            const colors = ['#fbbf24', '#f97316', '#dc2626', '#fb923c', '#fde047']; // 5 colors
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            return (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: '50%',
                  bottom: '40%',
                  width: `${randomSize * 2}px`,
                  height: `${randomSize * 2}px`,
                  background: randomColor,
                  boxShadow: `0 0 ${randomSize * 4}px ${randomColor}`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  y: [0, randomHeight * 0.6, randomHeight],
                  x: [0, randomX * 0.5, randomX],
                  opacity: [0, randomOpacity, 0],
                  scale: [0, 1.2, 0.4],
                }}
                transition={{
                  duration: randomDuration,
                  repeat: Infinity,
                  delay: randomDelay,
                  ease: 'easeOut',
                  repeatDelay: Math.random() * 0.3,
                }}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
