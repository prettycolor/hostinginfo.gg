/**
 * Animated Easter Eggs Mapper
 * Maps commands to their animated components
 */

import { ReactNode } from 'react';
import { AnimationErrorBoundary } from './AnimationErrorBoundary';
import { BrewAnimation, RoastAnimation, EspressoAnimation } from './CoffeeAnimations';
import { HackAnimation, MatrixAnimation, SudoAnimation } from './HackerAnimations';
import { ChaosEmeraldScene, SonicScene } from './ThreeJSScenes';

/**
 * Get animated easter egg component for a command
 * Returns null if command doesn't have an animation
 */
export function getAnimatedEasterEgg(command: string): ReactNode | null {
  const animations: Record<string, { component: ReactNode; name: string }> = {
    // Coffee animations
    'brew': { component: <BrewAnimation />, name: 'brew' },
    'roast': { component: <RoastAnimation />, name: 'roast' },
    'espresso': { component: <EspressoAnimation />, name: 'espresso' },
    
    // Hacker animations
    'hack': { component: <HackAnimation />, name: 'hack' },
    'matrix': { component: <MatrixAnimation />, name: 'matrix' },
    'sudo': { component: <SudoAnimation />, name: 'sudo' },
    
    // Three.js 3D scenes (Gaming Easter Eggs)
    'sonic': { component: <SonicScene />, name: 'sonic' },
    'emerald': { component: <ChaosEmeraldScene />, name: 'emerald' },
    'chaos': { component: <ChaosEmeraldScene />, name: 'chaos' },
  };

  const animation = animations[command];
  if (!animation) return null;

  // Wrap in error boundary for graceful fallback
  return (
    <AnimationErrorBoundary commandName={animation.name}>
      {animation.component}
    </AnimationErrorBoundary>
  );
}

/**
 * Check if a command has an animated easter egg
 */
export function hasAnimatedEasterEgg(command: string): boolean {
  return getAnimatedEasterEgg(command) !== null;
}

/**
 * Get list of all animated easter egg commands
 */
export function getAnimatedCommands(): string[] {
  return [
    'brew',
    'roast',
    'espresso',
    'hack',
    'matrix',
    'sudo',
    'sonic',
    'emerald',
    'chaos',
  ];
}
