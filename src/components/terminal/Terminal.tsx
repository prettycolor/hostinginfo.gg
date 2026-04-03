import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { executeCommand, type CommandResponse } from "@/lib/terminal/commands";
import { MateriaEasterEgg } from "./easter-eggs/MateriaEasterEgg";
import { ChaosEasterEgg } from "./easter-eggs/ChaosEasterEgg";
import { WarpEasterEgg } from "./easter-eggs/WarpEasterEgg";
import { WoahEasterEgg } from "./easter-eggs/WoahEasterEgg";
import { TerminalEasterEggErrorBoundary } from "./easter-eggs/TerminalEasterEggErrorBoundary";
import { UfoVideo } from "./UfoVideo";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "success" | "info" | "easter-egg";
  content: string;
}

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Terminal({ isOpen, onClose }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "0",
      type: "info",
      content: `
╔════════════════════════════════════════════════════════╗
║              HOSTINGINFO TERMINAL v2.0                 ║
╚════════════════════════════════════════════════════════╝

Welcome to HostingInfo Terminal!
Type 'help' for available commands.
`,
    },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeEasterEgg, setActiveEasterEgg] = useState<string | null>(null);
  const [showUfo, setShowUfo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const isTerminalMinimized = Boolean(activeEasterEgg || showUfo);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input when terminal opens or when it is restored after an easter egg
  useEffect(() => {
    if (isOpen && !isTerminalMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isTerminalMinimized]);

  // Handle ESC key to close terminal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    // Add input to history
    setHistory((prev) => [...prev, trimmedCmd]);
    setHistoryIndex(-1);

    // Add input line
    const inputLine: TerminalLine = {
      id: Date.now().toString(),
      type: "input",
      content: `> ${trimmedCmd}`,
    };

    // Handle special commands
    if (trimmedCmd.toLowerCase() === "clear") {
      setLines([]);
      setInput("");
      return;
    }

    if (trimmedCmd.toLowerCase() === "ufo") {
      setShowUfo(true);
      setInput("");
      return;
    }

    // Execute command
    const response: CommandResponse = executeCommand(trimmedCmd);

    // Add output line
    const outputLine: TerminalLine = {
      id: (Date.now() + 1).toString(),
      type: response.type || "info",
      content: response.output,
    };

    setLines((prev) => [...prev, inputLine, outputLine]);

    // Trigger easter egg if specified
    if (response.triggerEasterEgg) {
      setTimeout(() => {
        setActiveEasterEgg(response.triggerEasterEgg!);
      }, 500);
    }

    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex =
          historyIndex === -1
            ? history.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  const handleEasterEggComplete = () => {
    setActiveEasterEgg(null);
  };

  const handleEasterEggError = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-easter-egg-error`,
        type: "error",
        content:
          "3D animation unavailable on this browser/GPU. Continuing in terminal mode.",
      },
    ]);
    setActiveEasterEgg(null);
  };

  const handleUfoComplete = () => {
    setShowUfo(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Terminal Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isTerminalMinimized ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={
          isTerminalMinimized
            ? "fixed inset-0 z-[9998] pointer-events-none"
            : "fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        }
        onClick={isTerminalMinimized ? undefined : onClose}
      />

      {/* Terminal Window - Centered Container */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: isTerminalMinimized ? 0 : 1,
            scale: isTerminalMinimized ? 0.98 : 1,
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`w-[90vw] max-w-4xl h-[70vh] max-h-[700px] bg-black/95 backdrop-blur-sm border border-blue-500/30 rounded-lg shadow-2xl flex flex-col ${
            isTerminalMinimized ? "pointer-events-none" : "pointer-events-auto"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/30 bg-blue-500/10">
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                  aria-label="Close terminal"
                />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="ml-4 text-sm font-mono text-blue-400">
                HostingInfo Terminal
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-blue-400 hover:text-blue-300 transition-colors text-xl font-bold px-2"
              aria-label="Close terminal"
            >
              ✕
            </button>
          </div>

          {/* Terminal Content */}
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm text-blue-400"
            onClick={() => inputRef.current?.focus()}
          >
            {lines.map((line) => (
              <div
                key={line.id}
                className={`mb-2 whitespace-pre-wrap ${
                  line.type === "input"
                    ? "text-blue-300 font-bold"
                    : line.type === "error"
                      ? "text-red-400"
                      : line.type === "success"
                        ? "text-green-400"
                        : line.type === "easter-egg"
                          ? "text-purple-400"
                          : "text-blue-400"
                }`}
              >
                {line.content}
              </div>
            ))}

            {/* Input Line */}
            <div className="flex items-center gap-2">
              <span className="text-blue-300 font-bold">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none text-blue-400 font-mono"
                autoFocus
              />
              <span className="animate-pulse text-blue-300">▊</span>
            </div>
          </div>

          {/* Terminal Footer */}
          <div className="px-4 py-2 border-t border-blue-500/30 bg-blue-500/5 text-xs font-mono text-blue-400/70">
            <div className="flex items-center justify-between">
              <span>Type 'help' for commands</span>
              <span>Press ↑/↓ for history</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Easter Eggs */}
      <AnimatePresence>
        {activeEasterEgg === "materia" && (
          <TerminalEasterEggErrorBoundary onError={handleEasterEggError}>
            <MateriaEasterEgg onComplete={handleEasterEggComplete} />
          </TerminalEasterEggErrorBoundary>
        )}
        {activeEasterEgg === "chaos" && (
          <TerminalEasterEggErrorBoundary onError={handleEasterEggError}>
            <ChaosEasterEgg onComplete={handleEasterEggComplete} />
          </TerminalEasterEggErrorBoundary>
        )}
        {activeEasterEgg === "warp" && (
          <TerminalEasterEggErrorBoundary onError={handleEasterEggError}>
            <WarpEasterEgg onComplete={handleEasterEggComplete} />
          </TerminalEasterEggErrorBoundary>
        )}
        {activeEasterEgg === "woah" && (
          <TerminalEasterEggErrorBoundary onError={handleEasterEggError}>
            <WoahEasterEgg onComplete={handleEasterEggComplete} />
          </TerminalEasterEggErrorBoundary>
        )}
        {showUfo && <UfoVideo onComplete={handleUfoComplete} />}
      </AnimatePresence>
    </>
  );
}
