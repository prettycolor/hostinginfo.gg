"use client";

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import gsap from 'gsap';
import { Glasses, Code } from 'lucide-react';

/**
 * Nerd Certificate Easter Egg
 * 
 * Triggered when user clicks the fox logo on the calculator page.
 * Shows an official "CERTIFIED NERD" certificate with confetti animation.
 */

interface NerdCertificateEasterEggProps {
  onClose: () => void;
}

export function NerdCertificateEasterEgg({ onClose }: NerdCertificateEasterEggProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate certificate entrance
    if (certificateRef.current) {
      gsap.fromTo(
        certificateRef.current,
        { scale: 0, rotation: -180, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 1, ease: 'elastic.out(1, 0.5)' }
      );
    }

    // Confetti animation
    if (confettiRef.current) {
      const confetti = confettiRef.current.children;
      gsap.fromTo(
        confetti,
        { y: -100, opacity: 1, rotation: 0 },
        {
          y: 600,
          opacity: 0,
          rotation: 360,
          duration: 3,
          stagger: 0.05,
          ease: 'power2.in',
        }
      );
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Confetti */}
      <div ref={confettiRef} className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: -20,
              backgroundColor: ['#9333ea', '#3b82f6', '#ec4899', '#f59e0b', '#10b981'][i % 5],
            }}
          />
        ))}
      </div>

      <div ref={certificateRef} className="relative max-w-2xl w-full">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border-8 border-purple-600 rounded-lg p-8 md:p-12 shadow-2xl">
          <div className="text-center space-y-6">
            {/* Pepe Clown with DBZ Power-Up Effect */}
            <div className="relative flex justify-center">
              {/* Power aura rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-yellow-400 animate-ping opacity-75" />
                <div className="absolute w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-orange-400 animate-ping opacity-50" style={{ animationDelay: '0.2s' }} />
                <div className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-red-400 animate-ping opacity-25" style={{ animationDelay: '0.4s' }} />
              </div>
              
              {/* Pepe Clown Image with glow */}
              <div className="relative z-10">
                <img 
                  src="/assets/placeholder.png" 
                  alt="Pepe Clown" 
                  className="w-32 h-32 md:w-40 md:h-40 object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.8)) drop-shadow(0 0 40px rgba(249, 115, 22, 0.6))',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                />
              </div>
              
              {/* Energy sparks */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                      animation: `spark ${1 + Math.random()}s ease-out infinite`,
                      animationDelay: `${i * 0.2}s`,
                      transform: `rotate(${i * 45}deg) translateY(-60px)`,
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Certificate Header */}
            <div className="border-b-4 border-purple-600 pb-4">
              <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                OFFICIAL CERTIFICATE
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground mt-2">of Nerd</p>
            </div>
            
            {/* Certificate Body */}
            <div className="space-y-4">
              <p className="text-base md:text-lg">This certifies that</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-600">YOU</p>
              <p className="text-base md:text-lg">are officially recognized as a</p>
              <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                GIGA NERD
              </p>
              <p className="text-sm text-muted-foreground italic">You are officially recognized as a GIGA NERD</p>
            </div>
            
            {/* Badges */}
            <div className="flex items-center justify-center gap-8 pt-6">
              <div className="text-center">
                <Glasses className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 text-purple-600" />
                <p className="text-xs font-mono">NERD SEAL</p>
              </div>
              <div className="text-center">
                <Code className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 text-blue-600" />
                <p className="text-xs font-mono">TECH BADGE</p>
              </div>
            </div>
            
            {/* Accept Button */}
            <Button 
              onClick={onClose} 
              size="lg" 
              className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Accept Certificate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
