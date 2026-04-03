"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface SketchIconProps {
  type: 'sparkles' | 'search' | 'zap' | 'shield' | 'calculator' | 'star' | 'chart' | 'bell' | 'trending' | 'check' | 'user-plus';
  className?: string;
}

/**
 * Sketch Drawing Icon Component
 * 
 * Animated hand-drawn style icons with SVG path animations.
 * Each icon draws itself on mount with a continuous loop.
 */

export function SketchIcon({ type, className = "h-12 w-12" }: SketchIconProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const paths = svgRef.current.querySelectorAll('path, circle, line, polyline, polygon');
    if (paths.length === 0) return;

    // Initialize all paths
    paths.forEach((path) => {
      if (path instanceof SVGGeometryElement) {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });
      }
    });

    // Create drawing animation timeline (play once, no loop)
    // Optimized for smooth 60fps performance
    const tl = gsap.timeline();
    
    paths.forEach((path, index) => {
      if (path instanceof SVGGeometryElement) {
        tl.to(path, {
          strokeDashoffset: 0,
          duration: 1.2, // Faster for snappier feel
          ease: 'power2.out', // Smoother easing
          force3D: true, // Hardware acceleration
        }, index * 0.2); // Tighter stagger for faster completion
      }
    });

    // Icon stays drawn (no erase, no loop)

    return () => {
      tl.kill();
    };
  }, [type]);

  const getIconPaths = () => {
    switch (type) {
      case 'sparkles':
        return (
          <>
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M19 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
            <path d="M5 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
          </>
        );
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </>
        );
      case 'zap':
        return <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />;
      case 'shield':
        return (
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </>
        );
      case 'calculator':
        return (
          <>
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="10" y2="10" />
            <line x1="14" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="10" y2="14" />
            <line x1="14" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </>
        );
      case 'star':
        return <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
      case 'chart':
        return (
          <>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </>
        );
      case 'bell':
        return (
          <>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </>
        );
      case 'trending':
        return (
          <>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </>
        );
      case 'check':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </>
        );
      case 'user-plus':
        return (
          <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
      }}
    >
      {getIconPaths()}
    </svg>
  );
}
