import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Terminal } from "./Terminal";
import { UfoVideo } from "./UfoVideo";
import { useTerminalStore } from "@/lib/fox-terminal/terminal-store";
import { useKonamiCode } from "@/lib/fox-terminal/konami";
import { useSoundEffects } from "@/lib/fox-terminal/sound-effects";
import { gsap } from "gsap";
import "@/styles/fox-terminal.css";

export function FoxTerminal() {
  const { isOpen, closeTerminal } = useTerminalStore();
  const { playSound } = useSoundEffects();
  const [isMaximized, setIsMaximized] = useState(false);

  // Konami code listener
  const konamiActivated = useKonamiCode();

  useEffect(() => {
    if (konamiActivated) {
      playSound("achievement");
    }
  }, [konamiActivated, playSound]);

  useEffect(() => {
    if (isOpen) {
      playSound("open");
      // GSAP entrance animation
      gsap.from(".fox-terminal-container", {
        scale: 0.8,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(1.7)",
      });
    }
  }, [isOpen, playSound]);

  const handleClose = () => {
    playSound("close");
    // GSAP exit animation
    gsap.to(".fox-terminal-container", {
      scale: 0.8,
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: closeTerminal,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="terminal-backdrop"
            onClick={handleClose}
          />

          {/* Terminal Modal - Centered */}
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
            style={{ padding: isMaximized ? "0" : "2rem" }}
          >
            <div
              className="fox-terminal-container terminal-window pointer-events-auto"
              style={{
                width: isMaximized ? "100%" : "min(1400px, 95vw)",
                height: isMaximized ? "100%" : "min(85vh, 900px)",
                maxWidth: isMaximized ? "none" : "1400px",
                maxHeight: isMaximized ? "none" : "900px",
                transition: "all 0.3s ease",
              }}
            >
              {/* Header */}
              <div className="terminal-header">
                <div className="flex items-center gap-4">
                  <div className="terminal-title">
                    <span className="animate-pulse">●</span> HT TERMINAL v2.0.26
                  </div>
                  {konamiActivated && (
                    <div className="text-xs font-mono text-purple-400 animate-pulse">
                      🎮 KONAMI MODE ACTIVE
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="terminal-close"
                    aria-label={
                      isMaximized ? "Restore terminal" : "Maximize terminal"
                    }
                    title={isMaximized ? "Restore" : "Maximize"}
                  >
                    {isMaximized ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleClose}
                    className="terminal-close"
                    aria-label="Close terminal"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Content - Horizontal Layout */}
              <div className="flex flex-1 min-h-0 gap-4 p-4">
                {/* UFO Video - Left Side (Desktop Only) */}
                <div className="hologram-container hidden lg:block">
                  <UfoVideo />
                </div>

                {/* Terminal - Right Side (or Full Width on Mobile) */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-background rounded-lg border-2 border-primary/20">
                  <Terminal />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
