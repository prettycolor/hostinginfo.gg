import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  shouldPlaySignupConfetti,
  clearSignupConfettiFlag,
} from "@/lib/signup-confetti";

interface ConfettiPiece {
  element: HTMLDivElement;
  x: number;
  y: number;
  rotation: number;
  rotationSpeed: number;
  velocityX: number;
  velocityY: number;
  size: number;
  color: string;
  shape: "rect" | "circle" | "star";
}

const COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Light Salmon
  "#98D8C8", // Mint
  "#F7DC6F", // Yellow
  "#BB8FCE", // Purple
  "#85C1E2", // Sky Blue
  "#F8B739", // Orange
  "#52C41A", // Green
];

export function SignupConfetti() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!shouldPlaySignupConfetti() || !containerRef.current) {
      return;
    }

    // Clear the flag immediately to prevent replays
    clearSignupConfettiFlag();

    // Create confetti pieces
    const confettiPieces: ConfettiPiece[] = [];
    const container = containerRef.current;
    const pieceCount = 150;

    // Create confetti elements
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement("div");
      const shape = ["rect", "circle", "star"][
        Math.floor(Math.random() * 3)
      ] as "rect" | "circle" | "star";
      const size = Math.random() * 12 + 6; // 6-18px
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      // Base styles
      piece.style.position = "absolute";
      piece.style.width = `${size}px`;
      piece.style.height = `${size}px`;
      piece.style.backgroundColor = color;
      piece.style.pointerEvents = "none";
      piece.style.willChange = "transform";

      // Shape-specific styles
      if (shape === "circle") {
        piece.style.borderRadius = "50%";
      } else if (shape === "star") {
        piece.style.clipPath =
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
      }

      // Initial position (spread across top of screen)
      const startX = Math.random() * window.innerWidth;
      const startY = -50; // Start above viewport

      piece.style.left = `${startX}px`;
      piece.style.top = `${startY}px`;

      container.appendChild(piece);

      confettiPieces.push({
        element: piece,
        x: startX,
        y: startY,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20, // -10 to 10 degrees per frame
        velocityX: (Math.random() - 0.5) * 8, // Horizontal spread
        velocityY: Math.random() * 3 + 2, // Initial downward velocity
        size,
        color,
        shape,
      });
    }

    // Physics constants
    const gravity = 0.5;
    const duration = 4; // seconds

    // Create GSAP timeline
    const tl = gsap.timeline({
      onComplete: () => {
        // Cleanup
        confettiPieces.forEach((piece) => {
          piece.element.remove();
        });
      },
    });

    animationRef.current = tl;

    // Animate each confetti piece
    confettiPieces.forEach((piece) => {
      const delay = Math.random() * 0.3; // Stagger start times
      const endY = window.innerHeight + 100; // Fall below viewport
      const endX = piece.x + piece.velocityX * 100; // Horizontal drift
      const totalRotation =
        piece.rotation + piece.rotationSpeed * duration * 60; // 60 fps

      tl.to(
        piece.element,
        {
          x: endX,
          y: endY,
          rotation: totalRotation,
          opacity: 1,
          duration: duration,
          delay: delay,
          ease: "none",
          onUpdate: function () {
            // Custom physics simulation
            const progress = this.progress();
            // Apply gravity effect (quadratic easing)
            const gravityY =
              piece.y +
              piece.velocityY * progress * 100 +
              0.5 * gravity * Math.pow(progress * 100, 2);
            gsap.set(piece.element, { y: gravityY });

            // Wobble effect (sine wave)
            const wobble = Math.sin(progress * Math.PI * 4) * 20;
            const currentX =
              piece.x + piece.velocityX * progress * 100 + wobble;
            gsap.set(piece.element, { x: currentX });

            // Fade out near the end
            if (progress > 0.8) {
              const fadeProgress = (progress - 0.8) / 0.2;
              gsap.set(piece.element, { opacity: 1 - fadeProgress });
            }
          },
        },
        0,
      );
    });

    // Cleanup function
    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
      confettiPieces.forEach((piece) => {
        piece.element.remove();
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{
        perspective: "1000px",
        perspectiveOrigin: "50% 50%",
      }}
      aria-hidden="true"
    />
  );
}
